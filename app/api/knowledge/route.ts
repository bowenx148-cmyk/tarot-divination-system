import { NextRequest, NextResponse } from 'next/server';
import { isDeveloper } from '@/lib/server/developer';
import { knowledgeEntries, saveKnowledgeEntries } from '@/lib/server/knowledge-library';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: NextRequest) {
  if (!isDeveloper(request.cookies.get('tarot-developer')?.value)) return json({ message: '需要开发者登录' }, 401);
  return json({ entries: knowledgeEntries() });
}
export async function POST(request: NextRequest) {
  if (!isDeveloper(request.cookies.get('tarot-developer')?.value)) return json({ message: '需要开发者登录' }, 401);
  if (request.headers.get('origin') !== `${request.nextUrl.protocol}//${request.headers.get('host') || request.nextUrl.host}`) return json({ message: '只允许同源操作' }, 403);
  const text = await request.text(); if (text.length > 1100000) return json({ message: '内容过长' }, 413);
  try { saveKnowledgeEntries(JSON.parse(text).entries); return json({ entries: knowledgeEntries() }); }
  catch (error) { return json({ message: error instanceof Error ? error.message : '保存失败' }, 400); }
}
