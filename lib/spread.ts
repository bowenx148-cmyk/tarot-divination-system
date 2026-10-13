// 牌阵推荐逻辑（规格 G1）
//
// 原实现（lib/store.ts）为关键词顺序匹配 + 单字 '爱' 等过宽词，
// 导致"热爱工作"误判情感十字、固定顺序无评分。
// 方案：
//   1. 强关系信号词（语义足够明确）优先 → relationship-cross；
//   2. 其余按关键词命中数计分取最高；平局取规则表靠前者；
//   3. 无匹配默认 single-card；>50 字长问题给 life-guidance 加分。
// 注意：已移除单字 '爱'、'关系'、'喜欢' 等过宽词（工作语境常见，会误判）。
// 表驱动用例以 docs/archive/40-green-improvements.md 的 TDD 计划为验收基准。

// 强关系信号：出现即判为情感问题（"感情"+"选择/应该"等决策词干扰场景也正确）
const STRONG_RELATIONSHIP_KEYWORDS = [
  "爱情",
  "恋爱",
  "感情",
  "对象",
  "伴侣",
  "结婚",
  "分手",
  "表白",
  "复合",
];

interface SpreadRule {
  spreadId: string;
  keywords: string[];
}

// 规则表顺序即平局优先级（靠前者胜出）
const RULES: SpreadRule[] = [
  {
    spreadId: "relationship-cross",
    keywords: ["婚姻", "恋人", "男友", "女友", "夫妻", "前任"],
  },
  {
    spreadId: "decision-making",
    keywords: [
      "选择",
      "决定",
      "应该",
      "还是",
      "换工作",
      "工作",
      "事业",
      "创业",
      "跳槽",
      "职业",
      "前景",
    ],
  },
  {
    spreadId: "past-present-future",
    keywords: ["未来", "将来", "发展", "趋势", "这个月", "明年", "接下来"],
  },
  {
    spreadId: "life-guidance",
    keywords: ["人生", "命运", "指引", "迷茫", "方向", "整体", "全面"],
  },
];

/** 评分制推荐：返回牌阵 id；无匹配返回 "single-card" */
export function recommendSpreadId(question: string): string {
  const lower = question.toLowerCase();

  if (STRONG_RELATIONSHIP_KEYWORDS.some((k) => lower.includes(k))) {
    return "relationship-cross";
  }

  let bestScore = 0;
  let bestSpreadId: string | null = null;
  for (const rule of RULES) {
    const score =
      rule.keywords.filter((k) => lower.includes(k)).length +
      (lower.length > 50 && rule.spreadId === "life-guidance" ? 1 : 0);
    // 严格大于 → 平局保留先命中者（规则表靠前）
    if (score > bestScore) {
      bestScore = score;
      bestSpreadId = rule.spreadId;
    }
  }
  return bestScore > 0 && bestSpreadId ? bestSpreadId : "single-card";
}
