'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DRAW_PREFERENCES, DRAW_PREFERENCES_KEY, readDrawPreferences, playDrawSound, type DrawPreferences, type DrawSound } from '@/lib/draw-effects';

export function useDrawEffects() {
  const [preferences, setPreferences] = useState(DEFAULT_DRAW_PREFERENCES);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    // Defer browser preference hydration until after the server-matching first paint.
    const frame = requestAnimationFrame(() => {
      try { setPreferences(readDrawPreferences(localStorage.getItem(DRAW_PREFERENCES_KEY))); } catch { /* Browser storage can be disabled. */ }
    });
    return () => { cancelAnimationFrame(frame); void context.current?.close().catch(() => {}); context.current = null; };
  }, []);
  const play = useCallback((cue: DrawSound, settings = preferences) => {
    if (!settings.sound || settings.volume <= 0 || document.visibilityState === 'hidden') return;
    try {
      const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) { setAudioUnavailable(true); return; }
      const audio = context.current ?? (context.current = new Audio());
      if (audio.state === 'running') playDrawSound(audio, cue, settings.volume);
      else void audio.resume().then(() => { if (context.current === audio) playDrawSound(audio, cue, settings.volume); }).catch(() => setAudioUnavailable(true));
    } catch { setAudioUnavailable(true); }
  }, [preferences]);
  const update = (patch: Partial<DrawPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try { localStorage.setItem(DRAW_PREFERENCES_KEY, JSON.stringify(next)); } catch { /* Session-only preferences still work. */ }
    if (!next.sound) { const audio = context.current; context.current = null; void audio?.close().catch(() => {}); }
    else if (patch.sound || patch.volume !== undefined) play('reveal', next);
  };
  return { preferences, audioUnavailable, update, play };
}

export function DrawControls({ effects, systemReduced }: { effects: ReturnType<typeof useDrawEffects>; systemReduced: boolean }) {
  const { preferences, update, audioUnavailable } = effects;
  return <section aria-label="抽牌体验设置" className="mb-5 rounded-2xl border border-purple-200 bg-white/90 p-4 text-sm text-purple-950 shadow-sm">
    <div className="flex flex-wrap items-center gap-4">
      <button type="button" aria-pressed={preferences.sound} onClick={() => update({ sound: !preferences.sound })} className="rounded-full border border-purple-300 px-4 py-2">{preferences.sound ? '♫ 音效：开启' : '♪ 音效：关闭'}</button>
      <label className="flex items-center gap-2">音量<input aria-label="抽牌音量" type="range" min="0" max="1" step="0.05" value={preferences.volume} onChange={event => update({ volume: Number(event.target.value) })} className="w-24 accent-purple-700" /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={systemReduced || !preferences.animation} disabled={systemReduced} onChange={event => update({ animation: !event.target.checked })} /> 简化动画</label>
    </div>
    <p className="mt-2 text-xs text-purple-700">{systemReduced ? '已遵循设备的减少动态效果设置。' : '音效默认关闭；开启后选牌、确认和完成会有轻提示。设置仅保存在本浏览器。'}{audioUnavailable ? ' 当前浏览器未能播放音效，仍可正常抽牌。' : ''}</p>
  </section>;
}

export function DrawAtmosphere({ animated }: { animated: boolean }) {
  return <div aria-hidden="true" className={`draw-atmosphere ${animated ? 'draw-atmosphere-animated' : ''}`}><div className="draw-orbit" /><div className="draw-orbit draw-orbit-inner" />{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ left: `${8 + index * 7.5}%`, top: `${12 + (index * 17 % 70)}%`, animationDelay: `${index * .35}s` }} />)}</div>;
}
