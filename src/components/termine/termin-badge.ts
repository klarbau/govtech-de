import type { Termin } from '@/types';

import { displayStatus, istBuergeramtVorgemerkt } from './termin-status';

/**
 * View-level badge state: the Bürgeramt-vs-not split happens HERE so the shared
 * `displayStatus()` (and the spine) keep their 4-state union untouched. Shared by
 * `TermineView` (KPIs, rows, band) and `TerminDetailContent` (title badge).
 */
export type ViewBadge =
  | 'bestaetigt'
  | 'vorgemerkt'
  | 'wartet'
  | 'abgesagt'
  | 'erledigt';

export function viewBadge(term: Termin, nowIso: string): ViewBadge {
  const ds = displayStatus(term, nowIso);
  if (ds === 'vorgemerkt') {
    return istBuergeramtVorgemerkt(term, nowIso) ? 'vorgemerkt' : 'wartet';
  }
  return ds;
}

export function viewBadgeTone(badge: ViewBadge): string {
  switch (badge) {
    case 'bestaetigt':
      return 'green';
    case 'vorgemerkt':
      return 'amber';
    case 'wartet':
      return 'violet';
    case 'abgesagt':
      return 'red';
    case 'erledigt':
      return 'outline';
  }
}

export function viewBadgeLabelKey(badge: ViewBadge): string {
  switch (badge) {
    case 'vorgemerkt':
      return 'vorgeschlagen'; // Enum-Key bleibt; Label = „Vorgemerkt"
    case 'wartet':
      return 'wartet';
    case 'bestaetigt':
      return 'bestaetigt';
    case 'abgesagt':
      return 'abgesagt';
    case 'erledigt':
      return 'erledigt';
  }
}
