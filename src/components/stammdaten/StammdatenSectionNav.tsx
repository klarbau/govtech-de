'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type StammdatenSectionNavKey =
  | 'identitaet'
  | 'anschrift'
  | 'familie'
  | 'altersvorsorge'
  | 'krankenversicherung_pflege'
  | 'mobilitaet'
  | 'dokumente'
  | 'sperren_einstellungen';

/**
 * Mapping nav-key → DOM-`id` (anchor target).
 *
 * Wir können nicht alle Sektion-`id`s vereinheitlichen, weil V1.1
 * `altersvorsorge` und `kv-pflege` bereits in Yellow-Letter-Bridge-Deeplinks
 * verwendet werden.
 */
const NAV_KEY_TO_DOM_ID: Record<StammdatenSectionNavKey, string> = {
  identitaet: 'identitaet',
  anschrift: 'anschrift',
  familie: 'familie',
  altersvorsorge: 'altersvorsorge',
  krankenversicherung_pflege: 'kv-pflege',
  mobilitaet: 'mobilitaet',
  dokumente: 'dokumente',
  sperren_einstellungen: 'sperren_einstellungen',
};

interface StammdatenSectionNavProps {
  /**
   * Sektionen, die tatsächlich auf der Seite gerendert sind (in Render-Order).
   * Sektionen, die für die Persona nicht vorhanden sind (z. B. `altersvorsorge`
   * = null), werden vom Parent NICHT übergeben.
   */
  sections: StammdatenSectionNavKey[];
  className?: string;
}

/**
 * In-Page-ToC für `/stammdaten` (Audit-Finding #2).
 *
 * Renders eine horizontale, scrollbare Tab-Leiste mit Anker-Buttons zu den
 * jeweiligen Sektionen. Verhalten:
 *  - Klick scrollt zur Sektion + öffnet das `<details>` (über setting hash).
 *  - IntersectionObserver markiert die gerade sichtbare Sektion (`aria-current="true"`).
 *  - `prefers-reduced-motion: reduce` → instant scroll statt smooth.
 *  - Sticky an Top des `<main>`-Containers auf Desktop+Mobile.
 *
 * a11y:
 *  - `<nav role="tablist">`-Pattern wäre semantisch falsch, weil wir nicht
 *    tatsächlich Tabs sondern Anker rendern. Wir nutzen `<nav aria-label>`
 *    mit `<a>`-Elementen.
 *  - Aktive Section markiert mit `aria-current="true"` (kein `"page"` — das ist
 *    für separate URLs reserviert).
 */
export function StammdatenSectionNav({
  sections,
  className,
}: StammdatenSectionNavProps) {
  const t = useTranslations('stammdaten.section_nav');
  const [active, setActive] = React.useState<string | null>(
    sections[0] ? NAV_KEY_TO_DOM_ID[sections[0]] : null,
  );

  // IntersectionObserver: höchste Sichtbarkeit gewinnt.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;

    const elements = sections
      .map((key) => document.getElementById(NAV_KEY_TO_DOM_ID[key]))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        let topId: string | null = null;
        let topRatio = -1;
        for (const [id, ratio] of visible) {
          if (ratio > topRatio) {
            topRatio = ratio;
            topId = id;
          }
        }
        if (topId !== null) setActive(topId);
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  function onJump(
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    id: string,
  ) {
    e.preventDefault();
    const node = document.getElementById(id);
    if (!node) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    node.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    setActive(id);

    // Open the `<details>` of the target section, if it's collapsed.
    const details = node.querySelector('details');
    if (details && !details.hasAttribute('open')) {
      details.setAttribute('open', '');
    }

    // Move keyboard focus to the section heading for screenreader users.
    // We do not scroll a second time — only focus, preventScroll.
    const heading = node.querySelector('h2, h3');
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1');
      try {
        heading.focus({ preventScroll: true });
      } catch {
        heading.focus();
      }
    }
  }

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={t('label')}
      className={cn(
        'sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border sm:px-2',
        className,
      )}
      data-testid="stammdaten-section-nav"
    >
      <ul className="flex min-w-max items-center gap-1">
        {sections.map((key) => {
          const domId = NAV_KEY_TO_DOM_ID[key];
          const label = safeT(t, `items.${key}`);
          const isActive = active === domId;
          return (
            <li key={key} className="contents">
              <a
                href={`#${domId}`}
                onClick={(e) => onJump(e, domId)}
                aria-current={isActive ? 'true' : undefined}
                data-testid={`section-nav-item-${key}`}
                className={cn(
                  'inline-flex min-h-[44px] items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function safeT(
  t: ReturnType<typeof useTranslations>,
  key: string,
): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
