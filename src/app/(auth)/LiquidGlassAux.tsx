'use client';

import * as React from 'react';

import { lgEnabled } from '@/lib/liquid-glass';

/**
 * Liquid-Glass ambient for the surfaces OUTSIDE the `(app)` group — the landing
 * page (`/`) and the `(auth)` onboarding flow. These keep their own identity
 * (layout, typography, Waldgrün accents, illustrations); we only align the
 * ambient field + a restrained surface treatment.
 *
 * Unlike `LiquidGlassChrome` it sets `data-lg-aux` (NOT `data-lg`) on <html>, so
 * the app-wide generic primitives in `liquid-glass-core.css` (cards, inputs,
 * buttons, dialogs, the `--lg-canvas` background) do NOT match — those would
 * over-reskin these screens and override their identity background. Every rule
 * this mount relies on lives in `onboarding-landing-liquid-glass.css`, gated
 * under `html[data-lg-aux]`.
 *
 * Fewer blobs than the app shell (4 vs 6) — calmer, fitting a serious login.
 * Respects the `NEXT_PUBLIC_LG=0` kill-switch: renders null, sets no attribute.
 */
export function LiquidGlassAux() {
  React.useEffect(() => {
    if (!lgEnabled) return;
    const root = document.documentElement;
    root.setAttribute('data-lg-aux', '');
    return () => {
      root.removeAttribute('data-lg-aux');
    };
  }, []);

  if (!lgEnabled) return null;

  return (
    <div className="lg-ambient" aria-hidden="true">
      <span className="lg-blob lg-blob--a" />
      <span className="lg-blob lg-blob--b" />
      <span className="lg-blob lg-blob--c" />
      <span className="lg-blob lg-blob--d" />
    </div>
  );
}
