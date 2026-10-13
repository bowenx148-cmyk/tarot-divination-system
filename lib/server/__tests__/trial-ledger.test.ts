import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { finishTrial, registerOnDevice, reserveTrial, trialStatus } from '@/lib/server/trial-ledger';
let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'tarot-ledger-')); vi.stubEnv('TAROT_DATA_DIR', directory); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(directory, { recursive: true, force: true }); });
it('同浏览器只能注册一次，另一个浏览器可注册', () => {
  expect(registerOnDevice('device-aaaa', () => ({ user: { id: 'a' } })).user.id).toBe('a');
  expect(() => registerOnDevice('device-aaaa', () => ({ user: { id: 'b' } }))).toThrow('已经注册');
  expect(registerOnDevice('device-bbbb', () => ({ user: { id: 'b' } })).user.id).toBe('b');
});
it('并发占用拒绝，失败释放，成功后设备与账号都不能重复，记录可从文件重载', async () => {
  const first = reserveTrial('device-aaaa', 'a');
  expect(reserveTrial('device-aaaa', 'b')).toEqual({ error: 'trial_used' });
  expect(reserveTrial('device-bbbb', 'a')).toEqual({ error: 'trial_used' });
  finishTrial(first.token!, false);
  const second = reserveTrial('device-aaaa', 'a'); finishTrial(second.token!, true);
  vi.resetModules();
  const reloaded = await import('@/lib/server/trial-ledger');
  expect(reloaded.trialStatus('device-aaaa')).toBe(true);
  expect(trialStatus('device-bbbb', 'a')).toBe(true);
});
it('每日限额持久化，失败请求不占用额度', () => {
  vi.stubEnv('QUOTA_DAILY_LIMIT', '1');
  const first = reserveTrial('device-aaaa'); finishTrial(first.token!, false);
  const second = reserveTrial('device-aaaa'); finishTrial(second.token!, true);
  expect(reserveTrial('device-bbbb')).toEqual({ error: 'quota_exhausted' });
});
