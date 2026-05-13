'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import {
  getRechtsprechungsZitat,
  type RechtsprechungsZitat,
} from './rechtsprechungsLookup';

interface RechtsprechungZitatSpanProps {
  /**
   * Sichtbares Kurzzitat, z. B. „EuGH C-184/20". Wird verbatim gerendert;
   * gleichzeitig wird daraus die `aria-label`-Aussprache + Tooltip-Inhalt
   * aus `RECHTSPRECHUNGS_LOOKUP` geholt.
   */
  text: string;
  /**
   * Optional: explizite `aria-label`-Override. Wird verwendet, wenn der
   * Caller die Aussprache schon kennt; andernfalls aus dem Lookup geholt.
   */
  ariaLabel?: string;
  /** Erlaubt zusätzliche Tailwind-Klassen. */
  className?: string;
  /**
   * Wenn `true`, rendert die Komponente nur das aria-gewrappte `<span>`
   * ohne sichtbaren Tooltip-Trigger (für Inline-Verwendung im Disclaimer-
   * Body). Default `false` → es wird ein `<details>`/`<summary>`-basierter
   * Tooltip-Anker mit Vollzitat + Kernaussage gerendert (V1.5-a11y-Konvention:
   * Hover-Tooltip MUSS Focus-Equivalent haben).
   */
  inline?: boolean;
}

/**
 * `<RechtsprechungZitatSpan>` (Spec § 11.28 Hard-Line — Stammdaten V1.1).
 *
 * Pattern-Schwester von `<NormZitatSpan>`. Sehende Nutzer:innen sehen den
 * verbatim-Kurzzitat; Screenreader hören die volle Aussprache. Im Default-
 * Mode (`inline === false`) hängt sich ein `<details>`-Tooltip an, der das
 * Vollzitat und die Kernaussage in deutschem Klartext zeigt — vollständig
 * Tastatur-zugänglich.
 *
 * a11y:
 *   - `aria-label` aus Lookup; Fallback auf sichtbaren Text mit
 *     dev-`console.warn`, damit Lookup-Drift sichtbar wird.
 *   - Tooltip-Body ist `<div role="tooltip">` (statt `aria-describedby`,
 *     weil `<details>` selbst native Disclosure-Semantik hat).
 */
export function RechtsprechungZitatSpan({
  text,
  ariaLabel,
  className,
  inline = false,
}: RechtsprechungZitatSpanProps): React.ReactElement {
  const lookup: RechtsprechungsZitat | undefined = getRechtsprechungsZitat(text);
  const resolvedAria = ariaLabel ?? lookup?.aria_label;

  if (
    resolvedAria === undefined &&
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production' &&
    typeof console !== 'undefined'
  ) {
    console.warn(
      `[RechtsprechungZitatSpan] Kein aria-label-Lookup für „${text}" — ` +
        `Fallback auf sichtbaren Text. Bitte rechtsprechungsLookup.ts ergänzen.`,
    );
  }

  if (inline || lookup === undefined) {
    return (
      <span aria-label={resolvedAria ?? text} className={className}>
        {text}
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex items-baseline gap-0.5', className)}
      data-testid={`rechtsprechung-${text}`}
    >
      <span aria-label={resolvedAria ?? text}>{text}</span>
      <details className="group inline-block align-baseline">
        <summary
          className={cn(
            'inline-flex cursor-pointer list-none items-center justify-center rounded-full',
            'px-1 text-[10px] font-bold leading-none text-muted-foreground',
            'ring-1 ring-border hover:text-foreground hover:ring-foreground/40',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            '[&::-webkit-details-marker]:hidden marker:hidden',
          )}
          aria-label={`${text} — Vollzitat anzeigen`}
        >
          i
        </summary>
        <div
          role="tooltip"
          className={cn(
            'absolute z-30 mt-1 w-72 rounded-lg border border-border bg-popover',
            'p-3 text-xs leading-relaxed text-popover-foreground shadow-lg',
          )}
        >
          <p className="font-semibold">{lookup.vollzitat}</p>
          <p className="mt-1 text-muted-foreground">{lookup.kernaussage_de}</p>
        </div>
      </details>
    </span>
  );
}
