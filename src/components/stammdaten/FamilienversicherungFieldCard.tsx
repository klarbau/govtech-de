'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { cn } from '@/lib/utils';

export interface FamilienversicherteSubject {
  vorname: string;
  nachname: string;
  /** ISO YYYY-MM-DD oder YYYY-MM. */
  familienversichert_bis: string;
  art: 'partner' | 'kind';
}

interface FamilienversicherungFieldCardProps {
  /**
   * Wenn die Persona selbst familienversichert ist: Name der Stamm-Person +
   * Bis-Datum. Andernfalls undefined → die Persona ist Stamm-Versicherte:r,
   * und `mitversicherte_personen` listet die Familienangehörigen.
   */
  familienversichert_ueber?: { stammversicherte_name: string; bis: string };
  mitversicherte_personen: FamilienversicherteSubject[];
}

function formatBisIso(value: string): string {
  // Akzeptiert sowohl YYYY-MM-DD als auch YYYY-MM.
  try {
    if (value.length === 7) {
      // YYYY-MM
      return format(parseISO(`${value}-01`), 'MM/yyyy', { locale: deLocale });
    }
    return format(parseISO(value), 'MM/yyyy', { locale: deLocale });
  } catch {
    return value;
  }
}

function formatBisAria(value: string): string {
  try {
    if (value.length === 7) {
      return format(parseISO(`${value}-01`), 'MMMM yyyy', {
        locale: deLocale,
      });
    }
    return format(parseISO(value), 'MMMM yyyy', { locale: deLocale });
  } catch {
    return value;
  }
}

/**
 * `<FamilienversicherungFieldCard>` (Spec § 6.2 — Stammdaten V1.1).
 *
 * Sichtbar bei Stamm-Versicherten mit Angehörigen oder bei Familien-
 * versicherten selbst. Rendert:
 *   - Stamm-Versicherte:r selbst → Status-Pill „Familienversichert über
 *     {stammversicherte_name} — bis längstens {MM/JJJJ}" (§ 10 SGB V)
 *   - Stamm-Versicherte:r → Liste der mitversicherten Personen
 *
 * a11y:
 *   - Status-Pill `aria-label` mit ausgeschriebenem Datum für SR
 *   - Norm-Zitat via `<NormZitatSpan>`
 *   - Einkommens-Grenzen-Tooltip via `<details>` (Focus-Equivalent)
 */
export function FamilienversicherungFieldCard({
  familienversichert_ueber,
  mitversicherte_personen,
}: FamilienversicherungFieldCardProps) {
  const t = useTranslations('stammdaten.kv_pflege.familienversicherung');

  let title: string;
  try {
    title = t('title');
  } catch {
    title = 'Familienversicherung';
  }
  let einkommenTooltip: string;
  try {
    einkommenTooltip = t('einkommen_grenze_tooltip');
  } catch {
    einkommenTooltip =
      'Einkommensgrenze 2026: 565 €/Monat allgemein bzw. 603 € Minijob (§ 10 SGB V)';
  }

  if (!familienversichert_ueber && mitversicherte_personen.length === 0) {
    return null;
  }

  const titleId = 'familienversicherung-title';

  return (
    <article
      aria-labelledby={titleId}
      data-testid="familienversicherung-field-card"
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title} <NormZitatSpan text="§ 10 SGB V" />
        </h3>
      </header>

      {familienversichert_ueber && (
        <p
          className="mt-3 inline-flex flex-wrap items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground"
          aria-label={`Familienversichert über ${familienversichert_ueber.stammversicherte_name}, bis längstens ${formatBisAria(
            familienversichert_ueber.bis,
          )}`}
          data-testid="familienversicherung-self-pill"
        >
          Familienversichert über {familienversichert_ueber.stammversicherte_name} — bis
          längstens {formatBisIso(familienversichert_ueber.bis)}
        </p>
      )}

      {mitversicherte_personen.length > 0 && (
        <ul
          className="mt-3 flex flex-col gap-1 text-xs"
          data-testid="familienversicherung-list"
        >
          {mitversicherte_personen.map((p, idx) => (
            <li
              key={`fam-${idx}`}
              className="flex flex-wrap items-baseline justify-between gap-2"
            >
              <span className="text-foreground">
                {p.vorname} {p.nachname}{' '}
                <span className="text-muted-foreground">
                  ({p.art === 'partner' ? 'Partner:in' : 'Kind'})
                </span>
              </span>
              <span
                className="font-mono text-muted-foreground"
                aria-label={`bis längstens ${formatBisAria(p.familienversichert_bis)}`}
              >
                bis {formatBisIso(p.familienversichert_bis)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-3 group">
        <summary
          className={cn(
            'cursor-pointer list-none text-[11px] text-muted-foreground underline-offset-2',
            'hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            '[&::-webkit-details-marker]:hidden marker:hidden',
          )}
        >
          Einkommensgrenze 2026 anzeigen
        </summary>
        <p className="mt-2 rounded-md bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
          {einkommenTooltip}
        </p>
      </details>
    </article>
  );
}
