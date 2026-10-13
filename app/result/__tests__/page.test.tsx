import { describe, expect, it, vi } from "vitest";
import { render, screen, act, waitFor, fireEvent, within } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";

const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/deepseek", () => ({
  generateTarotReadingStream: streamMock,
}));

import ResultPage from "@/app/result/page";

function setupStore() {
  useTarotStore.setState({
    question: "测试问题",
    recommendedSpread: {
      id: "single-card",
      name: "单张牌指引",
      description: "最简单直接的指引",
      cardCount: 1,
      positions: ["核心指引"],
      category: [],
    },
    drawnCards: [tarotCards[0]],
    cardReversals: [false],
    apiKey: "",
    encryptedApiKey: null,
  });
}

async function renderAndGetCallbacks() {
  streamMock.mockClear(); // 清空跨测试累积的调用，确保取到本次渲染的 callbacks
  setupStore();
  render(<ResultPage />);
  await waitFor(() => expect(streamMock).toHaveBeenCalled());
  return streamMock.mock.calls[0][2] as {
    onContent: (c: string) => void;
    onComplete: () => void;
    onError: (e: string) => void;
  };
}

describe("O3 结果页流式解析与展示", () => {
  it("流式累积渲染：逐步 onContent 后界面出现累计文本", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n第一步：卡牌组合分析\n\n");
      callbacks.onContent("第二步：具体解读\n\n");
    });
    expect(screen.getByText(/第一步：卡牌组合分析/)).toBeInTheDocument();
    expect(screen.getByText(/第二步：具体解读/)).toBeInTheDocument();
  });

  it("完成后核心建议区显示完整建议（多行）", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析正文。\n\n");
      callbacks.onContent(
        "## 💡 核心建议\n\n勇敢迈出第一步，把完美留在路上。\n补充说明第二行。",
      );
      callbacks.onComplete();
    });
    expect(screen.getByText(/勇敢迈出第一步，把完美留在路上/)).toBeInTheDocument();
    expect(screen.getByText(/补充说明第二行/)).toBeInTheDocument();
  });

  it("解析区不包含 💡 核心建议节（重复问题回归用例）", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析正文。\n\n");
      callbacks.onContent("## 💡 核心建议\n\n一句话建议。\n\n");
      callbacks.onComplete();
    });
    const proseList = document.querySelectorAll(".prose");
    expect(proseList.length).toBeGreaterThan(0);
    // 第一个 .prose 是 AI 解析区，不应包含"核心建议"（已剥离 💡 节）
    expect(proseList[0].textContent).not.toContain("核心建议");
    // 核心建议区（独立 section）应显示建议
    expect(screen.getByText(/一句话建议/)).toBeInTheDocument();
  });

  it("AI 输出粗体标题时同样正确解析（** 格式回归用例）", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("🔮 **深度解析过程**\n\n粗体格式分析。\n\n");
      callbacks.onContent("💡 **核心建议**\n\n粗体建议。");
      callbacks.onComplete();
    });
    expect(screen.getByText(/粗体格式分析/)).toBeInTheDocument();
    expect(screen.getByText(/粗体建议/)).toBeInTheDocument();
  });

  it("G12 结论先行流式:先出核心建议,解析区占位→正文", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 💡 核心建议\n\n先给的核心建议。\n\n");
    });
    // 核心建议先出现
    expect(screen.getByText(/先给的核心建议/)).toBeInTheDocument();
    // 解析区尚未输出正文 → 占位文案
    expect(screen.getByText(/深度解析正在生成中/)).toBeInTheDocument();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析正文内容。\n\n");
      callbacks.onComplete();
    });
    // 解析正文出现,占位消失
    expect(screen.getByText(/分析正文内容/)).toBeInTheDocument();
    expect(screen.queryByText(/深度解析正在生成中/)).toBeNull();
  });
  it("G13 结果页末尾显示 AI 免责声明(历史记录上方)", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析内容。\n\n");
      callbacks.onComplete();
    });
    const disclaimer = screen.getByText("以上内容皆由AI生成，仅供娱乐，请勿尽信");
    expect(disclaimer).toBeInTheDocument();
    // 免责声明在历史记录按钮上方
    const historyBtn = screen.getByText(/历史记录/);
    expect(
      disclaimer.compareDocumentPosition(historyBtn) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it("trial_used 错误显示免费试用引导文案（R3）", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onError("trial_used");
    });
    expect(screen.getByText(/免费试用已用完/)).toBeInTheDocument();
  });

  it("核心建议 Markdown 渲染：** 粗体不原样显示（R3 标点问题回归）", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析正文。\n\n");
      callbacks.onContent("## 💡 核心建议\n\n**勇敢行动**，保持专注。\n\n");
      callbacks.onComplete();
    });
    // AI 输出的 ** 粗体渲染为 strong 元素
    expect(document.querySelector("strong")).toBeInTheDocument();
    // 页面中不应出现原样星号
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("G7 点击牌 → 放大模态显示牌位标注，关闭后消失", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析内容。\n\n");
      callbacks.onComplete();
    });
    // 点击第一张牌的牌面
    const cardImage = document.querySelector('img[alt="愚者"]');
    expect(cardImage).not.toBeNull();
    fireEvent.click(cardImage!);
    // 模态出现,含牌位标注(单张牌阵 positions[0] = 核心指引);范围限定在模态内(卡片上有同名位置标注)与牌名
    const modal = screen.getByTestId("card-modal-content");
    expect(within(modal).getByText("核心指引")).toBeInTheDocument();
    expect(within(modal).getByText("愚者")).toBeInTheDocument();
    // 关闭(AnimatePresence exit 动画需要等待)
    fireEvent.click(screen.getByTestId("card-modal-overlay"));
    await waitFor(() =>
      expect(screen.queryByTestId("card-modal-content")).toBeNull(),
    );
  });

  it("Y1 完成后自动保存记录（addReading 字段完整）", async () => {
    useTarotStore.setState({ readings: [] });
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n完整解析内容。\n\n");
      callbacks.onContent("## 💡 核心建议\n\n一句话建议。\n\n");
      callbacks.onComplete();
    });
    const readings = useTarotStore.getState().readings;
    expect(readings.length).toBe(1);
    const r = readings[0];
    expect(r.question).toBe("测试问题");
    expect(r.interpretation).toContain("完整解析内容");
    expect(r.advice).toContain("一句话建议");
    expect(r.cards.length).toBe(1);
  });

  it("Y1 流式失败不保存记录", async () => {
    useTarotStore.setState({ readings: [] });
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onError("AI解读服务暂时不可用，请稍后重试。");
    });
    expect(useTarotStore.getState().readings.length).toBe(0);
  });

  it("G2 完成后无 💡 节 → 核心建议区显示兜底文案", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析正文，但模型没有输出核心建议小节。\n\n");
      callbacks.onComplete();
    });
    // 兜底文案（streamComplete && !coreAdvice）
    expect(screen.getByText(/请结合以上解析，听从内心的声音/)).toBeInTheDocument();
  });

  it("G11 抽牌结果居中换行 + 每张牌标注位置名", async () => {
    streamMock.mockClear();
    useTarotStore.setState({
      question: "选择问题",
      recommendedSpread: {
        id: "decision-making",
        name: "选择之路",
        description: "五张牌阵",
        cardCount: 5,
        positions: ["现状", "选项A", "选项B", "影响因素", "建议"],
        category: [],
      },
      drawnCards: tarotCards.slice(0, 5),
      cardReversals: [false, false, false, false, false],
      apiKey: "",
      encryptedApiKey: null,
    });
    render(<ResultPage />);
    await waitFor(() => expect(streamMock).toHaveBeenCalled());
    // 居中换行布局(去除 grid-cols/grid-rows-2/col-start-2 补丁)
    const grid = screen.getByTestId("result-grid");
    expect(grid.className).toContain("flex");
    expect(grid.className).toContain("justify-center");
    expect(grid.className).toContain("flex-wrap");
    expect(grid.className).not.toContain("grid");
    // 每张牌上方标注对应位置名
    for (const position of ["现状", "选项A", "选项B", "影响因素", "建议"]) {
      expect(screen.getByText(position)).toBeInTheDocument();
    }
  });

  it("G11 核心建议前置到 AI 深度解析之前", async () => {
    const callbacks = await renderAndGetCallbacks();
    act(() => {
      callbacks.onContent("## 🔮 深度解析过程\n\n分析正文。\n\n");
      callbacks.onContent("## 💡 核心建议\n\n一句话建议。\n");
      callbacks.onComplete();
    });
    // DOM 顺序:核心建议 title 在 AI 深度解析 title 之前
    const titles = [...document.querySelectorAll(".astro-card-title")]
      .map((el) => el.textContent ?? "");
    const aiIdx = titles.findIndex((t) => t.includes("AI 深度解析"));
    const adviceIdx = titles.findIndex((t) => t.includes("核心建议"));
    expect(adviceIdx).toBeGreaterThanOrEqual(0);
    expect(aiIdx).toBeGreaterThan(adviceIdx);
  });
});