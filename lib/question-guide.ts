import { detectQuestionTopics, type QuestionTopic } from './tarot-knowledge';

export const QUESTION_EXAMPLES: Record<QuestionTopic, string[]> = {
  general: ['未来三个月我可以重点关注什么？', '面对眼前这件事，我可以先做什么？'],
  love: ['这段感情里，我可以怎样改善沟通？', '结束一段恋爱后，我该如何照顾自己？'],
  study: ['接下来一个月，我该怎样调整复习方法？', '准备论文答辩时，我需要关注哪些短板？'],
  income: ['我可以怎样改善兼职收入与支出的平衡？', '面对回款压力，我该先梳理哪些行动？'],
  career: ['这份工作与我的需要有哪些不匹配？', '准备跳槽前，我需要补足哪些资源？'],
  relationships: ['与朋友发生分歧后，我可以怎样沟通？', '我该怎样与室友建立清晰的边界？'],
  family: ['面对父母的期待，我该怎样表达自己的选择？', '我可以怎样改善家人的责任分担？'],
  growth: ['我可以怎样认识自己的潜能与优势？', '我对人生方向感到迷茫，可以从哪里探索？'],
  wellbeing: ['最近压力很大，我可以怎样减少内耗？', '我该如何调整作息，让身心恢复平衡？'],
  decision: ['A继续当前工作，B换到新团队，我该怎样比较？', '面对两个学习方案，我需要权衡哪些得失？'],
};

export const TOPIC_SPREADS: Record<QuestionTopic, string[]> = {
  general: ['single-card', 'situation-guidance', 'past-present-future', 'holy-triangle', 'diamond', 'life-guidance'],
  love: ['relationship-cross', 'love-tree', 'venus', 'past-present-future', 'hexagram'],
  study: ['core-insight', 'inner-talents', 'situation-guidance', 'two-choice', 'past-present-future'],
  income: ['gain-loss', 'two-choice', 'core-insight', 'situation-guidance', 'past-present-future'],
  career: ['decision-making', 'two-choice', 'gain-loss', 'inner-talents', 'hexagram', 'core-insight'],
  relationships: ['relationship-cross', 'core-insight', 'hexagram', 'situation-guidance'],
  family: ['situation-guidance', 'relationship-cross', 'diamond', 'hexagram'],
  growth: ['self-exploration', 'jung-archetypes', 'inner-talents', 'life-guidance'],
  wellbeing: ['body-mind-spirit', 'self-exploration', 'single-card', 'situation-guidance'],
  decision: ['two-choice', 'decision-making', 'gain-loss', 'core-insight'],
};

// 初步关键词判断，只限制明确的预测请求；未知问题仍允许按综合主题讨论。
export function assessQuestion(question: string) {
  const topics = detectQuestionTopics(question);
  const restricted = [
    [/(什么时候|何时|哪天|几岁|多少岁|多久|会不会|是否).*(死|去世)|寿命|生死/, '不能用牌预测生死或寿命。可以改问：面对当下的不安，我能怎样照顾自己？'],
    [/诊断|得了什么病|什么疾病|治疗方案|药物|怀孕|胎儿|胎儿性别/, '不能用牌判断疾病、治疗或怀孕结果。可以讨论面对压力时的自我关照；具体身体问题请通过专业检查核实。'],
    [/彩票|中奖|股票.*(涨|跌|买|卖)|(?:投资|基金|币价).*(收益|涨|跌|买|卖)/, '不能预测彩票号码、交易涨跌或保证投资收益。可以改问：我该怎样梳理预算、风险与收入规划？'],
    [/诉讼.*(赢|输)|官司.*(赢|输)|会.*判刑/, '不能以牌面判断法律结局。可以讨论面对这件事的准备、沟通和支持。'],
    [/(叫什么名字|具体.*日期|哪一年.*(?:出现|脱单)|考试.*(?:多少分|几分)|能考.*(?:多少分|几分))/, '不能用牌提供姓名、精确日期或考试分数。可以改问一段时间内的行动与准备。'],
    [/(偷窥|窃取|调查).*(隐私|秘密)|(?:他|她|别人).*(银行卡|密码|住址)/, '不能窥探他人的私人信息。可以讨论与你有关的互动、边界和沟通。'],
  ] as const;
  const rule = restricted.find(([pattern]) => pattern.test(question));
  return { topics, supported: !rule, message: rule?.[1] ?? '可以自由提问；示例仅供参考。将按问题、牌位和正逆位讨论可观察的倾向与行动。' };
}
