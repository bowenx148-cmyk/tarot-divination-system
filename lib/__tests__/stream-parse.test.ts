import { describe, expect, it } from "vitest";
import { parseStreamContent, removeAdviceSection } from "@/lib/stream-parse";

const STD = [
  "## 🔮 深度解析过程",
  "",
  "第一步：卡牌组合分析",
  "这里是第一张牌的分析内容。",
  "",
  "### 牌面 1",
  "战车正位：行动力强。",
  "",
  "第二步：针对问题的具体解读",
  "结合问题给出解读。",
  "",
  "## 💡 核心建议",
  "",
  "勇敢地迈出第一步，把完美留在路上。",
  "你的行动本身就是一种占卜，它会揭示下一步的答案。",
].join("\n");

const BOLD = [
  "🔮 **深度解析过程**",
  "",
  "第一步：卡牌组合分析",
  "这里是分析内容。",
  "",
  "💡 **核心建议**",
  "",
  "一句话核心建议。",
  "这是建议的补充说明段落。",
].join("\n");

describe("O3 parseStreamContent", () => {
  it("完整结构解析（## 标题格式）", () => {
    const r = parseStreamContent(STD);
    expect(r.analysis).toContain("第一步：卡牌组合分析");
    expect(r.analysis).toContain("战车正位：行动力强。");
    expect(r.analysis).not.toContain("核心建议");
    expect(r.coreAdvice).toContain("勇敢地迈出第一步，把完美留在路上。");
    expect(r.currentCardIndex).toBe(0);
  });

  it("完整结构解析（**粗体标题** 格式）——AI 实际输出回归用例", () => {
    const r = parseStreamContent(BOLD);
    expect(r.analysis).toContain("第一步：卡牌组合分析");
    expect(r.analysis).not.toContain("核心建议");
    expect(r.coreAdvice).toContain("一句话核心建议。");
  });

  it("混合格式：🔮 用 ## 标题、💡 用粗体标题", () => {
    const mixed = [
      "## 🔮 深度解析过程",
      "",
      "分析正文。",
      "",
      "💡 **核心建议**",
      "",
      "混合格式的建议。",
    ].join("\n");
    const r = parseStreamContent(mixed);
    expect(r.analysis).toContain("分析正文");
    expect(r.coreAdvice).toContain("混合格式的建议。");
  });

  it("advice 取完整节（多行 + 结束语，不只首行）", () => {
    const r = parseStreamContent(STD);
    expect(r.coreAdvice).toContain("你的行动本身就是一种占卜");
    expect(r.coreAdvice).toContain("把完美留在路上");
  });

  it("仅解析过程节（无 💡 节）→ coreAdvice 为 null", () => {
    const onlyAnalysis = [
      "## 🔮 深度解析过程",
      "",
      "分析内容。",
    ].join("\n");
    const r = parseStreamContent(onlyAnalysis);
    expect(r.analysis).toContain("分析内容");
    expect(r.coreAdvice).toBeNull();
  });

  it("仅核心建议节（无 🔮 节）→ analysis 为 null（G2 降级场景）", () => {
    const onlyAdvice = [
      "## 💡 核心建议",
      "",
      "一句话建议。",
    ].join("\n");
    const r = parseStreamContent(onlyAdvice);
    expect(r.analysis).toBeNull();
    expect(r.coreAdvice).toContain("一句话建议。");
  });

  it("半截标题容错（不抛错）", () => {
    const cases = [
      "## 💡",
      "## 💡 核心建",
      "💡 **核心建",
      "### 牌面 ",
      "## 🔮 深度解析过程\n\n分析\n\n## 💡 核心建议\n\n",
    ];
    for (const c of cases) {
      expect(() => parseStreamContent(c)).not.toThrow();
    }
    expect(parseStreamContent("## 💡 核心建").coreAdvice).toBeNull();
  });

  it("分块累积等价性（逐步拼接解析结果与一次性一致）", () => {
    const chunks = [
      "## 🔮 深度解析过程\n\n第一步：",
      "卡牌组合分析\n\n第二步：",
      "具体解读\n\n## 💡 核心建议\n\n建议内容。",
    ];
    let acc = "";
    const incremental: ReturnType<typeof parseStreamContent>[] = [];
    for (const chunk of chunks) {
      acc += chunk;
      incremental.push(parseStreamContent(acc));
    }
    const once = parseStreamContent(acc);
    expect(incremental[incremental.length - 1]).toEqual(once);
  });

  it("无结构内容 → 全部字段 null", () => {
    const r = parseStreamContent("普通文本，没有任何标题结构。");
    expect(r.analysis).toBeNull();
    expect(r.coreAdvice).toBeNull();
    expect(r.currentCardIndex).toBeNull();
  });

  it("G12 结论先行:💡 在 🔮 之前也能正确切分", () => {
    const conclusionFirst = [
      "## 💡 核心建议",
      "",
      "先给出的一句话建议。",
      "",
      "## 🔮 深度解析过程",
      "",
      "第一步：卡牌组合分析",
      "这里是分析正文。",
    ].join("\n");
    const r = parseStreamContent(conclusionFirst);
    expect(r.coreAdvice).toContain("先给出的一句话建议。");
    expect(r.analysis).toContain("第一步：卡牌组合分析");
    expect(r.analysis).toContain("这里是分析正文。");
    expect(r.analysis).not.toContain("核心建议");
  });
  it("多牌取最后一张（0 基索引）", () => {
    const multi = [
      "## 🔮 深度解析过程",
      "",
      "### 牌面 1",
      "第一张牌。",
      "",
      "### 牌面 2",
      "第二张牌。",
      "",
      "### 牌面 3",
      "第三张牌。",
    ].join("\n");
    expect(parseStreamContent(multi).currentCardIndex).toBe(2);
  });
});

describe("Y8 removeAdviceSection（历史页展开区剥离 💡 节）", () => {
  it("G12 结论先行（💡 在前）：仅移除 💡 节，保留 🔮 节及其标题", () => {
    const g12 = [
      "## 💡 核心建议",
      "",
      "勇敢行动，保持专注。",
      "",
      "## 🔮 深度解析过程",
      "",
      "第一步：卡牌组合分析",
      "分析正文内容。",
    ].join("\n");
    expect(removeAdviceSection(g12)).toBe(
      "## 🔮 深度解析过程\n\n第一步：卡牌组合分析\n分析正文内容。",
    );
  });

  it("旧格式（💡 在后）：保留 🔮 节，移除 💡 节", () => {
    const old = [
      "## 🔮 深度解析过程",
      "",
      "分析正文内容。",
      "",
      "## 💡 核心建议",
      "",
      "建议内容。",
    ].join("\n");
    expect(removeAdviceSection(old)).toBe(
      "## 🔮 深度解析过程\n\n分析正文内容。",
    );
  });

  it("粗体标题格式同样只保留 🔮 节", () => {
    const bold = [
      "🔮 **深度解析过程**",
      "",
      "分析正文内容。",
      "",
      "💡 **核心建议**",
      "",
      "建议内容。",
    ].join("\n");
    expect(removeAdviceSection(bold)).toBe(
      "🔮 **深度解析过程**\n\n分析正文内容。",
    );
  });

  it("无 💡 节 → 原样返回", () => {
    const plain = "普通文本，没有任何小节标题。";
    expect(removeAdviceSection(plain)).toBe(plain);
  });

  it("仅 💡 节 → 返回空字符串", () => {
    const onlyAdvice = "## 💡 核心建议\n\n建议内容。";
    expect(removeAdviceSection(onlyAdvice)).toBe("");
  });

  it("💡 节含结束语（无下一标题）→ 结束语随 💡 节一并移除", () => {
    const c = "## 💡 核心建议\n\n建议内容。\n\n愿塔罗指引你。";
    expect(removeAdviceSection(c)).toBe("");
  });
});
