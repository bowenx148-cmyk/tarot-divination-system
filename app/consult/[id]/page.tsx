'use client';
import { useParams } from 'next/navigation';
import { readingOwner, useTarotStore } from '@/lib/store';
import { TarotDialogue } from '@/app/components/TarotDialogue';
import { MarkdownRenderer } from '@/app/components/MarkdownRenderer';
import { ApiKeySettings } from '@/app/components/ApiKeySettings';
import { KnowledgeReferences } from '@/app/components/KnowledgeReferences';

export default function ConsultPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTarotStore();
  const reading = store.readings.find(r => r.id === id && readingOwner(r) === store.activeUserId);
  return <main className="min-h-screen bg-[#16132b] p-5 text-white"><div className="mx-auto max-w-3xl space-y-5">
    <a href="/history" className="text-amber-200 underline">返回当前用户历史记录</a>
    <ApiKeySettings currentModel={store.model} onModelChange={store.setModel} currentApiKey={store.apiKey} onApiKeyChange={store.setApiKey} />
    {!reading ? <p>当前用户没有这条记录，或记录已删除。</p> : <>
      <h1 className="text-2xl font-semibold">继续这次咨询</h1>
      <section className="rounded-xl border border-white/20 p-5"><p>{reading.question}</p><p className="mt-2 text-sm text-white/70">本次带入：原问题、{reading.spread.name}牌阵、牌位和正逆位、原解读及最近四轮追问。沿用原牌组，不重新抽牌。</p><ol className="mt-3 space-y-1">{reading.cards.map((card, index) => <li key={index}>{index + 1}. {reading.spread.positions[index]}：{card.name}（{reading.cardReversals?.[index] ? '逆位' : '正位'}）</li>)}</ol></section>
      <details className="rounded-xl border border-white/20 p-5"><summary>查看原解读</summary><MarkdownRenderer content={reading.interpretation} variant="dark" /></details>
      <KnowledgeReferences references={reading.knowledgeReferences} />
      <TarotDialogue key={`${store.activeUserId}:${reading.id}`} interpretation={reading.interpretation} readingId={reading.id} reading={reading} />
    </>}
  </div></main>;
}
