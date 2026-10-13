import rawCards from './knowledge/tarotoo-cards.json';
import { domainNotes } from './knowledge/domain-notes';
import { TarotCard } from './tarot-data';

export const QUESTION_TOPICS = { general: '综合', love: '感情', study: '学业', income: '收入', career: '事业', relationships: '人际', family: '家庭', growth: '自我成长', wellbeing: '情绪关照', decision: '选择决策' } as const;
export type QuestionTopic = keyof typeof QUESTION_TOPICS;
export type TopicChoice = QuestionTopic | 'auto';
export const isTopicChoice = (value: unknown): value is TopicChoice => value === 'auto' || (typeof value === 'string' && Object.hasOwn(QUESTION_TOPICS, value));

const topicWords: Record<Exclude<QuestionTopic, 'general'>, string[]> = {
  love: ['感情', '爱情', '恋爱', '伴侣', '分手', '复合', '婚姻', '暧昧', '桃花', '表白'],
  study: ['学业', '学习', '考试', '成绩', '复习', '考研', '考公', '升学', '论文', '答辩', '专业', '学校'],
  income: ['收入', '财运', '工资', '报酬', '钱', '兼职', '副业', '回款', '负债', '预算', '存款', '奖金'],
  career: ['事业', '工作', '职业', '岗位', '跳槽', '创业', '同事', '升职', '项目', '领导'],
  relationships: ['人际', '朋友', '友情', '社交', '室友', '沟通', '同学'],
  family: ['家人', '父母', '妈妈', '爸爸', '家庭', '亲子', '孩子', '长辈'],
  growth: ['成长', '自信', '潜能', '天赋', '迷茫', '人生方向', '认识自己', '自我'],
  wellbeing: ['情绪', '焦虑', '压力', '疲惫', '作息', '内耗', '心情', '身心'],
  decision: ['选择', '决定', '决策', '二选一', '还是', '去留', '方案', '取舍'],
};

export function detectQuestionTopics(question: string, choice: TopicChoice = 'auto'): QuestionTopic[] {
  if (choice !== 'auto') return [choice];
  const topics = (Object.keys(topicWords) as Exclude<QuestionTopic, 'general'>[]).filter(topic => topicWords[topic].some(word => question.includes(word)));
  return topics.length ? topics : ['general'];
}

const normalizeName = (name: string) => name.toLowerCase().replace(/^the /, '').replace('judgement', 'judgment').replace(/[^a-z]/g, '');
const sourceByName = new Map(rawCards.map(card => [normalizeName(card.name), card]));
const offsets = { love: 0, career: 2, study: 4, income: 6 } as const;

export function getCardKnowledge(card: TarotCard, reversed: boolean, topic: QuestionTopic) {
  const source = sourceByName.get(normalizeName(card.nameEn));
  const notes = domainNotes[card.id];
  const offset = offsets[topic as keyof typeof offsets];
  const meaning = offset === undefined
    ? reversed ? card.meaningReversed : card.meaningUpright
    : notes?.[offset + (reversed ? 1 : 0)] ?? '';
  const externalMeaning = !source ? '' : topic === 'love'
    ? reversed ? source.love_reversed : source.love
    : topic === 'career' ? reversed ? source.career_reversed : source.career
    : topic === 'general' ? reversed ? source.meaning_reversed : source.meaning_upright : '';
  return {
    meaning, externalMeaning,
    source: offset === undefined ? '原项目通用中文牌义，结合所选类别的情境指引' : '本地编辑：逐牌中文情境参考（象征性，不是预测事实）',
    externalSource: externalMeaning ? 'Tarotoo 78-card dataset（MIT；作者说明AI辅助生成并审校）' : '',
  };
}

export const TOPIC_GUIDANCE: Record<QuestionTopic, string> = {
  general: '只讨论用户提出的主题。若“这半年”未指明回顾还是未来，不擅自当成过去，先说明两种读法或问一个澄清问题。牌阵位置不等于时间阶段。',
  love: '区分单身、暧昧、恋爱、分手场景；未提供状态时不编造。关注沟通频率、回应、边界与责任等可核实行为，不断言对方爱不爱、出轨或必然复合。',
  study: '围绕基础掌握、复习方法、错题、时间安排、考试焦虑与支持条件。建议落实为一次可完成的练习或复盘，不预测分数、名次和必然通过。',
  income: '区分工资、兼职、副业、回款、支出与债务，围绕交付、结算、现金流和预算；未提供金额不编造，不给投资涨跌、彩票号码或保证收益。',
  career: '围绕岗位匹配、贡献、协作、职责、转职条件与执行成本；给出可验证的下一步，不断言必然升职或失业。',
  relationships: '关注具体互动、沟通、边界与信任；区分观察到的行为和猜测，不替朋友或同事断言内心。建议具体到一次沟通或可以设定的边界。',
  family: '围绕家庭沟通、责任分担、代际边界与本人能够做的改变，不以牌面诊断亲属或要求用户服从家人。',
  growth: '围绕已经经历的事情探索优势、价值与可实践的方向，不把牌面等同于固定人格或命运。建议一次小实验与复盘。',
  wellbeing: '回应情绪和压力，关注可调整的作息、支持和自我关照；不诊断疾病或替代治疗。情绪强烈时先稳定下来，不诱导反复抽牌。',
  decision: '明确A/B选项及同一时间范围，比较代价、资源、可逆性和下一步；牌面不替用户作最终决定，不保证任一方案的收益。',
};
