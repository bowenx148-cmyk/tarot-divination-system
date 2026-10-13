'use client';

import { tarotSpreads, type TarotSpread } from '@/lib/store';
import { spreadLayouts } from '@/lib/spread-layouts';
import { useEffect, useRef, useState } from 'react';
import { QUESTION_TOPICS, type QuestionTopic } from '@/lib/tarot-knowledge';
import { TOPIC_SPREADS } from '@/lib/question-guide';

export function SpreadDiagram({ spread }: { spread: TarotSpread }) {
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" className="mx-auto w-full max-w-[260px]">
      <path d="M18 18H242V172H18Z" fill="none" stroke="#a38445" opacity=".2" />
      {spreadLayouts[spread.id].map(([x, y], i) => (
        <g key={i} transform={`translate(${x}, ${y})`} data-card-number={i + 1}>
          <rect x="-17" y="-23" width="34" height="46" rx="3" fill="#151b20" stroke="#a38445" strokeWidth="1.5" />
          <rect x="-13" y="-19" width="26" height="38" rx="2" fill="none" stroke="#d6ba76" opacity=".5" />
          <path d="M0 -17V17M-11 0H11" stroke="#d6ba76" opacity=".25" />
          <circle r="11" fill="#151b20" stroke="#d6ba76" opacity=".9" />
          <text textAnchor="middle" dominantBaseline="central" fill="#f1d891" fontSize="13" fontWeight="700">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

export function SpreadGallery({ selectedId, onSelect, selectedSpread, topics = ['general'] }: {
  selectedId: string;
  onSelect: (id: string) => void;
  selectedSpread: TarotSpread;
  topics?: QuestionTopic[];
}) {
  const [filter, setFilter] = useState<QuestionTopic | 'all'>('all');
  const visibleSpreads = filter === 'all' ? tarotSpreads : tarotSpreads.filter(spread => TOPIC_SPREADS[filter].includes(spread.id));
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailSpread = tarotSpreads.find(spread => spread.id === detailId);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastDetailId = useRef<string | null>(null);
  useEffect(() => {
    if (detailId) {
      lastDetailId.current = detailId;
      headingRef.current?.focus();
    } else if (lastDetailId.current && document.activeElement === document.body) {
      fieldsetRef.current?.querySelector<HTMLInputElement>(`input[value="${lastDetailId.current}"]`)?.focus();
    }
  }, [detailId]);
  return (
    <fieldset ref={fieldsetRef} className="mt-6 min-w-0 space-y-3">
      <legend className="text-lg font-semibold text-gray-800">选择牌阵</legend>
      <p className="text-sm text-gray-600">点击牌阵查看详细说明，了解每个位置后再开始抽牌。</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="spread-topic-filter" className="text-gray-700">按问题种类查看牌阵</label>
        <select id="spread-topic-filter" value={filter} onChange={event => { setFilter(event.target.value as QuestionTopic | 'all'); setDetailId(null); }} className="rounded-lg border border-amber-200 bg-white p-2 text-gray-800">
          <option value="all">全部牌阵</option>
          {Object.entries(QUESTION_TOPICS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select>
        <button type="button" onClick={() => { setFilter(topics[0]); setDetailId(null); }} className="rounded-lg bg-purple-50 p-2 text-purple-800">查看适合「{QUESTION_TOPICS[topics[0]]}」的牌阵</button>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 focus-within:ring-2 focus-within:ring-amber-600">
        <input type="radio" name="spread" value="auto" checked={selectedId === 'auto'} onChange={() => { onSelect('auto'); setDetailId(null); }} className="accent-amber-700" aria-label="自动推荐" />
        <span>自动推荐 <span className="text-amber-800">· 根据问题选择（当前：{selectedId === 'auto' ? selectedSpread.name : '手动选择'}）</span></span>
      </label>
      {detailSpread ? (
        <section className="overflow-hidden rounded-xl border-2 border-[#d8c295] bg-[#f6e8c5]" aria-label={`${detailSpread.name}详细说明`}>
          <div className="flex items-center justify-between gap-3 bg-[#191c22] p-4 text-[#f0d58b]">
            <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold">{detailSpread.name} · {detailSpread.cardCount} 张</h3>
            <button type="button" onClick={() => setDetailId(null)} className="rounded-lg border border-[#cdb578] px-3 py-2 text-sm focus-visible:outline-2">返回牌阵列表</button>
          </div>
          <div className="p-5 text-[#534128]">
            <p className="text-sm leading-6">{detailSpread.description}</p>
            <p className="mt-2 text-sm"><strong>适合提问：</strong>{detailSpread.category.join('、')}</p>
            <div className="mt-4 grid items-center gap-4 md:grid-cols-2">
              <SpreadDiagram spread={detailSpread} />
              <div>
                <h4 className="mb-3 font-semibold">每张牌代表什么</h4>
                <ol className="space-y-2 text-sm leading-6">
                  {detailSpread.positions.map((position, i) => <li key={position}><strong className="mr-2 text-amber-900">{i + 1}</strong>{position}</li>)}
                </ol>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[#ceb781] bg-white/30 p-3 text-sm leading-6">
              <h4 className="font-semibold">怎么使用这个牌阵</h4>
              <p>先明确一个问题，再按图中 1 → {detailSpread.cardCount} 的编号依次抽牌。每个编号对应右侧的牌位含义；解读时把牌义放回这个位置理解，再结合其他牌看整体建议。</p>
              {detailSpread.id === 'two-choice' && <p className="mt-1">请在问题里写清 A 和 B 分别是什么，例如「A 留在当前岗位，B 换到新团队」。两条路线使用同一时间范围比较。</p>}
            </div>
            <button type="button" onClick={() => { onSelect(detailSpread.id); setDetailId(null); }} className="mt-4 rounded-lg bg-[#191c22] px-5 py-3 text-sm font-semibold text-[#f0d58b] focus-visible:outline-2 focus-visible:outline-amber-700">确认使用这个牌阵</button>
          </div>
        </section>
      ) : <div className="grid max-h-[680px] grid-cols-1 gap-4 overflow-y-auto rounded-xl p-1 sm:grid-cols-2 lg:grid-cols-3" tabIndex={0} aria-label="牌阵图鉴，向下滚动浏览全部牌阵">
        {visibleSpreads.map(spread => {
          const selected = selectedId === spread.id;
          return (
            <label key={spread.id} onClick={() => { onSelect(spread.id); setDetailId(spread.id); }} className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-[#f6e8c5] shadow-sm transition focus-within:ring-2 focus-within:ring-amber-600 focus-within:ring-offset-2 ${selected ? 'border-amber-600 ring-2 ring-amber-400 ring-offset-2' : 'border-[#d8c295] hover:border-amber-500'}`}>
              <div className="bg-[#191c22] px-4 py-3 text-[#f0d58b]">
                <div className="flex items-center gap-2">
                  <input type="radio" name="spread" value={spread.id} checked={selected} onChange={() => { onSelect(spread.id); setDetailId(spread.id); }} aria-label={`${spread.name} · ${spread.cardCount}张`} className="h-4 w-4 shrink-0 accent-amber-600" />
                  <span className="flex-1 text-base font-semibold">{spread.name}</span>
                  <span className="whitespace-nowrap text-xs">{spread.cardCount} 张</span>
                </div>
                <p className="mt-1 text-center text-[10px] tracking-[.3em] text-[#cdb578]">✦ 基础牌阵 ✦</p>
              </div>
              <SpreadDiagram spread={spread} />
              <div className="flex flex-1 flex-col px-4 pb-4 text-[#534128]">
                <p className="text-xs leading-5"><span className="font-semibold">适合：</span>{spread.category.join('、')}</p>
                <p className="mt-2 text-xs font-semibold text-amber-900">查看牌位说明 →</p>
                {selected && <span className="mt-2 text-xs font-semibold text-amber-900">✓ 已选择此牌阵</span>}
              </div>
            </label>
          );
        })}
      </div>}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" aria-live="polite" aria-atomic="true">
        <p className="font-semibold text-amber-950">已选：{selectedSpread.name}</p>
        <p className="mt-1 text-sm text-purple-700">本次抽 {selectedSpread.cardCount} 张：{selectedSpread.positions.join(' → ')}</p>
      </div>
      <p className="text-xs leading-5 text-gray-500">未来与结果代表当前趋势。涉及他人的想法请通过沟通核实，牌面不能替代对方的真实表达。</p>
    </fieldset>
  );
}
