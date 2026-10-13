import { expect, it, vi } from 'vitest';
import { playDrawSound, readDrawPreferences } from '@/lib/draw-effects';
it('本地设置损坏时降级，音量限幅且默认静音', () => {
  expect(readDrawPreferences('broken')).toEqual({ sound: false, volume: .35, animation: true });
  expect(readDrawPreferences('{"sound":true,"volume":10,"animation":false}')).toEqual({ sound: true, volume: 1, animation: false });
  expect(readDrawPreferences('null').sound).toBe(false);
});
it('仅在音频可运行且音量非零时生成短音，并在结束后释放节点', () => {
  const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: null | (() => void) }[] = [];
  const gains: { disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    state: 'running', currentTime: 2, destination: {},
    createOscillator: vi.fn(() => { const node = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) }; oscillators.push(node); return node; }),
    createGain: vi.fn(() => { const node = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(node); return node; }),
  };
  playDrawSound(context as unknown as AudioContext, 'complete', 0);
  expect(context.createOscillator).not.toHaveBeenCalled();
  context.state = 'suspended'; playDrawSound(context as unknown as AudioContext, 'reveal', .35);
  expect(context.createOscillator).not.toHaveBeenCalled();
  context.state = 'running'; playDrawSound(context as unknown as AudioContext, 'complete', .35);
  expect(oscillators).toHaveLength(3);
  oscillators.forEach((node, index) => { expect(node.start).toHaveBeenCalled(); expect(node.stop.mock.calls[0][0]).toBeLessThan(3); node.onended?.(); expect(node.disconnect).toHaveBeenCalledOnce(); expect(gains[index].disconnect).toHaveBeenCalledOnce(); });
});
