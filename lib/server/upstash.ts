// 腾讯云 Redis 客户端（ioredis）。用于限流与试用的跨实例共享存储；未配置时上层回退内存实现。
//
// 环境变量（腾讯云 Redis 控制台「内网访问」信息）：
// - REDIS_HOST：内网地址，如 xxx.redis.tencentclouddb.com
// - REDIS_PORT：端口，默认 6379
// - REDIS_PASSWORD：访问密码

import Redis from "ioredis";

export interface RedisCommandResult {
  result: unknown;
  error?: unknown;
}

/** 是否存在可用的 Redis 配置（腾讯云 Redis） */
export function hasRedisConfig(): boolean {
  return Boolean(process.env.REDIS_HOST && process.env.REDIS_PASSWORD);
}

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT ?? "6379"),
      password: process.env.REDIS_PASSWORD,
    });
    // 避免连接错误冒泡导致进程退出；命令失败由 redisCommand 捕获
    client.on("error", () => {});
  }
  return client;
}

export async function redisCommand(
  commands: unknown[][],
): Promise<RedisCommandResult[]> {
  if (commands.length === 0) {
    return [];
  }

  const redis = getClient();

  // 单命令直接执行；多命令走 pipeline（语义与旧 Upstash REST /pipeline 一致）
  if (commands.length === 1) {
    const [cmd, ...args] = commands[0];
    try {
      const result = await redis.call(
        cmd as string,
        ...(args as (string | number | Buffer)[]),
      );
      return [{ result }];
    } catch (error) {
      return [{ result: undefined, error }];
    }
  }

  const pipeline = redis.pipeline();
  for (const [cmd, ...args] of commands) {
    pipeline.call(cmd as string, ...(args as (string | number | Buffer)[]));
  }
  const results = await pipeline.exec();
  return (results ?? []).map(([error, result]) => ({
    result,
    error: error ?? undefined,
  }));
}
