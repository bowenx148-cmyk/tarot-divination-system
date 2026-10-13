import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HistoryPage from "@/app/history/page";
import { tarotCards } from "@/lib/tarot-data";

function makeReading(
  id: string,
  question: string,
  interpretation: string,
  advice = "核心建议内容",
) {
  return {
    id,
    question,
    spread: {
      id: "single-card",
      name: "单张牌指引",
      description: "d",
      cardCount: 1,
      positions: ["核心指引"],
      category: [],
    },
    cards: [tarotCards[0]],
    cardReversals: [true],
    interpretation,
    advice,
    timestamp: new Date("2026-01-01T10:00:00+08:00"),
  };
}

describe("Y1 /history 历史记录页", () => {
  beforeEach(() => {
    useTarotStore.setState({ readings: [] });
  });

  it("渲染记录列表：问题、牌阵名、牌名(逆)、时间", () => {
    useTarotStore.setState({
      readings: [makeReading("r1", "我的事业问题", "解析一")],
    });
    render(<HistoryPage />);
    expect(screen.getByText("我的事业问题")).toBeInTheDocument();
    expect(screen.getByText("单张牌指引")).toBeInTheDocument();
    expect(screen.getByText(/愚者/)).toBeInTheDocument(); // 牌名含(逆)
    expect(screen.getByText(/逆/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/1\/1/)).toBeInTheDocument();
  });

  it("展开详情：完整 AI 解析与核心建议可见", () => {
    useTarotStore.setState({
      readings: [makeReading("r1", "问题A", "完整的解析正文内容")],
    });
    render(<HistoryPage />);
    // 默认收起，详情不可见
    expect(screen.queryByText("完整的解析正文内容")).toBeNull();
    fireEvent.click(screen.getByText("问题A"));
    expect(screen.getByText("完整的解析正文内容")).toBeInTheDocument();
    expect(screen.getByText("核心建议内容")).toBeInTheDocument();
  });

  it("删除记录：confirm 确认后 removeReading", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    useTarotStore.setState({
      readings: [
        makeReading("r1", "问题A", "解析一"),
        makeReading("r2", "问题B", "解析二"),
      ],
    });
    render(<HistoryPage />);
    const deleteButtons = screen.getAllByRole("button", { name: /删除/ });
    fireEvent.click(deleteButtons[0]);
    expect(useTarotStore.getState().readings.length).toBe(1);
    expect(useTarotStore.getState().readings[0].id).toBe("r2");
    confirmSpy.mockRestore();
  });

  it("空状态提示", () => {
    render(<HistoryPage />);
    expect(screen.getByText(/暂无占卜记录/)).toBeInTheDocument();
  });
});

describe("Y8 /history 展开区去重 + 核心建议高亮", () => {
  beforeEach(() => {
    useTarotStore.setState({ readings: [] });
  });

  const G12_INTERPRETATION = [
    "## 💡 核心建议",
    "",
    "勇敢行动，保持专注。",
    "",
    "## 🔮 深度解析过程",
    "",
    "第一步：卡牌组合分析",
    "分析正文内容。",
  ].join("\n");

  function expand(reading: ReturnType<typeof makeReading>) {
    useTarotStore.setState({ readings: [reading] });
    render(<HistoryPage />);
    fireEvent.click(screen.getByText(reading.question));
  }

  it("展开不再显示 🤖 AI 深度解析 标题", () => {
    expand(makeReading("y8-1", "问题Y8", G12_INTERPRETATION));
    expect(screen.queryByText("🤖 AI 深度解析")).toBeNull();
  });

  it("核心建议仅保留一个（去重）且带高亮、位于深度解析过程之前", () => {
    expand(makeReading("y8-2", "问题Y8", G12_INTERPRETATION));
    // 唯一一个「核心建议」标题（interpretation 内 💡 节与底部块均已移除）
    expect(screen.getAllByText(/核心建议/)).toHaveLength(1);
    const adviceBlock = screen.getByTestId("history-advice");
    expect(adviceBlock).toHaveClass("bg-yellow-50");
    const adviceTitle = screen.getByText("💡 核心建议");
    const analysisTitle = screen.getByText("🔮 深度解析过程");
    expect(
      adviceTitle.compareDocumentPosition(analysisTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("核心建议正文不重复，解析正文正常显示", () => {
    // advice 字段与 interpretation 内 💡 节内容一致 → 去重后应只出现一次
    expand(
      makeReading("y8-3", "问题Y8", G12_INTERPRETATION, "勇敢行动，保持专注。"),
    );
    expect(screen.getAllByText("勇敢行动，保持专注。")).toHaveLength(1);
    // 解析正文同一段落内软换行 → 用正则子串匹配（CommonMark 单换行不换段）
    expect(screen.getByText(/分析正文内容/)).toBeInTheDocument();
  });

  it("无 💡 节旧记录不白屏：高亮块显示 advice 字段，解析内容原样显示", () => {
    expand(makeReading("y8-4", "问题Y8", "纯文本解析内容"));
    expect(screen.getByText("纯文本解析内容")).toBeInTheDocument();
    expect(screen.getByTestId("history-advice")).toBeInTheDocument();
    expect(screen.getByText("核心建议内容")).toBeInTheDocument();
  });
});

describe("Y9 /history 展开区收尾（去 hr + 嵌套按钮修复）", () => {
  beforeEach(() => {
    useTarotStore.setState({ readings: [] });
  });

  it("核心建议模块内不渲染 hr 分隔线（建议内容含 ---）", () => {
    const withHr = [
      "## 💡 核心建议",
      "",
      "建议内容。",
      "",
      "---",
      "",
      "## 🔮 深度解析过程",
      "",
      "分析正文。",
    ].join("\n");
    useTarotStore.setState({
      readings: [makeReading("y9-1", "问题Y9", withHr)],
    });
    render(<HistoryPage />);
    fireEvent.click(screen.getByText("问题Y9"));
    const adviceBlock = screen.getByTestId("history-advice");
    expect(adviceBlock.querySelector("hr")).toBeNull();
    expect(screen.getByText("建议内容。")).toBeInTheDocument();
  });

  it("摘要区无嵌套 button（修复 hydration 错误）", () => {
    useTarotStore.setState({
      readings: [makeReading("y9-2", "问题Y9", "解析正文内容")],
    });
    const { container } = render(<HistoryPage />);
    expect(container.querySelector("button button")).toBeNull();
  });

  it("点击问题文本仍可展开/收起", () => {
    useTarotStore.setState({
      readings: [makeReading("y9-3", "问题Y9", "展开后的解析内容")],
    });
    render(<HistoryPage />);
    expect(screen.queryByText("展开后的解析内容")).toBeNull();
    fireEvent.click(screen.getByText("问题Y9"));
    expect(screen.getByText("展开后的解析内容")).toBeInTheDocument();
  });
});

