import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    hasRedisConfig: vi.fn(() => true),
    redisCommand: vi.fn(),
  },
}));

vi.mock("@/lib/server/upstash", () => redisMock);

import { getStatsGuard } from "@/lib/server/stats";

// N3：聚合统计的 Redis 实现分支
//
// 这一层此前完全没有测试覆盖——内存版写对了，Redis 版却藏着一个
// 「边遍历数组边 push」导致的无限循环（线上表现为请求挂死、nginx 502）。
// 本文件专门锁住该分支。
const DATE = "2026-09-16";
const T = "2026-09-16T02:00:00Z"; // 上海 2026-09-16 10:00

/** 取出本次 record 下发的命令，扁平化为可读字符串 */
function sentCommands(): string[] {
  const call = redisMock.redisCommand.mock.calls[0]?.[0] as unknown[][] | undefined;
  return (call ?? []).map((c) => c.join(" "));
}

describe("N3 聚合统计（Redis 版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(T));
    redisMock.redisCommand.mockResolvedValue([]);
  });

  it("record 下发的命令数量有界（回归：禁止边遍历边 push 造成无限循环）", async () => {
    const g = getStatsGuard(true);
    await g.record({ keyType: "system", ok: true, deviceId: "d1" });

    expect(redisMock.redisCommand).toHaveBeenCalledTimes(1);
    // 3 个计数命令(INCR calls / INCR syskey / PFADD) + 3 个 EXPIRE = 6
    expect(sentCommands()).toHaveLength(6);
  });

  it("计数命令内容正确（系统 Key + 失败）", async () => {
    const g = getStatsGuard(true);
    await g.record({ keyType: "system", ok: false });

    const cmds = sentCommands();
    expect(cmds).toContain(`INCR stats:${DATE}:calls`);
    expect(cmds).toContain(`INCR stats:${DATE}:syskey`);
    expect(cmds).toContain(`INCR stats:${DATE}:fail`);
    expect(cmds).not.toContain(`INCR stats:${DATE}:userkey`);
  });

  it("用户 Key 走 userkey 计数，不碰 syskey", async () => {
    const g = getStatsGuard(true);
    await g.record({ keyType: "user", ok: true });

    const cmds = sentCommands();
    expect(cmds).toContain(`INCR stats:${DATE}:userkey`);
    expect(cmds).not.toContain(`INCR stats:${DATE}:syskey`);
    expect(cmds).not.toContain(`INCR stats:${DATE}:fail`);
  });

  it("每个被触及的键都下发 EXPIRE（聚合数据能自动过期）", async () => {
    const g = getStatsGuard(true);
    await g.record({ keyType: "system", ok: true, deviceId: "d1" });

    const expiries = sentCommands().filter((c) => c.startsWith("EXPIRE"));
    expect(expiries).toHaveLength(3);
    expect(expiries.every((c) => c.endsWith("2592000"))).toBe(true); // 30 天
  });

  it("deviceId 只进 HyperLogLog，不作为可读值存储", async () => {
    const g = getStatsGuard(true);
    await g.record({ keyType: "system", ok: true, deviceId: "secret-device-id" });

    const pfadd = sentCommands().filter((c) => c.startsWith("PFADD"));
    expect(pfadd).toHaveLength(1);
    // 唯一出现 deviceId 的地方就是 PFADD 的参数（HLL 草图输入）
    const others = sentCommands().filter((c) => !c.startsWith("PFADD"));
    expect(others.join(" ")).not.toContain("secret-device-id");
  });

  it("无 deviceId 时不写 HyperLogLog", async () => {
    const g = getStatsGuard(true);
    await g.record({ keyType: "user", ok: true });
    expect(sentCommands().some((c) => c.startsWith("PFADD"))).toBe(false);
  });

  it("getDaily 解析 MGET 与 PFCOUNT 结果", async () => {
    const g = getStatsGuard(true);
    redisMock.redisCommand.mockResolvedValueOnce([
      { result: ["12", "9", "3", "1"] },
      { result: 5 },
    ]);

    expect(await g.getDaily(DATE)).toEqual({
      date: DATE,
      calls: 12,
      systemKey: 9,
      userKey: 3,
      failures: 1,
      distinctDevices: 5,
    });
  });

  it("Redis 返回 null 时回落为 0，不抛错", async () => {
    const g = getStatsGuard(true);
    redisMock.redisCommand.mockResolvedValueOnce([
      { result: [null, null, null, null] },
      { result: null },
    ]);

    const s = await g.getDaily(DATE);
    expect(s.calls).toBe(0);
    expect(s.distinctDevices).toBe(0);
  });
});
