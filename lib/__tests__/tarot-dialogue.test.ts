import { describe, expect, it } from 'vitest';
import { buildFollowupPrompt, buildTarotPrompt } from '@/lib/deepseek';
import { tarotCards } from '@/lib/tarot-data';
import { tarotSpreads, useTarotStore } from '@/lib/store';

describe('牌阵、背景与连续追问', () => {
  it('三牌阵位置与正逆位牌义一一对应，带入自愿提供的背景', () => {
    const spread = tarotSpreads.find(s => s.id === 'situation-guidance')!;
    expect(spread.cardCount).toBe(spread.positions.length);
    const prompt = buildTarotPrompt('我该怎样准备考试？', tarotCards.slice(0, 3), [false, true, false], {
      spread, profile: { nickname: '小雨', birthday: '2000-01-01', background: '最近很紧张' },
    });
    spread.positions.forEach(position => expect(prompt).toContain(`牌位：${position}`));
    expect(prompt).toContain(tarotCards[1].meaningReversed);
    expect(prompt).toContain('小雨');
    expect(prompt).toContain('最近很紧张');
    expect(prompt).toContain('不能推导性格');
  });
  it('追问保留原牌、位置、解读，只发送最近四轮并限制长度', () => {
    const turns = Array.from({ length: 6 }, (_, i) => ({ question: `先前问题${i}`, answer: `回答${i}` }));
    const prompt = buildFollowupPrompt('原问题', [tarotCards[5]], [true], { spread: { name: '单牌', positions: ['核心指引'] } }, '先前解读', turns, '下一步呢？');
    expect(prompt).toContain(tarotCards[5].name);
    expect(prompt).toContain(tarotCards[5].meaningReversed);
    expect(prompt).toContain('先前解读');
    expect(prompt).toContain('下一步呢？');
    expect(prompt).toContain('不要重新抽牌');
    expect(prompt).not.toContain('先前问题0');
    expect(prompt).toContain('先前问题5');
  });
  it('追问写回同一条记录，其他历史及 API Key 不受影响', () => {
    const store = useTarotStore.getState();
    const readings = store.readings;
    const record = { id: 'dialogue-test', question: '测试', spread: tarotSpreads[0], cards: [tarotCards[0]], cardReversals: [false], interpretation: '解读', advice: '建议', timestamp: new Date() };
    try {
      useTarotStore.setState({ readings: [{ ...record, id: 'other' }, record] });
      store.setReadingFollowups('dialogue-test', [{ question: '再问', answer: '回答' }]);
      expect(useTarotStore.getState().readings[0].followups).toBeUndefined();
      expect(useTarotStore.getState().readings[1].followups?.[0].answer).toBe('回答');
      expect(useTarotStore.getState().apiKey).toBe(store.apiKey);
    } finally { useTarotStore.setState({ readings }); }
  });
});
