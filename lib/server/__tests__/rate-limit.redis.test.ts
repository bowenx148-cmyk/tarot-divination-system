import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    hasRedisConfig: vi.fn(() => true),
    redisCommand: vi.fn(),
  },
}));

vi.mock("@/lib/server/upstash", () => redisMock);

import { getRateLimiter } from "@/lib/server/rate-limit";

// N8：IP 限流的 Redis 实现分支
//
// 与 quota / trial 同属 stats.ts 事故暴露的系统性测试盲区：此前只测内存版。
// 该模块正跑在生产上，直接决定"每 IP 每 3 小时 5 次"是否真的生效。
const WINDOW_SEC = 3 * 60 * 60; // 3 小时 = 10800 秒

function sentCommands(): string[] {
  const call = redisMock.redisCommand.mock.calls[0]?.[0] as
    | unknown[][]
    | undefined;
  return (call ?? []).map((c) => c.join(" "));
}

describe("N8 IP 限流（Redis 版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.redisCommand.mockResolvedValue([]);
  });

  it("限流键带 rl: 前缀（与运维速查文档 §14.3 的 rl:system_* 一致）", async () => {
    const limiter = getRateLimiter(true);
    expect(limiter.kind).toBe("redis");

    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    await limiter.consume("system_1.2.3.4");

    expect(sentCommands()[0]).toBe("INCR rl:system_1.2.3.4");
  });

  it("INCR 与 EXPIRE 同批下发，且窗口为 3 小时（10800s）", async () => {
    const limiter = getRateLimiter(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    await limiter.consume("system_1.2.3.4");

    const cmds = sentCommands();
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toBe("INCR rl:system_1.2.3.4");
    expect(cmds[1]).toBe(`EXPIRE rl:system_1.2.3.4 ${WINDOW_SEC}`);
  });

  it("窗口内第 5 次放行、第 6 次拒绝（阈值来自 INCR 结果）", async () => {
    const limiter = getRateLimiter(true);

    for (let i = 1; i <= 5; i++) {
      redisMock.redisCommand.mockResolvedValueOnce([{ result: i }]);
      const r = await limiter.consume("system_1.2.3.4");
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(5 - i);
    }

    redisMock.redisCommand.mockResolvedValueOnce([{ result: 6 }]);
    const sixth = await limiter.consume("system_1.2.3.4");
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("remaining 不为负（第 100 次仍为 0，不出现 -95）", async () => {
    const limiter = getRateLimiter(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 100 }]);
    const r = await limiter.consume("system_1.2.3.4");
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("不同 IP 使用不同键（互不干扰）", async () => {
    const limiter = getRateLimiter(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    await limiter.consume("system_1.1.1.1");
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    await limiter.consume("system_2.2.2.2");

    const first = redisMock.redisCommand.mock.calls[0][0] as unknown[][];
    const second = redisMock.redisCommand.mock.calls[1][0] as unknown[][];
    expect(first[0][1]).toBe("rl:system_1.1.1.1");
    expect(second[0][1]).toBe("rl:system_2.2.2.2");
  });

  it("Redis 返回 null 时按 1 计（首次调用），不抛错", async () => {
    const limiter = getRateLimiter(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: null }]);
    const r = await limiter.consume("system_1.2.3.4");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
  });

  it("resetTime 为当前时间 + 窗口长度", async () => {
    const limiter = getRateLimiter(true);
    const before = Date.now();
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    const r = await limiter.consume("system_1.2.3.4");
    expect(r.resetTime).toBeGreaterThanOrEqual(before + WINDOW_SEC * 1000);
    expect(r.resetTime).toBeLessThanOrEqual(Date.now() + WINDOW_SEC * 1000);
  });
});
