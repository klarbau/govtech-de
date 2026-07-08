'use client';

import * as React from 'react';

import { lgEnabled } from '@/lib/liquid-glass';

/**
 * Marks the current screen for the Liquid-Glass layer by setting
 * `data-lg-screen={name}` on <html> while mounted, clearing it on unmount. This
 * lets a screen opt into rules gated one level deeper than the app-wide
 * `data-lg` — e.g. `html[data-lg][data-lg-screen='posteingang']` for the inbox's
 * 100vh / overflow-hidden archive model, which must NOT leak onto other routes.
 *
 * Purely presentational, renders null. Inert when the kill-switch is off.
 */
export function LiquidGlassScreen({ name }: { name: string }) {
  React.useEffect(() => {
    if (!lgEnabled) return;
    const root = document.documentElement;
    root.setAttribute('data-lg-screen', name);
    return () => {
      root.removeAttribute('data-lg-screen');
    };
  }, [name]);

  return null;
}
