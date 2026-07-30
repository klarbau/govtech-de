'use client';

import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import type { ProtokollZeile } from '@/components/stammdaten/datenblatt/Aenderungsprotokoll';
import { useProtokollZeilen } from '@/components/stammdaten/datenblatt/Aenderungsprotokoll';
import type { Behoerde, UebermittlungsLogEntry } from '@/types';

interface VerlaufRailKarteProps {
  entries: UebermittlungsLogEntry[];
  behoerdenById: Record<string, Behoerde>;
  personaId: string;
  /** Switches the register to „Verlauf" and moves focus onto its tab. */
  onAlleAktivitaeten: () => void;
}

const RAIL_LIMIT = 3;

/**
 * Rail-Kurzform des Protokoll-Titels: Datenart (bzw. Ereignis) + Empfänger,
 * ohne den Absender. In der schmalen Rail lief die Registerfassung
 * („{Sektion} · {Absender} → {Empfänger}") auf drei bis vier Zeilen pro
 * Eintrag; gekürzt wird über die Datenauswahl, nicht über `truncate`.
 *
 * Umformuliert wird ausschließlich aus den Bausteinen, die `useProtokollZeilen`
 * mitliefert (`datenart`/`empfaenger`) — keine zweite Ableitung aus dem Log und
 * keine Positionsannahme über die Zeilen (Code-Review 2026-07-29, B-3): filtert
 * der Hook eines Tages, paarte ein Index-Zugriff sonst lautlos die falsche
 * Rechtsgrundlage zum Titel. Ohne auflösbare Datenart bleibt die
 * Registerfassung stehen, damit nie eine leere Zeile entsteht.
 */
function useRailZeilen(
  entries: UebermittlungsLogEntry[],
  behoerdenById: Record<string, Behoerde>,
  personaId: string,
): ProtokollZeile[] {
  const t = useTranslations('stammdaten.akte');

  const zeilen = useProtokollZeilen(
    entries,
    behoerdenById,
    personaId,
    RAIL_LIMIT,
  );

  return zeilen.map((zeile) => {
    const { datenart, empfaenger } = zeile;
    if (!datenart) return zeile;

    return {
      ...zeile,
      titel: empfaenger ? t('verlauf.row', { datenart, empfaenger }) : datenart,
    };
  });
}

/**
 * Rail block d (Spec `stammdaten-akte-v2.md` § 4.7d) — the three most recent
 * transmissions as a quiet timeline, each with the norm it ran on.
 *
 * The dots carry no status meaning (they are pure rhythm, `aria-hidden`); the
 * legal basis is the information. „Alle Aktivitäten" is a plain button, not a
 * `role="tab"`: it opens the full register elsewhere on the page, so it also
 * hands the focus there (WCAG 2.4.3).
 */
export function VerlaufRailKarte({
  entries,
  behoerdenById,
  personaId,
  onAlleAktivitaeten,
}: VerlaufRailKarteProps) {
  const t = useTranslations('stammdaten.akte');
  const tD = useTranslations('stammdaten.datenblatt');

  const zeilen = useRailZeilen(entries, behoerdenById, personaId);

  return (
    <section
      aria-labelledby="sd-verlauf-title"
      data-testid="sd-verlauf-kurz"
      className="sd-flaeche min-w-0 px-4 py-4 md:px-[18px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="sd-verlauf-title"
          className="text-sm font-semibold text-text-primary"
        >
          {t('verlauf.title')}
        </h2>
        <button
          type="button"
          onClick={onAlleAktivitaeten}
          className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t('verlauf.alle')}
        </button>
      </div>

      {zeilen.length === 0 ? (
        <p className="text-sm text-text-secondary">{tD('protokoll.empty')}</p>
      ) : (
        <ol>
          {zeilen.map((zeile) => (
            <li key={zeile.id} className="flex gap-x-2.5 py-1.5">
              <span
                aria-hidden="true"
                className="mt-[7px] size-[7px] shrink-0 rounded-full bg-border-strong"
              />
              <div className="min-w-0">
                <p className="min-w-0 break-words text-[13px] font-medium leading-snug text-text-primary md:text-[12.5px]">
                  {zeile.titel}
                </p>
                <p className="mt-0.5 min-w-0 break-words text-[12px] leading-snug text-text-secondary md:text-[11.5px]">
                  {wrapNormZitate(zeile.rechtsgrundlage)}
                  {' · '}
                  <span className="tabular-nums">{zeile.datum}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
