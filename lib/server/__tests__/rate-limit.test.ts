import { describe, expect, it } from "vitest";
import { createRateLimiter, getRateLimiter } from "@/lib/server/rate-limit";

const LIMIT = 5;
const WINDOW_MS = 3 * 60 * 60 * 1000; // 3 小时

describe("R3 rate-limit 限流模块（含 R4 惰性清理）", () => {
  it("窗口内第 5 次放行、第 6 次拒绝", async () => {
    const limiter = createRateLimiter({ limit: LIMIT, windowMs: WINDOW_MS });
    for (let i = 1; i <= 5; i++) {
      const r = await limiter.consume("key-a");
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(LIMIT - i);
    }
    const sixth = await limiter.consume("key-a");
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("窗口重置后恢复额度（注入假时钟）", async () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({
      limit: LIMIT,
      windowMs: WINDOW_MS,
      now: () => now,
    });
    for (let i = 0; i < LIMIT; i++) {
      await limiter.consume("key-a");
    }
    expect((await limiter.consume("key-a")).allowed).toBe(false);
    now += WINDOW_MS + 1;
    expect((await limiter.consume("key-a")).allowed).toBe(true);
  });

  it("不同 key 相互独立", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW_MS });
    await limiter.consume("key-a");
    await limiter.consume("key-a");
    expect((await limiter.consume("key-a")).allowed).toBe(false);
    expect((await limiter.consume("key-b")).allowed).toBe(true);
  });

  it("惰性清理：过期条目访问时被清除并重新计数（R4）", async () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({
      limit: LIMIT,
      windowMs: WINDOW_MS,
      now: () => now,
    });
    await limiter.consume("key-a");
    const sizeBefore = limiter.debugSize?.() ?? 0;
    expect(sizeBefore).toBe(1);
    now += WINDOW_MS + 1;
    await limiter.consume("key-a"); // 过期 → 旧条目被清除，按新窗口计数
    expect(limiter.debugSize?.()).toBe(1);
    expect((await limiter.consume("key-a")).remaining).toBe(LIMIT - 2);
  });

  it("工厂回退：无 REDIS_* → 内存版；有 → Redis 版", async () => {
    const originalHost = process.env.REDIS_HOST;
    const originalPassword = process.env.REDIS_PASSWORD;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PASSWORD;
    try {
      expect(getRateLimiter(true).kind).toBe("memory");
    } finally {
      if (originalHost === undefined) delete process.env.REDIS_HOST;
      else process.env.REDIS_HOST = originalHost;
      if (originalPassword === undefined) delete process.env.REDIS_PASSWORD;
      else process.env.REDIS_PASSWORD = originalPassword;
    }
    process.env.REDIS_HOST = "127.0.0.1";
    process.env.REDIS_PASSWORD = "mock-password";
    try {
      expect(getRateLimiter(true).kind).toBe("redis");
    } finally {
      if (originalHost === undefined) delete process.env.REDIS_HOST;
      else process.env.REDIS_HOST = originalHost;
      if (originalPassword === undefined) delete process.env.REDIS_PASSWORD;
      else process.env.REDIS_PASSWORD = originalPassword;
    }
  });
});
