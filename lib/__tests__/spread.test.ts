import { describe, expect, it } from "vitest";
import { recommendSpreadId } from "@/lib/spread";

// 规格 G1：牌阵推荐逻辑增强（评分制）
// 原实现（lib/store.ts）为关键词顺序匹配 + 单字 '爱'，导致"热爱工作"误判情感十字。
// 目标：强关系信号优先，其余按关键词命中数计分取最高；默认单张牌；平局取规则表靠前者。
// 表驱动用例以规格 40-green-improvements.md 的 TDD 计划为验收基准。

describe("G1 recommendSpreadId 评分制", () => {
  it("爱情类问题 → relationship-cross", () => {
    expect(recommendSpreadId("我在感情方面应该如何选择")).toBe(
      "relationship-cross",
    );
  });

  it("事业类问题 → decision-making", () => {
    expect(recommendSpreadId("我的事业发展前景如何")).toBe(
      "decision-making",
    );
  });

  it("时间类问题 → past-present-future", () => {
    expect(recommendSpreadId("未来三个月的发展趋势")).toBe(
      "past-present-future",
    );
  });

  it("人生类/长问题 → life-guidance", () => {
    expect(recommendSpreadId("如何找到人生方向")).toBe("life-guidance");
    const longQuestion =
      "我已经在现在的岗位上工作了很多年，最近一直在思考是否应该做出一些改变，但是又担心风险，希望得到全面的指引和人生方向的建议，让我能够更清楚地看到整体局面。";
    expect(recommendSpreadId(longQuestion)).toBe("life-guidance");
  });

  it("默认无匹配 → single-card", () => {
    expect(recommendSpreadId("今天适合出门吗")).toBe("single-card");
  });

  it("边界：'热爱工作' 不命中情感十字（单字 '爱' / '喜欢' 等过宽词已移除）", () => {
    expect(recommendSpreadId("我热爱工作，如何提升职业发展")).not.toBe(
      "relationship-cross",
    );
  });

  it("平局取规则表靠前者（决策表在人生表之前）", () => {
    // "选择"（决策 1 分）+ "方向"（人生 1 分）→ 平局 → decision-making
    expect(recommendSpreadId("现在该选择什么方向")).toBe("decision-making");
  });
});
