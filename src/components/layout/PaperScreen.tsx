'use client';

import * as React from 'react';

/**
 * Schaltet die Content-Fläche auf das Papier-Idiom („Amtliches Portal-Dokument",
 * `src/app/akte-paper.css`), indem `data-lg-paper` auf <html> gesetzt wird,
 * solange der Screen gemountet ist. Die Liquid-Glass-Shell (TopNav, SideNav,
 * Ambient-Feld) bleibt unberührt — nur die Inhaltsspalte wird Papier.
 *
 * Anders als <LiquidGlassScreen> NICHT an `lgEnabled` gekoppelt: der Papier-Look
 * muss auch mit dem Kill-Switch `NEXT_PUBLIC_LG=0` stehen.
 */
export function PaperScreen() {
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-lg-paper', '');
    return () => {
      root.removeAttribute('data-lg-paper');
    };
  }, []);

  return null;
}
