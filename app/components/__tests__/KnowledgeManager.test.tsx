import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KnowledgeManager } from '@/app/components/KnowledgeManager';
import { KnowledgeReferences } from '@/app/components/KnowledgeReferences';
afterEach(() => vi.unstubAllGlobals());
it('编辑并保存资料、出处与适用领域，保存失败明确显示', async () => {
  const entry = { id: 'note', title: '感情资料', source: '自己的笔记', topic: 'love', cardIds: [], orientation: 'any', position: '', content: '观察行动', enabled: true };
  const fetchMock = vi.fn().mockImplementation(async (_url, options) => options ? Response.json({ message: '知识条目格式无效' }, { status: 400 }) : Response.json({ entries: [entry] }));
  vi.stubGlobal('fetch', fetchMock);
  render(<KnowledgeManager />);
  fireEvent.change(await screen.findByLabelText('参考内容'), { target: { value: '关注是否兑现约定' } });
  fireEvent.click(screen.getByText('保存知识库'));
  await waitFor(() => expect(screen.getByText('知识条目格式无效')).toBeInTheDocument());
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).entries[0]).toMatchObject({ source: '自己的笔记', topic: 'love', content: '关注是否兑现约定' });
});
it('参考依据展示实际资料快照，提示不是模型逐字引用', () => {
  render(<KnowledgeReferences references={[{ id: 'note', title: '资料标题', source: '笔记出处', content: '当时发送的内容' }]} />);
  expect(screen.getByText('查看本次参考依据（1条）')).toBeInTheDocument();
  expect(screen.getByText('当时发送的内容')).toBeInTheDocument();
  expect(screen.getByText(/不代表模型逐字引用/)).toBeInTheDocument();
});
