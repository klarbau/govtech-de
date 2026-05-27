import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { StatusVariant } from '@/components/shared/StatusBadge';

/**
 * Frontend-Ableitung des Dokument-Status (kein Backend-Feld) — `redesign-dokumente.md` § 4.5.
 *
 * Prüfreihenfolge (verbindlich): abgelaufen > ablauf_bald > neu > verifiziert.
 * Demo-Zeitbezug `nowIso` wird vom Server gereicht (SSR-stabil).
 */
export type DocumentStatus = Extract<
  StatusVariant,
  'abgelaufen' | 'ablauf_bald' | 'neu' | 'verifiziert'
>;

const ABLAUF_BALD_TAGE = 90;
const NEU_TAGE = 30;

export function deriveDocumentStatus(
  doc: { ausgestellt_am: string; gueltig_bis?: string },
  nowIso: string,
): DocumentStatus {
  const now = parseISO(nowIso);

  if (doc.gueltig_bis) {
    const restTage = differenceInCalendarDays(parseISO(doc.gueltig_bis), now);
    if (restTage < 0) return 'abgelaufen';
    if (restTage <= ABLAUF_BALD_TAGE) return 'ablauf_bald';
  }

  const alterTage = differenceInCalendarDays(now, parseISO(doc.ausgestellt_am));
  if (alterTage >= 0 && alterTage <= NEU_TAGE) return 'neu';

  return 'verifiziert';
}
