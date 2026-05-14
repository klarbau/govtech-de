# Code Appendix — Canonical Reality Reference

<!-- generated 2026-05-14 by Explore-Agent, saved by main-thread -->

This appendix contains canonical type definitions, configuration, mock fixtures, and API interfaces from the GovTech DE repository — providing external LLMs with the complete data model and backend contract. Used alongside `docs/handoff/product-spec-complete-2026-05-14.md`. When the spec and this file disagree, **this file wins** (it is copied verbatim from `src/`).

---

## § 1 — TypeScript Types (Canonical Schema Source)

All TypeScript type definitions that form the single source of truth for the application data model.

### file: src/types/persona.ts

```typescript
import type { Adresse } from './adresse';
import type { Mobilitaet } from './mobilitaet';
import type { PersonaKontakt } from './persona-kontakt';
import type {
  AnrechnungszeitPflege,
  EpaStatus,
  ERezeptModus,
  KvnrV11,
  Pflegegrad,
  RentenEckdaten,
  RentenTrack,
  Versorgungswerk,
} from './renten-kv';

export interface Krankenversicherung {
  typ: 'gkv' | 'pkv';
  traeger: string;
  versichertennummer?: string;
}

export interface Beschaeftigung {
  typ: 'angestellt' | 'selbstaendig' | 'beamt' | 'student' | 'arbeitssuchend' | 'rente';
  arbeitgeber?: string;
  rolle?: string;
  beginn?: string;
}

export interface Aufenthaltstitel {
  norm: string;
  valid_until: string;
  az: string;
  abh_behoerde_id?: string;
}

export type PersonaId = string;

export interface Persona {
  id: PersonaId;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  staatsangehoerigkeit: string;
  adresse: Adresse;
  steuer_id?: string;
  rentenversicherungsnummer?: string;
  aufenthaltstitel?: Aufenthaltstitel;
  familie: {
    partner?: Persona;
    kinder: Persona[];
  };
  beschaeftigung?: Beschaeftigung;
  krankenversicherung?: Krankenversicherung;
  kfz_halter: boolean;
  kindergeld_bezug: boolean;
  wehrerfasst: boolean;
  sprachen: string[];

  // V1.2 — Kontakt-Schicht
  kontakt?: PersonaKontakt;
  fruehere_namen?: string[];
  doktorgrad?: string;
  geburtsort?: string;
  geschlecht?: 'm' | 'w' | 'd' | 'x' | 'unbestimmt';
  religion?: 'rk' | 'ev' | 'ohne' | 'andere' | string;
  personalausweis_nr?: { nummer: string; gueltig_bis: string };
  reisepass?: { nummer: string; gueltig_bis: string };
  eat_can?: string;
  azr_nr?: string;
  eheschliessung?: { datum: string; ort: string; az: string };

  // V1.1 — Renten/KV
  renten_track?: RentenTrack;
  renten_eckdaten_v1_1?: RentenEckdaten;
  kvnr_v1_1?: KvnrV11;
  familienversichert_ueber?: PersonaId | string;
  familienversichert_bis?: string;
  epa_status_v1_1?: EpaStatus;
  erezept_modus_v1_1?: ERezeptModus;
  pflegegrad_v1_1?: Pflegegrad;
  anrechnungszeit_pflege_v1_1?: AnrechnungszeitPflege;
  versorgungswerk_v1_1?: Versorgungswerk;

  // V1.3 — Mobilität
  mobilitaet?: Mobilitaet;
}
```

### file: src/types/persona-kontakt.ts

```typescript
export interface BundIdEmail {
  value: string;
  verified: boolean;
  quelle: 'bundid';
  verifiziert_am?: string;
}

export interface BundIdMobil {
  value: string;
  verified: boolean;
  quelle: 'bundid_self_attested';
  verifiziert_am?: string;
}

export interface BundIdPostfach {
  aktiviert: boolean;
  status: 'aktiv' | 'inaktiv' | 'teilaktiviert';
  aktiviert_am?: string;
}

export type BundidPostfachAnbindung =
  | 'angebunden'
  | 'in_pilotierung'
  | 'nicht_angebunden';

export type NotificationKanal =
  | 'postfach'
  | 'email_pilot'
  | 'sms_pilot'
  | 'brief';

export type VorgangsKategorie =
  | 'steuer'
  | 'sozial'
  | 'familie'
  | 'verkehr'
  | 'sonstige';

export interface NotificationPraeferenzen {
  steuer: NotificationKanal;
  sozial: NotificationKanal;
  familie: NotificationKanal;
  verkehr: NotificationKanal;
  sonstige: NotificationKanal;
}

export interface PersonaKontakt {
  bundid_email: BundIdEmail;
  bundid_mobil?: BundIdMobil;
  bundid_postfach: BundIdPostfach;
  notification_praeferenzen: NotificationPraeferenzen;
}

export type KontaktState = PersonaKontakt;

export interface FamilienkasseCascade {
  ersparte_briefe_pro_jahr: number;
  ersparte_tage_pro_bescheid: number;
  vorher_letter_id?: string;
  followup_letter_hint_id?: string;
}

export interface ToggleNotificationPraeferenzResult {
  ok: true;
  counter: {
    briefe_pro_jahr_gespart: number;
    tage_frist_gespart: number;
  };
  cascade?: FamilienkasseCascade;
}

export const MOCK_OTP_DEMO_CODE = '124857' as const;
```

### file: src/types/mobilitaet.ts

```typescript
import type { BehoerdeId } from './behoerde';

export interface Mobilitaet {
  fahrerlaubnis?: Fahrerlaubnis;
  halter: KfzHalter[];
  halter_adresse?: HalterAdresse;
}

export type PflichtumtauschStatus =
  | 'nicht_relevant'
  | 'frist_aktiv'
  | 'frist_abgelaufen_offen'
  | 'umtausch_erfolgt';

export interface Fahrerlaubnis {
  fe_nr: string;
  bundesland_kennzeichen: string;
  fe_behoerde_id: BehoerdeId;
  klassen: FeKlasse[];
  ausstellungsdatum: string;
  pflichtumtausch_stichtag?: string;
  pflichtumtausch_status: PflichtumtauschStatus;
  pflichtumtausch_erfolgt_am?: string;
  fe_aktenzeichen: string;
}

export interface FeKlasse {
  klasse: string;
  erteilt_am: string;
  gueltig_bis?: string;
  schluesselzahlen: string[];
}

export interface KfzHalter {
  kennzeichen: string;
  marke: string;
  modell: string;
  baujahr: string;
  fin_voll: string;
  fin_masked: string;
  zulassungsstelle_id: BehoerdeId;
  hu_bis: string;
  evb_nummer: string;
  zulassung_aktenzeichen: string;
  mitnutzer?: Array<{ vorname: string; nachname: string }>;
}

export interface HalterAdresse {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  uebergangs_marker_via_umzug: boolean;
  uebergangs_marker_seit?: string;
  via_umzug_vorgang_id?: string;
}

export interface PunktestandPullResult {
  punkte: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  abgerufen_am: string;
  ttl_seconds: 300;
  stichtag: string;
  aktenzeichen: string;
}

export interface MdlAttestationMock {
  status: 'not_issued' | 'mock_preview_ready';
  preview_data?: MdlAttestationPreviewData;
}

export interface MdlAttestationPreviewData {
  given_name: string;
  family_name: string;
  birth_date: string;
  driving_privileges: Array<{
    klasse: string;
    erteilt_am: string;
    gueltig_bis?: string;
    schluesselzahlen: string[];
  }>;
  issuing_authority: string;
  issuing_country: 'DE';
  document_number: string;
  issue_date: string;
  expiry_date: string;
}

export const ISO_18013_5_MDL_TOGGLE_SET = [
  'given_name',
  'family_name',
  'birth_date',
  'age_over_18',
  'age_in_years',
  'driving_privileges',
  'portrait',
  'signature_usual_mark',
  'issue_date',
  'expiry_date',
  'issuing_authority',
  'issuing_country',
  'document_number',
  'un_distinguishing_sign',
] as const;

export type MdlSelectiveDisclosureToggle =
  (typeof ISO_18013_5_MDL_TOGGLE_SET)[number];
```

### file: src/types/behoerde.ts

```typescript
import type { Adresse } from './adresse';
import type { BundidPostfachAnbindung } from './persona-kontakt';

export type BehoerdeKategorie =
  | 'bund'
  | 'land'
  | 'kommune'
  | 'sozialversicherung'
  | 'privat';

export type BehoerdeId = string;

export interface Behoerde {
  id: BehoerdeId;
  name_de: string;
  kategorie: BehoerdeKategorie;
  zustaendige_themen: string[];
  adresse: Adresse;
  online: {
    portal_url?: string;
    supports_eudi: boolean;
  };
  bundid_postfach_anbindung: BundidPostfachAnbindung;
}
```

### file: src/types/letter.ts

```typescript
import type { BehoerdeId, BehoerdeKategorie } from './behoerde';
import type { PersonaId } from './persona';

export type LetterStatus = 'ungelesen' | 'gelesen' | 'erledigt';

export type LetterArchetype =
  | 'steuerbescheid'
  | 'krankenkasse-beitrag'
  | 'beitragsservice-mahnung'
  | 'abh-verlaengerung'
  | 'familienkasse-nachweis'
  | 'buergeramt-meldung'
  | 'ihk-beitrag'
  | 'berufsgenossenschaft-beitrag'
  | 'standesamt-urkunde'
  | 'renteninfo'
  | 'sonstiges';

export type LetterAuthChannel =
  | 'briefpost'
  | 'mein-elster'
  | 'zbp-bundid'
  | 'krankenkassen-portal'
  | 'eingabe-buerger'
  | 'eudi-versiegelt';

export type LetterFristTyp =
  | 'zahlung'
  | 'einspruch'
  | 'widerspruch'
  | 'klage'
  | 'nachweis'
  | 'antragstellung'
  | 'sonstige';

export interface LetterFrist {
  typ: LetterFristTyp;
  datum: string;
  original_zitat: string;
  citation_match: boolean;
  rechtsgrundlage?: string;
  cta_label?: string;
}

export interface LetterCitation {
  bullet_index: number;
  original_zitat: string;
  body_offset?: { start: number; end: number };
}

export interface LetterAiSummaryPreOpen {
  text: string;
  generated_at: string;
}

export interface LetterAiSummaryPostOpen {
  bullets: Array<{ text: string }>;
  citations: LetterCitation[];
  generated_at: string;
  model: string;
}

export interface LetterAiSummary {
  de: string;
  en?: string;
  ru?: string;
  uk?: string;
  ar?: string;
  tr?: string;
  pre_open?: LetterAiSummaryPreOpen;
  post_open?: LetterAiSummaryPostOpen;
  translations?: Partial<
    Record<
      'en' | 'ru' | 'uk' | 'ar' | 'tr',
      { pre_open?: LetterAiSummaryPreOpen; post_open?: LetterAiSummaryPostOpen }
    >
  >;
}

export interface LetterRequiredAction {
  typ: string;
  frist: string;
  cta: string;
}

export type LetterArchetypeAction = string;

export interface Letter {
  id: string;
  absender_behoerde_id: BehoerdeId;
  empfaenger_persona_id: PersonaId;
  aktenzeichen: string;
  aktenzeichen_weitere?: string[];
  betreff: string;
  body_de: string;
  ai_summary?: LetterAiSummary;
  required_action?: LetterRequiredAction;
  fristen?: LetterFrist[];
  archetype?: LetterArchetype;
  auth_channel?: LetterAuthChannel;
  was_kann_ich_tun_options?: LetterArchetypeAction[];
  status: LetterStatus;
  empfangen_am: string;
  vorgang_id?: string;
  bescheid_dated_at?: string;
  kanal?: 'brief' | 'postfach' | 'email_pilot';
}

export type LetterStatusFilter =
  | LetterStatus
  | 'frist_abgelaufen'
  | 'frist_unter_7d'
  | 'frist_ueber_7d';

export interface LetterFilter {
  unread?: boolean;
  vorgang_id?: string;
  aktenzeichen_query?: string;
  behoerden_kategorie?: BehoerdeKategorie;
  archetype?: LetterArchetype;
  status?: LetterStatusFilter[];
  frist_innerhalb_tage?: number;
  vorgang_status?: string[];
}

export type LetterActivityEvent =
  | 'opened_in_app'
  | 'summary_generated'
  | 'frist_added_to_calendar'
  | 'marked_read'
  | 'archived'
  | 'reply_compose_started'
  | 'reply_template_inserted'
  | 'reply_draft_saved'
  | 'reply_draft_deleted'
  | 'reply_sent_simulated';

export type ReplyStatus = 'draft' | 'sent_simulated' | 'deleted';

export type ReplyTemplateId =
  | 'frist_verlaengerung'
  | 'nachweis_einreichen'
  | 'informative_rueckmeldung'
  | 'termin_antwort'
  | 'rechtsbehelf_einspruch_skelett'
  | 'rechtsbehelf_widerspruch_skelett'
  | 'aussetzung_vollziehung_skelett';

export type ReplyTerminMode = 'bestaetigen' | 'verschieben' | 'absagen';

export interface LetterAttachment {
  name: string;
  mime: string;
  size_bytes: number;
  '[MOCK]_data'?: string;
}

export const LETTER_ATTACHMENT_LIMITS = {
  MAX_FILES: 20,
  MAX_BYTES_PER_FILE: 10 * 1024 * 1024,
  MAX_BYTES_TOTAL: 36 * 1024 * 1024,
  ALLOWED_MIME: [
    'application/pdf',
    'image/png',
    'image/jpeg',
  ] as const,
} as const;

export interface Reply {
  id: string;
  letter_id: string;
  status: ReplyStatus;
  template_id: ReplyTemplateId | null;
  mode?: ReplyTerminMode;
  body_de: string;
  attachments: LetterAttachment[];
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  kanal: string | null;
  receipt_text?: string | null;
}

export type ReplyDraft = Reply & { status: 'draft' };
export type LetterReplyMap = Record<string, Reply[]>;
```

### file: src/types/vorgang.ts

```typescript
import type { BehoerdeId } from './behoerde';

export type BlockTyp = 'A' | 'B' | 'C' | 'D';

export type AutopilotStepStatus =
  | 'pending'
  | 'in_progress'
  | 'needs_eid'
  | 'pending_eid_confirmation'
  | 'self_assigned'
  | 'confirmed'
  | 'failed';

export interface AutopilotStep {
  id: string;
  behoerde_id: BehoerdeId;
  block: BlockTyp;
  aktion: string;
  rechtsgrundlage: string;
  status: AutopilotStepStatus;
  started_at?: string;
  completed_at?: string;
  letter_id?: string;
  requires_eid?: boolean;
  requires_consent?: boolean;
  consent_given_at?: string;
  eid_confirmed_at?: string;
  failure_reason?: string;
}

export type VorgangTyp =
  | 'umzug'
  | 'kindergeburt'
  | 'aufenthaltstitel-verlaengerung'
  | 'eheschliessung'
  | 'gewerbeanmeldung'
  | 'anmeldung'
  | string;

export type VorgangStatus =
  | 'angelegt'
  | 'in_pruefung'
  | 'genehmigt'
  | 'abgelehnt'
  | 'abgeschlossen';

export interface VorgangFrist {
  typ: string;
  datum: string;
}

export interface Vorgang {
  id: string;
  typ: VorgangTyp;
  titel: string;
  status: VorgangStatus;
  beteiligte_behoerden_ids: BehoerdeId[];
  schritte: AutopilotStep[];
  fristen: VorgangFrist[];
  angelegt_am: string;
  abgeschlossen_am?: string;
  persona_id: string;
  context?: Record<string, unknown>;
}

export interface VorgangFilter {
  status?: VorgangStatus | VorgangStatus[];
  typ?: VorgangTyp;
}
```

### file: src/types/termin.ts

```typescript
import type { BehoerdeId } from './behoerde';

export type TerminStatus = 'gebucht' | 'bestaetigt' | 'abgesagt';
export type TerminOrtTyp = 'praesenz' | 'video' | 'telefon';

export interface TerminOrt {
  typ: TerminOrtTyp;
  details: string;
}

export interface Termin {
  id: string;
  behoerde_id: BehoerdeId;
  vorgang_id?: string;
  datum: string;
  ort: TerminOrt;
  status: TerminStatus;
  betreff: string;
}
```

### file: src/types/document.ts

```typescript
import type { BehoerdeId } from './behoerde';

export type DocumentTyp =
  | 'aufenthaltstitel'
  | 'geburtsurkunde'
  | 'meldebestaetigung'
  | 'steuerbescheid'
  | 'lohnsteuerbescheinigung'
  | 'wohnungsgeberbestaetigung'
  | 'zulassungsbescheinigung_teil_i'
  | 'sozialversicherungsausweis'
  | 'eheurkunde'
  | 'fuehrerschein'
  | 'krankenversicherungskarte'
  | 'kindergeldbescheid'
  | 'rentenauskunft'
  | string;

export interface Document {
  id: string;
  typ: DocumentTyp;
  titel: string;
  ausstellende_behoerde_id: BehoerdeId;
  ausgestellt_am: string;
  gueltig_bis?: string;
  qr_payload: string;
  eudi_compatible: boolean;
  watermark: '[MOCK]';
  vorgang_id?: string;
}
```

### file: src/types/adresse.ts

```typescript
export interface Adresse {
  strasse: string;
  hausnummer: string;
  zusatz?: string;
  plz: string;
  ort: string;
  land?: 'DE' | string;
}
```

### file: src/types/renten-kv.ts

```typescript
import type { BehoerdeId } from './behoerde';
import type { PersonaId } from './persona';

export type RentenTrack = 'A' | 'B' | 'C';

export interface RentenEckdaten {
  grundlage_kurzauszug: {
    beitragszeit_von: string;
    beitragszeit_bis: string;
    entgeltpunkte_aktuell: number;
  };
  em_rente_prognose_eur_monat: number;
  regelalter_prognose_eur_monat: number;
  anpassungs_wirkung: {
    beispiel_prozent_p_a: number;
    plus_eur_monat: number;
  };
  beitragsuebersicht: {
    jahr: string;
    gesamt_eur: number;
    versicherter_anteil_eur: number;
    arbeitgeber_anteil_eur: number;
    oeffentliche_kassen_eur?: number;
  };
  stichtag: string;
  quelle_letter_id: string;
  abgelegt_am: string;
}

export interface PflegegradConsent {
  consent_session: boolean;
  last_shown_at?: string;
}

export interface Pflegegrad {
  grad: 1 | 2 | 3 | 4 | 5;
  bewilligt_am: string;
  pflegekasse_id: BehoerdeId | string;
  begutachtung_stelle: 'md' | 'medicproof';
}

export interface AnrechnungszeitPflege {
  monate: number;
  pflegebeduerftige_person?: string;
  rechtsgrundlage: string;
}

export interface Versorgungswerk {
  name: string;
  mitgliedsnummer: string;
}

export interface KvnrV11 {
  unveraenderbar: string;
  veraenderbar: string;
}

export interface EpaStatus {
  eingerichtet: boolean;
  widerspruch_gesetzt: boolean;
  eingerichtet_am?: string;
  widerspruch_am?: string;
}

export type ERezeptModus = 'app' | 'egk' | 'papier';

export type KvVersichertenStatus =
  | 'pflicht'
  | 'freiwillig'
  | 'familienversichert'
  | 'privat';

export interface FamilienversicherteEintrag {
  persona_id?: PersonaId;
  vorname: string;
  nachname: string;
  familienversichert_bis: string;
  art: 'partner' | 'kind';
}

export interface YellowLetterBridgeResult {
  applied: boolean;
  eckdaten?: RentenEckdaten;
  activity_log_entry_id?: string;
}
```

### file: src/types/stammdaten.ts (Stammdaten read-snapshot shape, not the Persona type)

See `src/types/stammdaten.ts` in repo for full type — ~250 lines containing `Stammdaten` (read-only snapshot per persona), `StammdatenSektionId`, `StammdatenFieldDef`, `UebermittlungsLogEntry`, `StammdatenSperren`, `StammdatenReligionConsent`, `StammdatenIbanSpeculative`, `WalletAttestation`, `StammdatenDisclaimerMeta`. The shape mirrors `Persona` but is the canonical read API contract for the Stammdaten screen.

### file: src/types/umzug.ts

```typescript
import type { Adresse } from './adresse';
import type { BehoerdeId } from './behoerde';
import type { PersonaId } from './persona';

export interface UmzugInput {
  neue_adresse: Adresse;
  alte_adresse?: Adresse;
  stichtag: string;
  wohnungsgeber_bestaetigung_dataurl?: string;
  betroffene_personen: PersonaId[];
  consents?: BehoerdeId[];
  source?: 'ui' | 'assistant';
}

export interface AutopilotStepDraft {
  behoerde_id: BehoerdeId;
  aktion: string;
  rechtsgrundlage: string;
  block: 'A' | 'B' | 'C' | 'D';
  requires_eid?: boolean;
  requires_consent?: boolean;
  persona_flag?: string;
}

export interface SelfTask {
  id: string;
  titel: string;
  beschreibung: string;
  link?: string;
  generates_template?: boolean;
}

export interface UmzugPreview {
  block_a: AutopilotStepDraft[];
  block_b: AutopilotStepDraft[];
  block_c: SelfTask[];
  block_d: AutopilotStepDraft[];
}
```

### file: src/types/mock-event.ts

Discriminated union over all events emitted by the mock backend's `subscribe()` API. Includes letter events, vorgang events, autopilot-step events, document events, and ~25 stammdaten-event variants (V1.0 → V1.3). See repo file for complete enumeration (~150 lines).

---

## § 2 — Mock-Backend API Interface

File `src/lib/mock-backend/api.ts` provides the public contract for the mock backend. Method signatures:

```typescript
export interface MockBackendApi {
  // ---- READ ----
  getProfile(): Promise<Persona>;
  getLetters(filter?: LetterFilter): Promise<Letter[]>;
  getLetter(id: string): Promise<Letter>;
  getVorgang(id: string): Promise<Vorgang>;
  getVorgaenge(filter?: VorgangFilter): Promise<Vorgang[]>;
  getDocuments(): Promise<Document[]>;
  getTermine(): Promise<Termin[]>;
  getBehoerden(): Promise<Behoerde[]>;
  getBehoerde(id: string): Promise<Behoerde>;
  getStammdaten(sektion?: StammdatenSektionId): Promise<Stammdaten>;
  getLetterActivityLog(letterId: string): Promise<LetterActivityLog>;
  getWalletAttestations(): Promise<WalletAttestation[]>;
  getWalletAttestationPreview(empfaengerId: string): Promise<WalletAttestationPreview>;

  // ---- WRITE ----
  startUmzug(input: UmzugInput): Promise<{ vorgangId: string }>;
  previewUmzug(input: Pick<UmzugInput, 'neue_adresse' | 'stichtag'>): Promise<UmzugPreview>;
  cancelUmzug(vorgangId: string): Promise<void>;
  markiereLetterGelesen(id: string): Promise<void>;
  bestaetigeAutopilotSchritt(vorgangId: string, schrittId: string): Promise<void>;
  toggleNotificationPraeferenz(
    kategorie: VorgangsKategorie,
    kanal: NotificationKanal
  ): Promise<ToggleNotificationPraeferenzResult>;
  toggleSperren(sperrTyp: StammdatenUebermittlungssperreId | 'auskunftssperre'): Promise<void>;
  startReply(letterId: string, templateId?: ReplyTemplateId | null): Promise<ReplyDraft>;
  saveReplyDraft(letterId: string, draft: Partial<Reply>): Promise<ReplyDraft>;
  sendReplySim(letterId: string): Promise<Reply>;
  deleteReplyDraft(letterId: string): Promise<void>;

  // ---- V1.1 ----
  applyYellowLetterBridge(letterId: string): Promise<YellowLetterBridgeResult>;
  revealPflegegradConsent(): Promise<void>;
  revokePflegegradConsent(): Promise<void>;

  // ---- V1.2 ----
  verifiziereBundIdMobil(code: string): Promise<{ ok: boolean }>;
  simulateBundIdPostfachActivation(): Promise<void>;

  // ---- V1.3 ----
  pullMobilitaetPunktestand(): Promise<PunktestandPullResult>;
  previewMdlAttestation(): Promise<MdlAttestationMock>;

  // ---- EVENTS ----
  subscribe(listener: MockBackendEventListener): () => void;
}
```

All write methods emit at least one `MockBackendEvent`. Latency: 300–800 ms + 5% error rate via `withLatency()`. Reliable mode via `NEXT_PUBLIC_RELIABLE=1` or `?reliable=1`.

---

## § 3 — Package & Build Configuration

### file: package.json (versions are pinned, do not modify)

```json
{
  "name": "govtech-de-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test --project=a11y"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@base-ui/react": "^1.4.1",
    "@hookform/resolvers": "^3.9.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "next": "^15.1.4",
    "next-intl": "^3.26.3",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "shadcn": "^4.7.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.1",
    "tw-animate-css": "^1.4.0",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.1",
    "@playwright/test": "^1.49.1",
    "@tailwindcss/postcss": "^4.0.0-beta.8",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.4",
    "@types/react-dom": "^19.0.2",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.4",
    "tailwindcss": "^4.0.0-beta.8",
    "typescript": "^5.7.3",
    "vitest": "^4.1.5"
  }
}
```

### file: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### file: next.config.ts

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
```

### file: postcss.config.mjs

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

**Note**: Tailwind v4 uses CSS-first config via `@theme` directives in `globals.css` — no `tailwind.config.ts`.

### file: vitest.config.ts

```typescript
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    reporters: 'default',
  },
});
```

---

## § 4 — Global CSS & Design Tokens

File `src/app/globals.css` is the canonical source for OKLCH color tokens, type scale, motion curves, dark-mode, high-contrast, and print stylesheet. See the file directly in the repo (~690 lines). Key sections summarized in `product-spec-complete-2026-05-14.md` § 4.4.

Selected critical excerpts:

```css
@import 'tailwindcss';
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans:
    'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, sans-serif;
}

:root {
  --ds-text-h1: 3rem;
  --ds-text-h2: 2.25rem;
  --ds-text-h3: 1.5rem;
  --ds-text-h4: 1.1875rem;
  --ds-text-body: 1rem;
  --ds-text-small: 0.875rem;

  --ds-color-surface: oklch(100% 0 0);
  --ds-color-surface-raised: oklch(98% 0.002 80);
  --ds-color-surface-muted: oklch(95% 0.003 80);
  --ds-color-border: oklch(86% 0.004 80);
  --ds-color-border-strong: oklch(65% 0.005 80);
  --ds-color-text-primary: oklch(20% 0.005 250);
  --ds-color-text-secondary: oklch(45% 0.005 250);
  --ds-color-text-muted: oklch(55% 0.015 250);
  --ds-color-accent: oklch(40% 0.12 252);
  --ds-color-accent-soft: oklch(95% 0.025 252);
  --ds-color-accent-foreground: oklch(100% 0 0);
  --ds-color-warning: oklch(55% 0.13 80);
  --ds-color-warning-soft: oklch(97% 0.04 90);
  --ds-color-danger: oklch(48% 0.18 27);
  --ds-color-success: oklch(45% 0.12 152);
  --ds-color-info-soft: oklch(94% 0.018 245);

  --ds-ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ds-ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ds-ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ds-ease-standard: cubic-bezier(0.65, 0, 0.35, 1);
  --ds-duration-fast: 150ms;
  --ds-duration-base: 250ms;
  --ds-duration-base-plus: 400ms;
  --ds-duration-slow: 600ms;
  --ds-duration-page: 800ms;
}

@media (prefers-color-scheme: dark) { :root { /* dark overrides — see file */ } }
.dark { /* class-based dark override — see file */ }
@supports not (color: oklch(0% 0 0)) { :root { /* HEX fallbacks */ } }
@media (prefers-contrast: more) { :root { /* AAA contrast overrides */ } }
@media print { /* print stylesheet — A4 portrait, monochrome */ }
```

---

## § 5 — Data Fixtures

### file: src/data/personas.json (canonical IDs and shape)

3 personas, ~190 lines each, ~580 lines total. Persona IDs: `anna-petrov`, `markus-schmidt`, `mehmet-yildiz`. Each contains all V1.0–V1.3 fields. Family members nested (Anna's partner Tobias + child Lev; Schmidt's Lena + Felix; Mehmet single + child Eren).

### file: src/data/behoerden.json

~42 authorities. IDs follow pattern `<typ>-<ort>-<unter>` (e.g. `buergeramt-berlin-mitte`, `fe-hamburg-lbv`, `kfz-koeln-stadt`). Categories: bund / land / kommune / sozialversicherung / privat. Each entry includes `bundid_postfach_anbindung` enum.

### file: src/data/letters.json + letter-summaries.json

~15–20 letters across the 11 archetypes. Each has full `body_de` (with `[MOCK – Verwaltungsdemo, keine echten Daten]` watermark), `ai_summary` (multilingual + post-open bullets + citations), `fristen[]` with `original_zitat` + `citation_match`, `was_kann_ich_tun_options[]`, `archetype`, `auth_channel`. Aktenzeichen format varies per Behörde.

### file: src/data/vorgaenge.json

Seeds Anna's `vorgang-anna-anmeldung-2024` (abgeschlossen) and `vorgang-anna-aufenthaltstitel-2027-stub` (angelegt).

---

## § 6 — i18n Sample (de.json Namespace Structure)

Top-level namespaces in `src/lib/i18n/locales/de.json`:

```
app:             name, tagline, skip_to_content
nav:             dashboard, posteingang, stammdaten, vorgaenge, dokumente, termine, steuer, familie, assistent, datenschutz
topbar:          language_label, theme_toggle_light, theme_toggle_dark, theme_toggle_system, user_menu
footer:          imprint, privacy, accessibility
landing:         eyebrow, title, subtitle, personas_title, personas_helper, persona_anna, persona_schmidt, persona_mehmet
common:          cta.*, frist.*, disclaimer.*, frist_detail.*
umzug:           wizard.*, start.*, preview.*, run.*
placeholder:     [sub-sections per stub screen]
posteingang:     hero.*, list.*, search.*, filter.*, inbox.*, card.*, gruppe.*, archetype.*, reader.*, was_kann_ich_tun.*, normtooltip.*, disclaimer.*, toast.*, sticky_action.*, compose.*, bridge.*
stammdaten:      hero.*, tab.*, section_nav.*, sektion.*, field.*, mobilitaet.*, wallet.*, disclaimer.*, aktivitaet.*, badge.*, subtab.*
```

All 6 locales (de/en/ru/uk/ar/tr) must parse via `JSON.parse`. AR is RTL but FE-Nr / FIN / Aktenzeichen / IBAN / Kfz-Kennzeichen always render `dir="ltr"`. Behörden DE-term goes in parentheses in non-DE locales: e.g. EN `"Driving licence (Fahrerlaubnis)"`.

---

## § 7 — Mock Backend Persistence Keys

File `src/lib/mock-backend/persistence.ts`:

```typescript
const NAMESPACE = 'govtech-de:v1:';

export type CollectionKey =
  | 'meta'
  | 'profile'
  | 'personas'
  | 'behoerden'
  | 'letters'
  | 'vorgaenge'
  | 'documents'
  | 'termine'
  | 'consent'
  | 'letter-activity-log'
  | 'letter-replies'
  | 'stammdaten:sperren'
  | 'stammdaten:iban-speculative'
  | 'stammdaten:kontakt'
  | 'stammdaten:uebermittlungs-log'
  | 'stammdaten:renten-eckdaten-v1-1'
  | 'stammdaten:yellow-letter-bridge-applied'
  | 'stammdaten:notification-praeferenzen'
  | 'stammdaten:mobilitaet'
  | 'stammdaten:schema-version';
```

All values JSON-encoded, validated via zod schemas on read. Failed validation triggers bucket deletion + reseed via `seedIfEmpty()`. Migrations idempotent (V1 → V1.1 → V1.2 → V1.3), tracked in `schema-migrations` marker.

---

## § 8 — Autopilot Umzug Block Definitions

File `src/lib/mock-backend/autopilot/umzug.ts` defines the 4-Block-Kaskade:

### BLOCK A (Automatic, 4 steps, ~5 seconds total)

| Behörde | Aktion | Rechtsgrundlage | Latency |
|---------|--------|-----------------|---------|
| `buergeramt-berlin-mitte` | Anmeldung neuer Wohnort | § 17 BMG | 900ms |
| `finanzamt-koerperschaften-i-berlin` | Mitteilung örtl. Zuständigkeit | § 39 AO + § 36 BMG | 1400ms |
| `beitragsservice-koeln` | Adressänderung Beitragskonto | § 11 Abs. 4 RBStV | 1100ms |
| `bundesdruckerei` | Personalausweis-Adressaufkleber | § 28 PAuswG | 1700ms |

### BLOCK B (Consent-Required, 5 steps, ~3 seconds total)

| Empfänger | Aktion | Rechtsgrundlage | Latency |
|-----------|--------|-----------------|---------|
| `aok-nordost` | Adressänderung Versichertenkonto | Art. 6 Abs. 1 lit. a DSGVO | 600ms |
| `berliner-sparkasse` | Adressänderung Bankverbindung | DSGVO + AGB | 800ms |
| `allianz-hausrat` | Adressänderung Versicherungsvertrag | DSGVO | 700ms |
| `vattenfall` | Adressänderung Stromvertrag | DSGVO | 500ms |
| `telekom` | Adressänderung Mobilfunk-/Internetvertrag | DSGVO | 500ms |

### BLOCK C (Self-Service)

Plain `SelfTask[]` array — Kita-Anmeldung, Hausarztwahl, Vereins-/Abo-Adressen. No latency, no backend call.

### BLOCK D (eID-Confirmed, conditional on persona flags)

| Behörde | Aktion | Persona-Flag | Rechtsgrundlage |
|---------|--------|--------------|-----------------|
| `kfz-berlin-labo` | Pre-Fill i-Kfz-Adressänderung | `kfz_halter === true` | § 15 FZV + § 18 PAuswG |
| `familienkasse-berlin-brandenburg` | Veränderungsmitteilung Adresse | `kindergeld_bezug === true` | §§ 67/68 EStG + § 18 PAuswG |
| `abh-berlin-lea` | Adress-Update eAT-Karte + Termin | `aufenthaltstitel !== undefined` | § 87 AufenthG + § 18 PAuswG |

Each successful Block-A and Block-D step generates a confirmation `Letter` with realistic Aktenzeichen and Briefkopf-Floskeln. Block B emits status events only (no letter). Block C is purely UI-side.

**HL-MOB-14 verbatim wording** (Block D): `"Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV"`. Frist phrasing: `"unverzüglich (i.d.R. innerhalb einer Woche)"`. Forbidden phrases (CI grep-ban): `"automatische Synchronisierung"`, `"Halter-Adresse aktualisiert"`.

---

## § 9 — Norm-Zitat Lookup (Aria-Label Map)

File `src/components/posteingang/normZitatLookup.ts` exports `NORM_ZITAT_ARIA_LABELS: Record<string, string>` with ~100+ norm citations mapped to German aria-label pronunciations. Used by `NormZitatSpan` component to provide accessible reading of `§ N AO`, `Art. N DSGVO`, `§ N SGB VI`, etc.

Sample:
```typescript
export const NORM_ZITAT_ARIA_LABELS: Record<string, string> = {
  '§ 17 BMG': 'Paragraph 17 des Bundesmeldegesetzes',
  '§ 355 AO': 'Paragraph 355 der Abgabenordnung',
  '§ 361 AO': 'Paragraph 361 der Abgabenordnung',
  '§ 84 SGG': 'Paragraph 84 des Sozialgerichtsgesetzes',
  '§ 70 VwGO': 'Paragraph 70 der Verwaltungsgerichtsordnung',
  '§ 9 OZG': 'Paragraph 9 des Onlinezugangsgesetzes',
  'Art. 6 Abs. 1 lit. a DSGVO': 'Artikel 6 Absatz 1 Buchstabe a der Datenschutz-Grundverordnung',
  '§ 109 SGB VI': 'Paragraph 109 des Sozialgesetzbuches Sechs',
  '§ 15 FZV': 'Paragraph 15 der Fahrzeug-Zulassungsverordnung',
  '§ 18g AufenthG': 'Paragraph 18g des Aufenthaltsgesetzes',
  '§ 24a FeV': 'Paragraph 24a der Fahrerlaubnis-Verordnung',
  // ... ~90 more
};

export const NORM_ZITAT_REGEX = /(?:§|Art\.)\s*\d+[a-z]?\s*(?:Abs\.|Satz)?\s*\d*[a-z]?\s*[A-Z][A-Za-z]+/g;
```

Full per-version slicing (V1.0 / V1.1 / V1.2 / V1.3) in master spec `product-spec-complete-2026-05-14.md` Appendix C.

---

## § 10 — Status & Verification

**Generated**: 2026-05-14
**Source repo**: `C:\Users\iaiaa\govtech` / `loneliness-is-repulsive/govtech-de`
**Coverage**:

| Section | Source | Status |
|---------|--------|--------|
| § 1 Types | `src/types/*.ts` (13 files) | Complete (V1.0–V1.3 additive) |
| § 2 API | `src/lib/mock-backend/api.ts` interface block | Complete signatures |
| § 3 Config | `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts` | Pinned versions captured |
| § 4 CSS | `src/app/globals.css` | Excerpt of OKLCH/motion tokens (full ~690 lines in repo) |
| § 5 Fixtures | `src/data/*.json` | Schema + canonical IDs documented |
| § 6 i18n | `src/lib/i18n/locales/de.json` | Namespace tree only (DE is source-of-truth) |
| § 7 Persistence | `src/lib/mock-backend/persistence.ts` | All 20 collection keys enumerated |
| § 8 Autopilot | `src/lib/mock-backend/autopilot/umzug.ts` | Block-A/B/C/D tables with latencies + Rechtsgrundlagen |
| § 9 Norm-Zitate | `src/components/posteingang/normZitatLookup.ts` | Pattern + sample (full lookup ~100+ entries in repo) |

**Truncations**: full `letters.json` (~4000 lines) and full `de.json` (~8000 lines) not embedded inline — consume directly from repo. The shape is documented above; canonical IDs (`anna-petrov`, `markus-schmidt`, `mehmet-yildiz`, `buergeramt-berlin-mitte`, etc.) are stable.

**Anti-drift directive**: when the master spec and this appendix disagree about a TypeScript type signature, API method name, or token value — **this appendix wins**. The spec is conceptual narrative; this file is copied verbatim from `src/`.

End of code appendix.
