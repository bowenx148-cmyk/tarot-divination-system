import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    hasRedisConfig: vi.fn(() => true),
    redisCommand: vi.fn(),
  },
}));

vi.mock("@/lib/server/upstash", () => redisMock);

import { getTrialGuard, TRIAL_TTL_MS } from "@/lib/server/trial";

// N8：免费试用的 Redis 实现分支
//
// 同属 stats.ts 事故暴露的系统性盲区。该模块是"每设备免费试用 1 次"的唯一实现，
// 一旦 Redis 分支写错，要么试用可被无限重复（成本失控），要么正常用户被误拒。
const TTL_SEC = Math.floor(TRIAL_TTL_MS / 1000); // 90 天

/** 取出指定一次调用下发的命令（默认最后一次），扁平化为可读字符串 */
function sentCommands(callIndex = -1): string[] {
  const calls = redisMock.redisCommand.mock.calls;
  const call = calls.at(callIndex)?.[0] as unknown[][] | undefined;
  return (call ?? []).map((c) => c.join(" "));
}

describe("N8 免费试用（Redis 版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.redisCommand.mockResolvedValue([]);
  });

  it("check 用 EXISTS 探测 trial:{deviceId}", async () => {
    const guard = getTrialGuard(true);
    expect(guard.kind).toBe("redis");

    redisMock.redisCommand.mockResolvedValueOnce([{ result: 0 }]);
    await guard.check("dev-abc");

    expect(sentCommands()).toEqual(["EXISTS trial:dev-abc"]);
  });

  it("键不存在 → 放行（allowed=true, trialUsed=false）", async () => {
    const guard = getTrialGuard(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 0 }]);
    expect(await guard.check("dev-abc")).toEqual({
      allowed: true,
      trialUsed: false,
    });
  });

  it("键存在 → 拒绝（allowed=false, trialUsed=true）", async () => {
    const guard = getTrialGuard(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    expect(await guard.check("dev-abc")).toEqual({
      allowed: false,
      trialUsed: true,
    });
  });

  it("markUsed 用 SET + EX 写入，TTL 为 90 天（防键无限增长）", async () => {
    const guard = getTrialGuard(true);
    await guard.markUsed("dev-abc");

    const cmds = sentCommands();
    expect(cmds).toHaveLength(1);
    expect(cmds[0]).toBe(`SET trial:dev-abc 1 EX ${TTL_SEC}`);
  });

  it("deviceId 只作为键名的一部分，不写入值", async () => {
    const guard = getTrialGuard(true);
    await guard.markUsed("secret-device-id");
    // 值恒为 "1"；deviceId 不应出现在命令参数的值位置
    const cmd = (redisMock.redisCommand.mock.calls[0][0] as unknown[][])[0];
    expect(cmd[0]).toBe("SET");
    expect(cmd[2]).toBe("1");
  });

  it("不同设备使用不同键（互不影响）", async () => {
    const guard = getTrialGuard(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 0 }]);
    await guard.check("dev-a");
    redisMock.redisCommand.mockResolvedValueOnce([{ result: 0 }]);
    await guard.check("dev-b");

    // 最后一次调用针对 dev-b，第一次针对 dev-a
    expect(sentCommands(-1)).toEqual(["EXISTS trial:dev-b"]);
    expect(sentCommands(0)).toEqual(["EXISTS trial:dev-a"]);
  });

  it("check → markUsed → check 全链路：第二次被拒", async () => {
    const guard = getTrialGuard(true);

    redisMock.redisCommand.mockResolvedValueOnce([{ result: 0 }]);
    expect((await guard.check("dev-abc")).allowed).toBe(true);

    redisMock.redisCommand.mockResolvedValueOnce([]); // SET 无返回
    await guard.markUsed("dev-abc");

    redisMock.redisCommand.mockResolvedValueOnce([{ result: 1 }]);
    const after = await guard.check("dev-abc");
    expect(after.allowed).toBe(false);
    expect(after.trialUsed).toBe(true);
  });

  it("Redis 返回 null 时视为未试用（不误拒正常用户）", async () => {
    const guard = getTrialGuard(true);
    redisMock.redisCommand.mockResolvedValueOnce([{ result: null }]);
    expect(await guard.check("dev-abc")).toEqual({
      allowed: true,
      trialUsed: false,
    });
  });
});
