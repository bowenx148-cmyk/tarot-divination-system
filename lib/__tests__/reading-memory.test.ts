import { describe, expect, it } from 'vitest';
import { previousConsultation } from '@/lib/reading-memory';
import { tarotCards } from '@/lib/tarot-data';
import { tarotSpreads, type TarotReading, useTarotStore } from '@/lib/store';
import { buildTarotPrompt } from '@/lib/deepseek';
const reading: TarotReading = { id: 'a', userId: 'alice', question: '旧问题', spread: tarotSpreads[0], cards: [tarotCards[0]], cardReversals: [true], interpretation: '之前的解读', advice: '', timestamp: new Date(), followups: [{ question: '之后有变化', answer: '旧追问' }] };
describe('主动带入历史咨询', () => {
  it('只允许当前用户主动选择的记录，空选不读取历史', () => {
    expect(previousConsultation([reading], 'bob', 'a')).toBeUndefined();
    expect(previousConsultation([reading], 'alice', null)).toBeUndefined();
    const selected = previousConsultation([reading], 'alice', 'a')!;
    expect(selected.cards[0].reversed).toBe(true); expect(selected.followups[0].answer).toBe('旧追问');
    expect(buildTarotPrompt('新问题', [tarotCards[1]], [false], { previousConsultation: selected })).toContain('之前的解读');
  });
  it('切换用户清除引用，不能引用其他用户记录', () => {
    useTarotStore.setState({ users: [{ id: 'alice', name: 'A' }, { id: 'bob', name: 'B' }], activeUserId: 'alice', readings: [reading] });
    useTarotStore.getState().setReferenceReadingId('a'); expect(useTarotStore.getState().referenceReadingId).toBe('a');
    useTarotStore.getState().switchUser('bob'); expect(useTarotStore.getState().referenceReadingId).toBeNull();
    useTarotStore.getState().setReferenceReadingId('a'); expect(useTarotStore.getState().referenceReadingId).toBeNull();
  });
});
