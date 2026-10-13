import { describe, expect, it } from "vitest";
import {
  createStatsGuard,
  shanghaiDateKey,
  STATS_RETENTION_DAYS,
} from "@/lib/server/stats";

// N3：来源审计——匿名聚合统计
describe("N3 聚合统计（内存版）", () => {
  const at = (iso: string) => () => Date.parse(iso);
  const T = "2026-09-16T02:00:00Z";

  it("分别累加调用数 / 系统 Key / 用户 Key / 失败数", async () => {
    const g = createStatsGuard({ now: at(T) });
    await g.record({ keyType: "system", ok: true, deviceId: "d1" });
    await g.record({ keyType: "user", ok: true });
    await g.record({ keyType: "system", ok: false });

    const s = await g.getDaily("2026-09-16");
    expect(s.calls).toBe(3);
    expect(s.systemKey).toBe(2);
    expect(s.userKey).toBe(1);
    expect(s.failures).toBe(1);
  });

  it("去重设备数：同一 deviceId 多次只算一个", async () => {
    const g = createStatsGuard({ now: at(T) });
    await g.record({ keyType: "system", ok: true, deviceId: "same" });
    await g.record({ keyType: "system", ok: true, deviceId: "same" });
    await g.record({ keyType: "system", ok: true, deviceId: "other" });
    expect((await g.getDaily("2026-09-16")).distinctDevices).toBe(2);
  });

  it("无 deviceId 的调用计入调用数、不计入设备数（用户 Key 路径不带设备标识）", async () => {
    const g = createStatsGuard({ now: at(T) });
    await g.record({ keyType: "user", ok: true });
    const s = await g.getDaily("2026-09-16");
    expect(s.calls).toBe(1);
    expect(s.distinctDevices).toBe(0);
  });

  it("按上海自然日分区：UTC 16:00 是上海次日 0 点", async () => {
    const before = createStatsGuard({ now: at("2026-09-16T15:59:59Z") });
    const after = createStatsGuard({ now: at("2026-09-16T16:00:00Z") });
    await before.record({ keyType: "system", ok: true });
    await after.record({ keyType: "system", ok: true });

    expect((await before.getDaily("2026-09-16")).calls).toBe(1);
    expect((await before.getDaily("2026-09-17")).calls).toBe(0);
    expect((await after.getDaily("2026-09-17")).calls).toBe(1);
  });

  it("未记录的日期返回全 0，而不是报错", async () => {
    const g = createStatsGuard();
    expect(await g.getDaily("1999-01-01")).toEqual({
      date: "1999-01-01",
      calls: 0,
      systemKey: 0,
      userKey: 0,
      failures: 0,
      distinctDevices: 0,
    });
  });

  it("getDaily 不泄漏内部设备集合（只回数字）", async () => {
    const g = createStatsGuard({ now: at(T) });
    await g.record({ keyType: "system", ok: true, deviceId: "secret-device-id" });
    expect(JSON.stringify(await g.getDaily("2026-09-16"))).not.toContain(
      "secret-device-id",
    );
  });

  it("shanghaiDateKey 按 UTC+8 换算", () => {
    expect(shanghaiDateKey(Date.parse("2026-09-16T15:59:59Z"))).toBe(
      "2026-09-16",
    );
    expect(shanghaiDateKey(Date.parse("2026-09-16T16:00:00Z"))).toBe(
      "2026-09-17",
    );
  });

  it("保留期为 30 天", () => {
    expect(STATS_RETENTION_DAYS).toBe(30);
  });
});
