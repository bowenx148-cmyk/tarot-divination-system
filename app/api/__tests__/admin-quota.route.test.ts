import { beforeEach, describe, expect, it, vi } from "vitest";

const { quotaGuardMock } = vi.hoisted(() => ({
  quotaGuardMock: {
    kind: "memory",
    getStatus: vi.fn(),
    setEnabled: vi.fn(),
  },
}));

vi.mock("@/lib/server/quota", () => ({ getQuotaGuard: () => quotaGuardMock }));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/quota/route";

const ADMIN_TOKEN = "test-admin-token";

function makeRequest(method: "GET" | "POST", body?: unknown, token?: string) {
  return new NextRequest("http://localhost/api/admin/quota", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("G5 /api/admin/quota 管理接口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_TOKEN = ADMIN_TOKEN;
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: true,
      count: 3,
      limit: 50,
    });
    quotaGuardMock.setEnabled.mockResolvedValue(undefined);
  });

  it("无 token → 401", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("错误 token → 401", async () => {
    const res = await GET(makeRequest("GET", undefined, "wrong-token"));
    expect(res.status).toBe(401);
  });

  it("GET 授权 → 返回配额状态", async () => {
    const res = await GET(makeRequest("GET", undefined, ADMIN_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: true, count: 3, limit: 50 });
  });

  it("POST 授权切换开关 → setEnabled 被调用", async () => {
    const res = await POST(makeRequest("POST", { enabled: false }, ADMIN_TOKEN));
    expect(res.status).toBe(200);
    expect(quotaGuardMock.setEnabled).toHaveBeenCalledWith(false);
    const body = await res.json();
    expect(body.enabled).toBe(true); // getStatus mock 返回 enabled:true
  });

  it("POST enabled 非布尔 → 400", async () => {
    const res = await POST(makeRequest("POST", { enabled: "yes" }, ADMIN_TOKEN));
    expect(res.status).toBe(400);
    expect(quotaGuardMock.setEnabled).not.toHaveBeenCalled();
  });
});
