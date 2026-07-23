import { parseISO } from 'date-fns';

import type { Termin } from '@/types';

/**
 * Anzeige-Status eines Termins (redesign-termine-vorgemerkt.md, Tier 2).
 *
 * Der gespeicherte {@link Termin.status} kennt fünf Enum-Werte; die UI reduziert
 * sie auf vier Anzeige-Zustände und leitet „Erledigt" rein ab — es gibt KEINEN
 * sechsten Enum-Wert und „erledigt" wird niemals persistiert.
 *
 * - `'vorgeschlagen'`           → `'vorgemerkt'` (amber, vom Bürger zu bestätigen)
 * - `'bestaetigt'` / `'gebucht'`→ `'bestaetigt'` (grün; Legacy `gebucht` gemappt)
 * - `'verschoben'`              → defensiv `'bestaetigt'` (wird nicht mehr geschrieben)
 * - `'abgesagt'`               → `'abgesagt'`
 * - bestätigt/gebucht & `datum` < jetzt → `'erledigt'`
 */
export type TerminDisplayStatus =
  | 'vorgemerkt'
  | 'bestaetigt'
  | 'abgesagt'
  | 'erledigt';

function istVergangen(datumIso: string, nowIso: string): boolean {
  const datum = parseISO(datumIso).getTime();
  const now = parseISO(nowIso).getTime();
  if (Number.isNaN(datum) || Number.isNaN(now)) return false;
  return datum < now;
}

export function displayStatus(
  termin: Termin,
  nowIso: string,
): TerminDisplayStatus {
  if (termin.status === 'abgesagt') return 'abgesagt';
  if (termin.status === 'vorgeschlagen') return 'vorgemerkt';

  // bestaetigt | gebucht | verschoben — alle als „bestätigt" behandelt, in der
  // Vergangenheit zu „erledigt" abgeleitet.
  if (istVergangen(termin.datum, nowIso)) return 'erledigt';
  return 'bestaetigt';
}

/** i18n-Key des Status-Labels (Namespace `termine.status`). */
export function displayStatusLabelKey(status: TerminDisplayStatus): string {
  switch (status) {
    case 'vorgemerkt':
      return 'vorgeschlagen'; // Enum-Key bleibt; Label = „Vorgemerkt"
    case 'bestaetigt':
      return 'bestaetigt';
    case 'abgesagt':
      return 'abgesagt';
    case 'erledigt':
      return 'erledigt';
  }
}

/**
 * Ist dieser Termin der „Vorgemerkt"-Hero-Kandidat (Bürgeramt-§17-Anmeldung)?
 * Nur Bürgeramt-Termine im Zustand `vorgemerkt` tragen den Frist↔Termin-Wow.
 * Der ABH-Termin (LEA, invitation-only) ist NIE Hero (§ 9 / Honesty).
 */
export function istBuergeramtVorgemerkt(
  termin: Termin,
  nowIso: string,
): boolean {
  return (
    displayStatus(termin, nowIso) === 'vorgemerkt' &&
    termin.behoerde_id.startsWith('buergeramt-')
  );
}
