import { describe, expect, it } from "vitest";
import { buildTarotPrompt } from "@/lib/deepseek";
import { tarotCards } from "@/lib/tarot-data";

describe("G12 buildTarotPrompt 结论先行", () => {
  it("核心建议小节位于深度解析小节之前", () => {
    const prompt = buildTarotPrompt("测试问题", [tarotCards[0]]);
    const adviceIdx = prompt.indexOf("## 💡 核心建议");
    const analysisIdx = prompt.indexOf("## 🔮 深度解析过程");
    expect(adviceIdx).toBeGreaterThan(0);
    expect(analysisIdx).toBeGreaterThan(adviceIdx);
  });

  it("包含问题、卡牌信息与正/逆位标注", () => {
    const prompt = buildTarotPrompt(
      "我的感情",
      [tarotCards[0], tarotCards[1]],
      [false, true],
    );
    expect(prompt).toContain("我的感情");
    expect(prompt).toContain("愚者");
    expect(prompt).toContain("魔术师");
    expect(prompt).toContain(" - 正位");
    expect(prompt).toContain(" - 逆位");
  });
  it('强化直接判断和资料应用，保留解析协议且不强制正文模板', () => {
    const prompt = buildTarotPrompt('半年感情', [tarotCards[0]]);
    expect(prompt).toContain('第一句就说当前更偏向什么');
    expect(prompt).toContain('标题必须来自本次实际资料');
    expect(prompt).toContain('不再强制添加');
    expect(prompt).toContain('不编造咨询经验');
  });
});
