import { describe, expect, it } from "vitest";
import { createQuotaGuard, getQuotaGuard } from "@/lib/server/quota";

const LIMIT = 50;

describe("quota 每日熔断模块", () => {
  it("默认开启：计数累加，未达阈值放行", async () => {
    const guard = createQuotaGuard({ limit: LIMIT });
    const r1 = await guard.consume();
    expect(r1.allowed).toBe(true);
    expect(r1.count).toBe(1);
    const r2 = await guard.consume();
    expect(r2.count).toBe(2);
  });

  it("达到阈值后熔断（第 50 次放行，第 51 次拒绝）", async () => {
    const guard = createQuotaGuard({ limit: LIMIT });
    let last = { allowed: true, count: 0, limit: LIMIT };
    for (let i = 0; i < LIMIT; i++) {
      last = await guard.consume();
    }
    expect(last.allowed).toBe(true);
    expect(last.count).toBe(LIMIT);
    const over = await guard.consume();
    expect(over.allowed).toBe(false);
    expect(over.count).toBe(LIMIT); // 熔断后不再计数
  });

  it("关闭开关：放行且不计数", async () => {
    const guard = createQuotaGuard({ limit: LIMIT });
    await guard.consume();
    await guard.setEnabled(false);
    const r = await guard.consume();
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1); // 关闭期间不计数
    expect((await guard.getStatus()).enabled).toBe(false);
  });

  it("重新开启后从关闭时刻的计数继续（不清零）", async () => {
    const guard = createQuotaGuard({ limit: LIMIT });
    await guard.consume(); // 1
    await guard.consume(); // 2
    await guard.setEnabled(false);
    await guard.consume(); // 关闭期间不计数
    await guard.setEnabled(true);
    const r = await guard.consume();
    expect(r.count).toBe(3); // 从 2 继续
    expect(r.allowed).toBe(true);
  });

  it("自然日重置：次日 0 点计数归零", async () => {
    let now = Date.UTC(2026, 7, 20, 16, 0, 0); // 2026-08-21 00:00 上海（UTC+8）
    const guard = createQuotaGuard({ limit: LIMIT, now: () => now });
    await guard.consume();
    expect((await guard.getStatus()).count).toBe(1);
    // 推进到次日 0 点（上海）：从 08-21 00:00 到 08-22 00:00 正好 24h
    now += 24 * 60 * 60 * 1000;
    expect((await guard.getStatus()).count).toBe(0);
  });

  it("工厂回退：无 REDIS_* → 内存版；有 → Redis 版", async () => {
    const originalHost = process.env.REDIS_HOST;
    const originalPassword = process.env.REDIS_PASSWORD;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PASSWORD;
    try {
      expect(getQuotaGuard(true).kind).toBe("memory");
    } finally {
      if (originalHost === undefined) delete process.env.REDIS_HOST;
      else process.env.REDIS_HOST = originalHost;
      if (originalPassword === undefined) delete process.env.REDIS_PASSWORD;
      else process.env.REDIS_PASSWORD = originalPassword;
    }
    process.env.REDIS_HOST = "127.0.0.1";
    process.env.REDIS_PASSWORD = "mock-password";
    try {
      expect(getQuotaGuard(true).kind).toBe("redis");
    } finally {
      if (originalHost === undefined) delete process.env.REDIS_HOST;
      else process.env.REDIS_HOST = originalHost;
      if (originalPassword === undefined) delete process.env.REDIS_PASSWORD;
      else process.env.REDIS_PASSWORD = originalPassword;
    }
  });
});
