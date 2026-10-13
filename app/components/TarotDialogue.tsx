"use client";

import { useRef, useState } from 'react';
import { useTarotStore, type TarotReading } from '@/lib/store';
import { buildFollowupPrompt, streamTarotPrompt } from '@/lib/deepseek';
import { DialogueTurn, ReadingContext } from '@/lib/tarot-context';
import { MarkdownRenderer } from './MarkdownRenderer';
import { KnowledgeReference } from '@/lib/knowledge-types';
import { KnowledgeReferences } from './KnowledgeReferences';

export function TarotDialogue({ interpretation, readingId, reading }: { interpretation: string; readingId: string | null; reading?: TarotReading }) {
  const session = useTarotStore();
  const { apiKey, model, setApiUsage, setReadingFollowups } = session;
  const question = reading?.question ?? session.question;
  const drawnCards = reading?.cards ?? session.drawnCards;
  const cardReversals = reading?.cardReversals ?? session.cardReversals;
  const recommendedSpread = reading?.spread ?? session.recommendedSpread;
  const profile = reading ? reading.profile : session.profile;
  const topic = reading ? reading.topic ?? 'auto' : session.topic;
  const [turns, setTurns] = useState<DialogueTurn[]>(reading?.followups ?? []);
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const followup = input.trim();
    if (!followup || pending.current) return;
    pending.current = true;
    setBusy(true); setError(''); setAnswer('');
    let content = '';
    let references: KnowledgeReference[] = [];
    const context: ReadingContext = { spread: recommendedSpread ?? undefined, profile, topic };
    try {
      await streamTarotPrompt(buildFollowupPrompt(question, drawnCards, cardReversals, context, interpretation, turns, followup), {
        onContent: chunk => { content += chunk; setAnswer(content); },
        onComplete: () => {
          if (!content.trim()) { setError('回答内容为空，请重试。'); return; }
          const next = [...turns, { question: followup, answer: content, ...(references.length ? { knowledgeReferences: references } : {}) }];
          setTurns(next); setInput(''); setAnswer('');
          if (readingId) setReadingFollowups(readingId, next);
        },
        onError: message => {
          setAnswer('');
          setError(message === 'trial_used' || message === 'quota_exhausted' ? '免费额度已用完，请在设置中填写对应提供商的个人 API Key。' : message.replace(/^API_KEY_NEEDED:/, ''));
        },
        onMeta: meta => { references = meta.knowledgeReferences ?? []; setApiUsage(meta.remainingCalls, meta.usingSystemKey, meta.trialUsed); },
      }, apiKey || undefined, model, { question: followup, cards: drawnCards.map((card, index) => ({ id: card.id, reversed: cardReversals[index] ?? false, position: recommendedSpread?.positions[index] ?? '核心指引' })) });
    } finally { pending.current = false; setBusy(false); }
  };
  return <section className="astro-card p-6 md:p-8">
    <h2 className="astro-card-title mb-3">继续聊聊这组牌</h2>
    <p className="text-white/60 text-sm mb-5">沿用原问题、牌阵和正逆位，每次追问会产生一次 API 调用。最近四轮对话用于承接背景。</p>
    <div className="space-y-5" aria-live="polite">
      {turns.map((turn, index) => <div key={index} className="border-b border-white/10 pb-4">
        <p className="text-gold-light mb-3">你：{turn.question}</p>
        <MarkdownRenderer content={turn.answer} variant="dark" />
        <KnowledgeReferences references={turn.knowledgeReferences} />
      </div>)}
      {answer && <MarkdownRenderer content={answer} variant="dark" />}
      {busy && <p className="text-white/60">正在结合原牌组思考…</p>}
      {error && <p role="alert" className="text-amber-300">{error}</p>}
    </div>
    <form onSubmit={submit} className="mt-5 space-y-3">
      <label htmlFor="followup" className="text-white/80 text-sm">想继续问什么？</label>
      <textarea id="followup" maxLength={500} rows={3} value={input} disabled={busy} onChange={e => setInput(e.target.value)} placeholder="比如：这组牌对我明天可以做的一件小事，有什么建议？" className="block w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white placeholder:text-white/40" />
      <button type="submit" disabled={busy || !input.trim()} className="astro-button px-5 py-3 disabled:opacity-40">{busy ? '正在回答…' : '继续提问'}</button>
    </form>
  </section>;
}
