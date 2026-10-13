import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { applyUserMemory, startUserMemory, useUserMemory, userMemoryAction } from '@/lib/user-memory-client';
import { DEFAULT_USER_ID, TarotReading, useTarotStore } from '@/lib/store';
const user = { id: 'account-test', name: 'Alice' };
const reading = (id: string, owner: string): TarotReading => ({ id, userId: owner, question: '感情', interpretation: '解读', advice: '', cards: [], cardReversals: [], spread: { id: 'single', name: '单牌', cardCount: 1, positions: ['核心'], description: '', category: [] }, timestamp: new Date() });
afterEach(() => { vi.unstubAllGlobals(); useUserMemory.setState({ user: null, ready: false, message: '' }); useTarotStore.setState({ readings: [], users: [{ id: DEFAULT_USER_ID, name: '游客' }], activeUserId: DEFAULT_USER_ID }); });
it('游客加载账号状态不清空当前牌局；登录后账号记录不写浏览器持久化', () => {
  useTarotStore.setState({ question: '正在询问', activeUserId: DEFAULT_USER_ID, readings: [reading('guest', DEFAULT_USER_ID)] });
  applyUserMemory({ user: null, readings: [] });
  expect(useTarotStore.getState().question).toBe('正在询问');
  applyUserMemory({ user, readings: [reading('private', user.id)] });
  const persisted = useTarotStore.persist.getOptions().partialize!(useTarotStore.getState()) as { readings: TarotReading[]; activeUserId: string };
  expect(persisted.readings.map(record => record.id)).toEqual(['guest']);
  expect(persisted.activeUserId).toBe(DEFAULT_USER_ID);
  applyUserMemory({ user: null, readings: [] });
  expect(useTarotStore.getState().readings.map(record => record.id)).toEqual(['guest']);
});
it('保存和追问同步本人记录；退出清理账号和当前咨询', async () => {
  const fetchMock = vi.fn().mockImplementation(async (_url, options) => {
    const body = options && JSON.parse(options.body);
    return Response.json(body?.action === 'logout' ? { user: null, readings: [] } : body?.action === 'save' ? { saved: true } : { user, readings: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
  const stop = startUserMemory();
  try {
    await waitFor(() => expect(useUserMemory.getState().user?.id).toBe(user.id));
    useTarotStore.getState().addReading(reading('new', user.id));
    await waitFor(() => expect(useUserMemory.getState().message).toBe('历史已同步'));
    const save = fetchMock.mock.calls.find(call => call[1] && JSON.parse(call[1].body).action === 'save');
    expect(JSON.parse(save![1].body).readings.map((record: TarotReading) => record.id)).toEqual(['new']);
    await userMemoryAction('logout');
    expect(useTarotStore.getState().readings).toEqual([]);
    expect(useUserMemory.getState().user).toBeNull();
  } finally { stop(); }
});
