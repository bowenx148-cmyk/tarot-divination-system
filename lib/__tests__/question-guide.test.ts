import { describe, expect, it } from 'vitest';
import { assessQuestion, QUESTION_EXAMPLES, TOPIC_SPREADS } from '@/lib/question-guide';
import { detectQuestionTopics, getCardKnowledge, QUESTION_TOPICS, type QuestionTopic } from '@/lib/tarot-knowledge';
import { tarotCards } from '@/lib/tarot-data';
import { tarotSpreads } from '@/lib/store';
import { GET } from '@/app/api/suggested-questions/route';

describe('自由提问与问题分类', () => {
  it('自定义未知问题走综合，不限制为示例白名单', () => {
    expect(assessQuestion('搬到陌生城市之后，我能先做些什么？')).toMatchObject({ supported: true, topics: ['general'] });
    expect(detectQuestionTopics('家庭沟通让我很焦虑')).toEqual(['relationships', 'family', 'wellbeing']);
    expect(detectQuestionTopics('我该怎样认识自己的天赋')).toEqual(['growth']);
  });
  it.each(['我什么时候死', '我的寿命有多长', '怀孕结果如何', '下期彩票中奖号码', '股票会涨还是跌', '我的官司能赢吗', '考试能考多少分', '未来伴侣叫什么名字', '调查朋友的隐私'])('预测请求%s给出改写提示', question => {
    const result = assessQuestion(question);
    expect(result.supported).toBe(false); expect(result.message.length).toBeGreaterThan(15);
  });
  it('10类20条示例都能正常咨询，筛选映射均指向真实牌阵', async () => {
    expect(Object.keys(QUESTION_EXAMPLES)).toHaveLength(10);
    expect(Object.values(QUESTION_EXAMPLES).flat()).toHaveLength(20);
    for (const [key, questions] of Object.entries(QUESTION_EXAMPLES)) {
      expect(questions.every(q => assessQuestion(q).supported)).toBe(true);
      expect(TOPIC_SPREADS[key as QuestionTopic].every(id => tarotSpreads.some(spread => spread.id === id))).toBe(true);
    }
    const payload = await (await GET()).json();
    expect(payload.questions).toHaveLength(20); expect(payload.groups).toEqual(QUESTION_EXAMPLES);
  });
  it('新增类别结合通用正逆位知识，所有类别的78张牌义均非空', () => {
    for (const topic of Object.keys(QUESTION_TOPICS) as QuestionTopic[]) for (const card of tarotCards) for (const reversed of [true, false]) {
      expect(getCardKnowledge(card, reversed, topic).meaning.length).toBeGreaterThan(0);
    }
  });
});
