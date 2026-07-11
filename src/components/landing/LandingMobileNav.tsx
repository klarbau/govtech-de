'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

/**
 * Mobile disclosure nav for the marketing landing (`/`).
 *
 * ≤767px the frosted `.landing-header` swaps its wrapped 5-link `.landing-nav`
 * (which stacked into ~3 rows under the logo) for this burger. Strings are DE-
 * inline on purpose — the landing is the deliberate static-DE exception, no
 * next-intl (see page.tsx header comment). Links mirror the desktop nav exactly.
 *
 * a11y: `aria-expanded` + `aria-controls` disclosure; Escape closes and returns
 * focus to the trigger; opening moves focus to the first link; each link closes
 * the panel. No motion (nothing to gate for reduced-motion). Visibility itself
 * is CSS-driven (onboarding-landing-liquid-glass.css, `data-lg-aux` scope).
 */
const LINKS = [
  { label: 'Lösungen', href: '#leistungen' },
  { label: 'Lebenslagen', href: '#leistungen' },
  { label: 'Sicherheit & Datenschutz', href: '/datenschutz' },
  { label: 'Ressourcen', href: '#' },
  { label: 'Über uns', href: '#' },
] as const;

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="landing-mobile-nav">
      <button
        ref={buttonRef}
        type="button"
        className="landing-burger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      {open ? (
        <div ref={panelRef} id={panelId} className="landing-burger-panel">
          <ul>
            {LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
