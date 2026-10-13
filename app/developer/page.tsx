'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OpenAIApiTutorial } from '@/app/components/OpenAIApiTutorial';
import { DeepSeekApiTutorial } from '@/app/components/DeepSeekApiTutorial';
import { KnowledgeManager } from '@/app/components/KnowledgeManager';

export default function DeveloperPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [siteTitle, setSiteTitle] = useState('塔罗指引');
  const [style, setStyle] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [deepseekConfigured, setDeepseekConfigured] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  function accept(data: { authenticated?: boolean; siteTitle?: string; style?: string; openaiConfigured?: boolean; deepseekConfigured?: boolean }) {
    setAuthenticated(!!data.authenticated);
    setSiteTitle(data.siteTitle || '塔罗指引'); setStyle(data.style || '');
    setOpenaiConfigured(!!data.openaiConfigured);
    setDeepseekConfigured(!!data.deepseekConfigured);
  }
  useEffect(() => { fetch('/api/developer').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(accept).catch(() => setMessage('加载失败，请刷新重试')).finally(() => setReady(true)); }, []);
  async function action(body: unknown) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/developer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '操作失败');
      const refreshed = await fetch('/api/developer');
      if (!refreshed.ok) throw new Error('无法刷新设置');
      accept(await refreshed.json()); setPassword(''); setOpenaiKey(''); setDeepseekKey(''); setMessage('操作成功');
    } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-purple-50 p-5 text-gray-800"><div className="mx-auto max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow">
    <Link href="/" className="text-purple-700 underline">进入使用者页面（无需登录）</Link>
    <h1 className="text-2xl font-semibold">开发者后台</h1>
    {!authenticated && <p className="text-sm text-gray-600">新部署没有默认账号；请由部署者在私有环境中配置开发者用户名和初始密码。已有实例沿用保存的密码。</p>}
    {!ready ? <p>正在加载…</p> : !authenticated ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); void action({ action: 'login', username, password }); }}>
      <label className="block">开发者账号<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full rounded border p-3" /></label>
      <label className="block">密码<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded border p-3" /></label>
      <button disabled={busy} className="rounded bg-purple-700 px-5 py-3 text-white">登录</button>
    </form> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void action({ action: 'save', settings: { siteTitle, style, ...(openaiKey ? { openaiKey } : {}), ...(deepseekKey ? { deepseekKey } : {}) } }); }}>
      <p className="text-sm text-gray-600">已登录开发者。这里的修改会影响所有使用者；密钥保存后不回显。</p>
      <label className="block">网站名称<input maxLength={80} value={siteTitle} onChange={e => setSiteTitle(e.target.value)} className="mt-1 w-full rounded border p-3" /></label>
      <label className="block">解读语言偏好<textarea maxLength={1000} rows={4} value={style} onChange={e => setStyle(e.target.value)} placeholder="例如：用简短自然的中文，语气温和，建议尽量具体。" className="mt-1 w-full rounded border p-3" /></label>
      <label className="block">OpenAI 系统 API Key（{openaiConfigured ? '已配置' : '未配置'}）<input type="password" autoComplete="off" maxLength={2000} value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="留空保留已有密钥" className="mt-1 w-full rounded border p-3" /></label>
      <details><summary className="cursor-pointer text-sm text-purple-700 underline">OpenAI Key 配置教程</summary><div className="mt-3"><OpenAIApiTutorial /></div></details>
      <label className="block">DeepSeek 系统 API Key（{deepseekConfigured ? '已配置' : '未配置'}）<input type="password" autoComplete="off" maxLength={2000} value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} placeholder="留空保留已有密钥" className="mt-1 w-full rounded border p-3" /></label>
      <details><summary className="cursor-pointer text-sm text-purple-700 underline">DeepSeek Key 配置教程</summary><div className="mt-3"><DeepSeekApiTutorial /></div></details>
      <p className="text-sm text-gray-600">保存系统密钥后，用户选择对应服务并留空个人密钥即可使用一次系统试用，调用费用由该系统密钥所属账户承担。</p>
      <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded bg-purple-700 px-5 py-3 text-white">保存全局设置</button><button type="button" disabled={busy} onClick={() => void action({ action: 'logout' })} className="rounded border px-5 py-3">退出登录</button></div>
      <div className="flex flex-wrap gap-3 text-sm"><button type="button" disabled={busy} onClick={() => void action({ action: 'save', settings: { openaiKey: '' } })} className="text-red-700 underline">清除后台 OpenAI Key</button><button type="button" disabled={busy} onClick={() => void action({ action: 'save', settings: { deepseekKey: '' } })} className="text-red-700 underline">清除后台 DeepSeek Key</button></div>
    </form>}
    {message && <p role="status" className="text-purple-800">{message}</p>}
    {authenticated && <KnowledgeManager />}
  </div></main>;
}
