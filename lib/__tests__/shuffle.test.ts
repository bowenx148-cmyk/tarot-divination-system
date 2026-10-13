import { describe, expect, it, vi } from "vitest";
import { shuffle } from "@/lib/shuffle";
import { tarotCards } from "@/lib/tarot-data";

// 规格 O4：洗牌算法有偏
// 原实现 `[...arr].sort(() => Math.random() - 0.5)` 基于不稳定比较器，分布不均匀。
// 目标：Fisher-Yates 均匀无偏洗牌。
describe("O4 shuffle Fisher-Yates", () => {
  it("一次抽牌结果无重复", () => {
    const result = shuffle(tarotCards).slice(0, 5);
    const ids = new Set(result.map((c) => c.id));
    expect(ids.size).toBe(5);
  });

  it("边界：0/1 长度输入", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
  });

  it("78 张洗牌后仍是全集（无增删）", () => {
    const result = shuffle(tarotCards);
    expect(result.length).toBe(78);
    expect(new Set(result.map((c) => c.id)).size).toBe(78);
  });

  it("确定性路径：注入固定随机序列，结果与手工计算一致", () => {
    // Math.random() 返回固定序列 0.999, 0.5, 0.5 ...
    // 对 [1,2,3,4]：
    //   i=3: j = floor(0.999*4)=3 → swap(3,3) → [1,2,3,4]
    //   i=2: j = floor(0.5*3)=1   → swap(2,1) → [1,3,2,4]
    //   i=1: j = floor(0.5*2)=1   → swap(1,1) → [1,3,2,4]
    const spy = vi.spyOn(Math, "random");
    spy.mockReturnValueOnce(0.999).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);
    try {
      expect(shuffle([1, 2, 3, 4])).toEqual([1, 3, 2, 4]);
    } finally {
      spy.mockRestore();
    }
  });

  it("分布均匀（统计）：50,000 次单张抽样每张出现次数在期望值 ±20% 内", () => {
    // 抽样量取 50k：78 张牌下期望 641，±20% 容差（±128）远大于
    // 极值波动（~±3σ≈72），避免 20k 抽样时出现 3.5σ 正常波动导致 flaky
    const N = 50_000;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const card = shuffle(tarotCards)[0];
      counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
    }
    const expected = N / 78;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.8);
      expect(count).toBeLessThan(expected * 1.2);
    }
  });
});
