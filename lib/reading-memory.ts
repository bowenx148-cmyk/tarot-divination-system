import { readingOwner, type TarotReading } from './store';
import type { ReadingContext } from './tarot-context';

export function previousConsultation(readings: TarotReading[], userId: string, id: string | null): ReadingContext['previousConsultation'] {
  const reading = readings.find(r => r.id === id && readingOwner(r) === userId);
  if (!reading) return undefined;
  return {
    question: reading.question.slice(0, 500),
    cards: reading.cards.map((card, index) => ({ name: card.name, position: reading.spread.positions[index], reversed: reading.cardReversals?.[index] ?? false })),
    interpretation: reading.interpretation.slice(0, 2500),
    followups: (reading.followups ?? []).slice(-4).map(turn => ({ question: turn.question.slice(0, 300), answer: turn.answer.slice(0, 500) })),
  };
}
