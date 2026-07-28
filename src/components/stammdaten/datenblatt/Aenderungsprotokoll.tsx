'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { formatDateDe, formatTimeDe } from '@/lib/utils';
import type { Behoerde } from '@/types';
import type { UebermittlungsLogEntry } from '@/types/stammdaten';

interface AenderungsprotokollProps {
  entries: UebermittlungsLogEntry[];
  behoerdenById: Record<string, Behoerde>;
  personaId: string;
  limit?: number;
}

/**
 * Band 3 — „Änderungsprotokoll" (Spec § 4.4c, full width since
 * `stammdaten-blatt-dense.md` § 3.4). Date on the left in a narrow
 * `tabular-nums` column, the transmission and its `rechtsgrundlage` on the
 * right; hairlines instead of avatars or icon circles.
 *
 * Rows whose two ends are both authorities read `{Sektion} · {Absender} →
 * {Empfänger}`. Seed entries that have only one end (a citizen-triggered app
 * activity) fall back to their `zweck` text — inventing an authority for the
 * missing end would be a false claim.
 */
export function Aenderungsprotokoll({
  entries,
  behoerdenById,
  personaId,
  limit = 5,
}: AenderungsprotokollProps) {
  const t = useTranslations('stammdaten.datenblatt');
  const tRoot = useTranslations();
  const tFmt = useTranslations('stammdaten.format');

  const rows = entries.slice(0, limit).map((entry) => {
    const sektionKey = entry.sektion
      ? `stammdaten.sektion.${entry.sektion}.title`
      : undefined;
    const sektion =
      sektionKey && tRoot.has(sektionKey) ? tRoot(sektionKey) : undefined;

    const absender = entry.absender_behoerde_id
      ? behoerdenById[entry.absender_behoerde_id]?.name_de
      : undefined;
    const empfaenger = entry.empfaenger_id
      ? (behoerdenById[entry.empfaenger_id]?.name_de ??
        (entry.empfaenger_id === personaId
          ? t('protokoll.empfaenger_buerger')
          : undefined))
      : undefined;

    let titel: string;
    if (absender && empfaenger) {
      titel = sektion
        ? t('protokoll.row_mit_sektion', { sektion, absender, empfaenger })
        : t('protokoll.row', { absender, empfaenger });
    } else {
      const zweck = tRoot.has(entry.zweck_i18n_key)
        ? tRoot(entry.zweck_i18n_key)
        : (absender ?? empfaenger ?? '');
      titel = sektion ? t('protokoll.row_zweck', { sektion, zweck }) : zweck;
    }

    return {
      id: entry.id,
      datum: formatDateDe(entry.timestamp),
      zeit: formatTimeDe(entry.timestamp),
      titel,
      rechtsgrundlage: entry.rechtsgrundlage,
    };
  });

  return (
    <section
      aria-labelledby="sd-protokoll-title"
      data-testid="sd-protokoll"
      className="border-t border-border pt-4"
    >
      {/* Gleicher Sektionskopf wie im Blatt: 11px-Versalien links, die
          Herkunftszeile rechtsbündig auf derselben Grundlinie. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="sd-protokoll-title"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary"
        >
          {t('protokoll.title')}
        </h2>
        <p className="text-xs text-text-secondary">{t('protokoll.subtitle')}</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">{t('protokoll.empty')}</p>
      ) : (
        <ol className="mt-3">
          {rows.map((row, idx) => (
            /* ≥1280px the row is set as a table line: stamp · transmission ·
               legal basis on one baseline. Below that the legal basis stays the
               second line of column 2 — same DOM, placed by grid. */
            <li
              key={row.id}
              /* Spalte 3 = 18rem statt der Spec-22rem: mit 22rem lag die Seite
                 @1280 bei 1912px (> Budget 1900); 18rem gibt Spalte 2 genug
                 Breite, dass lange Behörden-Ketten zwei- statt dreizeilig
                 setzen (Build-Log-Abweichung #2). */
              className={`grid grid-cols-[max-content_1fr] gap-x-4 py-2.5 xl:grid-cols-[max-content_minmax(0,1fr)_minmax(0,18rem)] xl:items-baseline xl:gap-x-8 xl:py-2 ${
                idx > 0 ? 'border-t border-border/40' : ''
              }`}
            >
              <p className="text-xs leading-snug text-text-secondary tabular-nums">
                {row.datum}{' '}
                {/* Wortzwischenraum statt `xl:ms-2`: lightningcss verwirft die
                    logische Margin-Utility im xl-Media-Block (leerer Regelsatz
                    im Bundle verifiziert). Ein Leerzeichen braucht kein CSS,
                    keinen Key und ist RTL-neutral; ≤1279 kollabiert es am
                    Zeilenende vor dem block-Span. */}
                <span className="block xl:inline">
                  {tFmt('uhrzeit', { zeit: row.zeit })}
                </span>
              </p>
              <p className="min-w-0 text-sm text-text-primary">{row.titel}</p>
              <p className="col-start-2 mt-0.5 min-w-0 text-xs leading-relaxed text-text-secondary xl:col-start-3 xl:row-start-1 xl:mt-0">
                {wrapNormZitate(row.rechtsgrundlage)}
              </p>
            </li>
          ))}
        </ol>
      )}

      <Link
        href="/datenschutz"
        className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {t('protokoll.show_all')}
      </Link>
    </section>
  );
}
