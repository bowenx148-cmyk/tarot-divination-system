'use client';
import { useEffect, useState } from 'react';
import { KnowledgeEntry } from '@/lib/knowledge-types';
import { QUESTION_TOPICS } from '@/lib/tarot-knowledge';
import { tarotCards } from '@/lib/tarot-data';
export function KnowledgeManager() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]), [ready, setReady] = useState(false), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/knowledge').then(async response => { if (!response.ok) throw new Error('知识库加载失败'); return response.json(); }).then(data => { if (!Array.isArray(data.entries)) throw new Error('知识库返回格式无效'); setEntries(data.entries); setReady(true); }).catch(error => setMessage(error.message)); }, []);
  const update = (id: string, patch: Partial<KnowledgeEntry>) => setEntries(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  async function save() {
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setEntries(data.entries); setMessage('知识库已保存，后续解读会使用匹配的资料'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '保存失败'); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-purple-200 p-4">
    <h2 className="text-xl font-semibold">知识库管理</h2>
    <p className="text-sm">按领域、牌面、正逆位和牌位检索。启用且匹配的资料会发送给模型，并在使用者的参考依据中显示。内容不会替换解读的基本规则，已保存的咨询保留当时快照。</p>
    {ready && <>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setEntries([...entries, { id: crypto.randomUUID(), title: '新资料', source: '', topic: 'general', cardIds: [], orientation: 'any', position: '', content: '', enabled: true }])} className="rounded border px-3 py-2">添加资料</button>
        <label className="cursor-pointer rounded border px-3 py-2">导入 JSON<input type="file" accept=".json,application/json" className="hidden" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 1100000) throw new Error('文件过大'); const parsed = JSON.parse(await file.text()); const incoming = Array.isArray(parsed) ? parsed : parsed.entries; if (!Array.isArray(incoming) || incoming.length > 300 || !incoming.every((item: Partial<KnowledgeEntry>) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.source === 'string' && typeof item.content === 'string' && typeof item.position === 'string' && typeof item.enabled === 'boolean' && Array.isArray(item.cardIds) && item.cardIds.every(id => typeof id === 'string') && typeof item.topic === 'string' && Object.hasOwn(QUESTION_TOPICS, item.topic) && ['any', 'upright', 'reversed'].includes(item.orientation || ''))) throw new Error('需要格式完整的条目数组'); if (new Set([...entries, ...incoming].map(item => item.id)).size !== entries.length + incoming.length) throw new Error('存在重复ID，请先修改ID'); setEntries([...entries, ...incoming]); setMessage('已导入到编辑区，请检查并保存；重复ID会被拒绝'); } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败'); } event.target.value = ''; }} /></label></div>
      <p className="text-xs">JSON 条目包含 id、title、source、topic、cardIds（牌ID数组）、orientation（any/upright/reversed）、position、content、enabled。<a href="/knowledge-template.json" download className="text-purple-700 underline">下载导入模板</a>，或复制下方JSON格式；资料应自行整理或取得使用授权。</p>
      {entries.map(entry => <details key={entry.id} className="rounded border p-3"><summary className="cursor-pointer">{entry.title || '未命名资料'} · {entry.enabled ? '启用' : '停用'}</summary><div className="mt-3 space-y-3">
        <label className="block">标题<input maxLength={100} value={entry.title} onChange={event => update(entry.id, { title: event.target.value })} className="block w-full rounded border p-2" /></label>
        <label className="block">出处 / 链接<input maxLength={300} value={entry.source} onChange={event => update(entry.id, { source: event.target.value })} className="block w-full rounded border p-2" /></label>
        <label className="block">适用领域<select value={entry.topic} onChange={event => update(entry.id, { topic: event.target.value })} className="block w-full rounded border p-2">{Object.entries(QUESTION_TOPICS).map(([id, name]) => <option key={id} value={id}>{name}{id === 'general' ? '（通用）' : ''}</option>)}</select></label>
        <label className="block">适用牌（按住 Ctrl / Command 可多选；不选为通用）<select multiple value={entry.cardIds} onChange={event => update(entry.id, { cardIds: Array.from(event.target.selectedOptions).map(option => option.value) })} className="block h-28 w-full rounded border p-2">{tarotCards.map(card => <option key={card.id} value={card.id}>{card.name} · {card.id}</option>)}</select></label>
        <label className="block">正逆位<select value={entry.orientation} onChange={event => update(entry.id, { orientation: event.target.value as KnowledgeEntry['orientation'] })} className="block rounded border p-2"><option value="any">不限</option><option value="upright">正位</option><option value="reversed">逆位</option></select></label>
        <label className="block">牌位（留空为不限）<input maxLength={80} value={entry.position} onChange={event => update(entry.id, { position: event.target.value })} className="block w-full rounded border p-2" /></label>
        <label className="block">参考内容<textarea rows={6} maxLength={5000} value={entry.content} onChange={event => update(entry.id, { content: event.target.value })} className="block w-full rounded border p-2" /></label>
        <label><input type="checkbox" checked={entry.enabled} onChange={event => update(entry.id, { enabled: event.target.checked })} /> 启用</label>
        <button type="button" onClick={() => setEntries(entries.filter(item => item.id !== entry.id))} className="ml-4 text-red-700 underline">删除此条（保存后生效）</button>
      </div></details>)}
      <button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-purple-700 px-4 py-2 text-white">保存知识库</button>
      <details><summary>查看 / 复制 JSON 格式</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(entries, null, 2)}</pre></details>
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
