import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { knowledgeEntries, retrieveKnowledge, saveKnowledgeEntries } from '@/lib/server/knowledge-library';
import { tarotCards } from '@/lib/tarot-data';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/knowledge/route';
let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'tarot-knowledge-')); vi.stubEnv('TAROT_DATA_DIR', directory); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(directory, { recursive: true, force: true }); });
it('按牌、领域、正逆位和牌位匹配，保留实际发送的出处与快照', () => {
  const entry = { id: 'custom', title: '我的资料', source: '用户笔记', topic: 'love', cardIds: [tarotCards[0].id], orientation: 'reversed', position: '建议', content: '核实沟通而不猜测', enabled: true };
  saveKnowledgeEntries([entry]);
  const request = { question: '感情', cards: [{ id: tarotCards[0].id, reversed: true, position: '建议' }] };
  const references = retrieveKnowledge(request);
  expect(references.find(item => item.id === 'custom')).toMatchObject({ source: '用户笔记', content: entry.content });
  expect(retrieveKnowledge({ ...request, cards: [{ ...request.cards[0], reversed: false }] }).some(item => item.id === 'custom')).toBe(false);
  expect(retrieveKnowledge({ ...request, question: '考试', cards: request.cards }).some(item => item.id === 'custom')).toBe(false);
  saveKnowledgeEntries([{ ...entry, content: '已修改' }]);
  expect(references.find(item => item.id === 'custom')!.content).toBe('核实沟通而不猜测');
  expect(() => saveKnowledgeEntries([entry, entry])).toThrow();
  expect(() => saveKnowledgeEntries([{ ...entry, cardIds: ['invalid'] }])).toThrow();
});
it('访客无法读写管理资料', async () => {
  expect((await GET(new NextRequest('http://localhost/api/knowledge'))).status).toBe(401);
  expect((await POST(new NextRequest('http://localhost/api/knowledge', { method: 'POST', body: '{}' }))).status).toBe(401);
});
it('教学种子牌义能按领域和正逆位命中，停用后不再被检索', () => {
  const entries = knowledgeEntries();
  expect(entries.filter(entry => entry.id.startsWith('teaching-'))).toHaveLength(24);
  const request = { question: '半年内的感情', cards: [{ id: 'cups-02', reversed: false, position: '结果趋势' }] };
  expect(retrieveKnowledge(request).find(entry => entry.id === 'teaching-cups-two-love')?.content).toContain('双方行动');
  expect(retrieveKnowledge({ ...request, cards: [{ ...request.cards[0], reversed: true }] }).some(entry => entry.id === 'teaching-cups-two-love')).toBe(false);
  saveKnowledgeEntries(entries.map(entry => entry.id === 'teaching-cups-two-love' ? { ...entry, enabled: false } : entry));
  expect(retrieveKnowledge(request).some(entry => entry.id === 'teaching-cups-two-love')).toBe(false);
});
