import type { BehoerdeId, BehoerdeKategorie } from './behoerde';
import type { PersonaId } from './persona';

export type LetterStatus = 'ungelesen' | 'gelesen' | 'erledigt';

/**
 * Brief-Archetyp aus posteingang.md §6 Brief-Archetypen.
 * Persona-agnostische Capability — jeder Archetyp kann jeder:m Bürger:in begegnen.
 */
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
  | 'sonstiges';

/**
 * Kanal, über den der Brief in der App erscheint (Authentizitäts-Stufe).
 * V1 funktional sind nur Empfangs-Kanäle; `eingabe-buerger` und `eudi-versiegelt`
 * sind Konventionen für V2 und werden im UI als „Coming soon" gerendert.
 */
export type LetterAuthChannel =
  | 'briefpost'
  | 'mein-elster'
  | 'zbp-bundid'
  | 'krankenkassen-portal'
  | 'eingabe-buerger'
  | 'eudi-versiegelt';

/** Frist-Typ — ein Brief kann mehrere Fristen haben (Edge case #1). */
export type LetterFristTyp =
  | 'zahlung'
  | 'einspruch'
  | 'widerspruch'
  | 'klage'
  | 'nachweis'
  | 'antragstellung'
  | 'sonstige';

/**
 * Eine konkrete Frist mit Original-Zitat-Beleg (Citation-Pflicht).
 *
 * `citation_match: false` → die LLM-Datums-Extraktion war NICHT deckungsgleich
 * mit dem Regex-Match (`\d{1,2}\.\d{1,2}\.\d{4}`); UI deaktiviert dann „Frist im
 * Kalender"-CTA bis zur manuellen Verifikation (Spec §4.4 / Edge case #10).
 */
export interface LetterFrist {
  typ: LetterFristTyp;
  /** ISO-Datum YYYY-MM-DD. */
  datum: string;
  /** Original-Satz aus body_de — Pflicht (citation pattern). */
  original_zitat: string;
  /** LLM-Datum stimmt mit Regex-Datum aus original_zitat überein. */
  citation_match: boolean;
  /** Optional: Norm-Kürzel der Frist-Rechtsgrundlage (z. B. „§ 70 VwGO"). */
  rechtsgrundlage?: string;
  /** Optional: Klartext-CTA für die UI. */
  cta_label?: string;
}

/** Citation-Eintrag pro AI-Bullet (Post-Open-Summary). */
export interface LetterCitation {
  /** Bullet-Index, 0-basiert. */
  bullet_index: number;
  /** Original-Satz aus body_de. Leer-String erlaubt für reine Norm-Kontextualisierung. */
  original_zitat: string;
  /** Optional: Char-Offset-Range im body_de für Highlight-Anker. */
  body_offset?: { start: number; end: number };
}

/** Pre-Open-Summary — strikt strukturell, 1 Zeile, max 80 Zeichen. */
export interface LetterAiSummaryPreOpen {
  /** Format: „[Behörde] · [Brieftyp] · [Frist|Keine Frist]". Max 80 Zeichen. */
  text: string;
  /** ISO-Timestamp der KI-Generierung. */
  generated_at: string;
}

/**
 * Post-Open-Summary mit 5–8 Bullets + Citation pro Bullet.
 * Citations und Bullets korrespondieren über `bullet_index`.
 */
export interface LetterAiSummaryPostOpen {
  bullets: Array<{ text: string }>;
  citations: LetterCitation[];
  /** ISO-Timestamp der KI-Generierung. */
  generated_at: string;
  /** Modellbezeichnung (z. B. 'claude-haiku-4-5-20251001'). */
  model: string;
}

/**
 * Mehrsprachige KI-Zusammenfassung (Legacy + Erweiterung).
 *
 * `de` (Pflicht) und `en|ru|uk|ar|tr` (optional) sind die Roh-Single-Sentence-
 * Zusammenfassungen aus der Umzug-Phase und bleiben für Back-Kompatibilität
 * erhalten. `pre_open` / `post_open` sind die Posteingang-Erweiterung und
 * können zusätzlich Per-Locale-Übersetzungen tragen.
 */
export interface LetterAiSummary {
  de: string;
  en?: string;
  ru?: string;
  uk?: string;
  ar?: string;
  tr?: string;
  /** Strikt strukturelle 1-Zeilen-Pre-Open-Variante. */
  pre_open?: LetterAiSummaryPreOpen;
  /** 5–8 Bullets mit Citation-Pflicht (Post-Open). */
  post_open?: LetterAiSummaryPostOpen;
  /**
   * Optionale Locale-Spezifische Pre-/Post-Open-Übersetzungen.
   * Originaltext (`Letter.body_de`) bleibt immer DE.
   */
  translations?: Partial<
    Record<
      'en' | 'ru' | 'uk' | 'ar' | 'tr',
      { pre_open?: LetterAiSummaryPreOpen; post_open?: LetterAiSummaryPostOpen }
    >
  >;
}

/** Aufforderung zu einer Aktion mit Frist (Legacy-Felder, additiv zu `Letter.fristen`). */
export interface LetterRequiredAction {
  /** Maschinenlesbarer Aktions-Typ, z. B. 'termin_buchen'. */
  typ: string;
  /** ISO-Datum. */
  frist: string;
  /** Klartext-CTA. */
  cta: string;
}

/**
 * Optionen-IDs aus dem Was-kann-ich-tun-Katalog (i18n-keys unter
 * `posteingang.was_kann_ich_tun.<archetype>.<option>`). Vergibt das Mock-Backend
 * pro Brief; Frontend rendert die Liste mit dem `no_legal_advice`-Disclaimer.
 */
export type LetterArchetypeAction = string;

/**
 * Ein Behördenbrief im Posteingang. `body_de` enthält den vollständigen Brieftext
 * inkl. Briefkopf, Anrede und Schlussformel — und immer eine
 * `[MOCK – Verwaltungsdemo, keine echten Daten]`-Zeile als Watermark.
 */
export interface Letter {
  id: string;
  absender_behoerde_id: BehoerdeId;
  empfaenger_persona_id: PersonaId;
  /** Primäres Aktenzeichen (synthetisch, mit `[MOCK]`-Präfix). */
  aktenzeichen: string;
  /** Weitere Aktenzeichen (z. B. Steuer-IdNr. neben Steuernummer). */
  aktenzeichen_weitere?: string[];
  betreff: string;
  body_de: string;
  ai_summary?: LetterAiSummary;
  /** Legacy single-action-Feld; bei Mehrfach-Fristen ist `fristen[]` primär. */
  required_action?: LetterRequiredAction;
  /** Mehrfach-Fristen (Posteingang-Spec §6 Edge case #1). Leeres Array → keine Frist. */
  fristen?: LetterFrist[];
  /** Brief-Archetyp aus Spec §6. */
  archetype?: LetterArchetype;
  /** Authentizitäts-Kanal (Empfangsweg). */
  auth_channel?: LetterAuthChannel;
  /** Was-kann-ich-tun-Optionen aus Archetyp-Katalog. */
  was_kann_ich_tun_options?: LetterArchetypeAction[];
  status: LetterStatus;
  /** ISO-Timestamp des Eingangs. */
  empfangen_am: string;
  /** Optionaler Bezug zu einem laufenden Vorgang. */
  vorgang_id?: string;
}

/** Status-Filter inkl. abgeleiteter Frist-Buckets. */
export type LetterStatusFilter =
  | LetterStatus
  | 'frist_abgelaufen'
  | 'frist_unter_7d'
  | 'frist_ueber_7d';

export interface LetterFilter {
  /** Nur ungelesene Briefe. */
  unread?: boolean;
  /** Briefe eines konkreten Vorgangs. */
  vorgang_id?: string;
  /** Substring-Suche auf `aktenzeichen` + `aktenzeichen_weitere` (case-insensitive). */
  aktenzeichen_query?: string;
  /** Filter nach Behörden-Kategorie (Bund / Land / Kommune / Selbstverwaltung / Privat). */
  behoerden_kategorie?: BehoerdeKategorie;
  /** Filter nach Brief-Archetyp. */
  archetype?: LetterArchetype;
  /** Status-Filter (mehrfach möglich, inkl. Frist-Buckets). */
  status?: LetterStatusFilter[];
  /** Nur Briefe mit Frist innerhalb der nächsten N Tage. */
  frist_innerhalb_tage?: number;
  /** Filter nach Vorgangs-Status (kombiniert via `vorgang_id` join). */
  vorgang_status?: string[];
}

// ----------------------------------------------------------------------------
// Activity-Log (Datenschutz-Cockpit)
// ----------------------------------------------------------------------------

/**
 * Reine App-Aktivität — niemals „Lesebestätigung" oder Read-Receipt zur Behörde.
 * Wird im `/datenschutz?letter={id}`-Cockpit pro Brief angezeigt (Spec §6.3).
 *
 * Die fünf kanonischen Werte sind in `src/lib/mock-backend/schemas.ts` über
 * `letterActivityLogEntrySchema.shape.event` definiert; jede Drift zwischen
 * Schema und TS-Type würde beim Schreiben in den Activity-Log stillschweigend
 * akzeptiert und beim nächsten Re-Read als Schema-Mismatch gelöscht — daher
 * die Pflicht, beide Stellen synchron zu halten.
 */
export type LetterActivityEvent =
  | 'opened_in_app'
  | 'summary_generated'
  | 'frist_added_to_calendar'
  | 'marked_read'
  | 'archived'
  // V1.5 — Antwort verfassen (verifier #6, domain §5.D2):
  | 'reply_compose_started'
  | 'reply_template_inserted'
  | 'reply_draft_saved'
  | 'reply_draft_deleted'
  | 'reply_sent_simulated';

/**
 * Alias für `LetterActivityEvent` — der Spec/Frontend-side bevorzugte Name.
 * Beide Namen verweisen auf dieselbe Union; importieren Sie diesen, wenn das
 * aufrufende Modul bereits andere `*Aktion`-Bezeichner verwendet.
 */
export type LetterActivityAktion = LetterActivityEvent;

export interface LetterActivityLogEntry {
  letter_id: string;
  event: LetterActivityEvent;
  /** ISO-Timestamp. */
  at: string;
  /** Wer hat den Eintrag geschrieben — V1 immer 'app_internal'. */
  by: 'app_internal';
  /** Optional: DSGVO-Rechtsgrundlage. */
  rechtsgrundlage?: string;
  /** Optional: Freitext-Notiz (z. B. Modellbezeichnung). */
  note?: string;
}

/** Map letterId → chronologisch geordnete Aktivitäts-Liste. */
export type LetterActivityLog = Record<string, LetterActivityLogEntry[]>;

// ----------------------------------------------------------------------------
// V1.5 — Antwort verfassen (Reply / ReplyDraft)
// ----------------------------------------------------------------------------

/**
 * Status einer Antwort:
 *  - `draft`: persistiert, aber noch nicht „versandt".
 *  - `sent_simulated`: Bürger:in hat „Versand simulieren" geklickt; localStorage-
 *    only, kein realer Versand. Bestätigungs-Prosa wird im Frontend aus
 *    `kanal` + `sent_at` + i18n-Template gerendert (siehe Domain §7).
 *  - `deleted`: weiches Löschen (V2-Hook für Datenschutz-Cockpit-Lösch-Anträge).
 */
export type ReplyStatus = 'draft' | 'sent_simulated' | 'deleted';

/**
 * Whitelist der V1.5.0-Templates (Domain-Validiert + Verifier-getrimmt).
 * Skelett-Templates (`rechtsbehelf_skelett_einspruch`, `…_widerspruch`) sind
 * V1.5.1-OUT — siehe Verifier-Verdict, sie benötigen den Adressat-Risiko-Modal,
 * der erst dort spezifiziert wird.
 *
 * `null` als Template-ID kennzeichnet den `freitext`-Modus (kein Skelett, nur
 * optionaler Stammdaten-Prefill von Empfänger + Aktenzeichen + Datum).
 */
export type ReplyTemplateId =
  | 'frist_verlaengerung'
  | 'nachweis_einreichen'
  | 'informative_rueckmeldung'
  | 'termin_antwort';

/**
 * Modus-Radio für `termin_antwort`. Cover-Text passt sich an den gewählten
 * Modus an — Spec §3 success-criteria.
 */
export type ReplyTerminMode = 'bestaetigen' | 'verschieben' | 'absagen';

/**
 * Anhang einer Antwort. ELSTER-Realismus-Konstanten begrenzen Anzahl, Größe
 * pro Datei und Gesamtgröße — siehe `LETTER_ATTACHMENT_LIMITS`.
 *
 * `[MOCK]_data?` ist ein optionales synthetisches Payload-Feld (z. B. ein
 * data-URL-Stub `[MOCK] data:application/pdf;…`) — wir persistieren niemals
 * den echten Datei-Inhalt, sondern nur Meta-Daten + einen `[MOCK]`-Marker,
 * damit der localStorage-Bucket nicht aufquillt.
 */
export interface LetterAttachment {
  name: string;
  /** MIME-Type — auf `LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME` beschränkt. */
  mime: string;
  size_bytes: number;
  /** `[MOCK]`-präfigierter synthetischer Payload-Stub (kein echter Inhalt). */
  '[MOCK]_data'?: string;
}

/**
 * ELSTER-Realismus-Konstanten für Anhänge (Verifier-locked).
 * Quelle: Verifier-MUST-Cover #10 + research-scout Axis-1 #5.
 */
export const LETTER_ATTACHMENT_LIMITS = {
  /** Maximale Anzahl Anhänge pro Antwort. */
  MAX_FILES: 20,
  /** Maximale Größe pro einzelner Datei (10 MiB). */
  MAX_BYTES_PER_FILE: 10 * 1024 * 1024,
  /** Maximale Summen-Größe aller Anhänge (36 MiB). */
  MAX_BYTES_TOTAL: 36 * 1024 * 1024,
  /** Erlaubte MIME-Types (PDF, PNG, JPEG). */
  ALLOWED_MIME: [
    'application/pdf',
    'image/png',
    'image/jpeg',
  ] as const,
} as const;

/**
 * Eine Bürger:innen-Antwort auf einen Brief — als Draft oder simuliert versandt.
 * Eine Antwort lebt **immer** in-thread zu genau einem inbound `Letter`
 * (Aktenzeichen-Anker; verifier #2: keine free-form Mailbox in V1.5).
 *
 * `body_de` bleibt unabhängig von der UI-Locale Deutsch (Behörde parst
 * Deutsch — Spec §3 success-criteria).
 */
export interface Reply {
  id: string;
  /** Brief-ID, auf den geantwortet wird (Aktenzeichen-Anker). */
  letter_id: string;
  status: ReplyStatus;
  /**
   * Template-ID oder `null` für Freitext-Modus. `null` ist wichtig für
   * Datenschutz-Cockpit-Anzeige („ohne Vorlage verfasst").
   */
  template_id: ReplyTemplateId | null;
  /**
   * Pflicht für `template_id === 'termin_antwort'`, sonst `undefined`.
   * Schema validiert das (siehe `replySchema`).
   */
  mode?: ReplyTerminMode;
  /** Bürger:innen-Text, immer DE. */
  body_de: string;
  attachments: LetterAttachment[];
  /** ISO-Timestamp der ersten Persistierung. */
  created_at: string;
  /** ISO-Timestamp der letzten Mutation (Draft-Auto-Save). */
  updated_at: string;
  /** ISO-Timestamp des Mock-Versands; `null` solange `status === 'draft'`. */
  sent_at: string | null;
  /**
   * Mock-Kanal-Bezeichnung („BundID-Postfach (speculative 2027)" / „ELSTER-
   * Postfach" / …). Aus `getMockKanalForBehoerde(letter.absender_behoerde_id)`
   * abgeleitet; `null` solange Draft.
   */
  kanal: string | null;
  /**
   * @deprecated Seit V1.5.1 entfernt. Die Empfangsbestätigungs-Prosa wird im
   * Frontend aus `kanal`, `sent_at` und dem i18n-Template
   * `posteingang.compose.confirmation.full_receipt_template` zusammengesetzt
   * (Domain §7, Code-Review BLOCKER #3 vom 2026-05-09). Hardcoded German strings
   * verstoßen gegen CLAUDE.md (i18n-only-Regel).
   *
   * Das Feld bleibt aus Schema-Compat-Gründen optional erhalten — ältere
   * persistierte Replies (Pre-V1.5.1) führen sonst beim Re-Read zu
   * Schema-Drift-Reseed. Niemals neu schreiben.
   */
  receipt_text?: string | null;
}

/**
 * Type-Alias für eine Reply im Draft-Status. Erlaubt es Frontend-Code, an
 * der Signatur-Ebene zu kommunizieren „dies ist noch nicht versandt" — die
 * Laufzeit-Form ist identisch zu `Reply`.
 */
export type ReplyDraft = Reply & { status: 'draft' };

/** Map letterId → einzige aktuelle Reply pro Brief. */
export type LetterReplyMap = Record<string, Reply>;
