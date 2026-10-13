import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/developer/route';
import { getSystemKey, isDeveloper, loginDeveloper } from '@/lib/server/developer';
let directory: string;
const request = (body: unknown, cookie?: string, origin = 'http://localhost:3000') => new NextRequest('http://localhost:3000/api/developer', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
describe('开发者服务端权限', () => {
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'tarot-auth-test-')); vi.stubEnv('TAROT_DATA_DIR', directory); vi.stubEnv('DEVELOPER_USERNAME', 'test-admin'); vi.stubEnv('DEVELOPER_PASSWORD', 'test-only-password'); });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(directory, { recursive: true, force: true }); });
  it('未配置或初始弱密码时不创建开发者档案、不接受登录', () => {
    vi.stubEnv('DEVELOPER_USERNAME', '');
    expect(loginDeveloper('test-admin', 'test-only-password')).toBeNull();
    vi.stubEnv('DEVELOPER_USERNAME', 'test-admin'); vi.stubEnv('DEVELOPER_PASSWORD', 'short');
    expect(loginDeveloper('test-admin', 'short')).toBeNull();
    expect(isDeveloper('a'.repeat(64))).toBe(false);
    expect(existsSync(join(directory, 'auth.json'))).toBe(false);
  });
  it('既有密码哈希及加密秘密保留，修改环境密码不会覆盖原档案', () => {
    expect(loginDeveloper('test-admin', 'test-only-password')).not.toBeNull();
    const initial = JSON.parse(readFileSync(join(directory, 'auth.json'), 'utf8'));
    vi.stubEnv('DEVELOPER_PASSWORD', '');
    expect(loginDeveloper('test-admin', 'test-only-password')).not.toBeNull();
    expect(loginDeveloper('different-admin', 'test-only-password')).toBeNull();
    const saved = JSON.parse(readFileSync(join(directory, 'auth.json'), 'utf8'));
    expect(saved.passwordHash).toBe(initial.passwordHash); expect(saved.secret).toBe(initial.secret);
  });
  it('访客与伪造会话不能写设置；跨域登录被拒绝', async () => {
    expect((await POST(request({ action: 'save', settings: { siteTitle: '攻击' } }))).status).toBe(401);
    expect((await POST(request({ action: 'save', settings: {} }, 'tarot-developer=' + 'a'.repeat(64)))).status).toBe(401);
    expect((await POST(request({ action: 'login', username: 'test-admin', password: 'test-only-password' }, undefined, 'https://other.example'))).status).toBe(403);
  });
  it('同源校验使用浏览器访问的Host，允许127.0.0.1而不信任第三方Origin', async () => {
    const result = await POST(new NextRequest('http://localhost:3000/api/developer', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'login', username: 'test-admin', password: 'test-only-password' }) }));
    expect(result.status).toBe(200);
  });
  it('合法登录保存配置，密码哈希、Key加密且不回显；退出后原会话失效', async () => {
    const response = await POST(request({ action: 'login', username: 'test-admin', password: 'test-only-password' }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')!.toLowerCase()).toContain('samesite=strict');
    expect(isDeveloper(cookie.split('=')[1])).toBe(true);
    const saved = await POST(request({ action: 'save', settings: { siteTitle: '测试标题', style: '温和简短', openaiKey: 'sk-test-openai', deepseekKey: 'sk-test-deepseek' } }, cookie));
    expect(saved.status).toBe(200);
    expect(await saved.text()).not.toContain('sk-test');
    expect(getSystemKey('openai')).toBe('sk-test-openai'); expect(getSystemKey('deepseek')).toBe('sk-test-deepseek');
    expect(readFileSync(join(directory, 'settings.json'), 'utf8')).not.toContain('sk-test');
    expect(JSON.parse(readFileSync(join(directory, 'auth.json'), 'utf8')).passwordHash).toHaveLength(128);
    const visitor = await GET(new NextRequest('http://localhost:3000/api/developer'));
    expect(await visitor.json()).not.toHaveProperty('style');
    await POST(request({ action: 'logout' }, cookie));
    expect((await POST(request({ action: 'save', settings: {} }, cookie))).status).toBe(401);
  });
});
