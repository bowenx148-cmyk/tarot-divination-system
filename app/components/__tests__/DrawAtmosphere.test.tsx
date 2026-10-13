import { afterEach, expect, it, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DrawControls, useDrawEffects } from '@/app/components/DrawAtmosphere';
import { DRAW_PREFERENCES_KEY } from '@/lib/draw-effects';
function Panel({ reduced = false }) { const effects = useDrawEffects(); return <DrawControls effects={effects} systemReduced={reduced} />; }
afterEach(() => { vi.unstubAllGlobals(); localStorage.removeItem(DRAW_PREFERENCES_KEY); });
it('音效必须显式开启；不支持音频时提示并保存偏好，系统减少动画优先', () => {
  vi.stubGlobal('AudioContext', undefined);
  render(<Panel reduced />);
  expect(screen.getByRole('button', { name: '♪ 音效：关闭' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('简化动画')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '♪ 音效：关闭' }));
  expect(screen.getByText(/仍可正常抽牌/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(DRAW_PREFERENCES_KEY)!)).toMatchObject({ sound: true });
  fireEvent.change(screen.getByLabelText('抽牌音量'), { target: { value: '0' } });
  expect(JSON.parse(localStorage.getItem(DRAW_PREFERENCES_KEY)!).volume).toBe(0);
});
