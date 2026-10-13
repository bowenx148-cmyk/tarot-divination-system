import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TarotReading } from '@/lib/store';

interface Account { id: string; name: string; normalized: string; readings: TarotReading[] }
interface Database { accounts: Account[]; sessions: { hash: string; accountId: string; expires: number }[] }
const directory = () => process.env.TAROT_DATA_DIR || join(process.cwd(), '.local');
function read(): Database {
  const file = join(directory(), 'user-memory.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { accounts: [], sessions: [] };
}
function write(data: Database) {
  mkdirSync(directory(), { recursive: true });
  const temporary = join(directory(), `user-memory.${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  renameSync(temporary, join(directory(), 'user-memory.json'));
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
function normalizedName(value: unknown) {
  if (typeof value !== 'string') throw new Error('请填写用户名');
  const name = value.normalize('NFKC').trim();
  if (!name || name.length > 40 || /[\p{Cc}\p{Cf}]/u.test(name)) throw new Error('用户名需为1到40个字符');
  return { name, normalized: name.toLowerCase() };
}
export function enterUser(name: unknown, register: boolean) {
  const clean = normalizedName(name), data = read();
  let account = data.accounts.find(item => item.normalized === clean.normalized);
  if (register) {
    if (account) throw new Error('该用户名已存在，请直接登录');
    if (data.accounts.length >= 10000) throw new Error('注册数量已达上限');
    account = { id: `account-${randomUUID()}`, ...clean, readings: [] };
    data.accounts.push(account);
  }
  if (!account) throw new Error('用户名不存在，请先注册');
  const token = randomBytes(32).toString('hex');
  data.sessions = data.sessions.filter(item => item.expires > Date.now());
  const own = data.sessions.filter(item => item.accountId === account.id);
  if (own.length >= 20) data.sessions = data.sessions.filter(item => item !== own[0]);
  data.sessions.push({ hash: hash(token), accountId: account.id, expires: Date.now() + 30 * 86400000 });
  write(data);
  return { token, user: { id: account.id, name: account.name }, readings: account.readings };
}
export function userMemory(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const data = read(), session = data.sessions.find(item => item.hash === hash(token) && item.expires > Date.now());
  const account = session && data.accounts.find(item => item.id === session.accountId);
  return account ? { user: { id: account.id, name: account.name }, readings: account.readings } : null;
}
export function leaveUser(token: string) {
  const data = read(); data.sessions = data.sessions.filter(item => item.hash !== hash(token)); write(data);
}
export function saveUserMemory(token: string, expectedId: unknown, input: unknown) {
  const current = userMemory(token);
  if (!current || current.user.id !== expectedId) throw new Error('登录档案已改变，请刷新重试');
  if (!Array.isArray(input) || input.length > 50 || JSON.stringify(input).length > 1500000) throw new Error('最多保存50条咨询，内容过长');
  const ids = new Set<string>();
  const validReferences = (value: unknown) => value === undefined || (Array.isArray(value) && value.length <= 30 && value.every(item => item && typeof item.id === 'string' && item.id.length <= 150 && typeof item.title === 'string' && item.title.length <= 250 && typeof item.source === 'string' && item.source.length <= 300 && typeof item.content === 'string' && item.content.length <= 10000));
  const readings = input.map(value => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || value.id.length > 100 || ids.has(value.id) ||
      typeof value.question !== 'string' || typeof value.interpretation !== 'string' || typeof value.advice !== 'string' ||
      !Array.isArray(value.cards) || value.cards.length > 10 || !value.cards.every((card: { id?: unknown }) => card && typeof card.id === 'string') ||
      !Array.isArray(value.cardReversals) || value.cardReversals.length !== value.cards.length || !value.cardReversals.every((flag: unknown) => typeof flag === 'boolean') ||
      !value.spread || typeof value.spread.name !== 'string' || !Array.isArray(value.spread.positions) || !Number.isFinite(Date.parse(value.timestamp)) ||
      !validReferences(value.knowledgeReferences) ||
      (value.followups !== undefined && (!Array.isArray(value.followups) || value.followups.length > 100 || !value.followups.every((turn: { question?: unknown; answer?: unknown; knowledgeReferences?: unknown }) => turn && typeof turn.question === 'string' && typeof turn.answer === 'string' && validReferences(turn.knowledgeReferences))))) throw new Error('咨询记录格式无效');
    ids.add(value.id);
    return { ...value, userId: current.user.id } as TarotReading;
  });
  const data = read(); data.accounts.find(item => item.id === current.user.id)!.readings = readings; write(data);
}
