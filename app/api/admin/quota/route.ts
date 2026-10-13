import { NextRequest, NextResponse } from "next/server";
import { getQuotaGuard } from "@/lib/server/quota";

// 配额熔断管理接口（规格 G5）
// - GET  查询开关与当天计数
// - POST 切换开关 { enabled: boolean }
// 认证：Authorization: Bearer <ADMIN_TOKEN>

function authorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const status = await getQuotaGuard().getStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await req.json();
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled 必须为布尔值" },
      { status: 400 },
    );
  }
  await getQuotaGuard().setEnabled(body.enabled);
  const status = await getQuotaGuard().getStatus();
  return NextResponse.json(status);
}
