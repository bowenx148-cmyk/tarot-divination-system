import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { statsMock } = vi.hoisted(() => ({
  statsMock: { kind: "memory", record: vi.fn(), getDaily: vi.fn() },
}));

// 只替换工厂，保留 shanghaiDateKey 等真实实现（路由要用）
vi.mock("@/lib/server/stats", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/stats")>();
  return { ...actual, getStatsGuard: () => statsMock };
});

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/stats/route";

const TOKEN = "test-admin-token";

function makeRequest(qs = "", token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest(`http://localhost/api/admin/stats${qs}`, {
    method: "GET",
    headers,
  });
}

describe("N3 GET /api/admin/stats 来源审计统计", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // 2026-09-16T02:00:00Z = 上海 2026-09-16 10:00
    vi.setSystemTime(new Date("2026-09-16T02:00:00Z"));
    process.env.ADMIN_TOKEN = TOKEN;
    statsMock.getDaily.mockImplementation(async (date: string) => ({
      date,
      calls: 0,
      systemKey: 0,
      userKey: 0,
      failures: 0,
      distinctDevices: 0,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("无 Authorization → 401，且不查询统计", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(statsMock.getDaily).not.toHaveBeenCalled();
  });

  it("错误 token → 401", async () => {
    const res = await GET(makeRequest("", "wrong-token"));
    expect(res.status).toBe(401);
  });

  it("未配置 ADMIN_TOKEN → 401（不允许空 token 放行）", async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await GET(makeRequest("", ""));
    expect(res.status).toBe(401);
  });

  it("正确 token → 200，默认返回 7 天", async () => {
    const res = await GET(makeRequest("", TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toBe(7);
    expect(body.stats).toHaveLength(7);
  });

  it("按日期倒序：第一条是今天（上海时区）", async () => {
    const body = await (await GET(makeRequest("?days=3", TOKEN))).json();
    expect(body.stats.map((s: { date: string }) => s.date)).toEqual([
      "2026-09-16",
      "2026-09-15",
      "2026-09-14",
    ]);
  });

  it("days 超过上限被截断为 30", async () => {
    const body = await (await GET(makeRequest("?days=999", TOKEN))).json();
    expect(body.days).toBe(30);
    expect(body.stats).toHaveLength(30);
  });

  it("days 为 0 或负数被兜底为 1", async () => {
    const body = await (await GET(makeRequest("?days=0", TOKEN))).json();
    expect(body.days).toBe(1);
  });

  it("days 非数字时回落默认值 7", async () => {
    const body = await (await GET(makeRequest("?days=abc", TOKEN))).json();
    expect(body.days).toBe(7);
  });
});
