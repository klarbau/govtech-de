'use client';

import * as React from 'react';

/**
 * SSR-sicherer `matchMedia`-Hook. Initial `false`, bis nach dem ersten Mount der
 * echte Match-Wert eingelesen ist (kein Hydration-Mismatch — der Server kennt
 * die Viewport-Breite nicht). Genutzt u. a. für den Posteingang-Inline/Modal-
 * Breakpoint (1100 px, Spec §6.2).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
