import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock('@/lib/server/trial-ledger', () => ({ trialStatus: () => false }));
vi.mock('@/lib/server/user-memory', () => ({ userMemory: () => null }));

const { trialGuardMock } = vi.hoisted(() => ({
  trialGuardMock: {
    kind: "memory",
    check: vi.fn(),
    markUsed: vi.fn(),
  },
}));

vi.mock("@/lib/server/trial", () => ({ getTrialGuard: () => trialGuardMock }));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/trial-status/route";

function makeRequest(
  headers: Record<string, string> = {},
  url = "http://localhost/api/trial-status",
): NextRequest {
  return new NextRequest(url, { method: "GET", headers });
}

describe("R3 GET /api/trial-status 试用状态查询", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未试用 → trialUsed:false, remaining:1", async () => {
    trialGuardMock.check.mockResolvedValue({ allowed: true, trialUsed: false });
    const res = await GET(makeRequest({ "X-Device-Id": "dev-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trialUsed: false, remaining: 1 });
    expect(trialGuardMock.check).toHaveBeenCalledWith("dev-1");
  });

  it("已试用 → trialUsed:true, remaining:0", async () => {
    trialGuardMock.check.mockResolvedValue({ allowed: false, trialUsed: true });
    const res = await GET(makeRequest({ "X-Device-Id": "dev-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trialUsed: true, remaining: 0 });
  });

  it("缺设备标识 → 400，不调用 check", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("无 header 时支持 deviceId 查询参数", async () => {
    trialGuardMock.check.mockResolvedValue({ allowed: false, trialUsed: true });
    const res = await GET(
      makeRequest({}, "http://localhost/api/trial-status?deviceId=dev-2"),
    );
    expect(res.status).toBe(200);
    expect(trialGuardMock.check).toHaveBeenCalledWith("dev-2");
  });
});
