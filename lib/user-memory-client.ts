'use client';
import { create } from 'zustand';
import { DEFAULT_USER_ID, readingOwner, TarotReading, useTarotStore } from './store';
import { getOrCreateDeviceId } from './deviceId';
interface User { id: string; name: string }
export const useUserMemory = create<{ user: User | null; ready: boolean; message: string }>(() => ({ user: null, ready: false, message: '' }));
let applying = false;
let queue = Promise.resolve();
export function applyUserMemory(data: { user: User | null; readings: TarotReading[] }) {
  applying = true;
  const state = useTarotStore.getState();
  if (!data.user && !state.activeUserId.startsWith('account-')) {
    useUserMemory.setState({ user: null, ready: true, message: '' }); applying = false; return;
  }
  state.resetSession();
  useTarotStore.setState({ users: [...state.users.filter(user => !user.id.startsWith('account-')), ...(data.user ? [data.user] : [])], activeUserId: data.user?.id || DEFAULT_USER_ID,
    readings: [...state.readings.filter(record => !readingOwner(record).startsWith('account-')), ...data.readings.map(record => ({ ...record, timestamp: new Date(record.timestamp), userId: data.user!.id }))], apiKey: '', encryptedApiKey: null });
  useUserMemory.setState({ user: data.user, ready: true, message: '' }); applying = false;
}
export async function userMemoryAction(action: string, name?: string) {
  await queue;
  const response = await fetch('/api/user-memory', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Id': getOrCreateDeviceId() }, body: JSON.stringify({ action, name }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '操作失败');
  applyUserMemory(data);
}
export function retryUserMemory() {
  useTarotStore.setState(state => ({ readings: [...state.readings] }));
}
export function startUserMemory() {
  let cancelled = false;
  const unsubscribe = useTarotStore.subscribe((state, previous) => {
    const user = useUserMemory.getState().user;
    if (applying || !user || state.activeUserId !== user.id || state.readings === previous.readings) return;
    const readings = state.readings.filter(record => readingOwner(record) === user.id);
    useUserMemory.setState({ message: '历史同步中…' });
    queue = queue.then(async () => {
      const response = await fetch('/api/user-memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', userId: user.id, readings }) });
      if (!response.ok) throw new Error((await response.json()).message || '历史保存失败');
      useUserMemory.setState({ message: '历史已同步' });
    }).catch(error => useUserMemory.setState({ message: `历史未同步：${error.message}。请保留页面，修改记录后重试。` }));
  });
  fetch('/api/user-memory').then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { if (!cancelled) applyUserMemory(data); }).catch(() => { if (!cancelled) useUserMemory.setState({ ready: true, message: '无法加载账号历史，请刷新重试' }); });
  return () => { cancelled = true; unsubscribe(); };
}
