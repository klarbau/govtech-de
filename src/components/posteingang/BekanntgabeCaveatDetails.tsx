'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { Letter } from '@/types';

import { wrapNormZitate } from './wrapNormZitate';

interface BekanntgabeCaveatDetailsProps {
  letter: Letter;
  className?: string;
}

/**
 * § 122a-AO-Bekanntgabe-Caveat (Spec § 7.4 / § 11.8).
 *
 * Render-Bedingung: `letter.auth_channel === 'mein-elster'`.
 *
 * Verhalten:
 *   - Auf `<md` (= < 768 px): native `<details>`, default-collapsed.
 *   - Auf `>=md` (>= 768 px): default-open.
 *
 * Implementierung: ein `useEffect` setzt das `open`-Attribut basierend auf
 * `window.matchMedia('(min-width: 768px)').matches`. Bei SSR + No-JS rendert
 * das Element collapsed (kein `defaultOpen`), und das `<summary>`-Element ist
 * sichtbar — Progressive Enhancement, kein Mandatory-Hide (Domain-Doc § 8).
 *
 * a11y:
 *   - Native `<details>`/`<summary>` → Tastatur-Toggle automatisch.
 *   - Wir überschreiben `role="button"` NICHT (Spec § 3 a11y-Auflagen).
 */
export function BekanntgabeCaveatDetails({
  letter,
  className,
}: BekanntgabeCaveatDetailsProps): React.ReactElement | null {
  const t = useTranslations('posteingang.compose');

  const detailsRef = React.useRef<HTMLDetailsElement | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = detailsRef.current;
    if (!node) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => {
      node.open = mq.matches;
    };
    apply();
    // Spätere Resize zwischen Mobile- und Desktop-Breakpoint angemessen
    // mitziehen, damit der Caveat nicht in falscher Falt-Position bleibt.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    // Legacy-Fallback (Safari < 14)
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  if (letter.auth_channel !== 'mein-elster') return null;

  let summary: string;
  let body: string;
  try {
    summary = t('bekanntgabe_caveat_summary');
    body = t('bekanntgabe_caveat');
  } catch {
    return null;
  }

  return (
    <details
      ref={detailsRef}
      className={cn(
        'rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground',
        '[&[open]>summary]:mb-2',
        className,
      )}
      data-testid="bekanntgabe-caveat-details"
    >
      <summary
        className={cn(
          'cursor-pointer list-none font-medium text-foreground',
          'marker:hidden [&::-webkit-details-marker]:hidden',
          'flex items-center gap-2',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <span aria-hidden="true" className="inline-block transition-transform">
          ▸
        </span>
        <span>{summary}</span>
      </summary>
      <p className="leading-relaxed">{wrapNormZitate(body)}</p>
    </details>
  );
}

