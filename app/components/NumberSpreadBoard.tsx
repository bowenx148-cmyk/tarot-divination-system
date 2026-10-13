'use client';
import { motion } from 'framer-motion';
import type { TarotSpread } from '@/lib/store';
import type { SelectionFill } from '@/lib/drawFlow';
import { spreadLayouts } from '@/lib/spread-layouts';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';

export function NumberSpreadBoard({ spread, fills, numbers, reducedMotion = false }: { spread: TarotSpread; fills: (SelectionFill | null)[]; numbers: (number | null)[]; reducedMotion?: boolean }) {
  return <section aria-label="报数牌阵翻牌" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
    <h3 className="text-center font-semibold">{spread.name} · 按牌位依次翻开</h3>
    <div className="relative mx-auto mt-2 aspect-[260/190] w-full max-w-md">
      {spreadLayouts[spread.id].map(([x, y], index) => <div key={index} data-number-slot={index + 1} className="absolute" style={{ left: `${(x - 17) / 260 * 100}%`, top: `${(y - 23) / 190 * 100}%`, width: `${34 / 260 * 100}%`, height: `${46 / 190 * 100}%` }}>
        {fills[index] ? <motion.div key={`face-${numbers[index]}`} initial={reducedMotion ? false : { rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0 : .55 }} className={`h-full w-full ${reducedMotion ? '' : 'draw-reveal-glow'}`} data-number-revealed={numbers[index]}><CardFace card={fills[index]!.card} reversed={fills[index]!.reversed} /></motion.div> : <CardBack />}
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-100 px-1 text-[10px]">{index + 1}位{numbers[index] ? ` · ${numbers[index]}号` : ''}</span>
      </div>)}
    </div>
  </section>;
}
