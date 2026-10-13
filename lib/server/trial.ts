// 免费试用模块（规格 R3 / 决策 D9）
//
// 无登录系统下"同一用户免费试用一次"的尽力而为方案：
// - 客户端 deviceId（localStorage）标识用户，服务端记录"已试用"；
// - Redis（生产）跨实例一致；未配置回退内存（单实例，诚实降级）；
// - 边界：清除 localStorage / 换浏览器 / 无痕可绕过（D9），IP 限流为辅助防线。

import { hasRedisConfig, redisCommand } from "./upstash";

export const TRIAL_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 天
const TRIAL_TTL_S = Math.floor(TRIAL_TTL_MS / 1000);

export interface TrialResult {
  allowed: boolean;
  trialUsed: boolean;
}

export interface TrialGuard {
  readonly kind: "memory" | "redis";
  check(deviceId: string): Promise<TrialResult>;
  markUsed(deviceId: string): Promise<void>;
}

/** 内存版：Map + TTL + 惰性清理（访问时判断过期并删除） */
export function createTrialGuard(
  opts: { ttlMs?: number; now?: () => number } = {},
): TrialGuard {
  const ttlMs = opts.ttlMs ?? TRIAL_TTL_MS;
  const now = opts.now ?? Date.now;
  const used = new Map<string, number>(); // deviceId -> expireAt

  return {
    kind: "memory",
    async check(deviceId) {
      const expireAt = used.get(deviceId);
      if (expireAt !== undefined) {
        if (now() < expireAt) {
          return { allowed: false, trialUsed: true };
        }
        used.delete(deviceId); // 惰性清理过期条目
      }
      return { allowed: true, trialUsed: false };
    },
    async markUsed(deviceId) {
      used.set(deviceId, now() + ttlMs);
    },
  };
}

/** Redis 版：trial:{deviceId} SETNX + EX（跨实例一致） */
function createRedisTrialGuard(): TrialGuard {
  return {
    kind: "redis",
    async check(deviceId) {
      const [res] = await redisCommand([["EXISTS", `trial:${deviceId}`]]);
      const exists = Number(res?.result ?? 0);
      return { allowed: exists === 0, trialUsed: exists === 1 };
    },
    async markUsed(deviceId) {
      await redisCommand([
        ["SET", `trial:${deviceId}`, "1", "EX", String(TRIAL_TTL_S)],
      ]);
    },
  };
}

let cachedGuard: TrialGuard | null = null;

/** 工厂（单例；force 用于测试重建） */
export function getTrialGuard(force = false): TrialGuard {
  if (cachedGuard && !force) return cachedGuard;
  const hasRedis = hasRedisConfig();
  cachedGuard = hasRedis ? createRedisTrialGuard() : createTrialGuard();
  return cachedGuard;
}
