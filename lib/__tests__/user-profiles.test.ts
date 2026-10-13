import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_USER_ID, readingOwner, tarotSpreads, useTarotStore } from '@/lib/store';
import { tarotCards } from '@/lib/tarot-data';

const reading = (id: string) => ({ id, question: `问题${id}`, spread: tarotSpreads[0], cards: [tarotCards[0]], cardReversals: [true], interpretation: '解读', advice: '建议', timestamp: new Date() });
describe('本机用户历史分隔', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    useTarotStore.setState({ users: [{ id: DEFAULT_USER_ID, name: '默认用户' }], activeUserId: DEFAULT_USER_ID, readings: [], apiKey: '', encryptedApiKey: null });
    useTarotStore.getState().resetSession();
  });
  it('切换清空牌局、背景、Key，A/B历史保留且分别归属', () => {
    const store = useTarotStore.getState();
    const a = store.createUser('用户A')!; const b = store.createUser('用户B')!;
    store.switchUser(a); store.addReading(reading('a'));
    useTarotStore.setState({ question: 'A的私密问题', apiKey: 'A-key', encryptedApiKey: 'A-cipher', drawnCards: [tarotCards[0]], profile: { nickname: 'A', birthday: '2000-01-01', background: 'A的背景' } });
    store.switchUser(b); store.addReading(reading('b'));
    const state = useTarotStore.getState();
    expect(state.question).toBe(''); expect(state.drawnCards).toEqual([]);
    expect(state.profile.background).toBe(''); expect(state.apiKey).toBe(''); expect(state.encryptedApiKey).toBeNull();
    expect(state.readings.filter(r => readingOwner(r) === a).map(r => r.id)).toEqual(['a']);
    expect(state.readings.filter(r => readingOwner(r) === b).map(r => r.id)).toEqual(['b']);
    store.setReadingFollowups('a', [{ question: '越界', answer: '不应该出现' }]); store.removeReading('a');
    expect(useTarotStore.getState().readings.find(r => r.id === 'a')?.followups).toBeUndefined();
    expect(useTarotStore.getState().readings).toHaveLength(2);
  });
  it('旧记录归默认档案，持久化重新载入不会删除或误归其他用户', () => {
    const original = reading('old');
    localStorage.setItem('tarot-store', JSON.stringify({ state: { readings: [original] }, version: 0 }));
    useTarotStore.persist.rehydrate();
    expect(useTarotStore.getState().readings[0].id).toBe('old');
    expect(readingOwner(useTarotStore.getState().readings[0])).toBe(DEFAULT_USER_ID);
    const a = useTarotStore.getState().createUser('A')!;
    useTarotStore.getState().switchUser(a);
    useTarotStore.persist.rehydrate();
    expect(useTarotStore.getState().activeUserId).toBe(a);
    expect(useTarotStore.getState().readings).toHaveLength(1);
  });
  it('每个用户50条上限互不挤掉其他用户记录，异步结果按原用户归属', () => {
    const store = useTarotStore.getState();
    const a = store.createUser('A')!; const b = store.createUser('B')!;
    store.switchUser(a); store.addReading(reading('a'));
    store.switchUser(b);
    for (let i = 0; i < 55; i++) store.addReading(reading(`b${i}`));
    store.addReading({ ...reading('a-late'), userId: a });
    expect(useTarotStore.getState().readings.filter(r => readingOwner(r) === a)).toHaveLength(2);
    expect(useTarotStore.getState().readings.filter(r => readingOwner(r) === b)).toHaveLength(50);
  });
  it('加密保存尚未完成时切换用户，不能将A的Key密文写入B', async () => {
    const store = useTarotStore.getState();
    const a = store.createUser('A')!; const b = store.createUser('B')!;
    store.switchUser(a);
    const saving = store.setApiKey('A-private-key', true);
    store.switchUser(b);
    await saving;
    expect(useTarotStore.getState().apiKey).toBe('');
    expect(useTarotStore.getState().encryptedApiKey).toBeNull();
    expect(localStorage.getItem('tarot-store')).not.toContain('A-private-key');
  });
});
