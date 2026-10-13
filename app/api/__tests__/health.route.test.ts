import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    hasRedisConfig: vi.fn(),
    redisCommand: vi.fn(),
  },
}));

vi.mock("@/lib/server/upstash", () => ({
  hasRedisConfig: redisMock.hasRedisConfig,
  redisCommand: redisMock.redisCommand,
}));

import { GET } from "@/app/api/health/route";

// N2：健康检查端点（供 UptimeRobot 等外部监控探测）
describe("N2 GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未配置 Redis → 200 ok（回退内存是既定降级行为，不算不健康）", async () => {
    redisMock.hasRedisConfig.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks.redis).toBe("not-configured");
    expect(redisMock.redisCommand).not.toHaveBeenCalled();
  });

  it("Redis 正常 → 200 ok", async () => {
    redisMock.hasRedisConfig.mockReturnValue(true);
    redisMock.redisCommand.mockResolvedValue([{ result: "PONG" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks.redis).toBe("ok");
  });

  it("Redis 配置了但 PING 失败 → 503 degraded", async () => {
    redisMock.hasRedisConfig.mockReturnValue(true);
    redisMock.redisCommand.mockResolvedValue([
      { result: undefined, error: new Error("ECONNREFUSED") },
    ]);
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.redis).toBe("fail");
  });

  it("Redis 命令层抛异常 → 仍是干净的 503，不是 500", async () => {
    redisMock.hasRedisConfig.mockReturnValue(true);
    redisMock.redisCommand.mockRejectedValue(new Error("client init failed"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).checks.redis).toBe("fail");
  });

  it("返回运行时长供人工排查", async () => {
    redisMock.hasRedisConfig.mockReturnValue(false);
    const body = await (await GET()).json();
    expect(typeof body.uptime).toBe("number");
  });
});
