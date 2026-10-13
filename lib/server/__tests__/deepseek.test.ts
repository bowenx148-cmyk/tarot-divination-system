import { describe, expect, it, vi } from "vitest";
vi.mock('@/lib/server/developer', () => ({ getSystemKey: () => '', getDeveloperSettings: () => ({ style: '' }) }));
import {
  chatCompletion,
  NeedApiKeyError,
  resolveApiKey,
} from "@/lib/server/deepseek";

describe("R3 deepseek 共享模块", () => {
  it('DeepSeek请求走独立官方接口与参数，系统Key不会跨提供商', async () => {
    const mock = vi.fn().mockResolvedValue(new Response('ok')); vi.stubGlobal('fetch', mock);
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-ds'); vi.stubEnv('OPENAI_API_KEY', 'sk-oa');
    try {
      expect(resolveApiKey(undefined, 'deepseek-flash').apiKey).toBe('sk-ds');
      await chatCompletion({ prompt: 'p', apiKey: 'sk-ds', model: 'deepseek-flash', stream: true });
      expect(mock.mock.calls[0][0]).toBe('https://api.deepseek.com/chat/completions');
      const body = JSON.parse(mock.mock.calls[0][1].body); expect(body.max_tokens).toBe(2500); expect(body.thinking).toEqual({ type: 'disabled' }); expect(body.max_completion_tokens).toBeUndefined(); expect(body.reasoning_effort).toBeUndefined();
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  it("resolveApiKey 优先用户 key", () => {
    const r = resolveApiKey("sk-user");
    expect(r).toEqual({ apiKey: "sk-user", usingSystemKey: false });
  });

  it("无用户 key 且无系统 key → 抛 NeedApiKeyError", () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      expect(() => resolveApiKey(undefined)).toThrow(NeedApiKeyError);
    } finally {
      if (original !== undefined) process.env.OPENAI_API_KEY = original;
    }
  });

  it("无用户 key 用系统 key", () => {
    const original = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-system";
    try {
      const r = resolveApiKey(undefined);
      expect(r).toEqual({ apiKey: "sk-system", usingSystemKey: true });
    } finally {
      if (original === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = original;
    }
  });

  it("chatCompletion 转发参数（URL/method/headers/body/stream）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await chatCompletion({ prompt: "你好", apiKey: "sk-x", stream: true });
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer sk-x");
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("gpt-5.4-mini");
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('不能断言他人的内心');
      expect(body.messages[1]).toEqual({ role: 'user', content: '你好' });
      expect(body.stream).toBe(true);
      expect(body.temperature).toBeUndefined();
      expect(body.reasoning_effort).toBe("none");
      expect(body.max_completion_tokens).toBe(2500);
      expect(body.max_tokens).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("所选 GPT 模型被转发，接口固定在官方地址", async () => {
    vi.stubEnv("OPENAI_API_URL", "https://untrusted.example/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await chatCompletion({ prompt: "p", apiKey: "sk-x", model: "gpt-5.4" });
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("gpt-5.4");
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });

  it("不会将旧 DeepSeek 系统 Key 发送到 OpenAI", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-old");
    try { expect(() => resolveApiKey()).toThrow(NeedApiKeyError); }
    finally { vi.unstubAllEnvs(); }
  });

  it("清除个人 Key 两端空白", () => {
    expect(resolveApiKey("  sk-personal  ").apiKey).toBe("sk-personal");
  });
});
