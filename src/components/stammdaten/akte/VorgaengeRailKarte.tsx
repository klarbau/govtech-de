'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatDateDe } from '@/lib/utils';
import type { Vorgang, VorgangStatus } from '@/types';

/**
 * Status vocabulary of the Vorgang rows. `abgelehnt` deliberately gets neither
 * green nor the Umzug reading „mit Fehlern abgeschlossen": a rejection is a
 * burdening administrative act with a Rechtsbehelfsbelehrung (§ 70 VwGO /
 * § 355 AO), not a technical fault — the wrong word would mislead about the
 * deadline that is running.
 *
 * The dot is `aria-hidden`; the word travels as `sr-only` text in the row's
 * accessible name, so colour is never the sole carrier (WCAG 1.4.1).
 */
const STATUS: Record<VorgangStatus, { punkt: string; key: string }> = {
  angelegt: { punkt: 'bg-warning', key: 'vorgaenge.punkt_laeuft' },
  in_pruefung: { punkt: 'bg-warning', key: 'vorgaenge.punkt_laeuft' },
  abgeschlossen: {
    punkt: 'bg-success',
    key: 'vorgaenge.punkt_abgeschlossen',
  },
  genehmigt: { punkt: 'bg-success', key: 'vorgaenge.status_genehmigt' },
  abgelehnt: { punkt: 'bg-text-muted', key: 'vorgaenge.status_abgelehnt' },
};

const OFFEN = (v: Vorgang) =>
  v.status !== 'abgeschlossen' && v.status !== 'abgelehnt';

interface VorgaengeRailKarteProps {
  vorgaenge: Vorgang[];
}

/**
 * Rail block b (Spec `stammdaten-akte-v2.md` § 4.7b) — the standing list of
 * what is running, open ones first, then the most recently closed.
 *
 * Rows, not status pills: five pills in a 320px rail wrap into a ragged badge
 * cloud, and the row already carries its state twice (dot + hidden word).
 */
export function VorgaengeRailKarte({ vorgaenge }: VorgaengeRailKarteProps) {
  const t = useTranslations('stammdaten.akte');

  const zeilen = [...vorgaenge]
    .sort((a, b) => {
      const aOffen = OFFEN(a);
      const bOffen = OFFEN(b);
      if (aOffen !== bOffen) return aOffen ? -1 : 1;
      const key = (v: Vorgang) =>
        OFFEN(v) ? v.angelegt_am : (v.abgeschlossen_am ?? v.angelegt_am);
      return key(b).localeCompare(key(a));
    })
    .slice(0, 5);

  return (
    <section
      aria-labelledby="sd-vorgaenge-title"
      data-testid="sd-vorgaenge"
      className="sd-flaeche min-w-0 px-4 py-4 md:px-[18px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="sd-vorgaenge-title"
          className="text-sm font-semibold text-text-primary"
        >
          {t('vorgaenge.title')}
        </h2>
        <Link
          href="/vorgaenge"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t('vorgaenge.alle')}
        </Link>
      </div>

      {zeilen.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('vorgaenge.leer')}</p>
      ) : (
        <ul>
          {zeilen.map((v, idx) => {
            const status = STATUS[v.status];
            const datum = OFFEN(v)
              ? v.angelegt_am
              : (v.abgeschlossen_am ?? v.angelegt_am);
            return (
              <li
                key={v.id}
                className={idx > 0 ? 'border-t border-border/60' : ''}
              >
                <Link
                  href={`/vorgaenge/${v.id}`}
                  className="flex min-h-11 items-center gap-x-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden="true"
                    className={`size-[7px] shrink-0 rounded-full ${status.punkt}`}
                  />
                  <span className="min-w-0 flex-1 break-words text-[13px] font-medium leading-snug text-text-primary">
                    {v.titel}
                  </span>
                  <span className="sr-only">{t(status.key)}</span>
                  <span className="shrink-0 whitespace-nowrap text-[12px] text-text-secondary tabular-nums md:text-[11.5px]">
                    {formatDateDe(datum)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
