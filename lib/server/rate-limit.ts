// 限流模块（规格 R3，惰性清理见 R4）
//
// - 内存版：Map + 窗口 + 惰性清理（访问时判断过期删除；超过阈值时批量清理过期条目）
// - Redis 版：INCR + EXPIRE（滑动窗口，跨实例一致），经 lib/server/upstash.ts 的 ioredis 客户端执行
// - 工厂 getRateLimiter()：配置了 REDIS_HOST + REDIS_PASSWORD 返回 Redis 版，否则内存版

import { hasRedisConfig, redisCommand } from "./upstash";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface RateLimiter {
  readonly kind: "memory" | "redis";
  consume(key: string): Promise<RateLimitResult>;
  /** 仅内存版：当前条目数（测试用） */
  debugSize?(): number;
}

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 10_000;

/** 内存版：窗口计数 + 惰性清理（R4） */
export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const limit = opts.limit;
  const windowMs = opts.windowMs;
  const now = opts.now ?? Date.now;
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const entries = new Map<string, { count: number; resetTime: number }>();

  return {
    kind: "memory",
    async consume(key) {
      const nowMs = now();
      // 条目过多时批量清理过期条目，防止内存无限增长
      if (entries.size >= maxEntries) {
        for (const [k, v] of entries) {
          if (nowMs >= v.resetTime) entries.delete(k);
        }
      }
      const cached = entries.get(key);
      if (cached && nowMs < cached.resetTime) {
        cached.count++;
        return {
          allowed: cached.count <= limit,
          remaining: Math.max(0, limit - cached.count),
          resetTime: cached.resetTime,
        };
      }
      if (cached) {
        entries.delete(key); // 惰性清理过期条目
      }
      const resetTime = nowMs + windowMs;
      entries.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    },
    debugSize() {
      return entries.size;
    },
  };
}

/** Redis 版：INCR + EXPIRE 滑动窗口（跨实例一致） */
function createRedisRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const limit = opts.limit;
  const windowMs = opts.windowMs;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  return {
    kind: "redis",
    async consume(key) {
      const rlKey = `rl:${key}`;
      const [incr] = await redisCommand([
        ["INCR", rlKey],
        ["EXPIRE", rlKey, String(windowSec)],
      ]);
      const count = Number(incr?.result ?? 1);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetTime: Date.now() + windowMs,
      };
    },
  };
}

let cachedLimiter: RateLimiter | null = null;

/** 工厂（单例；force 用于测试重建） */
export function getRateLimiter(force = false): RateLimiter {
  if (cachedLimiter && !force) return cachedLimiter;
  const hasRedis = hasRedisConfig();
  cachedLimiter = hasRedis
    ? createRedisRateLimiter({ limit: 5, windowMs: 3 * 60 * 60 * 1000 })
    : createRateLimiter({ limit: 5, windowMs: 3 * 60 * 60 * 1000 });
  return cachedLimiter;
}
