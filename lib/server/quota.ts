// 每日熔断配额（规格 G5 / 用户需求 2026-08）
//
// - 系统 Key 每天（自然日，Asia/Shanghai 0 点起算）最多调用 N 次（默认 50，可配 QUOTA_DAILY_LIMIT）；
// - 超限后系统 Key 熔断（只允许用户自填 Key）；
// - 开关可关闭/开启：关闭期间不计数不熔断；重新开启后从关闭时刻的计数继续（不清零）；
// - Redis 跨实例 + 持久化（重启不清零）；未配置（REDIS_HOST/REDIS_PASSWORD）回退内存（单实例，开发用）。

import { hasRedisConfig, redisCommand } from "./upstash";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 50;

export interface QuotaStatus {
  enabled: boolean;
  count: number;
  limit: number;
}

export interface QuotaConsumeResult {
  allowed: boolean;
  count: number;
  limit: number;
}

export interface QuotaGuard {
  readonly kind: "memory" | "redis";
  getStatus(): Promise<QuotaStatus>;
  setEnabled(enabled: boolean): Promise<void>;
  /** 原子：检查 + 计数（未超限时 +1） */
  consume(): Promise<QuotaConsumeResult>;
  /** 无条件计数 +1（调用成功后使用） */
  increment(): Promise<QuotaConsumeResult>;
}

/** 上海时区（UTC+8，无夏令时）当天日期 key：YYYY-MM-DD */
function shanghaiDateKey(nowMs: number): string {
  return new Date(nowMs + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** 距上海当天 24:00 的秒数（Redis key 过期用） */
function secondsUntilShanghaiDayEnd(nowMs: number): number {
  const dayStartUtc =
    Math.floor((nowMs + SHANGHAI_OFFSET_MS) / 86_400_000) * 86_400_000 -
    SHANGHAI_OFFSET_MS;
  const dayEndUtc = dayStartUtc + 86_400_000;
  return Math.max(1, Math.ceil((dayEndUtc - nowMs) / 1000));
}

function resolveLimit(): number {
  const v = Number(process.env.QUOTA_DAILY_LIMIT ?? DEFAULT_LIMIT);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_LIMIT;
}

/** 内存版（单实例，开发/回退） */
export function createQuotaGuard(
  opts: { limit?: number; now?: () => number } = {},
): QuotaGuard {
  const limit = opts.limit ?? resolveLimit();
  const now = opts.now ?? Date.now;
  let enabled = true;
  const counts = new Map<string, number>(); // dateKey -> count

  const currentCount = () => counts.get(shanghaiDateKey(now())) ?? 0;

  return {
    kind: "memory",
    async getStatus() {
      return { enabled, count: currentCount(), limit };
    },
    async setEnabled(v) {
      enabled = v;
    },
    async consume() {
      if (!enabled) {
        // 关闭：放行且不计数
        return { allowed: true, count: currentCount(), limit };
      }
      const key = shanghaiDateKey(now());
      const count = counts.get(key) ?? 0;
      if (count >= limit) {
        return { allowed: false, count, limit };
      }
      const next = count + 1;
      counts.set(key, next);
      return { allowed: true, count: next, limit };
    },
    async increment() {
      const key = shanghaiDateKey(now());
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return { allowed: next <= limit, count: next, limit };
    },
  };
}

/** Redis 版（跨实例 + 持久化） */
function createRedisQuotaGuard(): QuotaGuard {
  const limit = resolveLimit();
  return {
    kind: "redis",
    async getStatus() {
      const nowMs = Date.now();
      const [enabledRes, countRes] = await redisCommand([
        ["GET", "quota:enabled"],
        ["GET", `quota:count:${shanghaiDateKey(nowMs)}`],
      ]);
      const enabled = (enabledRes?.result ?? "1") !== "0";
      const count = Number(countRes?.result ?? 0);
      return { enabled, count, limit };
    },
    async setEnabled(v) {
      await redisCommand([["SET", "quota:enabled", v ? "1" : "0"]]);
    },
    async consume() {
      const nowMs = Date.now();
      const [enabledRes] = await redisCommand([["GET", "quota:enabled"]]);
      const enabled = (enabledRes?.result ?? "1") !== "0";
      const key = `quota:count:${shanghaiDateKey(nowMs)}`;
      const [countRes] = await redisCommand([["GET", key]]);
      const count = Number(countRes?.result ?? 0);
      if (!enabled) {
        return { allowed: true, count, limit };
      }
      if (count >= limit) {
        return { allowed: false, count, limit };
      }
      const [incrRes] = await redisCommand([
        ["INCR", key],
        ["EXPIRE", key, String(secondsUntilShanghaiDayEnd(nowMs))],
      ]);
      const next = Number(incrRes?.result ?? count + 1);
      return { allowed: true, count: next, limit };
    },
    async increment() {
      const nowMs = Date.now();
      const key = `quota:count:${shanghaiDateKey(nowMs)}`;
      const [incrRes] = await redisCommand([
        ["INCR", key],
        ["EXPIRE", key, String(secondsUntilShanghaiDayEnd(nowMs))],
      ]);
      const next = Number(incrRes?.result ?? 1);
      return { allowed: next <= limit, count: next, limit };
    },
  };
}

let cachedGuard: QuotaGuard | null = null;

/** 工厂（单例；force 用于测试重建） */
export function getQuotaGuard(force = false): QuotaGuard {
  if (cachedGuard && !force) return cachedGuard;
  const hasRedis = hasRedisConfig();
  cachedGuard = hasRedis ? createRedisQuotaGuard() : createQuotaGuard();
  return cachedGuard;
}
