'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { cn } from '@/lib/utils';

export interface AnrechnungszeitKindererziehung {
  typ: 'kindererziehung';
  /** Anzahl Monate. */
  monate: number;
  /** Vorname des Kindes (für Disclosure). */
  kind_vorname: string;
}

export interface AnrechnungszeitWehrZivildienst {
  typ: 'wehrdienst' | 'zivildienst';
  monate: number;
}

export interface AnrechnungszeitPflege {
  typ: 'pflege';
  monate: number;
  /** Bezugsperson (Familienmitglied). */
  pflegebeduerftige_person?: string;
}

export type AnrechnungszeitEntry =
  | AnrechnungszeitKindererziehung
  | AnrechnungszeitWehrZivildienst
  | AnrechnungszeitPflege;

interface AnrechnungszeitenListProps {
  entries: AnrechnungszeitEntry[];
  /**
   * Hard-Line § 11.30: Pflege-Zeile NUR sichtbar, wenn der Pflegegrad-Modal-
   * Consent-Toggle in derselben Sitzung erteilt wurde. Semantische Art-9-
   * Coupling.
   */
  pflegegradConsentSession: boolean;
}

/**
 * `<AnrechnungszeitenList>` (Spec § 11.30 Hard-Line — Stammdaten V1.1).
 *
 * Liste mit Anrechnungszeiten:
 *   - Kindererziehung (`§ 56 SGB VI`)
 *   - Wehr-/Zivildienst (informativ)
 *   - Pflege (`§ 3 SGB VI`) — gekoppelt an Pflegegrad-Modal-Toggle
 *     (`pflegegradConsentSession === true`)
 *
 * Frontend-coder darf für Pflege KEINEN separaten Modal-Toggle einbauen.
 *
 * a11y:
 *   - `<ul>` mit `<li>` pro Eintrag; Norm-Zitat via `<NormZitatSpan>`-Wrap
 *   - Pflege-Zeile wird komplett aus dem DOM entfernt, wenn Consent fehlt
 *     (kein „leeres Render"; Idempotenz mit Modal-State).
 */
export function AnrechnungszeitenList({
  entries,
  pflegegradConsentSession,
}: AnrechnungszeitenListProps) {
  const t = useTranslations('stammdaten.altersvorsorge.anrechnungszeiten');

  const visible = entries.filter(
    (e) => e.typ !== 'pflege' || pflegegradConsentSession,
  );

  if (visible.length === 0) return null;

  let title: string;
  try {
    title = t('title');
  } catch {
    title = 'Anrechnungszeiten';
  }

  return (
    <section
      aria-labelledby="anrechnungszeiten-title"
      data-testid="anrechnungszeiten-list"
      className={cn('rounded-xl border border-border bg-card p-4 shadow-sm')}
    >
      <h3
        id="anrechnungszeiten-title"
        className="text-sm font-semibold tracking-tight text-foreground"
      >
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {visible.map((e, idx) => (
          <li
            key={`anr-${idx}`}
            className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
            data-testid={`anrechnungszeit-${e.typ}`}
          >
            <span className="text-foreground">
              {renderEntryLabel(e)}{' '}
              <span className="text-muted-foreground">
                ({renderRechtsgrundlage(e)})
              </span>
            </span>
            <span className="font-mono text-muted-foreground">
              {e.monate} Monate
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renderEntryLabel(e: AnrechnungszeitEntry): React.ReactNode {
  switch (e.typ) {
    case 'kindererziehung':
      return `Kindererziehung (${e.kind_vorname})`;
    case 'wehrdienst':
      return 'Wehrdienst';
    case 'zivildienst':
      return 'Zivildienst';
    case 'pflege':
      return e.pflegebeduerftige_person
        ? `Pflege — ${e.pflegebeduerftige_person}`
        : 'Pflege';
  }
}

function renderRechtsgrundlage(e: AnrechnungszeitEntry): React.ReactElement {
  switch (e.typ) {
    case 'kindererziehung':
      return <NormZitatSpan text="§ 56 SGB VI" />;
    case 'pflege':
      return <NormZitatSpan text="§ 3 SGB VI" />;
    case 'wehrdienst':
    case 'zivildienst':
      return <NormZitatSpan text="§ 3 SGB VI" />;
  }
}
