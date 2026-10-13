"use client";
import { useState } from 'react';
import { useUserMemory, userMemoryAction, retryUserMemory } from '@/lib/user-memory-client';
export function UserProfiles() {
  const { user, ready, message } = useUserMemory();
  const [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function action(kind: string) {
    setBusy(true); setError('');
    try { await userMemoryAction(kind, name); setName(''); } catch (error) { setError(error instanceof Error ? error.message : '操作失败'); } finally { setBusy(false); }
  }
  return <section className="bg-white border border-purple-200 rounded-2xl p-4 mb-5 text-gray-700">
    <h2 className="font-semibold">使用者登录 / 咨询记忆</h2>
    {!ready ? <p>正在加载账号…</p> : user ? <div className="mt-3 flex items-center justify-between"><span>当前用户：{user.name}</span><button disabled={busy} type="button" onClick={() => void action('logout')} className="text-purple-700 underline">退出登录</button></div> : <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void action('login'); }}>
      <input aria-label="使用者用户名" maxLength={40} required value={name} onChange={event => setName(event.target.value)} placeholder="输入用户名，英文不区分大小写" className="min-w-0 flex-1 rounded-lg border p-2" />
      <button disabled={busy} className="rounded-lg bg-purple-600 px-4 py-2 text-white">登录</button>
      <button disabled={busy || !name.trim()} type="button" onClick={() => void action('register')} className="rounded-lg border px-4 py-2">注册用户名</button>
    </form>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    {user && message.startsWith('历史未同步') && <button type="button" onClick={retryUserMemory} className="mt-2 text-purple-700 underline">重试保存历史</button>}
    <p className="mt-3 text-xs text-gray-500">同一浏览器只能注册一个用户名；已有用户可直接登录。账号或浏览器已使用试用，就不会再次赠送。登录后保存最近50条咨询，下次登录可恢复。没有密码，知道用户名的人也能登录查看，请勿记录敏感隐私。游客旧记录仅在本浏览器，注册不会自动上传。</p>
  </section>;
}
