/**
 * Device-local accessibility preferences (Bedienhilfen).
 *
 * This module reads/writes `localStorage` DIRECTLY and intentionally bypasses
 * `lib/mock-backend/api.ts`. That is the documented, allowed exception (spec
 * §5): these are device-UI prefs (which font size THIS device shows), not
 * domain data — exactly the next-themes precedent. The mock-backend's latency/
 * error simulation would also make the No-FOUC pre-paint script impossible.
 */

export type FontScale = 100 | 115 | 130 | 150;

/** Vorlese-Tempo (SpeechSynthesisUtterance.rate): langsam | normal | schnell. */
export type ReadAloudRate = 0.8 | 1 | 1.25;

export interface A11yPreferences {
  fontScale: FontScale;
  contrast: boolean;
  readable: boolean;
  reduceMotion: boolean;
  /**
   * BEHAVIORAL pref (not visual): when on, selecting text surfaces a floating
   * "Vorlesen" button. Persisted only — it does NOT toggle an `<html>` class and
   * is intentionally absent from the no-FOUC pre-paint path (nothing to flash).
   */
  selectionReadAloud: boolean;
  /**
   * BEHAVIORAL pref (not visual): speech-synthesis rate for on-device Vorlesen.
   * Consumed directly by `use-speech.ts` (no visual class, absent from the
   * no-FOUC pre-paint path — nothing to flash).
   */
  readAloudRate: ReadAloudRate;
}

export const A11Y_DEFAULTS: A11yPreferences = {
  fontScale: 100,
  contrast: false,
  readable: false,
  reduceMotion: false,
  selectionReadAloud: false,
  readAloudRate: 1,
};

export const A11Y_STORAGE_KEY = 'govtech-de:v1:a11y:prefs';

export const FONT_SCALES: readonly FontScale[] = [100, 115, 130, 150];

export const READ_ALOUD_RATES: readonly ReadAloudRate[] = [0.8, 1, 1.25];

/** `100 → 1`, `115 → 1.15`, … — the multiplier consumed by `--a11y-zoom`. */
export function fontScaleToZoom(scale: FontScale): number {
  return scale / 100;
}

function clampFontScale(value: unknown): FontScale {
  return (FONT_SCALES as readonly number[]).includes(value as number)
    ? (value as FontScale)
    : A11Y_DEFAULTS.fontScale;
}

export function clampReadAloudRate(value: unknown): ReadAloudRate {
  return (READ_ALOUD_RATES as readonly number[]).includes(value as number)
    ? (value as ReadAloudRate)
    : A11Y_DEFAULTS.readAloudRate;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Defensive parse of an unknown JSON value into a fully-normalised
 * {@link A11yPreferences}. Unknown/invalid shapes fall back to defaults; the
 * font scale is clamped to one of the four allowed steps.
 */
export function parsePreferences(raw: unknown): A11yPreferences {
  if (typeof raw !== 'object' || raw === null) {
    return { ...A11Y_DEFAULTS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    fontScale: clampFontScale(obj.fontScale),
    contrast: asBool(obj.contrast, A11Y_DEFAULTS.contrast),
    readable: asBool(obj.readable, A11Y_DEFAULTS.readable),
    reduceMotion: asBool(obj.reduceMotion, A11Y_DEFAULTS.reduceMotion),
    selectionReadAloud: asBool(
      obj.selectionReadAloud,
      A11Y_DEFAULTS.selectionReadAloud,
    ),
    readAloudRate: clampReadAloudRate(obj.readAloudRate),
  };
}

/** Reads + parses persisted prefs. SSR-safe (returns defaults off-window). */
export function readPreferences(): A11yPreferences {
  if (typeof window === 'undefined') {
    return { ...A11Y_DEFAULTS };
  }
  try {
    const stored = window.localStorage.getItem(A11Y_STORAGE_KEY);
    if (!stored) return { ...A11Y_DEFAULTS };
    return parsePreferences(JSON.parse(stored));
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function writePreferences(prefs: A11yPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota/privacy-mode failures are non-fatal — prefs simply won't persist.
  }
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(A11Y_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isDefault(prefs: A11yPreferences): boolean {
  return (
    prefs.fontScale === A11Y_DEFAULTS.fontScale &&
    prefs.contrast === A11Y_DEFAULTS.contrast &&
    prefs.readable === A11Y_DEFAULTS.readable &&
    prefs.reduceMotion === A11Y_DEFAULTS.reduceMotion &&
    prefs.selectionReadAloud === A11Y_DEFAULTS.selectionReadAloud &&
    prefs.readAloudRate === A11Y_DEFAULTS.readAloudRate
  );
}

/**
 * Imperatively applies preferences to `document.documentElement`: sets the
 * `--a11y-zoom` custom property (the load-bearing font-scaling mechanism — see
 * spec §6.1; rem/`font-size` would be a silent no-op against the hardcoded px),
 * mirrors the step into `data-font-scale`, and toggles the manual `.a11y-*`
 * classes that share their declarations with the OS media queries.
 *
 * The pre-paint inline script (`no-fouc-script.ts`) performs the same writes
 * before first paint; this function is the runtime equivalent for the provider.
 */
export function applyPreferences(prefs: A11yPreferences): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (!el) return;

  el.style.setProperty('--a11y-zoom', String(fontScaleToZoom(prefs.fontScale)));
  el.dataset.fontScale = String(prefs.fontScale);

  el.classList.toggle('a11y-contrast', prefs.contrast);
  el.classList.toggle('a11y-readable', prefs.readable);
  el.classList.toggle('a11y-reduce-motion', prefs.reduceMotion);
}
