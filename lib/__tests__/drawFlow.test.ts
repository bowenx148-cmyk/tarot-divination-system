import { describe, expect, it } from "vitest";
import {
  buildPositionMeanings,
  createDeckOrder,
  extractQuestionTheme,
} from "@/lib/drawFlow";
import { tarotCards } from "@/lib/tarot-data";

describe("G8 extractQuestionTheme", () => {
  it("去除标点与疑问语气词,提取简短主题", () => {
    expect(extractQuestionTheme("猫咪想说什么？")).toBe("猫咪想说");
    expect(extractQuestionTheme("请问我的事业前景如何？")).toBe("我的事业前景");
    expect(extractQuestionTheme("我想问今年运势怎么样呢")).toBe("今年运势");
  });

  it("空串或纯符号回退为「你」", () => {
    expect(extractQuestionTheme("")).toBe("你");
    expect(extractQuestionTheme("？？？")).toBe("你");
  });

  it("超长问题截断(含省略号,总长 ≤ 13)", () => {
    const theme = extractQuestionTheme("这是一个非常非常非常非常非常非常非常非常非常非常长的问题吗");
    expect(theme.length).toBeLessThanOrEqual(13);
    expect(theme.endsWith("…")).toBe(true);
  });
});

describe("G8 buildPositionMeanings", () => {
  it("结合问题使用实际牌位，保持过去、现在、未来的原始顺序", () => {
    const meanings = buildPositionMeanings("猫咪想说什么", ["过去", "现在", "未来"]);
    expect(meanings).toHaveLength(3);
    expect(meanings[0]).toContain("猫咪想说");
    expect(meanings).toEqual(['关于「猫咪想说」的过去', '关于「猫咪想说」的现在', '关于「猫咪想说」的未来']);
  });

  it("单张牌阵给出核心指引", () => {
    const meanings = buildPositionMeanings("我今天运势如何", ["核心指引"]);
    expect(meanings).toHaveLength(1);
    expect(meanings[0]).toContain("核心指引");
    expect(meanings[0]).toContain("我今天运势");
  });

  it("多牌阵的每个牌位都保留真实含义", () => {
    const positions = Array.from({ length: 10 }, (_, i) => `位${i}`);
    const meanings = buildPositionMeanings("问题", positions);
    expect(meanings).toHaveLength(10);
    expect(meanings[9]).toContain("位9");
  });
});
// 规格 G17（bug 修复）：牌序必须每局洗一次
// 修复前 app/draw/select 直接渲染 tarotCards 的固定数据顺序，于是「第 1 格永远是愚者」——
// 习惯性点同一位置的用户每次占卜都会抽到同一张牌。
describe("G17 createDeckOrder：牌序洗牌", () => {
  it("返回 0..n-1 的一个排列（长度、取值域、无重复）", () => {
    const order = createDeckOrder(78);
    expect(order).toHaveLength(78);
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 78 }, (_, i) => i),
    );
    expect(new Set(order).size).toBe(78);
  });

  it("n = 1 与 n = 0 的边界", () => {
    expect(createDeckOrder(1)).toEqual([0]);
    expect(createDeckOrder(0)).toEqual([]);
  });

  it("多次调用会产生不同的顺序（否则等同于没洗）", () => {
    const orders = Array.from({ length: 20 }, () => createDeckOrder(78).join(","));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it("不修改任何外部数组（纯函数）", () => {
    const snapshot = JSON.stringify(tarotCards);
    createDeckOrder(tarotCards.length);
    expect(JSON.stringify(tarotCards)).toBe(snapshot);
  });
});
