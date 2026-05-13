/**
 * Barrel-Export aller Demo-Types. Komponenten importieren ausschließlich
 * über `@/types` (oder einen konkreten Subpfad), niemals aus
 * `@/lib/mock-backend/internals`.
 */
export type { Adresse } from './adresse';
export type {
  Behoerde,
  BehoerdeId,
  BehoerdeKategorie,
} from './behoerde';
export type {
  Persona,
  PersonaId,
  Aufenthaltstitel,
  Beschaeftigung,
  Krankenversicherung,
} from './persona';
// V1.2 — Kontakt-Schicht (BundID-Postfach + Notification-Präferenzen).
export type {
  BundIdEmail,
  BundIdMobil,
  BundIdPostfach,
  BundidPostfachAnbindung,
  FamilienkasseCascade,
  KontaktState,
  NotificationKanal,
  NotificationPraeferenzen,
  PersonaKontakt,
  ToggleNotificationPraeferenzResult,
  VorgangsKategorie,
} from './persona-kontakt';
export { MOCK_OTP_DEMO_CODE } from './persona-kontakt';
export type {
  Letter,
  LetterActivityAktion,
  LetterActivityEvent,
  LetterActivityLog,
  LetterActivityLogEntry,
  LetterAiSummary,
  LetterAiSummaryPostOpen,
  LetterAiSummaryPreOpen,
  LetterArchetype,
  LetterArchetypeAction,
  LetterAttachment,
  LetterAuthChannel,
  LetterCitation,
  LetterFilter,
  LetterFrist,
  LetterFristTyp,
  LetterReplyMap,
  LetterRequiredAction,
  LetterStatus,
  LetterStatusFilter,
  Reply,
  ReplyDraft,
  ReplyStatus,
  ReplyTemplateId,
  ReplyTerminMode,
} from './letter';
export { LETTER_ATTACHMENT_LIMITS } from './letter';
export type { Document, DocumentTyp } from './document';
export type { Termin, TerminStatus, TerminOrt, TerminOrtTyp } from './termin';
export type {
  AutopilotStep,
  AutopilotStepStatus,
  BlockTyp,
  Vorgang,
  VorgangFilter,
  VorgangFrist,
  VorgangStatus,
  VorgangTyp,
} from './vorgang';
export type {
  UmzugInput,
  UmzugPreview,
  AutopilotStepDraft,
  SelfTask,
} from './umzug';
export type { MockBackendEvent, MockBackendEventListener } from './mock-event';
// V1.1 — Renten/KV-Erweiterung (Spec § 4.2).
export type {
  AnrechnungszeitPflege,
  EpaStatus,
  ERezeptModus,
  FamilienversicherteEintrag,
  KvnrV11,
  KvVersichertenStatus,
  Pflegegrad,
  PflegegradConsent,
  RentenEckdaten,
  RentenTrack,
  Versorgungswerk,
  YellowLetterBridgeResult,
} from './renten-kv';
export type {
  FeldQuelle,
  IbanSpeculativeStatus,
  ReligionConsent,
  SperrenStatus,
  Stammdaten,
  StammdatenDisclaimerMeta,
  StammdatenFieldDef,
  StammdatenFieldEditability,
  StammdatenFieldQuelle,
  StammdatenIbanSpeculative,
  StammdatenKorrekturweg,
  StammdatenReligionConsent,
  StammdatenSection,
  StammdatenSektionId,
  StammdatenSnapshot,
  StammdatenSperren,
  StammdatenUebermittlungssperreId,
  UebermittlungsLogEntry,
  WalletAttestation,
  WalletAttestationPreview,
} from './stammdaten';
