"use client";

import { useState } from 'react';
import Link from 'next/link';
import { tarotCards } from '@/lib/tarot-data';
import { CardImage } from '@/app/components/CardImage';
import { getCardKnowledge, QUESTION_TOPICS, QuestionTopic } from '@/lib/tarot-knowledge';

export default function CardsPage() {
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [reversed, setReversed] = useState(false);
  const [topic, setTopic] = useState<QuestionTopic>('general');
  const visible = tarotCards.filter(card =>
    (family === 'all' || card.arcana === family || card.suit === family) &&
    `${card.name} ${card.nameEn} ${card.keywordsUpright.join(' ')} ${card.keywordsReversed.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  return <main className="min-h-screen bg-purple-50 px-4 py-8 text-gray-800">
    <div className="max-w-5xl mx-auto">
      <Link href="/" className="text-purple-700 underline">← 返回首页</Link>
      <h1 className="text-3xl font-bold mt-6">78 张塔罗牌 · 牌义手册</h1>
      <p className="mt-3 text-gray-600">牌义是理解问题的象征语言。结合问题和牌位阅读，逆位不等于坏事；未来位置也不意味着必然发生。</p>
      <div className="flex flex-wrap gap-3 my-6">
        <input aria-label="搜索牌名或关键词" placeholder="搜索：权杖六、The Sun、勇气…" value={search} onChange={e => setSearch(e.target.value)} className="border rounded-xl p-3 flex-1 min-w-48 bg-white" />
        <select aria-label="牌组" value={family} onChange={e => setFamily(e.target.value)} className="border rounded-xl p-3 bg-white">
          <option value="all">全部牌组</option><option value="major">大阿尔卡纳</option><option value="wands">权杖</option><option value="cups">圣杯</option><option value="swords">宝剑</option><option value="pentacles">星币</option>
        </select>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reversed} onChange={e => setReversed(e.target.checked)} />查看逆位</label>
        <select aria-label="牌义领域" value={topic} onChange={event => setTopic(event.target.value as QuestionTopic)} className="border rounded-xl p-3 bg-white">
          {Object.entries(QUESTION_TOPICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <p role="status" className="text-sm mb-4">找到 {visible.length} 张牌 · {reversed ? '逆位' : '正位'}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map(card => <article key={card.id} className="bg-white rounded-2xl border border-purple-100 p-5 flex gap-4">
          <div className={`relative w-24 h-36 shrink-0 overflow-hidden rounded-lg ${reversed ? 'rotate-180' : ''}`}><CardImage card={card} /></div>
          <div><h2 className="text-lg font-bold">{card.name} · {reversed ? '逆位' : '正位'}</h2><p className="text-xs text-gray-500">{card.nameEn}</p>
            <p className="text-sm text-purple-700 mt-2">{(reversed ? card.keywordsReversed : card.keywordsUpright).join(' · ')}</p>
            <p className="text-sm leading-6 mt-2">{reversed ? card.meaningReversed : card.meaningUpright}</p>
            {topic !== 'general' && <div className="mt-3 bg-purple-50 rounded-lg p-3"><p className="font-semibold text-sm text-purple-800">{QUESTION_TOPICS[topic]}参考</p><p className="text-sm leading-6">{getCardKnowledge(card, reversed, topic).meaning}</p></div>}
          </div>
        </article>)}
      </div>
      <footer className="text-xs text-gray-500 mt-8 space-y-2">
        <p>综合中文牌义沿用原牌库；领域中文内容为本地逐牌编辑的象征性参考。感情、事业另有Tarotoo（MIT）英文素材用于AI解读，不是对用户事实的判断。</p>
        <p><a className="underline" href="https://github.com/Tarotoo-com/tarotoo-tarot-dataset">Tarotoo数据来源</a></p>
        <p>阅读参考：<a href="https://www.learntarot.com/less17.htm" className="underline">Joan Bunning：逆位</a> · <a href="https://www.learntarot.com/quickinsight.htm" className="underline">三牌反思</a> · <a href="https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot" className="underline">Waite 原著</a></p>
      </footer>
    </div>
  </main>;
}
