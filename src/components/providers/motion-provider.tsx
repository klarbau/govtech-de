'use client';

import { MotionConfig, useReducedMotion } from 'framer-motion';

import { useA11yPreferences } from '@/lib/a11y/use-a11y-preferences';

interface MotionProviderProps {
  children: React.ReactNode;
}

/**
 * Bridges our manual "Bewegung reduzieren" preference into framer-motion's JS
 * animation layer. `<MotionConfig reducedMotion="user">` reads ONLY the OS
 * `prefers-reduced-motion` media query, so a user who flips the panel switch
 * without an OS setting still got full JS animation. We OR our pref with the OS
 * signal: when either is on, `reducedMotion="always"` snaps animations to their
 * END state (0.01ms, not 0 — the sequence still completes, e.g. the Umzug
 * InlineCascade payoff still fires). Must sit INSIDE `A11yPreferencesProvider`.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  const { reduceMotion } = useA11yPreferences();
  const os = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reduceMotion || os ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
}
