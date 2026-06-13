import type { BehoerdeId } from './behoerde';
import type { Document } from './document';
import type { Termin } from './termin';
import type { Letter } from './letter';
import type { PersonaId } from './persona';
import type {
  BundIdPostfach,
  NotificationKanal,
  NotificationPraeferenzen,
} from './persona-kontakt';
import type {
  StammdatenSektionId,
  StammdatenUebermittlungssperreId,
  UebermittlungsLogEntry,
} from './stammdaten';
import type { AutopilotStep, VorgangStatus } from './vorgang';
import type {
  AuditLogEntry,
  CircuitBreakerState,
  DeadLetterEntry,
  SagaStatus,
} from './orchestration';

/**
 * Stammdaten-Events (Spec § 5.3). Ergänzen den globalen Mock-Backend-Bus
 * um Notifications für Religion-Consent, Sperren-Toggle, IBAN-Push, Wallet-
 * Preview etc. Jeder Event begleitet einen Activity-Log-Eintrag (siehe
 * `src/lib/mock-backend/api.ts` `appendStammdatenLogEntry`).
 */
export type StammdatenEvent =
  | {
      type: 'stammdaten/log-entry-appended';
      persona_id: PersonaId;
      entry: UebermittlungsLogEntry;
    }
  | {
      type: 'stammdaten/kontakt-updated';
      persona_id: PersonaId;
      fields: Array<'email' | 'mobil'>;
    }
  | {
      type: 'stammdaten/sprache-updated';
      persona_id: PersonaId;
      sprache: string;
    }
  | {
      type: 'stammdaten/iban-speculative-updated';
      persona_id: PersonaId;
    }
  | {
      type: 'stammdaten/iban-push-simulated';
      persona_id: PersonaId;
      targets: Array<'familienkasse' | 'elster' | 'gkv'>;
    }
  | {
      type: 'stammdaten/sperre-updated';
      persona_id: PersonaId;
      sperre_typ: 'auskunftssperre' | StammdatenUebermittlungssperreId;
      aktiv: boolean;
    }
  | {
      type: 'stammdaten/religion-consented';
      persona_id: PersonaId;
      session_only: true;
    }
  | {
      type: 'stammdaten/religion-consent-revoked';
      persona_id: PersonaId;
    }
  | {
      type: 'stammdaten/wallet-attestation-previewed';
      persona_id: PersonaId;
      empfaenger_id: string;
    }
  | {
      type: 'stammdaten/sektion-viewed';
      persona_id: PersonaId;
      sektion: StammdatenSektionId;
    }
  // V1.1 — Renten/KV (Spec § 5.2). Yellow-Letter-Bridge ist Hard-Line § 11.25
  // idempotent; Pflegegrad ist Hard-Line § 11.22 sessionStorage-only.
  | {
      type: 'stammdaten/yellow-letter-bridge-applied';
      persona_id: PersonaId;
      letter_id: string;
    }
  | {
      type: 'stammdaten/yellow-letter-bridge-skipped-idempotent';
      persona_id: PersonaId;
      letter_id: string;
    }
  | {
      type: 'stammdaten/pflegegrad-consented';
      persona_id: PersonaId;
      session_only: true;
    }
  | {
      type: 'stammdaten/pflegegrad-consent-revoked';
      persona_id: PersonaId;
    }
  | {
      type: 'stammdaten/epa-banner-seen';
      persona_id: PersonaId;
    }
  // V1.2 — Kontakt-Schicht (Spec § 5.3). Hard-Lines § 11.31–§ 11.41.
  | {
      type: 'stammdaten/notification-praeferenz-changed';
      persona_id: PersonaId;
      kategorie: keyof NotificationPraeferenzen;
      vorher: NotificationKanal;
      nachher: NotificationKanal;
      counter: { briefe_pro_jahr_gespart: number; tage_frist_gespart: number };
    }
  | {
      type: 'stammdaten/postfach-activation-simulated';
      persona_id: PersonaId;
      new_status: BundIdPostfach['status'];
    }
  | {
      type: 'stammdaten/bundid-mobil-otp-verified';
      persona_id: PersonaId;
    }
  | {
      type: 'stammdaten/bundid-mobil-otp-failed';
      persona_id: PersonaId;
    }
  | {
      type: 'stammdaten/familienkasse-followup-letter-simulated';
      persona_id: PersonaId;
      letter_id: string;
    }
  // V1.3 — Mobilität (Spec § 6.7). Hard-Lines § 11.1–§ 11.14.
  | {
      type: 'stammdaten/mobilitaet-punkte-pulled';
      persona_id: PersonaId;
      punkte: number;
      aktenzeichen: string;
    }
  | {
      type: 'stammdaten/mobilitaet-mdl-preview-opened';
      persona_id: PersonaId;
    }
  | {
      type: 'stammdaten/mobilitaet-korrekturweg-fe-cta-opened';
      persona_id: PersonaId;
      behoerde_id: BehoerdeId;
    }
  | {
      type: 'stammdaten/mobilitaet-halter-adresse-marker-set';
      persona_id: PersonaId;
      vorgang_id: string;
    };

/**
 * Events, die die Mock-Backend-Schicht an die UI publiziert.
 * Subscribers via `api.subscribe(listener)`.
 */
export type MockBackendEvent =
  | { type: 'letter_received'; letter: Letter }
  | { type: 'letter_status_changed'; letterId: string; status: Letter['status'] }
  | { type: 'vorgang_created'; vorgangId: string }
  | { type: 'vorgang_status_changed'; vorgangId: string; status: VorgangStatus }
  | { type: 'autopilot_step'; vorgangId: string; step: AutopilotStep }
  | { type: 'document_added'; document: Document }
  // Pass-1 (§1.2/§C1): Dokument-Mint nutzt weiterhin `document_added` (bereits
  // verdrahtet + von der Dokumente-Screen konsumiert) — KEIN separates
  // `document_created`, kein Doppel-Emit. Termin-Mint nutzt das neue
  // `termin_created`; `termin_updated` deckt die Termine-Ops (§C2).
  | { type: 'termin_created'; termin: Termin }
  | { type: 'termin_updated'; termin: Termin }
  // Resilient Orchestration Engine (Spec resilient-orchestration-engine.md
  // § 6.6). Additive zur bestehenden `autopilot_step`-Projektion: die
  // Laufzettel-/Resilienz-Panels abonnieren diese parallel; `autopilot_step`
  // bleibt der primäre Treiber der Kaskaden-Zeilen.
  | { type: 'audit_appended'; sagaId: string; entry: AuditLogEntry }
  | { type: 'dlq_changed'; sagaId: string; dlq: DeadLetterEntry[] }
  | {
      type: 'breaker_changed';
      behoerdeId: BehoerdeId;
      state: CircuitBreakerState;
    }
  | { type: 'saga_status_changed'; sagaId: string; status: SagaStatus }
  | StammdatenEvent;

export type MockBackendEventListener = (event: MockBackendEvent) => void;
