'use client';

import * as React from 'react';

import {
  A11Y_DEFAULTS,
  applyPreferences,
  clearPreferences,
  isDefault,
  readPreferences,
  writePreferences,
  type A11yPreferences,
} from '@/lib/a11y/preferences';

interface A11yPreferencesContextValue {
  prefs: A11yPreferences;
  isDefault: boolean;
  setPreferences: (next: A11yPreferences) => void;
  reset: () => void;
}

const A11yPreferencesContext =
  React.createContext<A11yPreferencesContextValue | null>(null);

export function useA11yPreferencesContext(): A11yPreferencesContextValue {
  const ctx = React.useContext(A11yPreferencesContext);
  if (!ctx) {
    throw new Error(
      'useA11yPreferencesContext must be used within <A11yPreferencesProvider>',
    );
  }
  return ctx;
}

interface A11yPreferencesProviderProps {
  children: React.ReactNode;
}

/**
 * Holds the accessibility prefs in React state, synced with `localStorage`.
 *
 * On first mount it reads the persisted key into state but does NOT re-apply
 * the DOM attributes — the pre-paint inline script (`no-fouc-script.ts`)
 * already applied them, and re-applying here would cause a flicker. Only
 * subsequent user-driven changes write through to `localStorage` + the DOM.
 */
export function A11yPreferencesProvider({
  children,
}: A11yPreferencesProviderProps) {
  const [prefs, setPrefs] = React.useState<A11yPreferences>(A11Y_DEFAULTS);

  // Read persisted prefs once on mount, without re-applying DOM attributes.
  React.useEffect(() => {
    setPrefs(readPreferences());
  }, []);

  const setPreferences = React.useCallback((next: A11yPreferences) => {
    setPrefs(next);
    writePreferences(next);
    applyPreferences(next);
  }, []);

  const reset = React.useCallback(() => {
    setPrefs(A11Y_DEFAULTS);
    clearPreferences();
    applyPreferences(A11Y_DEFAULTS);
  }, []);

  const value = React.useMemo<A11yPreferencesContextValue>(
    () => ({
      prefs,
      isDefault: isDefault(prefs),
      setPreferences,
      reset,
    }),
    [prefs, setPreferences, reset],
  );

  return (
    <A11yPreferencesContext.Provider value={value}>
      {children}
    </A11yPreferencesContext.Provider>
  );
}
