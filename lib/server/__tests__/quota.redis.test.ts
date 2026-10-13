import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    hasRedisConfig: vi.fn(() => true),
    redisCommand: vi.fn(),
  },
}));

vi.mock("@/lib/server/upstash", () => redisMock);

import { getQuotaGuard } from "@/lib/server/quota";

// N8：每日熔断配额的 Redis 实现分支
//
// 这一层此前完全没有测试覆盖——内存版写对了，Redis 版却从未被验证。
// 这正是 stats.ts 无限循环 OOM 事故暴露出的系统性盲区（见归档 §10.1）。
// 本文件锁住该分支：断言实际下发的命令，而非仅断言 kind === "redis"。
const T = "2026-09-16T02:00:00Z"; // 上海 2026-09-16 10:00
const DATE = "2026-09-16";
const KEY = `quota:count:${DATE}`;

/** 取出指定一次调用下发的命令（默认最后一次），扁平化为可读字符串 */
function sentCommands(callIndex = -1): string[] {
  const calls = redisMock.redisCommand.mock.calls;
  const call = calls.at(callIndex)?.[0] as unknown[][] | undefined;
  return (call ?? []).map((c) => c.join(" "));
}

/** 让第 n 次 redisCommand 调用返回指定结果 */
function mockResults(...results: { result: unknown }[][]) {
  results.forEach((r) => redisMock.redisCommand.mockResolvedValueOnce(r));
}

describe("N8 每日熔断配额（Redis 版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(T));
    redisMock.redisCommand.mockResolvedValue([]);
  });

  it("count 取自当日配额键，未超限时放行", async () => {
    const g = getQuotaGuard(true);
    expect(g.kind).toBe("redis");

    mockResults([{ result: "1" }], [{ result: "3" }], [{ result: "4" }]);
    const r = await g.consume();

    expect(r.allowed).toBe(true);
    expect(r.count).toBe(4); // 取自 INCR 结果，而非 INCR 前的读值
    expect(r.limit).toBe(50);
  });

  it("consume 下发的键名与命令正确（GET 开关 → GET 计数 → INCR+EXPIRE）", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: "1" }], [{ result: "0" }], [{ result: "1" }]);
    await g.consume();

    const calls = redisMock.redisCommand.mock.calls.map((c) =>
      (c[0] as unknown[][]).map((x) => x.join(" ")),
    );
    expect(calls[0]).toEqual(["GET quota:enabled"]);
    expect(calls[1]).toEqual([`GET ${KEY}`]);
    // 第三次：INCR 与 EXPIRE 必须同批下发，否则计数键永不过期
    expect(calls[2][0]).toBe(`INCR ${KEY}`);
    expect(calls[2][1]).toMatch(new RegExp(`^EXPIRE ${KEY} \\d+$`));
  });

  it("EXPIRE 到当日 24:00 剩余秒数（上海 10:00 → 50400s），而非固定 24h", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: "1" }], [{ result: "0" }], [{ result: "1" }]);
    await g.consume();

    // INCR/EXPIRE 是本次 consume 的第 3 次（也是最后一次）调用
    const expiries = sentCommands(-1).filter((c) => c.startsWith("EXPIRE"));
    expect(expiries).toHaveLength(1);
    // 上海时间 10:00 距当日 24:00 还有 14 小时 = 50400 秒
    expect(expiries[0]).toBe(`EXPIRE ${KEY} 50400`);
  });

  it("达到阈值时熔断：allowed=false 且不再计数（不下发 INCR）", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: "1" }], [{ result: "50" }]);
    const r = await g.consume();

    expect(r.allowed).toBe(false);
    expect(r.count).toBe(50);
    // 熔断路径不得写入：只应有 2 条读命令（GET 开关 + GET 计数），无 INCR
    const all = redisMock.redisCommand.mock.calls.flatMap((c) =>
      (c[0] as unknown[][]).map((x) => x.join(" ")),
    );
    expect(all).toHaveLength(2);
    expect(all.some((c) => c.startsWith("INCR"))).toBe(false);
  });

  it("开关关闭时放行且不计数（不下发 INCR）", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: "0" }], [{ result: "7" }]);
    const r = await g.consume();

    expect(r.allowed).toBe(true);
    expect(r.count).toBe(7); // 关闭期间读数不变
    const all = redisMock.redisCommand.mock.calls.flatMap((c) =>
      (c[0] as unknown[][]).map((x) => x.join(" ")),
    );
    expect(all.some((c) => c.startsWith("INCR"))).toBe(false);
  });

  it("开关缺省（键不存在）视为开启", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: null }], [{ result: null }], [{ result: "1" }]);
    const r = await g.consume();
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it("increment 无条件 +1 并带 EXPIRE", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: "9" }]);
    const r = await g.increment();

    expect(r.count).toBe(9);
    expect(r.allowed).toBe(true);
    const cmds = sentCommands();
    expect(cmds[0]).toBe(`INCR ${KEY}`);
    expect(cmds[1]).toMatch(new RegExp(`^EXPIRE ${KEY} \\d+$`));
  });

  it("increment 超过阈值时 allowed=false（计数仍写入，供审计）", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: "51" }]);
    const r = await g.increment();
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(51);
  });

  it("getStatus 以单次批量调用读取开关与当日计数（MGET 语义）", async () => {
    const g = getQuotaGuard(true);
    // getStatus 把两条读命令放进同一次 redisCommand 调用
    redisMock.redisCommand.mockResolvedValueOnce([
      { result: "0" },
      { result: "12" },
    ]);
    const s = await g.getStatus();

    expect(s).toEqual({ enabled: false, count: 12, limit: 50 });
    expect(redisMock.redisCommand).toHaveBeenCalledTimes(1);
    expect(sentCommands(0)).toEqual(["GET quota:enabled", `GET ${KEY}`]);
  });

  it("setEnabled 写入 quota:enabled（1 / 0）", async () => {
    const g = getQuotaGuard(true);
    await g.setEnabled(false);
    expect(sentCommands()).toEqual(["SET quota:enabled 0"]);

    redisMock.redisCommand.mockClear();
    await g.setEnabled(true);
    expect(sentCommands()).toEqual(["SET quota:enabled 1"]);
  });

  it("Redis 返回 null/非数值时回落为 0，不抛错", async () => {
    const g = getQuotaGuard(true);
    mockResults([{ result: null }], [{ result: null }], [{ result: null }]);
    const r = await g.consume();
    expect(r.count).toBe(1); // INCR 结果缺失时回落为 count+1
    expect(Number.isFinite(r.count)).toBe(true);
  });
});
