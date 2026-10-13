import { describe, expect, it } from 'vitest';
import { tarotCards } from '@/lib/tarot-data';
import { domainNotes } from '@/lib/knowledge/domain-notes';
import { detectQuestionTopics, getCardKnowledge, QuestionTopic } from '@/lib/tarot-knowledge';
import { buildFollowupPrompt, buildTarotPrompt } from '@/lib/deepseek';

describe('分类牌义检索', () => {
  it('78张牌的四领域正逆位均有独立内容，感情事业均能关联外部来源', () => {
    expect(Object.keys(domainNotes)).toHaveLength(78);
    for (const card of tarotCards) for (const topic of ['love', 'career', 'study', 'income'] as QuestionTopic[]) {
      const upright = getCardKnowledge(card, false, topic);
      const reversed = getCardKnowledge(card, true, topic);
      expect(upright.meaning, `${card.id}/${topic}`).not.toBe('');
      expect(reversed.meaning, `${card.id}/${topic}`).not.toBe('');
      expect(upright.meaning).not.toBe(reversed.meaning);
      if (topic === 'love' || topic === 'career') {
        expect(upright.externalMeaning, card.nameEn).not.toBe('');
        expect(reversed.externalMeaning, card.nameEn).not.toBe('');
      }
    }
  });
  it('复合问题识别多个领域，手动选择优先', () => {
    expect(detectQuestionTopics('考研期间兼职收入怎么平衡')).toEqual(['study', 'income']);
    expect(detectQuestionTopics('工作收入', 'love')).toEqual(['love']);
    expect(detectQuestionTopics('热爱生活')).toEqual(['general']);
  });
  it('同一张牌按领域与方向提供不同知识，初次解读与追问都用到', () => {
    const card = tarotCards.find(card => card.id === 'wands-06')!;
    const exam = buildTarotPrompt('考试该怎么准备', [card], [true]);
    expect(exam).toContain(getCardKnowledge(card, true, 'study').meaning);
    expect(exam).not.toContain(getCardKnowledge(card, false, 'study').meaning);
    const income = buildFollowupPrompt('考试准备', [card], [true], { topic: 'study' }, '首次解读', [], '兼职收入呢');
    expect(income).toContain(getCardKnowledge(card, true, 'income').meaning);
    expect(income).toContain('不预测分数');
  });
});
