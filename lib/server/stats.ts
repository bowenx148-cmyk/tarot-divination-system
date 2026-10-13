// 来源审计：匿名聚合统计（运维台账 N3，已上线）
//
// 设计约束（决策：仅聚合计数）：
// - **不记录**单次调用明细、不记录 IP、不记录问题内容；
// - 去重设备数用 Redis HyperLogLog（PFADD/PFCOUNT）估算——服务端不保存原始
//   deviceId，HLL 是固定大小的基数草图，无法从中还原出具体设备；
// - 因此本模块的数据无法定位到任何个人，只是"今天被用了多少次"。
//
// 存储：Redis（跨实例 + 持久化），键按上海自然日分区并带 TTL（保留 30 天）；
// 未配置 Redis 时回退内存（单实例，开发用）。
//
// 重要：统计是**非关键路径**——record() 内部吞掉所有异常，统计失败绝不能
// 影响用户的占卜请求。

import { hasRedisConfig, redisCommand } from "./upstash";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
/** 聚合数据保留天数（Redis 键 TTL） */
export const STATS_RETENTION_DAYS = 30;
const RETENTION_SEC = STATS_RETENTION_DAYS * 24 * 60 * 60;

export interface CallEvent {
  /** 本次调用用的是系统 Key 还是用户自带 Key */
  keyType: "system" | "user";
  /** 是否成功（上游返回非 200 记为失败） */
  ok: boolean;
  /** 设备标识；仅用于 HLL 估算去重设备数，不落库为可读值 */
  deviceId?: string;
}

export interface DailyStats {
  date: string;
  /** 当日调用总数 */
  calls: number;
  /** 其中使用系统 Key 的次数 */
  systemKey: number;
  /** 其中使用用户自带 Key 的次数 */
  userKey: number;
  /** 上游失败的次数 */
  failures: number;
  /** 去重设备数（HLL 估算，误差约 0.81%） */
  distinctDevices: number;
}

export interface StatsGuard {
  readonly kind: "memory" | "redis";
  record(event: CallEvent): Promise<void>;
  getDaily(dateKey: string): Promise<DailyStats>;
}

/** 上海时区（UTC+8，无夏令时）当天日期 key：YYYY-MM-DD */
export function shanghaiDateKey(nowMs: number): string {
  return new Date(nowMs + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

function emptyStats(date: string): DailyStats {
  return {
    date,
    calls: 0,
    systemKey: 0,
    userKey: 0,
    failures: 0,
    distinctDevices: 0,
  };
}

/** 内存版（单实例，开发/回退） */
export function createStatsGuard(
  opts: { now?: () => number } = {},
): StatsGuard {
  const now = opts.now ?? Date.now;
  const days = new Map<string, DailyStats & { devices: Set<string> }>();

  const bucket = (date: string) => {
    let b = days.get(date);
    if (!b) {
      b = { ...emptyStats(date), devices: new Set<string>() };
      days.set(date, b);
    }
    return b;
  };

  return {
    kind: "memory",
    async record(event) {
      const b = bucket(shanghaiDateKey(now()));
      b.calls += 1;
      if (event.keyType === "system") b.systemKey += 1;
      else b.userKey += 1;
      if (!event.ok) b.failures += 1;
      if (event.deviceId) b.devices.add(event.deviceId);
    },
    async getDaily(dateKey) {
      const b = days.get(dateKey);
      if (!b) return emptyStats(dateKey);
      const { devices, ...rest } = b;
      return { ...rest, distinctDevices: devices.size };
    },
  };
}

const k = (dateKey: string, field: string) => `stats:${dateKey}:${field}`;

/** Redis 版（跨实例 + 持久化） */
function createRedisStatsGuard(now: () => number): StatsGuard {
  return {
    kind: "redis",
    async record(event) {
      const date = shanghaiDateKey(now());
      const counters: unknown[][] = [["INCR", k(date, "calls")]];
      if (event.keyType === "system") {
        counters.push(["INCR", k(date, "syskey")]);
      } else {
        counters.push(["INCR", k(date, "userkey")]);
      }
      if (!event.ok) {
        counters.push(["INCR", k(date, "fail")]);
      }
      if (event.deviceId) {
        // HyperLogLog：只累积基数草图，不保存原始 deviceId
        counters.push(["PFADD", k(date, "devices"), event.deviceId]);
      }
      // 为本次触及的键续期，保证聚合数据到期自动清理。
      // 注意：必须构造新数组，不可边遍历 counters 边 push（会无限循环）。
      const expiries = counters.map((cmd) => [
        "EXPIRE",
        String(cmd[1]),
        String(RETENTION_SEC),
      ]);
      await redisCommand([...counters, ...expiries]);
    },
    async getDaily(dateKey) {
      const [mget, pfcount] = await redisCommand([
        [
          "MGET",
          k(dateKey, "calls"),
          k(dateKey, "syskey"),
          k(dateKey, "userkey"),
          k(dateKey, "fail"),
        ],
        ["PFCOUNT", k(dateKey, "devices")],
      ]);
      const values = Array.isArray(mget?.result)
        ? (mget.result as (string | null)[])
        : [];
      const num = (v: unknown) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? n : 0;
      };
      const distinct = num(pfcount?.result);
      return {
        date: dateKey,
        calls: num(values[0]),
        systemKey: num(values[1]),
        userKey: num(values[2]),
        failures: num(values[3]),
        distinctDevices: distinct,
      };
    },
  };
}

let cachedGuard: StatsGuard | null = null;

/** 工厂（单例；force 用于测试重建） */
export function getStatsGuard(force = false): StatsGuard {
  if (cachedGuard && !force) return cachedGuard;
  cachedGuard = hasRedisConfig()
    ? createRedisStatsGuard(Date.now)
    : createStatsGuard();
  return cachedGuard;
}

/**
 * 安全记录一次调用：统计属非关键路径，任何异常都不得影响占卜请求。
 * 调用方无需 try/catch，也无需 await 后再处理失败。
 */
export async function recordCallSafely(event: CallEvent): Promise<void> {
  try {
    await getStatsGuard().record(event);
  } catch (error) {
    console.error("统计记录失败（已忽略，不影响请求）:", error);
  }
}
