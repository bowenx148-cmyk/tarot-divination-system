import { NextResponse } from "next/server";
import { hasRedisConfig, redisCommand } from "@/lib/server/upstash";

// 健康检查端点（运维台账 N2，已上线）
//
// 供 UptimeRobot 等外部监控探测。相比探测首页，它能回答"应用是否真的健康"：
// Redis 配了却连不上时返回 503，而首页此时仍会返回 200（降级为单实例内存），
// 纯页面探测发现不了这种"看起来正常、实际防滥用策略已失效"的状态。
//
// 注意：未配置 Redis 属既定的降级行为（回退单实例内存），不算不健康。
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  if (hasRedisConfig()) {
    try {
      const [res] = await redisCommand([["PING"]]);
      const pong = String(res?.result ?? "").toUpperCase() === "PONG";
      checks.redis = pong ? "ok" : "fail";
      if (!pong) healthy = false;
    } catch {
      // 连接层异常（如客户端初始化失败）也要给出干净 503，而非 500
      checks.redis = "fail";
      healthy = false;
    }
  } else {
    checks.redis = "not-configured";
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      uptime: Math.round(process.uptime()),
    },
    { status: healthy ? 200 : 503 },
  );
}
