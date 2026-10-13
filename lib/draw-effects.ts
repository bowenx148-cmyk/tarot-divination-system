export type DrawSound = 'shuffle' | 'reveal' | 'settle' | 'complete';
export interface DrawPreferences { sound: boolean; volume: number; animation: boolean }
export const DRAW_PREFERENCES_KEY = 'tarot-draw-preferences';
export const DEFAULT_DRAW_PREFERENCES: DrawPreferences = { sound: false, volume: .35, animation: true };

export function readDrawPreferences(raw: string | null): DrawPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    return {
      sound: value.sound === true,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume)) : .35,
      animation: value.animation !== false,
    };
  } catch { return { ...DEFAULT_DRAW_PREFERENCES }; }
}

// Synthesized locally; short envelopes keep cues quiet and release every audio node.
export function playDrawSound(context: AudioContext, cue: DrawSound, volume: number) {
  if (context.state !== 'running' || volume <= 0) return;
  const pitches = cue === 'complete' ? [523.25, 659.25, 783.99] : cue === 'reveal' ? [622.25, 932.33] : cue === 'shuffle' ? [110, 146.83, 130.81, 174.61] : [196];
  const duration = cue === 'shuffle' ? .09 : cue === 'settle' ? .12 : .45;
  pitches.forEach((pitch, index) => {
    const oscillator = context.createOscillator(), gain = context.createGain();
    const start = context.currentTime + index * (cue === 'shuffle' ? .085 : .075);
    oscillator.type = cue === 'shuffle' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(pitch, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(Math.min(1, volume) * .12, start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + duration);
  });
}
