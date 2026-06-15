'use client';

import * as React from 'react';

import { useA11yPreferencesContext } from '@/components/providers/A11yPreferencesProvider';
import { FONT_SCALES, type FontScale } from '@/lib/a11y/preferences';

export interface UseA11yPreferences {
  fontScale: FontScale;
  contrast: boolean;
  readable: boolean;
  reduceMotion: boolean;
  isDefault: boolean;
  canIncreaseFont: boolean;
  canDecreaseFont: boolean;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  toggleContrast: () => void;
  toggleReadable: () => void;
  toggleReduceMotion: () => void;
  setContrast: (value: boolean) => void;
  setReadable: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  reset: () => void;
}

/**
 * Component-facing hook over {@link useA11yPreferencesContext}: prefs plus
 * stepper/toggle/reset setters. The font stepper walks the four allowed steps
 * and clamps at the ends.
 */
export function useA11yPreferences(): UseA11yPreferences {
  const { prefs, isDefault, setPreferences, reset } =
    useA11yPreferencesContext();

  const index = FONT_SCALES.indexOf(prefs.fontScale);
  const canIncreaseFont = index < FONT_SCALES.length - 1;
  const canDecreaseFont = index > 0;

  const increaseFontScale = React.useCallback(() => {
    const next = FONT_SCALES[Math.min(index + 1, FONT_SCALES.length - 1)];
    if (next !== undefined) setPreferences({ ...prefs, fontScale: next });
  }, [index, prefs, setPreferences]);

  const decreaseFontScale = React.useCallback(() => {
    const next = FONT_SCALES[Math.max(index - 1, 0)];
    if (next !== undefined) setPreferences({ ...prefs, fontScale: next });
  }, [index, prefs, setPreferences]);

  const setContrast = React.useCallback(
    (value: boolean) => setPreferences({ ...prefs, contrast: value }),
    [prefs, setPreferences],
  );
  const setReadable = React.useCallback(
    (value: boolean) => setPreferences({ ...prefs, readable: value }),
    [prefs, setPreferences],
  );
  const setReduceMotion = React.useCallback(
    (value: boolean) => setPreferences({ ...prefs, reduceMotion: value }),
    [prefs, setPreferences],
  );

  return {
    fontScale: prefs.fontScale,
    contrast: prefs.contrast,
    readable: prefs.readable,
    reduceMotion: prefs.reduceMotion,
    isDefault,
    canIncreaseFont,
    canDecreaseFont,
    increaseFontScale,
    decreaseFontScale,
    toggleContrast: React.useCallback(
      () => setContrast(!prefs.contrast),
      [prefs.contrast, setContrast],
    ),
    toggleReadable: React.useCallback(
      () => setReadable(!prefs.readable),
      [prefs.readable, setReadable],
    ),
    toggleReduceMotion: React.useCallback(
      () => setReduceMotion(!prefs.reduceMotion),
      [prefs.reduceMotion, setReduceMotion],
    ),
    setContrast,
    setReadable,
    setReduceMotion,
    reset,
  };
}
