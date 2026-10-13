import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { KnowledgeEntry, KnowledgeReference, KnowledgeRequest } from '@/lib/knowledge-types';
import { QUESTION_TOPICS, detectQuestionTopics, getCardKnowledge, isTopicChoice } from '@/lib/tarot-knowledge';
import { tarotCards } from '@/lib/tarot-data';
import { USER_REFERENCE } from '@/lib/tarot-reference';
import teachingNotes from '@/lib/knowledge/teaching-notes.json';
const builtins: KnowledgeEntry[] = [
  { id: 'builtin-notices', title: '用户提供的占卜须知摘要', source: '用户提供的三张截图，2026-10-09整理', topic: 'general', cardIds: [], orientation: 'any', position: '', enabled: true, content: USER_REFERENCE },
  { id: 'builtin-communication', title: '沟通与自然表达原则', source: '非暴力沟通与动机式访谈公开介绍的摘要，非完整书籍', topic: 'general', cardIds: [], orientation: 'any', position: '', enabled: true, content: '区分观察和判断，理解已表达的感受与需要，尊重用户选择。不诊断、不编造情绪经历。先回答问题，再给牌面依据和一个具体行动；避免机械串联、空泛安慰及重复总结。' },
  ...teachingNotes as KnowledgeEntry[],
];
const directory = () => process.env.TAROT_DATA_DIR || join(process.cwd(), '.local');
export function knowledgeEntries(): KnowledgeEntry[] {
  const file = join(directory(), 'knowledge-library.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : builtins;
}
export function saveKnowledgeEntries(input: unknown) {
  if (!Array.isArray(input) || input.length > 300) throw new Error('最多300条知识');
  const ids = new Set<string>();
  const entries = input.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id) ||
      typeof item.title !== 'string' || !item.title.trim() || item.title.length > 100 || typeof item.source !== 'string' || item.source.length > 300 ||
      typeof item.content !== 'string' || !item.content.trim() || item.content.length > 5000 || !Object.hasOwn(QUESTION_TOPICS, item.topic) ||
      !['any', 'upright', 'reversed'].includes(item.orientation) || typeof item.position !== 'string' || item.position.length > 80 || typeof item.enabled !== 'boolean' ||
      !Array.isArray(item.cardIds) || item.cardIds.length > 78 || !item.cardIds.every((id: unknown) => tarotCards.some(card => card.id === id))) throw new Error('知识条目格式无效');
    ids.add(item.id);
    return { id: item.id, title: item.title.trim(), source: item.source, topic: item.topic, content: item.content.trim(), cardIds: item.cardIds, orientation: item.orientation, position: item.position, enabled: item.enabled } as KnowledgeEntry;
  });
  if (JSON.stringify(entries).length > 1000000) throw new Error('知识库内容过长');
  mkdirSync(directory(), { recursive: true });
  const temporary = join(directory(), `knowledge.${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(entries), { mode: 0o600 }); renameSync(temporary, join(directory(), 'knowledge-library.json'));
}
export function retrieveKnowledge(input: unknown): KnowledgeReference[] {
  if (input === undefined) return [];
  const request = input as KnowledgeRequest;
  if (!request || typeof request.question !== 'string' || request.question.length > 2000 || !Array.isArray(request.cards) || request.cards.length > 10 ||
    (request.topic !== undefined && !isTopicChoice(request.topic)) || !request.cards.every(card => card && tarotCards.some(item => item.id === card.id) && typeof card.reversed === 'boolean' && typeof card.position === 'string' && card.position.length <= 80)) throw new Error('参考资料检索条件无效');
  const topics = detectQuestionTopics(request.question, isTopicChoice(request.topic) ? request.topic : 'auto');
  const selected = knowledgeEntries().filter(entry => entry.enabled && (entry.topic === 'general' || topics.includes(entry.topic as keyof typeof QUESTION_TOPICS)) &&
    (entry.cardIds.length ? request.cards.some(card => entry.cardIds.includes(card.id) && (entry.orientation === 'any' || (card.reversed ? 'reversed' : 'upright') === entry.orientation) && (!entry.position || entry.position === card.position)) : request.cards.some(card => (entry.orientation === 'any' || (card.reversed ? 'reversed' : 'upright') === entry.orientation) && (!entry.position || entry.position === card.position))));
  const score = (entry: KnowledgeEntry) => (entry.cardIds.length ? 4 : 0) + (entry.topic !== 'general' ? 2 : 0) + (entry.position ? 1 : 0) + (entry.orientation !== 'any' ? 1 : 0);
  selected.sort((a, b) => score(b) - score(a));
  const references = selected.slice(0, 8).map(({ id, title, source, content }) => ({ id, title, source, content }));
  for (const drawn of request.cards) {
    const card = tarotCards.find(item => item.id === drawn.id)!;
    for (const topic of topics.slice(0, 2)) references.push({ id: `card-${card.id}-${topic}-${drawn.reversed ? 'reversed' : 'upright'}`, title: `${card.name} ${drawn.reversed ? '逆位' : '正位'} · ${QUESTION_TOPICS[topic]} · ${drawn.position}`, source: '项目内置牌义及领域笔记；外部牌义来源见 docs/knowledge', content: JSON.stringify(getCardKnowledge(card, drawn.reversed, topic)) });
  }
  let size = 0;
  return references.filter(reference => { if (size + reference.content.length > 14000) return false; size += reference.content.length; return true; });
}
