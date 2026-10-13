import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeveloperPage from './page';

afterEach(() => vi.unstubAllGlobals());
it('保存 DeepSeek 系统密钥，不回显，留空保留并可单独清除', async () => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json({ authenticated: true, siteTitle: '塔罗指引', deepseekConfigured: true }));
  vi.stubGlobal('fetch', fetchMock);
  render(<DeveloperPage />);
  const input = await screen.findByLabelText('DeepSeek 系统 API Key（已配置）');
  expect(input).toHaveAttribute('type', 'password');
  expect(input).toHaveValue('');
  fireEvent.change(input, { target: { value: 'sk-test-deepseek' } });
  fireEvent.click(screen.getByText('保存全局设置'));
  await waitFor(() => expect(input).toHaveValue(''));
  const posts = () => fetchMock.mock.calls.filter(call => call[1]?.method === 'POST').map(call => JSON.parse(call[1].body));
  expect(posts()[0].settings.deepseekKey).toBe('sk-test-deepseek');
  expect(posts()[0].settings).not.toHaveProperty('openaiKey');
  fireEvent.click(screen.getByText('保存全局设置'));
  await waitFor(() => expect(posts()).toHaveLength(2));
  expect(posts()[1].settings).not.toHaveProperty('deepseekKey');
  await waitFor(() => expect(screen.getByText('保存全局设置')).not.toBeDisabled());
  fireEvent.click(screen.getByText('清除后台 DeepSeek Key'));
  await waitFor(() => expect(posts()).toHaveLength(3));
  expect(posts()[2].settings).toEqual({ deepseekKey: '' });
});
