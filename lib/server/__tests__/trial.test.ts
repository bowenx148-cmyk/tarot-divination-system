import { describe, expect, it } from "vitest";
import {
  createTrialGuard,
  getTrialGuard,
  TRIAL_TTL_MS,
} from "@/lib/server/trial";

describe("R3 trial 免费试用模块", () => {
  it("未试用放行并标记：check 允许 → markUsed → check 拒绝", async () => {
    const guard = createTrialGuard();
    expect(await guard.check("dev-a")).toEqual({
      allowed: true,
      trialUsed: false,
    });
    await guard.markUsed("dev-a");
    expect(await guard.check("dev-a")).toEqual({
      allowed: false,
      trialUsed: true,
    });
  });

  it("markUsed 幂等（重复标记不抛错）", async () => {
    const guard = createTrialGuard();
    await guard.markUsed("dev-a");
    await guard.markUsed("dev-a");
    expect(await guard.check("dev-a")).toEqual({
      allowed: false,
      trialUsed: true,
    });
  });

  it("不同设备相互独立", async () => {
    const guard = createTrialGuard();
    await guard.markUsed("dev-a");
    expect(await guard.check("dev-b")).toEqual({
      allowed: true,
      trialUsed: false,
    });
  });

  it("TTL 过期后可再试用（注入时钟，惰性清理）", async () => {
    let now = 1_000_000;
    const guard = createTrialGuard({ now: () => now });
    await guard.markUsed("dev-a");
    expect((await guard.check("dev-a")).allowed).toBe(false);
    now += TRIAL_TTL_MS + 1; // 推进超过 TTL
    expect((await guard.check("dev-a")).allowed).toBe(true);
    expect((await guard.check("dev-a")).trialUsed).toBe(false);
  });

  it("工厂回退：无 REDIS_* 环境变量 → 内存版", async () => {
    const originalHost = process.env.REDIS_HOST;
    const originalPassword = process.env.REDIS_PASSWORD;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PASSWORD;
    try {
      expect(getTrialGuard(true).kind).toBe("memory");
    } finally {
      if (originalHost) process.env.REDIS_HOST = originalHost;
      if (originalPassword) process.env.REDIS_PASSWORD = originalPassword;
    }
  });

  it("工厂：有 REDIS_* 环境变量 → Redis 版（不真实请求）", async () => {
    const originalHost = process.env.REDIS_HOST;
    const originalPassword = process.env.REDIS_PASSWORD;
    process.env.REDIS_HOST = "127.0.0.1";
    process.env.REDIS_PASSWORD = "mock-password";
    // 工厂是单例，先清除缓存以便按 env 重建
    try {
      expect(getTrialGuard(true).kind).toBe("redis");
    } finally {
      if (originalHost === undefined) delete process.env.REDIS_HOST;
      else process.env.REDIS_HOST = originalHost;
      if (originalPassword === undefined) delete process.env.REDIS_PASSWORD;
      else process.env.REDIS_PASSWORD = originalPassword;
    }
  });
});
