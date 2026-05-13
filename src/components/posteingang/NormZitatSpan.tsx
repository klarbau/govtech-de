'use client';

import * as React from 'react';

import { getNormZitatAriaLabel } from './normZitatLookup';

interface NormZitatSpanProps {
  /**
   * Sichtbarer Norm-Text, z. B. „§ 357 Abs. 2 Satz 1 AO". Wird verbatim
   * gerendert; gleichzeitig wird daraus die `aria-label`-Aussprache aus dem
   * Lookup-Map geholt.
   */
  text: string;
  /**
   * Optional: explizite `aria-label`-Override. Wird benutzt, wenn der Caller
   * die Aussprache schon kennt (z. B. aus dem i18n-Layer); andernfalls wird
   * sie aus `getNormZitatAriaLabel(text)` aufgelöst.
   */
  ariaLabel?: string;
  /** Erlaubt zusätzliche Tailwind-Klassen (z. B. `font-semibold`). */
  className?: string;
}

/**
 * `<NormZitatSpan>` (Spec § 11.5, Hard-Line).
 *
 * Wrappt ein Norm-Zitat (`§ 357 Abs. 2 Satz 1 AO`) so, dass:
 *   - sehende Nutzer:innen den verbatim-Text sehen
 *   - Screenreader die volle Aussprache hören
 *     (`aria-label="Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung"`).
 *
 * Bei unbekanntem Norm-Text fällt das `aria-label` auf den sichtbaren Text
 * zurück, und in dev wird einmal pro Render console.warn'd — damit i18n-Drift
 * (neuer §, der nicht im Lookup ist) sichtbar wird, ohne den Render zu brechen.
 */
export function NormZitatSpan({
  text,
  ariaLabel,
  className,
}: NormZitatSpanProps): React.ReactElement {
  const resolved = ariaLabel ?? getNormZitatAriaLabel(text);

  if (
    resolved === undefined &&
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production' &&
    typeof console !== 'undefined'
  ) {
    console.warn(
      `[NormZitatSpan] Kein aria-label-Lookup für „${text}" — Fallback auf sichtbaren Text. ` +
        `Bitte normZitatLookup.ts ergänzen.`,
    );
  }

  return (
    <span aria-label={resolved ?? text} className={className}>
      {text}
    </span>
  );
}
