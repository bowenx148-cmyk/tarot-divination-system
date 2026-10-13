import { afterEach, describe, expect, it, vi } from "vitest";
import { generateTarotReadingStream } from "@/lib/deepseek";

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI 浏览器流式请求", () => {
  it('流提前结束且缺少完成帧时报告错误，不调用完成回调', async () => {
    const callbacks = { onContent: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('data: {"type":"content","content":"部分回答"}\n\n')));
    await generateTarotReadingStream('问题', [], callbacks);
    expect(callbacks.onContent).toHaveBeenCalledWith('部分回答');
    expect(callbacks.onError).toHaveBeenCalled();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });
  it("转发 Key 和模型，并接受流式内容", async () => {
    const callbacks = { onContent: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: {"type":"content","content":"解读"}\n\ndata: {"type":"complete"}\n\n'));
    vi.stubGlobal("fetch", fetchMock);
    await generateTarotReadingStream("问题", [], callbacks, "sk-user", [], "gpt-5.4");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ userApiKey: "sk-user", model: "gpt-5.4" });
    expect(callbacks.onContent).toHaveBeenCalledWith("解读");
    expect(callbacks.onComplete).toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it.each([
    [400, { needApiKey: true, message: "请填写 OpenAI API Key" }, "API_KEY_NEEDED:请填写 OpenAI API Key"],
    [429, { message: "OpenAI API 额度不足" }, "OpenAI API 额度不足"],
  ])("HTTP %s 直接返回可操作提示，不抛控制台异常", async (status, body, message) => {
    const callbacks = { onContent: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
    const consoleSpy = vi.spyOn(console, "error");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status })));
    try {
      await generateTarotReadingStream("问题", [], callbacks);
      expect(callbacks.onError).toHaveBeenCalledWith(message);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally { consoleSpy.mockRestore(); }
  });
});
