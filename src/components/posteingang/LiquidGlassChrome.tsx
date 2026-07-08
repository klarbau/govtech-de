'use client';

import * as React from 'react';

/**
 * Liquid-Glass chrome for the Posteingang route.
 *
 * Two jobs, both purely presentational and fully reversible:
 *
 *  1. Route gate — sets `data-lg` on <html> while this component is mounted
 *     (i.e. only on /posteingang) and removes it on unmount. Every rule in
 *     `posteingang-liquid-glass.css` is scoped under `html[data-lg] …`, so the
 *     glass treatment applies to this screen ONLY; navigating away restores the
 *     stock shell with no residue. The stylesheet touches surfaces
 *     (background / border / shadow / backdrop-filter) — never text colour — so
 *     the existing token-driven text keeps its light/dark contrast for free.
 *
 *  2. Ambient background — the animated refracted colour field the glass
 *     surfaces blur against. Fixed, aria-hidden, pointer-events:none, painted
 *     behind all content. Respects `prefers-reduced-motion` (blobs hold still).
 *
 * No data, no interactivity — the fully-wired PosteingangInbox renders on top.
 */
export function LiquidGlassChrome() {
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-lg', '');
    return () => {
      root.removeAttribute('data-lg');
    };
  }, []);

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
