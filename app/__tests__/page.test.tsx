import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import {
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from "@/lib/apiKeyCrypto";

const { routerPushMock, trialStatusMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  // 服务端试用状态（fetch mock 按需读取；默认与 beforeEach 的 store 初始一致）
  trialStatusMock: { trialUsed: true, remaining: 0 },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

import Home from "@/app/page";

describe("首页：免费试用用完时的弹窗引导", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useTarotStore.setState({
      trialUsed: true,
      apiKey: "",
      encryptedApiKey: null,
      question: "",
      recommendedSpread: null,
      drawnCards: [],
      cardReversals: [],
    });
    trialStatusMock.trialUsed = true; // 默认：服务端已用过（与 store 初始一致）
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/trial-status")) {
        return Promise.resolve(
          new Response(JSON.stringify(trialStatusMock), {
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ questions: ["测试问题一"] }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;
  });

  it("试用已用完且未填个人 Key → 提交时弹出 API 设置并提示，不跳转", async () => {
    render(<Home />);
    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByLabelText("你的问题");
    fireEvent.change(input, { target: { value: "我的测试问题" } });
    fireEvent.click(screen.getByText("开始占卜"));

    expect(screen.getByText(/免费试用次数已用完/)).toBeInTheDocument();
    expect(screen.getByText("API 设置")).toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("试用已用完但已通过加密存储恢复个人 Key → 不弹窗", async () => {
    const b64 = await generateSessionKey();
    const key = await importSessionKey(b64);
    const encrypted = await encryptApiKey("sk-personal", key);
    sessionStorage.setItem("tarot-session-key", b64);
    useTarotStore.setState({
      encryptedApiKey: encrypted,
      apiKey: "",
      trialUsed: true,
    });

    render(<Home />);
    // 等待 useEffect 的 initApiKeyFromStorage 恢复 Key
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    fireEvent.change(screen.getByLabelText("你的问题"), {
      target: { value: "我的测试问题" },
    });
    fireEvent.click(screen.getByText("开始占卜"));

    expect(screen.queryByText(/免费试用次数已用完/)).toBeNull();
  });

  it("本地缓存已用完但服务端未试用 → 加载时校正为可用", async () => {
    trialStatusMock.trialUsed = false;
    useTarotStore.setState({
      trialUsed: true, // 模拟过期缓存：上次刷新时已用完
      apiKey: "",
      encryptedApiKey: null,
    });

    render(<Home />);
    // 等待 useEffect 的 fetchTrialStatus 完成
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // 服务端为权威 → 本地缓存被校正为未试用
    expect(useTarotStore.getState().trialUsed).toBe(false);
  });
});

describe("G17 首页：去掉假等待 + 问题回填", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    // 试用可用 → 提交不被 API 设置闸门拦下
    useTarotStore.setState({
      trialUsed: false,
      apiKey: "",
      encryptedApiKey: null,
      question: "",
      recommendedSpread: null,
      drawnCards: [],
      cardReversals: [],
    });
    trialStatusMock.trialUsed = false;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/trial-status")) {
        return Promise.resolve(
          new Response(JSON.stringify(trialStatusMock), {
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ questions: ["测试问题一"] }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;
  });

  it("C1 提交后同步初始化牌阵并直接跳转 /draw/select", async () => {
    render(<Home />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("你的问题"), {
      target: { value: "我的测试问题" },
    });
    fireEvent.click(screen.getByText("开始占卜"));

    // 同步跳转：不推进任何计时器
    expect(routerPushMock).toHaveBeenCalledWith("/draw/select");
  });

  it("C2 store 中已有问题时，输入框回填该问题（返回首页不必重输）", async () => {
    useTarotStore.setState({ question: "之前问过的问题" });
    render(<Home />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByLabelText("你的问题")).toHaveValue("之前问过的问题");
  });
});
