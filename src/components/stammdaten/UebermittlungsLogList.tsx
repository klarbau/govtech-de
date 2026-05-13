'use client';

import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';
import type { UebermittlungsLogEntry } from '@/types/stammdaten';

/** V1.2 — Filter-Achse für `<RichtungSwitch>`. */
export type UebermittlungsLogRichtung =
  | 'alle'
  | 'eingehend'
  | 'ausgehend'
  | 'intern';

interface UebermittlungsLogListProps {
  entries: UebermittlungsLogEntry[];
  behoerdenById: Record<string, Behoerde>;
  /** Maximale Anzahl Einträge — für Sektion-Drawer typischerweise 5. */
  limit?: number;
  /**
   * V1.2 — Richtung-Filter (Spec § 6.11 / Hard-Line § 11.40). Default `alle`.
   * - `eingehend`: nur `behoerde_zu_buerger`
   * - `ausgehend`: nur `behoerde_zu_behoerde` + `speculative_2027`
   * - `intern`: nur `app_aktivitaet`
   */
  richtung?: UebermittlungsLogRichtung;
  className?: string;
}

/**
 * `<UebermittlungsLogList>` (Spec § 3 / § 7.4).
 *
 * Reverse-chronologische Liste; jeder Eintrag rendert:
 *   - Kategorie-Pill (Behörde-zu-Behörde / App-Aktivität / 2027-Vision)
 *   - Absender → Empfänger (BehoerdenBadge × 2 für `behoerde_zu_behoerde`)
 *   - Zweck (i18n)
 *   - Rechtsgrundlage gewrappt mit `<NormZitatSpan>` (Hard-Line § 11.7)
 *   - Zeitstempel
 *
 * a11y: ungeordnete Liste; jeder `<li>` hat strukturiertes Markup,
 * Aussprache der Norm-Zitate via `<NormZitatSpan>`-Lookup.
 */
export function UebermittlungsLogList({
  entries,
  behoerdenById,
  limit,
  richtung = 'alle',
  className,
}: UebermittlungsLogListProps) {
  const t = useTranslations();
  const tLog = useTranslations('stammdaten.aktivitaet');

  // V1.2 — Richtung-Filter (Hard-Line § 11.40).
  const filteredByRichtung = entries.filter((entry) => {
    if (richtung === 'alle') return true;
    if (richtung === 'eingehend') {
      return entry.kategorie === 'behoerde_zu_buerger';
    }
    if (richtung === 'ausgehend') {
      return (
        entry.kategorie === 'behoerde_zu_behoerde' ||
        entry.kategorie === 'speculative_2027'
      );
    }
    if (richtung === 'intern') {
      return entry.kategorie === 'app_aktivitaet';
    }
    return true;
  });

  if (filteredByRichtung.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{tLog('empty')}</p>
    );
  }

  const visible = limit ? filteredByRichtung.slice(0, limit) : filteredByRichtung;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h3 className="text-xs font-semibold tracking-tight text-foreground">
        {tLog('list_heading')}
      </h3>
      <ol className="flex flex-col gap-2">
        {visible.map((entry) => (
          <UebermittlungsLogItem
            key={entry.id}
            entry={entry}
            behoerdenById={behoerdenById}
            t={t}
            tLog={tLog}
          />
        ))}
      </ol>
    </div>
  );
}

interface ItemProps {
  entry: UebermittlungsLogEntry;
  behoerdenById: Record<string, Behoerde>;
  t: ReturnType<typeof useTranslations>;
  tLog: ReturnType<typeof useTranslations>;
}

function UebermittlungsLogItem({ entry, behoerdenById, t, tLog }: ItemProps) {
  let zweck: string;
  try {
    zweck = t(entry.zweck_i18n_key);
  } catch {
    zweck = entry.zweck_i18n_key;
  }

  const absenderName =
    entry.absender_behoerde_id !== undefined
      ? (behoerdenById[entry.absender_behoerde_id]?.name_de ??
        `[Behörde ${entry.absender_behoerde_id}]`)
      : null;
  const empfaengerName =
    entry.empfaenger_id !== undefined
      ? (behoerdenById[entry.empfaenger_id]?.name_de ?? entry.empfaenger_id)
      : null;

  let zeit: string;
  try {
    zeit = format(parseISO(entry.timestamp), 'dd.MM.yyyy HH:mm', {
      locale: deLocale,
    });
  } catch {
    zeit = entry.timestamp;
  }

  const kategorieClass: Record<typeof entry.kategorie, string> = {
    behoerde_zu_behoerde:
      'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
    app_aktivitaet:
      'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100',
    speculative_2027:
      'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100',
    behoerde_zu_buerger:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  };

  return (
    <li
      className="flex flex-col gap-1.5 rounded-md border border-border bg-background px-3 py-2"
      data-testid={`log-entry-${entry.id}`}
      data-kategorie={entry.kategorie}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kategorieClass[entry.kategorie]}`}
        >
          {tLog(`kategorie.${entry.kategorie}.label`)}
        </span>
        <time className="text-[11px] text-muted-foreground" dateTime={entry.timestamp}>
          {zeit}
        </time>
      </div>
      {entry.kategorie === 'behoerde_zu_behoerde' && absenderName && empfaengerName && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <BehoerdenBadge
            name={absenderName}
            kategorie={behoerdenById[entry.absender_behoerde_id ?? '']?.kategorie}
          />
          <span aria-hidden="true">→</span>
          <BehoerdenBadge
            name={empfaengerName}
            kategorie={
              entry.empfaenger_id
                ? behoerdenById[entry.empfaenger_id]?.kategorie
                : undefined
            }
          />
        </div>
      )}
      {entry.kategorie === 'speculative_2027' && empfaengerName && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true">→</span>
          <BehoerdenBadge
            name={empfaengerName}
            kategorie={
              entry.empfaenger_id
                ? behoerdenById[entry.empfaenger_id]?.kategorie
                : undefined
            }
          />
        </div>
      )}
      {entry.kategorie === 'behoerde_zu_buerger' && absenderName && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <BehoerdenBadge
            name={absenderName}
            kategorie={behoerdenById[entry.absender_behoerde_id ?? '']?.kategorie}
          />
          <span aria-hidden="true">↓</span>
          <span className="text-foreground">{tLog('richtung.eingehend.label')}</span>
        </div>
      )}
      <p className="text-sm leading-relaxed text-foreground">{zweck}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {wrapNormZitate(entry.rechtsgrundlage)}
      </p>
    </li>
  );
}
