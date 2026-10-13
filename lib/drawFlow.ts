// 抽牌交互模块(规格 G8/G10)纯逻辑与常量
// - 结合占卜问题动态生成牌位含义
// - 选牌进行中的槽位填充类型与辅助函数(情况页与选牌子页共享)
// - 动画时长常量:页面状态机与视觉动画共用同一时长,避免动画回调时序依赖

import { shuffle } from "./shuffle";
import type { TarotCard } from "./tarot-data";

// 进场洗牌动画时长(ms):进入选牌子页时,78 张牌由散乱状态归位为网格
export const SHUFFLE_DURATION_MS = 1200;
// 揭示浮层飞入时长(ms):在源格处旋转翻面(背→正) + 放大 + 移到屏幕中央,一次连续运动
export const REVEAL_FLY_IN_MS = 500;
// 揭示浮层缩回时长(ms):从中央缩回源格并保持正面。刻意短于飞入——
// 飞入是仪式(要看得清、要有分量),缩回只是"归位"(用户的目光已经在找下一张牌了)
export const REVEAL_FLY_BACK_MS = 280;
// 逆位概率(与 G6 原实现一致:30%)
export const REVERSAL_PROBABILITY = 0.3;

/**
 * 生成一副洗好的牌序:返回 0..size-1 的排列,值即 `tarotCards` 的下标。
 *
 * **每局只调用一次,整局固定**——否则关掉揭示浮层后再点同一格会得到不同的牌。
 * 每局一洗是"点击的牌即抽到的牌"与"牌是随机的"两条承诺同时成立的前提:
 * 固定顺序(修复前)会让"第 1 格永远是愚者",习惯性点同一位置的用户每次都抽到同一张。
 */
export function createDeckOrder(size: number): number[] {
  return shuffle(Array.from({ length: size }, (_, i) => i));
}

/** 随机生成逆位状态(30% 概率)。抽离为纯模块函数,避免组件内调用 Math.random 触发 Compiler 纯净性规则 */
export function randomReversal(): boolean {
  return Math.random() < REVERSAL_PROBABILITY;
}

// 句末疑问短语:按长度优先循环剥离("猫咪想说什么" → "猫咪想说")
const TRAILING_QUESTION_WORDS = [
  "怎么样",
  "什么",
  "为什么",
  "怎样",
  "怎么",
  "如何",
  "吗",
  "呢",
  "吧",
  "啊",
  "么",
];

function stripTrailingQuestionWords(text: string): string {
  let current = text;
  let changed = true;
  while (changed && current) {
    changed = false;
    for (const word of TRAILING_QUESTION_WORDS) {
      if (current.endsWith(word)) {
        current = current.slice(0, -word.length);
        changed = true;
        break;
      }
    }
  }
  return current;
}

/**
 * 从问题中提取简短主题短语(用于动态牌位含义)。
 * 策略:去标点/疑问语气词,去除常见提问前缀,循环剥离句末疑问短语,超长截断。
 * 例:"猫咪想说什么？" → "猫咪想说"
 */
export function extractQuestionTheme(question: string): string {
  const cleaned = question
    .replace(/[，。！？、；：\"\"''（）()\[\]【】\\s?？!！,.;:]/g, "")
    .replace(/^(请问|我想知道|我想问|帮我看看|帮我|求|想|请)/, "");
  const theme = stripTrailingQuestionWords(cleaned);
  if (!theme) return "你";
  return theme.length > 12 ? `${theme.slice(0, 12)}…` : theme;
}

/**
 * 结合问题与真实牌位生成说明，保持图鉴、选牌和解读的语义一致。
 */
export function buildPositionMeanings(
  question: string,
  positions: readonly string[],
): string[] {
  const theme = extractQuestionTheme(question);
  return positions.map(position => `关于「${theme}」的${position}`);
}

/** 选牌进行中某一槽位的填充记录(情况页与选牌子页共享) */
export interface SelectionFill {
  cardIndex: number;
  card: TarotCard;
  reversed: boolean;
}

/** 第一个未填充的槽位索引(按顺序依次高亮;全部填满返回 null) */
export function firstEmptySlot(
  slots: readonly (SelectionFill | null)[],
): number | null {
  for (let i = 0; i < slots.length; i += 1) {
    if (!slots[i]) return i;
  }
  return null;
}

/** 已选牌的牌组索引(供选牌子页把已选位置标为不可再选) */
export function pickedIndexesFromSlots(
  slots: readonly (SelectionFill | null)[],
): number[] {
  const indexes: number[] = [];
  for (const s of slots) {
    if (s) indexes.push(s.cardIndex);
  }
  return indexes;
}
