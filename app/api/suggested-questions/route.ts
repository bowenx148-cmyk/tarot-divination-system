import { NextResponse } from 'next/server';
import { QUESTION_EXAMPLES } from '@/lib/question-guide';

export async function GET() {
  return NextResponse.json({ questions: Object.values(QUESTION_EXAMPLES).flat(), groups: QUESTION_EXAMPLES, timestamp: new Date().toISOString() });
}
