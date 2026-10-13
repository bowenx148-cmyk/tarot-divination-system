import { NextRequest, NextResponse } from 'next/server';
import { getDeveloperSettings, isDeveloper, loginDeveloper, logoutDeveloper, publicSettings, saveDeveloperSettings } from '@/lib/server/developer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieName = 'tarot-developer';
const failures = new Map<string, { count: number; until: number }>();
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: NextRequest) {
  const authenticated = isDeveloper(request.cookies.get(cookieName)?.value);
  return json({ authenticated, ...publicSettings(), ...(authenticated ? { style: getDeveloperSettings().style } : {}) });
}
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get('host') || url.host}`;
  if (request.headers.get('origin') !== expectedOrigin) return json({ message: '只允许同源操作' }, 403);
  let input;
  try { input = await request.json(); } catch { return json({ message: '请求格式无效' }, 400); }
  if (!input || typeof input !== 'object') return json({ message: '请求格式无效' }, 400);
  const token = request.cookies.get(cookieName)?.value;
  if (input.action === 'login') {
    const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    for (const [key, value] of failures) if (value.until <= Date.now()) failures.delete(key);
    const previous = failures.get(address);
    if ((previous?.count ?? 0) >= 5 || failures.size >= 1000) return json({ message: '尝试过多，请十分钟后再试' }, 429);
    const session = loginDeveloper(input.username, input.password);
    if (!session) {
      failures.set(address, { count: (previous?.count ?? 0) + 1, until: previous?.until ?? Date.now() + 600000 });
      return json({ message: '账号或密码不正确' }, 401);
    }
    failures.delete(address);
    const response = json({ authenticated: true });
    response.cookies.set(cookieName, session, { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', maxAge: 28800, path: '/' });
    return response;
  }
  if (!isDeveloper(token)) return json({ message: '需要开发者登录' }, 401);
  if (input.action === 'logout') {
    logoutDeveloper(token!); const response = json({ authenticated: false }); response.cookies.delete(cookieName); return response;
  }
  if (input.action !== 'save') return json({ message: '未知操作' }, 400);
  try { saveDeveloperSettings(input.settings); } catch { return json({ message: '设置格式无效或保存失败' }, 400); }
  return json({ authenticated: true, ...publicSettings(), style: getDeveloperSettings().style });
}
