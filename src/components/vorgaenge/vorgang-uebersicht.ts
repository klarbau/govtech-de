import type {
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  Vorgang,
  VorgangStatus,
} from '@/types';

import type { StepperNode, StepperNodeStatus } from './HorizontalStepper';

/** Client-derived view-model for one Vorgang on the overview screen. */
export interface VorgangUebersicht {
  vorgang_id: string;
  titel: string;
  typ: string;
  status: VorgangStatus;
  schritte_gesamt: number;
  schritte_erledigt: number;
  naechste_frist_iso?: string;
  wartet_auf_buerger: boolean;
  unterlagen_fehlen: boolean;
  stepper_nodes: StepperNode[];
}

const EID_WAITING: AutopilotStepStatus[] = [
  'needs_eid',
  'pending_eid_confirmation',
];

function stepNodeStatus(status: AutopilotStepStatus): StepperNodeStatus {
  if (status === 'confirmed') return 'done';
  if (status === 'failed') return 'failed';
  if (
    status === 'in_progress' ||
    status === 'needs_eid' ||
    status === 'pending_eid_confirmation'
  ) {
    return 'active';
  }
  return 'pending';
}

function formatTag(iso?: string): string | undefined {
  if (!iso) return undefined;
  // Render dd.MM as a compact tabular-nums label under the node.
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return undefined;
  const [, month, day] = parts;
  return `${day}.${month}`;
}

/**
 * Derives a per-Vorgang overview view-model from the raw Vorgang plus the
 * Behörden lookup — no backend method required (spec § 6 default path).
 * „Unterlagen fehlen" is read from `context.unterlagen_fehlen` (a free-form
 * marker on the existing `context` field; no new top-level field).
 */
export function buildVorgangUebersicht(
  vorgang: Vorgang,
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de'>>,
): VorgangUebersicht {
  const schritte = vorgang.schritte ?? [];
  const erledigt = schritte.filter((s) => s.status === 'confirmed').length;

  const wartetEid = schritte.some((s) => EID_WAITING.includes(s.status));
  const unterlagenFehlen =
    vorgang.context?.unterlagen_fehlen === true ||
    schritte.some((s) => s.status === 'self_assigned');

  const fristen = (vorgang.fristen ?? [])
    .map((f) => f.datum)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const nodes: StepperNode[] = schritte.map((s) => ({
    id: s.id,
    behoerde: behoerdenById[s.behoerde_id]?.name_de ?? s.behoerde_id,
    status: stepNodeStatus(s.status),
    datum: formatTag(s.completed_at ?? s.started_at),
  }));

  return {
    vorgang_id: vorgang.id,
    titel: vorgang.titel,
    typ: vorgang.typ,
    status: vorgang.status,
    schritte_gesamt: schritte.length,
    schritte_erledigt: erledigt,
    naechste_frist_iso: fristen[0],
    wartet_auf_buerger: wartetEid || unterlagenFehlen,
    unterlagen_fehlen: unterlagenFehlen,
    stepper_nodes: nodes,
  };
}

export type FilterTabId = 'alle' | 'laufend' | 'warten' | 'abgeschlossen';

/** Status-to-filter mapping per spec § 4.1. */
export function matchesFilter(u: VorgangUebersicht, tab: FilterTabId): boolean {
  switch (tab) {
    case 'alle':
      return true;
    case 'abgeschlossen':
      return u.status === 'abgeschlossen';
    case 'warten':
      return u.wartet_auf_buerger;
    case 'laufend':
      return (
        u.status !== 'abgeschlossen' &&
        u.status !== 'abgelehnt' &&
        u.schritte_erledigt < u.schritte_gesamt
      );
    default:
      return true;
  }
}
