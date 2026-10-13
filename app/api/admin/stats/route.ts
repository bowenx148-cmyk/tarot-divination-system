import { NextRequest, NextResponse } from "next/server";
import { getStatsGuard, shanghaiDateKey } from "@/lib/server/stats";

// 来源审计统计接口（运维台账 N3，已上线）
//
// GET /api/admin/stats?days=7 —— 查询最近 N 天（默认 7，上限 30）的匿名聚合计数
// 认证：Authorization: Bearer <ADMIN_TOKEN>（与 /api/admin/quota 一致）
//
// 返回内容**只有聚合数字**：调用总数 / 系统 Key 次数 / 用户 Key 次数 /
// 失败次数 / 去重设备数。不含 IP、不含单次明细、不含问题内容。

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
const DAY_MS = 86_400_000;

function authorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const raw = Number(req.nextUrl.searchParams.get("days") ?? DEFAULT_DAYS);
  const days = Number.isFinite(raw)
    ? Math.min(Math.max(Math.trunc(raw), 1), MAX_DAYS)
    : DEFAULT_DAYS;

  const guard = getStatsGuard();
  const now = Date.now();
  const stats = [];
  // 按日期倒序（今天在前）；上海无夏令时，直接按 24h 回推即可
  for (let i = 0; i < days; i += 1) {
    stats.push(await guard.getDaily(shanghaiDateKey(now - i * DAY_MS)));
  }

  return NextResponse.json({ days, stats });
}
