'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { Car } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';

import { FinMaskedSpan } from './FinMaskedSpan';
import { KfzMitnutzerPill } from './KfzMitnutzerPill';

export interface KfzHalterView {
  kennzeichen: string;
  marke: string;
  modell: string;
  baujahr: string;
  fin_voll: string;
  fin_masked: string;
  hu_bis: string;
  evb_nummer: string;
  zulassung_aktenzeichen: string;
  zulassungsstelle_id: string;
  mitnutzer?: Array<{ vorname: string; nachname: string }>;
}

interface KfzHalterKarteProps {
  halter: KfzHalterView;
  zulassungsstelle?: Behoerde;
  /**
   * Anker-Suffix für eindeutige FIN-Toggle-IDs (Mehmet hat 2 Halter-Cards).
   */
  cardIndex: number;
  className?: string;
}

/**
 * `<KfzHalterKarte>` (Spec § 4.1 / VL-12).
 *
 * Pro Fahrzeug eine Karte: Kennzeichen, Marke/Modell + BJ, FIN-masked
 * (Toggle voll), HU-Datum + Frist-Pill bei <90 Tagen, eVB, Zulassungsstelle,
 * optional Mitnutzer-Pill (Familie Schmidt).
 *
 * **Read-Only** (HL-MOB-10). Kein Self-Edit-Pfad.
 */
export function KfzHalterKarte({
  halter,
  zulassungsstelle,
  cardIndex,
  className,
}: KfzHalterKarteProps) {
  const t = useTranslations('stammdaten.mobilitaet.halter');
  const tBadge = useTranslations('stammdaten.badge');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  const huDaysLeft = (() => {
    try {
      return differenceInCalendarDays(parseISO(halter.hu_bis), new Date());
    } catch {
      return Infinity;
    }
  })();
  const huWithin90 = huDaysLeft >= 0 && huDaysLeft <= 90;

  const uniqueKey = `halter-${cardIndex}`;

  return (
    <article
      aria-labelledby={`${uniqueKey}-title`}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
      data-testid={`kfz-halter-card-${cardIndex}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Car className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3
          id={`${uniqueKey}-title`}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t('card_title')}
        </h3>
        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60">
          {tBadge('mock')}
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('kennzeichen_label')}
          </dt>
          <dd className="font-mono text-base font-semibold text-foreground">
            {halter.kennzeichen}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('fahrzeug_label')}
          </dt>
          <dd className="text-sm text-foreground">
            {t('marke_modell_baujahr', {
              marke: halter.marke,
              modell: halter.modell,
              baujahr: halter.baujahr,
            })}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('fin_label')}
          </dt>
          <dd>
            <FinMaskedSpan
              finVoll={halter.fin_voll}
              finMasked={halter.fin_masked}
              uniqueKey={uniqueKey}
            />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('hu_label')}
          </dt>
          <dd className="flex flex-col gap-1 text-sm text-foreground">
            <span>{formatIso(halter.hu_bis)}</span>
            {huWithin90 && (
              <span
                role="status"
                className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60"
                data-testid={`hu-frist-warning-${cardIndex}`}
              >
                {t('hu_frist_warning_90d', { days: huDaysLeft })}
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('evb_label')}
          </dt>
          <dd className="font-mono text-sm text-foreground">
            {halter.evb_nummer}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('zulassungsstelle_label')}
          </dt>
          <dd className="text-sm text-foreground">
            {zulassungsstelle ? (
              <BehoerdenBadge
                name={zulassungsstelle.name_de}
                kategorie={zulassungsstelle.kategorie}
              />
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('aktenzeichen_label')}
          </dt>
          <dd className="font-mono text-xs text-muted-foreground">
            {halter.zulassung_aktenzeichen}
          </dd>
        </div>
      </dl>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {wrapNormZitate(tDisclaimer('fin_masked_default'))}
      </p>

      {halter.mitnutzer && halter.mitnutzer.length > 0 && (
        <div className="flex flex-col gap-2">
          {halter.mitnutzer.map((m) => (
            <KfzMitnutzerPill
              key={`${m.vorname}-${m.nachname}`}
              vorname={m.vorname}
              nachname={m.nachname}
            />
          ))}
        </div>
      )}
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
