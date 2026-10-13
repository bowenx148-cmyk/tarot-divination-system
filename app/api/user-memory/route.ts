import { NextRequest, NextResponse } from 'next/server';
import { enterUser, leaveUser, saveUserMemory, userMemory } from '@/lib/server/user-memory';
import { registerOnDevice, bindExistingRegistration } from '@/lib/server/trial-ledger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookie = 'tarot-user';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const attempts = new Map<string, { count: number; until: number }>();
export async function GET(request: NextRequest) {
  return json(userMemory(request.cookies.get(cookie)?.value) || { user: null, readings: [] });
}
export async function POST(request: NextRequest) {
  const expected = `${request.nextUrl.protocol}//${request.headers.get('host') || request.nextUrl.host}`;
  if (request.headers.get('origin') !== expected) return json({ message: '只允许同源操作' }, 403);
  const text = await request.text();
  if (text.length > 1600000) return json({ message: '请求内容过长' }, 413);
  let input;
  try { input = JSON.parse(text); } catch { return json({ message: '请求格式无效' }, 400); }
  if (!input || typeof input !== 'object') return json({ message: '请求格式无效' }, 400);
  const token = request.cookies.get(cookie)?.value;
  try {
    if (input.action === 'register' || input.action === 'login') {
      const address = request.headers.get('x-forwarded-for') || 'local';
      for (const [key, value] of attempts) if (value.until <= Date.now()) attempts.delete(key);
      const previous = attempts.get(address);
      if ((previous?.count || 0) >= 30 || attempts.size >= 10000) return json({ message: '尝试过多，请十分钟后再试' }, 429);
      attempts.set(address, { count: (previous?.count || 0) + 1, until: previous?.until || Date.now() + 600000 });
      const result = input.action === 'register' ? registerOnDevice(request.headers.get('x-device-id'), () => enterUser(input.name, true)) : enterUser(input.name, false);
      if (input.action === 'login' && request.headers.get('x-device-id')) bindExistingRegistration(request.headers.get('x-device-id'), result.user.id);
      const response = json({ user: result.user, readings: result.readings });
      response.cookies.set(cookie, result.token, { httpOnly: true, sameSite: 'strict', secure: request.headers.get('x-user-public') === 'true' || request.nextUrl.protocol === 'https:', maxAge: 30 * 86400, path: '/' });
      return response;
    }
    if (!token || !userMemory(token)) return json({ message: '请先登录' }, 401);
    if (input.action === 'logout') {
      leaveUser(token); const response = json({ user: null, readings: [] }); response.cookies.delete(cookie); return response;
    }
    if (input.action === 'save') { saveUserMemory(token, input.userId, input.readings); return json({ saved: true }); }
    return json({ message: '未知操作' }, 400);
  } catch (error) { return json({ message: error instanceof Error ? error.message : '操作失败' }, 400); }
}
