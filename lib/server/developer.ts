import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface AuthData { salt: string; passwordHash: string; secret: string; sessions: { hash: string; expires: number }[]; }
interface Settings { siteTitle: string; style: string; openaiKey?: string; deepseekKey?: string; }
const defaults: Settings = { siteTitle: '塔罗指引', style: '' };
const directory = () => process.env.TAROT_DATA_DIR || join(process.cwd(), '.local');
function read<T>(file: string, fallback: T): T {
  const path = join(directory(), file);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}
function write(file: string, value: unknown) {
  mkdirSync(directory(), { recursive: true });
  const temporary = join(directory(), `${file}.${randomBytes(8).toString('hex')}.tmp`);
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  renameSync(temporary, join(directory(), file));
}
function auth(): AuthData | null {
  if (!existsSync(join(directory(), 'auth.json'))) {
    const username = process.env.DEVELOPER_USERNAME?.trim();
    const password = process.env.DEVELOPER_PASSWORD;
    if (!username || !password || password.length < 12 || password.length > 256) return null;
    const salt = randomBytes(16).toString('hex');
    mkdirSync(directory(), { recursive: true });
    const initial: AuthData = { salt, passwordHash: scryptSync(password, salt, 64).toString('hex'), secret: randomBytes(32).toString('hex'), sessions: [] };
    try { writeFileSync(join(directory(), 'auth.json'), JSON.stringify(initial), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  }
  return read<AuthData>('auth.json', {} as AuthData);
}
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function loginDeveloper(username: unknown, password: unknown): string | null {
  const configuredUsername = process.env.DEVELOPER_USERNAME?.trim();
  if (!configuredUsername || username !== configuredUsername || typeof password !== 'string' || password.length > 256) return null;
  const data = auth();
  if (!data) return null;
  if (!timingSafeEqual(scryptSync(password, data.salt, 64), Buffer.from(data.passwordHash, 'hex'))) return null;
  const token = randomBytes(32).toString('hex');
  data.sessions = [...data.sessions.filter(s => s.expires > Date.now()).slice(-19), { hash: tokenHash(token), expires: Date.now() + 8 * 60 * 60 * 1000 }];
  write('auth.json', data);
  return token;
}
export function isDeveloper(token: string | undefined): boolean {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return auth()?.sessions.some(s => s.expires > Date.now() && s.hash === tokenHash(token)) ?? false;
}
export function logoutDeveloper(token: string) {
  const data = auth(); if (!data) return;
  data.sessions = data.sessions.filter(s => s.hash !== tokenHash(token)); write('auth.json', data);
}
function seal(key: string): string {
  const data = auth(); if (!data) throw new Error('开发者账号尚未配置');
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(data.secret, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
}
function unseal(value?: string): string {
  if (!value) return '';
  const [iv, tag, ciphertext] = value.split('.').map(s => Buffer.from(s, 'base64'));
  const data = auth(); if (!data) throw new Error('开发者账号尚未配置');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(data.secret, 'hex'), iv);
  decipher.setAuthTag(tag); return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
export function getDeveloperSettings() { return read<Settings>('settings.json', defaults); }
export function publicSettings() {
  const settings = getDeveloperSettings();
  return { siteTitle: settings.siteTitle, openaiConfigured: !!settings.openaiKey || !!process.env.OPENAI_API_KEY, deepseekConfigured: !!settings.deepseekKey || !!process.env.DEEPSEEK_API_KEY };
}
export function getSystemKey(provider: 'openai' | 'deepseek'): string {
  const settings = getDeveloperSettings();
  return unseal(provider === 'openai' ? settings.openaiKey : settings.deepseekKey);
}
export function saveDeveloperSettings(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('设置格式无效');
  const fields = input as Record<string, unknown>;
  for (const [name, limit] of [['siteTitle', 80], ['style', 1000], ['openaiKey', 2000], ['deepseekKey', 2000]] as const) {
    if (fields[name] !== undefined && (typeof fields[name] !== 'string' || (fields[name] as string).length > limit)) throw new Error('设置内容过长或格式无效');
  }
  const next = { ...getDeveloperSettings() };
  if (fields.siteTitle !== undefined) next.siteTitle = (fields.siteTitle as string).trim() || defaults.siteTitle;
  if (fields.style !== undefined) next.style = (fields.style as string).trim();
  for (const key of ['openaiKey', 'deepseekKey'] as const) if (fields[key] !== undefined) next[key] = fields[key] ? seal((fields[key] as string).trim()) : '';
  write('settings.json', next);
}
