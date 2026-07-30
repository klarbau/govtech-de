/**
 * Gesamtplan einer Lebenslage-Akte (Spec `lebenslage-akte.md` §8.1).
 *
 * Read-Model: `api.getVorgangPlan(vorgangId)` leitet ihn DETERMINISTISCH aus der
 * `LebenslageConfig` (Reihenfolge, Rechtsgrundlagen, Datenkategorien) + den
 * materialisierten `AutopilotStep`s des Vorgangs ab. Keine Erfindung, keine
 * Schreiboperation.
 *
 * Ehrlichkeits-Leitplanke (Domain Q4): geplant, autorisierungsbedürftig,
 * abgewählt und vollzogen sind VIER verschiedene Zustände — `erledigt`/`gesamt`
 * zählen ausschließlich vollzogene bzw. beauftragte Schritte.
 */
import type { BehoerdeId } from './behoerde';
import type { BlockTyp } from './vorgang';
// Type-only (zur Compile-Zeit gelöscht): hält `mode` in Lockstep mit der Config.
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';

export type PlanZustand =
  | 'geplant' // noch nicht begonnen
  | 'laeuft' // in_progress
  | 'wartet_eid' // pending_eid_confirmation / needs_eid
  | 'wartet_consent' // Einwilligung steht aus
  | 'nicht_beauftragt' // consent nicht erteilt → läuft nicht
  | 'persoenlich' // gate 'termin' — nur persönlich möglich
  | 'erledigt' // confirmed
  | 'fehlgeschlagen'; // failed

export interface VorgangPlanRow {
  /** `${vorgangId}:${configStepId}` — stabile AutopilotStep-ID. */
  step_id: string;
  config_id: string;
  /** 1-basiert, Config-Reihenfolge. */
  position: number;
  behoerde_id: BehoerdeId;
  /** `cfg.kurzlabel ?? cfg.aktion`. */
  kurzlabel: string;
  behoerde_kurz?: string;
  agent_label: string;
  aktion: string;
  rechtsgrundlage: string;
  datenkategorien: string[];
  block: BlockTyp;
  gate: 'auto' | 'eid' | 'consent' | 'termin';
  zukunft: boolean;
  aktenzeichen?: string;
  zustand: PlanZustand;
  completed_at?: string;
  eid_confirmed_at?: string;
  consent_given_at?: string;
  letter_id?: string;
  eid_preview?: string;
  /** Durch die Formular-eID getragen (§7) — die Zeile zeigt „Von Ihnen mit eID
   *  freigegeben am …", statt ein zweites Gate zu verlangen. */
  pre_authorized: boolean;
}

export interface VorgangPlan {
  slug: string;
  titel_de: string;
  mode: LebenslageConfig['mode'];
  /** Config-Level-Flag (spekulative 2027-Lebenslage). */
  zukunft: boolean;
  /** Config-Reihenfolge, `visibleIf`-gefiltert. */
  rows: VorgangPlanRow[];
  /** Nur `zustand === 'erledigt'`. */
  erledigt: number;
  /** `rows` ohne `zustand === 'nicht_beauftragt'`. */
  gesamt: number;
  eid_authorized_at?: string;
}
