'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';

import { KorrekturwegFeBehoerdeCTA } from './KorrekturwegFeBehoerdeCTA';

interface FuehrerscheinHauptkarteProps {
  /** FE-Nr mit `[MOCK]`-Präfix. */
  feNr: string;
  /** Zuständige FE-Behörde (kommune; § 73 FeV). */
  feBehoerde?: Behoerde;
  /** Ausstellungsdatum der aktuellen Plastik-Karte (ISO YYYY-MM-DD). */
  ausstellungsdatum: string;
  /** FE-Aktenzeichen bei der FE-Behörde (`[MOCK]`-Präfix). */
  feAktenzeichen: string;
  /**
   * Optional: Mehmet-Hook — eAT-Stufe-4-Pill (VL-11). Default false.
   * Wenn true, rendert eine kleine Pill „eAT-eID Stufe 4 aktiv".
   */
  showEatStufe4Pill?: boolean;
  /** Telemetry-Hook für Korrekturweg-CTA-Open (Activity-Log). */
  onKorrekturwegOpened?: (behoerdeName: string) => void;
  className?: string;
}

/**
 * `<FuehrerscheinHauptkarte>` (Spec § 4.1).
 *
 * Hauptkarte der Fahrerlaubnis-Gruppe: FE-Nr (read-only), Ausstellende
 * Behörde, Ausstellungsdatum + FE-Aktenzeichen, Korrekturweg-CTA.
 *
 * FE-Nr ist nicht-maskiert (kein personenbezogen-äquivalenter Marker wie FIN).
 * Aber: **read-only** (HL-MOB-10). Mutation nur via kommunale FE-Behörde.
 */
export function FuehrerscheinHauptkarte({
  feNr,
  feBehoerde,
  ausstellungsdatum,
  feAktenzeichen,
  showEatStufe4Pill,
  onKorrekturwegOpened,
  className,
}: FuehrerscheinHauptkarteProps) {
  const t = useTranslations('stammdaten.mobilitaet.fe');
  const tBadge = useTranslations('stammdaten.badge');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  return (
    <article
      aria-labelledby="fe-hauptkarte-title"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
      data-testid="fe-hauptkarte"
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3
          id="fe-hauptkarte-title"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t('fe_nr_label')}
        </h3>
        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60">
          {tBadge('mock')}
        </span>
        {showEatStufe4Pill && (
          <span
            className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-900 ring-1 ring-violet-300/70 dark:bg-violet-900/40 dark:text-violet-100 dark:ring-violet-700/60"
            data-testid="eat-stufe4-pill"
          >
            {t('eat_stufe4_pill')}
          </span>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('fe_nr_label')}
          </dt>
          <dd
            dir="ltr"
            className="font-mono text-sm tabular-nums text-foreground"
          >
            {feNr}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('ausstellungsdatum_label')}
          </dt>
          <dd className="text-sm text-foreground">
            {formatIso(ausstellungsdatum)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('fe_behoerde_label')}
          </dt>
          <dd className="text-sm text-foreground">
            {feBehoerde ? (
              <BehoerdenBadge
                name={feBehoerde.name_de}
                kategorie={feBehoerde.kategorie}
              />
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('fe_aktenzeichen_label')}
          </dt>
          <dd
            dir="ltr"
            className="font-mono text-xs tabular-nums text-muted-foreground"
          >
            {feAktenzeichen}
          </dd>
        </div>
      </dl>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {wrapNormZitate(tDisclaimer('fe_nr_read_only'))}
      </p>

      <KorrekturwegFeBehoerdeCTA
        feBehoerde={feBehoerde}
        onOpened={onKorrekturwegOpened}
      />
    </article>
  );
}

function formatIso(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
