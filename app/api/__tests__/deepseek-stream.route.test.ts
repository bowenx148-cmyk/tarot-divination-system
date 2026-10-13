import { beforeEach, describe, expect, it, vi } from "vitest";
const settingsMock = vi.hoisted(() => vi.fn(() => ({ openaiConfigured: true, deepseekConfigured: true })));
vi.mock('@/lib/server/developer', () => ({ publicSettings: settingsMock }));
vi.mock('@/lib/server/trial-ledger', () => ({ reserveTrial: () => ({ token: 'test-reservation' }), finishTrial: vi.fn() }));
vi.mock('@/lib/server/user-memory', () => ({ userMemory: () => null }));

const {
  trialGuardMock,
  rateLimiterMock,
  resolveApiKeyMock,
  chatCompletionMock,
  quotaGuardMock,
} = vi.hoisted(() => ({
  trialGuardMock: {
    kind: "memory",
    check: vi.fn(),
    markUsed: vi.fn(),
  },
  rateLimiterMock: { kind: "memory", consume: vi.fn() },
  resolveApiKeyMock: vi.fn(),
  chatCompletionMock: vi.fn(),
  quotaGuardMock: {
    kind: "memory",
    getStatus: vi.fn(),
    setEnabled: vi.fn(),
    consume: vi.fn(),
    increment: vi.fn(),
  },
}));

vi.mock("@/lib/server/trial", () => ({ getTrialGuard: () => trialGuardMock }));
vi.mock("@/lib/server/rate-limit", () => ({
  getRateLimiter: () => rateLimiterMock,
}));
vi.mock("@/lib/server/quota", () => ({ getQuotaGuard: () => quotaGuardMock }));
vi.mock("@/lib/server/deepseek", () => ({
  NeedApiKeyError: class NeedApiKeyError extends Error {
    name = "NeedApiKeyError";
  },
  resolveApiKey: resolveApiKeyMock,
  chatCompletion: chatCompletionMock,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/deepseek-stream/route";
import { NeedApiKeyError } from "@/lib/server/deepseek";

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost/api/deepseek-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

const deepseekChunks = [
  'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"世界"}}]}\n\n',
  "data: [DONE]\n\n",
];

describe("R3 /api/deepseek-stream 试用 + 限流 + 流式", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMock.mockReturnValue({ openaiConfigured: true, deepseekConfigured: true });
    trialGuardMock.check.mockResolvedValue({ allowed: true, trialUsed: false });
    trialGuardMock.markUsed.mockResolvedValue(undefined);
    rateLimiterMock.consume.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetTime: 0,
    });
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: true,
      count: 0,
      limit: 50,
    });
    quotaGuardMock.increment.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 50,
    });
  });
  it('没有个人密钥时使用已配置的 DeepSeek；个人 OpenAI 密钥不改变服务', async () => {
    settingsMock.mockReturnValue({ openaiConfigured: false, deepseekConfigured: true });
    resolveApiKeyMock.mockReturnValue({ apiKey: 'sk-system', usingSystemKey: true });
    chatCompletionMock.mockImplementation(async () => sseResponse(deepseekChunks));
    const system = await POST(makeRequest({ prompt: 'p', model: 'gpt-5.4-mini' }, { 'x-device-id': 'test-device' }));
    expect(await system.text()).toContain('"type":"complete"');
    expect(chatCompletionMock).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'deepseek-flash' }));
    resolveApiKeyMock.mockReturnValue({ apiKey: 'sk-personal', usingSystemKey: false });
    const personal = await POST(makeRequest({ prompt: 'p', model: 'gpt-5.4-mini', userApiKey: 'sk-personal' }));
    await personal.text();
    expect(chatCompletionMock).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gpt-5.4-mini' }));
  });
  it.each([
    ['连接提前结束', deepseekChunks.slice(0, 1)],
    ['输出达到长度限制', [...deepseekChunks.slice(0, 1), 'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n', 'data: [DONE]\n\n']],
  ])('%s 时返回错误，不能把部分内容保存为完整回答', async (_, chunks) => {
    resolveApiKeyMock.mockReturnValue({ apiKey: 'sk-user', usingSystemKey: false });
    chatCompletionMock.mockResolvedValue(sseResponse(chunks));
    const res = await POST(makeRequest({ prompt: 'p', userApiKey: 'sk-user' }));
    const body = await res.text();
    expect(body).toContain('"type":"error"');
    expect(body).not.toContain('"type":"complete"');
  });
  it('过长请求在调用上游和解析Key前被拒绝', async () => {
    const res = await POST(makeRequest({ prompt: 'x'.repeat(40001) }));
    expect(res.status).toBe(400);
    expect(resolveApiKeyMock).not.toHaveBeenCalled();
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("系统 key 未配置 → 400 needApiKey", async () => {
    resolveApiKeyMock.mockImplementation(() => {
      throw new NeedApiKeyError("API密钥未配置");
    });
    const res = await POST(makeRequest({ prompt: "p" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.needApiKey).toBe(true);
  });

  it("用系统 key 但缺 X-Device-Id → 400", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    const res = await POST(makeRequest({ prompt: "p" }));
    expect(res.status).toBe(400);
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("试用已用完 → 429 trial_used + needApiKey", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    trialGuardMock.check.mockResolvedValue({ allowed: false, trialUsed: true });
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("trial_used");
    expect(body.needApiKey).toBe(true);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("用户自带 key 跳过试用检查（即使已试用也放行）", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-user", usingSystemKey: false });
    trialGuardMock.check.mockResolvedValue({ allowed: false, trialUsed: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p", userApiKey: "sk-user" }),
    );
    expect(res.status).toBe(200);
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("IP 限流命中 → 429（系统 key 且生产环境）", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    rateLimiterMock.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: 0,
    });
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("调用次数已达上限");
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("每日熔断：配额已满 → 429 quota_exhausted", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: true,
      count: 50,
      limit: 50,
    });
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("quota_exhausted");
    expect(chatCompletionMock).not.toHaveBeenCalled();
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("熔断关闭时：跳过配额检查，正常放行", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: false,
      count: 99,
      limit: 50,
    });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(200);
  });

  it("成功调用后：配额计数 increment 被调用", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    await POST(makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }));
    expect(quotaGuardMock.increment).toHaveBeenCalled();
  });

  it("DeepSeek 上游错误（500）→ 不标记试用、不计配额", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(new Response("err", { status: 500 }));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(500);
    expect(trialGuardMock.markUsed).not.toHaveBeenCalled();
    expect(quotaGuardMock.increment).not.toHaveBeenCalled();
  });

  it("成功流式转发：标记试用 + content/meta/complete 帧 + meta.trialUsed", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(trialGuardMock.markUsed).toHaveBeenCalledWith("dev-1");

    const text = await res.text();
    expect(text).toContain('"type":"content","content":"你好"');
    expect(text).toContain('"type":"content","content":"世界"');
    expect(text).toContain('"type":"meta"');
    expect(text).toContain('"trialUsed":true');
    // 试用已标记 → 剩余次数为 0（不再硬编码 5）
    expect(text).toContain('"remainingCalls":0');
    expect(text).toContain('"type":"complete"');
  });

  it("O5 Content-Type 以 text/event-stream 开头（SSE 规范）", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type") ?? "";
    expect(ct.startsWith("text/event-stream")).toBe(true);
    expect(ct).toContain("charset=utf-8");
  });

  it("O5 事件帧为 data: {json}\n\n 格式（meta → content* → complete）", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    const text = await res.text();
    const frames = text
      .split("\n\n")
      .map((f) => f.trim())
      .filter(Boolean);
    // 首帧 meta，中间 content 帧，末帧 complete
    expect(frames[0]).toMatch(/^data: {"type":"meta"/);
    expect(frames.some((f) => f === 'data: {"type":"content","content":"你好"}')).toBe(true);
    expect(frames.some((f) => f === 'data: {"type":"content","content":"世界"}')).toBe(true);
    expect(frames[frames.length - 1]).toBe('data: {"type":"complete"}');
  });
  it("异常模型和非字符串 Key 在调用上游前被拒绝", async () => {
    for (const invalid of [{ model: "invalid" }, { userApiKey: {} }]) {
      const res = await POST(makeRequest({ prompt: "p", ...invalid }));
      expect(res.status).toBe(400);
    }
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("用户选择的模型进入上游请求", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-user", usingSystemKey: false });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(makeRequest({ prompt: "p", userApiKey: "sk-user", model: "gpt-5.4" }));
    await res.text();
    expect(chatCompletionMock).toHaveBeenCalledWith({ prompt: "p", apiKey: "sk-user", stream: true, model: "gpt-5.4" });
  });

  it.each([
    [401, "invalid_api_key", "无效"],
    [402, "insufficient_balance", "余额不足"],
    [429, "insufficient_quota", "额度不足"],
    [429, "rate_limit_exceeded", "过于频繁"],
    [403, "permission_denied", "模型"],
  ])("上游 %s 显示清晰提示且不泄漏原始响应", async (status, code, message) => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-user", usingSystemKey: false });
    chatCompletionMock.mockResolvedValue(Response.json({ error: { code, message: "secret-upstream" } }, { status }));
    const res = await POST(makeRequest({ prompt: "p", userApiKey: "sk-user" }));
    expect(res.status).toBe(status);
    const body = await res.text();
    expect(body).toContain(message);
    expect(body).not.toContain("secret-upstream");
    expect(trialGuardMock.markUsed).not.toHaveBeenCalled();
  });

});
