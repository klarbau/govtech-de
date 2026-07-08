'use client';

import * as React from 'react';

import { lgEnabled } from '@/lib/liquid-glass';

/**
 * App-wide Liquid-Glass chrome. Rendered once in `(app)/layout.tsx`, so it
 * covers every authenticated route.
 *
 * Two jobs, both purely presentational and fully reversible:
 *
 *  1. App-wide gate — sets `data-lg` on <html> while mounted (i.e. on the whole
 *     app shell) and removes it on unmount. Every rule in `liquid-glass-core.css`
 *     (and the deeper, screen-scoped `posteingang-liquid-glass.css`) is gated
 *     under `html[data-lg] …`, so the glass treatment covers the app shell +
 *     generic primitives everywhere. The stylesheets touch surfaces
 *     (background / border / shadow / backdrop-filter) — never text colour — so
 *     token-driven text keeps its light/dark contrast for free.
 *
 *  2. Ambient background — the animated refracted colour field the glass
 *     surfaces blur against. Fixed, aria-hidden, pointer-events:none, painted
 *     behind all content. Respects `prefers-reduced-motion` (blobs hold still).
 *
 * With the kill-switch off (`NEXT_PUBLIC_LG=0`) it renders null and sets no
 * attribute — the whole layer is inert.
 */
export function LiquidGlassChrome() {
  React.useEffect(() => {
    if (!lgEnabled) return;
    const root = document.documentElement;
    root.setAttribute('data-lg', '');
    return () => {
      root.removeAttribute('data-lg');
    };
  }, []);

  if (!lgEnabled) return null;

  return (
    <div className="lg-ambient" aria-hidden="true">
      <span className="lg-blob lg-blob--a" />
      <span className="lg-blob lg-blob--b" />
      <span className="lg-blob lg-blob--c" />
      <span className="lg-blob lg-blob--d" />
      <span className="lg-blob lg-blob--e" />
      <span className="lg-blob lg-blob--f" />
    </div>
  );
}
