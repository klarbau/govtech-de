'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { cn } from '@/lib/utils';

export type VersichertenStatus =
  | 'pflicht'
  | 'freiwillig'
  | 'familienversichert'
  | 'privat';

interface KrankenkasseFieldCardProps {
  /** Name der Krankenkasse (z. B. „AOK Nordost"). */
  kassenName: string;
  /** Behörden-Kategorie für `<BehoerdenBadge>`-Tone (sozialversicherung etc.). */
  kassenKategorie?: 'sozialversicherung' | 'privat' | 'bund' | 'land' | 'kommune';
  /** KVNR im § 290-konformen 10/10-Format (Hard-Line § 11.21). */
  kvnr?: { unveraenderbar: string; veraenderbar: string };
  /** Fallback-KVNR (V1-Bestand) wenn `kvnr` fehlt. */
  kvnrFallback?: string;
  versicherten_status: VersichertenStatus;
}

/**
 * `<KrankenkasseFieldCard>` (Spec § 6.2, § 11.21 — Stammdaten V1.1).
 *
 * Krankenkasse-Name + KVNR (zwei-Teile-Visual-Trennung unveränderbar/
 * veränderbar nach § 290 SGB V) + Versicherten-Status-Pill.
 *
 * a11y:
 *   - KVNR-Zwei-Teile haben jeweils eigene `aria-label` mit Spelling
 *     („A 1 2 3 4 5 6 7 8 0"), damit Screenreader nicht „A12345678C0" als
 *     ein Wort lesen.
 *   - Status-Pill mit `aria-label` = vollständigen Klartext
 */
export function KrankenkasseFieldCard({
  kassenName,
  kassenKategorie,
  kvnr,
  kvnrFallback,
  versicherten_status,
}: KrankenkasseFieldCardProps) {
  const t = useTranslations('stammdaten.kv_pflege.krankenkasse');

  let label: string;
  try {
    label = t('label');
  } catch {
    label = 'Krankenkasse';
  }
  let kvnrLabel: string;
  try {
    kvnrLabel = t('kvnr_label');
  } catch {
    kvnrLabel = 'Krankenversichertennummer (KVNR, § 290 SGB V)';
  }
  let unveraenderbarLabel: string;
  try {
    unveraenderbarLabel = t('kvnr_part_unveraenderbar_label');
  } catch {
    unveraenderbarLabel = 'Unveränderbarer Teil (lebenslang)';
  }
  let veraenderbarLabel: string;
  try {
    veraenderbarLabel = t('kvnr_part_veraenderbar_label');
  } catch {
    veraenderbarLabel = 'Veränderbarer Teil (Kassenbezug)';
  }
  let statusLabel: string;
  try {
    statusLabel = t(`versicherten_status.${versicherten_status}`);
  } catch {
    statusLabel = versicherten_status;
  }

  const titleId = 'kvnr-field-title';

  return (
    <article
      aria-labelledby={titleId}
      data-testid="krankenkasse-field-card"
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {label}
        </h3>
        <span
          className={cn(
            'rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground',
          )}
          aria-label={statusLabel}
          data-testid={`versicherten-status-${versicherten_status}`}
        >
          {statusLabel}
        </span>
      </header>
      <div className="mt-2 flex items-center gap-2">
        <BehoerdenBadge name={kassenName} kategorie={kassenKategorie} />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-xs">
        <div>
          <dt className="font-medium text-muted-foreground">
            {kvnrLabel} <NormZitatSpan text="§ 290 SGB V" />
          </dt>
          {kvnr ? (
            <dd className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <KvnrPart
                value={kvnr.unveraenderbar}
                label={unveraenderbarLabel}
                testId="kvnr-part-unveraenderbar"
              />
              <KvnrPart
                value={kvnr.veraenderbar}
                label={veraenderbarLabel}
                testId="kvnr-part-veraenderbar"
              />
            </dd>
          ) : (
            kvnrFallback && (
              <dd
                className="mt-1 font-mono text-foreground"
                aria-label={spellChars(kvnrFallback)}
              >
                {kvnrFallback}
              </dd>
            )
          )}
        </div>
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Kassenwechsel oder Mitgliedsdaten-Korrektur erfolgt direkt bei Ihrer
        Krankenkasse — nicht über diese App.
      </p>
    </article>
  );
}

function KvnrPart({
  value,
  label,
  testId,
}: {
  value: string;
  label: string;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-sm text-foreground"
        aria-label={`${label}: ${spellChars(value)}`}
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  );
}

function spellChars(value: string): string {
  return value.split('').join(' ');
}
