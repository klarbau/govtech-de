import * as React from 'react';

/**
 * Pinnt den primären CTA auf Telefonen (≤767px) fixiert über der
 * Bottom-Tab-Bar; ab 768px ist der Wrapper via `display: contents`
 * layoutneutral — die Kinder liegen im Eltern-Flow wie unverpackt.
 * CSS-Vertrag: `.mobile-sticky-cta` in src/app/mobile-nav.css.
 */
export function MobileStickyCta({ children }: { children: React.ReactNode }) {
  return <div className="mobile-sticky-cta">{children}</div>;
}
