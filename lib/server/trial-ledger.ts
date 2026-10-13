import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
interface Ledger { registrations: Record<string, string>; used: Record<string, boolean>; pending: Record<string, { keys: string[]; date: string; expires: number }>; days: Record<string, number> }
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const date = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
function transaction<T>(operation: (data: Ledger) => T): T {
  const directory = process.env.TAROT_DATA_DIR || join(process.cwd(), '.local'); mkdirSync(directory, { recursive: true });
  const path = join(directory, 'trial-ledger.json'), lock = join(directory, 'trial-ledger.lock');
  let descriptor;
  try { descriptor = openSync(lock, 'wx'); } catch { throw new Error('服务正在处理另一请求，请稍后重试'); }
  try {
    const data: Ledger = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { registrations: {}, used: {}, pending: {}, days: {} };
    for (const [id, pending] of Object.entries(data.pending)) if (pending.expires <= Date.now()) delete data.pending[id];
    const result = operation(data);
    const temporary = join(directory, `trial-ledger.${randomUUID()}.tmp`); writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 }); renameSync(temporary, path); return result;
  } finally { closeSync(descriptor); unlinkSync(lock); }
}
function deviceKey(device: unknown): string {
  if (typeof device !== 'string' || !/^[a-zA-Z0-9_-]{8,150}$/.test(device)) throw new Error('缺少有效设备标识，请刷新页面');
  return `device:${hash(device)}`;
}
export function registerOnDevice<T extends { user: { id: string } }>(device: unknown, register: () => T): T {
  const key = deviceKey(device);
  return transaction(data => { if (data.registrations[key]) throw new Error('此浏览器已经注册过用户名，请使用已有用户名登录'); const result = register(); data.registrations[key] = result.user.id; return result; });
}
export function trialStatus(device: unknown, account?: string) {
  const key = deviceKey(device);
  return transaction(data => !!data.used[key] || !!(account && data.used[`account:${account}`]));
}
export function bindExistingRegistration(device: unknown, account: string) {
  const key = deviceKey(device);
  transaction(data => { if (!data.registrations[key]) data.registrations[key] = account; });
}
export function reserveTrial(device: unknown, account?: string) {
  const keys = [deviceKey(device), ...(account ? [`account:${account}`] : [])];
  return transaction(data => {
    if (keys.some(key => data.used[key] || Object.values(data.pending).some(item => item.keys.includes(key)))) return { error: 'trial_used' as const };
    const day = date(), limit = Number(process.env.QUOTA_DAILY_LIMIT || 50);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;
    if ((data.days[day] || 0) + Object.values(data.pending).filter(item => item.date === day).length >= safeLimit) return { error: 'quota_exhausted' as const };
    const token = randomUUID(); data.pending[token] = { keys, date: day, expires: Date.now() + 10 * 60000 }; return { token };
  });
}
export function finishTrial(token: string, success: boolean) {
  transaction(data => { const pending = data.pending[token]; if (!pending) return; if (success) { for (const key of pending.keys) data.used[key] = true; data.days[pending.date] = (data.days[pending.date] || 0) + 1; } delete data.pending[token]; });
}
