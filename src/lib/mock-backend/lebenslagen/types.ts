/**
 * Config-Schema für die funktionalen Lebenslagen (Spec
 * `docs/specs/vorgaenge-functional.md` §2 + §2.1).
 *
 * Ein `LebenslageConfig`-Objekt pro Lebenslage; die Registry (`index.ts`) mappt
 * `slug → config`. Reine Daten + ein paar `(persona) => boolean`-Prädikate
 * (gleiches Muster wie Umzug `visibleIf`). KEINE Submission-Logik — die generische
 * Engine `runLebenslageCascade` (Phase 2) liest diese Configs.
 *
 * Realismus-Guardrails (Spec §8): jedes Aktenzeichen ist `[MOCK]`-präfixiert,
 * jede Dokumentenvorschau trägt das `[MOCK]`-Wasserzeichen, kein echter Behörden-
 * Versand. `user_decision: true`-Felder werden NIE vorausgefüllt.
 */
import type { BehoerdeId } from '@/types/behoerde';
import type { BlockTyp, VorgangTyp } from '@/types/vorgang';
import type { Persona } from '@/types/persona';

/** Where a prefilled field's value comes from (Once-Only provenance). */
export interface PrefillSource {
  /** Dot-path into the Persona/Stammdaten, e.g. 'adresse', 'steuer_id',
   *  'krankenversicherung.versichertennummer', 'familie.kinder[0].geburtsdatum'.
   *  null = no register source → the field is a genuine user input. */
  path: string | null;
  /** Human DE label of the source register/authority for the provenance line,
   *  e.g. 'Melderegister (§ 3 BMG)', 'BZSt (§ 139b AO)', 'Ihre Stammdaten'. */
  label_de: string;
  /** True when this is a real, citizen-genuine decision that must NEVER be
   *  auto-filled (e.g. child's Namensbestimmung). Forces an empty input. */
  user_decision?: boolean;
}

export interface FormFieldConfig {
  /** Stable key; also the i18n sub-key under `lebenslagen.{slug}.fields`. */
  key: string;
  /** 'text' | 'date' | 'iban' | 'select' | 'number' | 'checkbox' | 'upload'. */
  typ: 'text' | 'date' | 'iban' | 'select' | 'number' | 'checkbox' | 'upload';
  /** Once-Only provenance. */
  prefill: PrefillSource;
  /** Datenminimierung: which Datenkategorie this field belongs to. Feeds the
   *  Datenminimierungs-Panel + the per-recipient minimal set. */
  datenkategorie: string;
  required: boolean;
  /** Light client-side validation hint (regex name or 'iban'|'plz'|'date'). */
  validate?: 'iban' | 'plz' | 'date' | 'nonempty';
  /** Only render this field when the predicate holds (e.g. married → Eheurkunde). */
  visibleIf?: (p: Persona) => boolean;
  /** `[MOCK]` upload affordance only — never a real file submission. */
  upload_mock?: boolean;
}

/** A single cascade hop. Maps 1:1 onto an AutopilotStep. */
export interface CascadeStepConfig {
  /** Stable per-config id, e.g. 'lea-antrag'. → AutopilotStep.id derives from it. */
  id: string;
  behoerdeId: BehoerdeId;
  /** A = auto/register, B = consent (private), D = eID-gated forward (Umzug parity). */
  block: BlockTyp;
  gate: 'auto' | 'eid' | 'consent';
  /** Klartext-Aktion (DE data, not an i18n key) → AutopilotStep.aktion. */
  aktion: string;
  /** Kurzer DE-Schritttitel für den Detail-Stepper (DE-Daten, kein i18n-Key,
   *  konsistent mit `aktion`/`agentLabel`), z.B. „Geburt beurkunden". Optional;
   *  die View fällt sonst auf `aktion` zurück. */
  kurzlabel?: string;
  /** Kurzes DE-Behörden-Label für die Stepper-Sublabel (DE-Daten, kein i18n-Key),
   *  z.B. „Standesamt". Optional. */
  behoerdeKurz?: string;
  /** Delegated agent-voice primary line (DE data) → AutopilotStep.agent_label. */
  agentLabel: string;
  /** Short norm tag → AutopilotStep.rechtsgrundlage. */
  rechtsgrundlage: string;
  /** Minimal Datenkategorien for THIS recipient (Datenminimierung). */
  datenkategorien: string[];
  /**
   * Das `[MOCK]`-Aktenzeichen, das dieser Hop dem/der Bürger:in zeigt. Aus dem
   * Dossier (Spec §3) verbatim übernommen, deterministisch + `[MOCK]`-präfixiert
   * (Guardrail §8 G1). Die Engine (Phase 2) substituiert es in die `{az}`-
   * Platzhalter der `mints`-Templates und ankert es an die Transport-Quittung
   * des `isPrimarySubmission`-Schritts. `undefined` für reine Prüf-/Abgleich-
   * Hops, die kein eigenes Az. erzeugen. */
  aktenzeichen?: string;
  /** What the successful hop produces. */
  mints: {
    letter?: LetterTemplate; // → Posteingang Bestätigungs-Brief
    document?: DocumentTemplate; // → Dokumente vault ([MOCK])
    termin?: TerminTemplate; // → Termine (status 'vorgeschlagen', never 'gebucht')
  };
  /** The ONE headline forward step routes through getTransport() (§1.2). */
  isPrimarySubmission?: boolean;
  /** Marks a speculative-2027 hop → renders the [ZUKUNFT]/Zukunft chip. */
  zukunft?: boolean;
  /**
   * Einzel-Datum-„input"-Schritt (Spec Move A §5.4). Pausiert die Kaskade an
   * genau EINEM benötigten Datum und läuft nach Freigabe weiter — die Mechanik
   * ist das bestehende `gate: 'eid'`-Pause/Resume (kein neuer Control-Flow).
   *
   * - `kind: 'confirm'` (Stufe-1-Demo, Schmidt/Mia): eID-BESTÄTIGUNG eines
   *   bereits BEKANNTEN Kontos — die Engine berechnet aus
   *   `persona.bankverbindung.iban` die maskierte Vorschau (`AutopilotStep.eid_preview`,
   *   z. B. `DE.. •••• 4711`). NIE „IBAN eingeben".
   * - `kind: 'input'` (Stufe-2 Erstkind): echte Einzel-Datum-Eingabe. Im Typ
   *   definiert, als interaktiver Flow OUT OF SCOPE (nur Erklär-Layer).
   *
   * `fieldKey` benennt das eine Datum (Stufe 1: `'iban'`). `maskedPreview`
   * optional als statischer Fallback, wenn kein Register-Wert vorliegt.
   */
  eidInput?: { kind: 'confirm' | 'input'; fieldKey: string; maskedPreview?: string };
  /** Latency choreography (ms) so the cascade streams like Umzug. */
  latencyMs: number;
  /** Render only for personas this hop applies to. */
  visibleIf?: (p: Persona) => boolean;
}

export interface LetterTemplate {
  absender: string; // Briefkopf
  betreffTemplate: string; // '{az}' placeholder
  floskel: string; // body; '{name}' '{az}' '{datum}' placeholders
  abschluss: string;
  /** Letter archetype, optional (Posteingang rendering). */
  archetype?: string;
}

export interface DocumentTemplate {
  typ: string; // DocumentTyp (additive ok)
  titelTemplate: string; // '[MOCK] Fiktionsbescheinigung …'
  eudi_compatible: boolean;
}

export interface TerminTemplate {
  betreff: string;
  ort_details: string;
  /** Always 'vorgeschlagen' for these flows (never auto-book). */
  status: 'vorgeschlagen';
}

export interface LebenslageConfig {
  slug: string; // url + i18n namespace
  vorgangTyp: VorgangTyp;
  icon: string; // lucide icon name (frontend maps)
  kategorie: 'familie' | 'wohnen' | 'arbeit' | 'migration' | 'steuern' | 'mehr';
  /** antrag = classic application; antragslos = no form, auto-cascade;
   *  termin = mandatory in-person step; hybrid = mix (eID antrag + consent + termin). */
  mode: 'antrag' | 'antragslos' | 'termin' | 'hybrid';
  /** Speculative-2027 overall flag → page-level [ZUKUNFT 2027] banner. */
  zukunft: boolean;
  /** i18n keys for titel/lead live under `lebenslagen.{slug}.*` (DE source). */
  zustaendige_behoerden: BehoerdeId[]; // primary first
  /** Free DE bullet strings (i18n key list) for the Vorprüfung. */
  voraussetzungen_keys: string[];
  benoetigte_dokumente_keys: string[];
  formFields: FormFieldConfig[];
  rechtsgrundlagen: { norm: string; bedeutung_key: string }[];
  frist?: { tage: number | null; beschreibung_key: string };
  gebuehr: { gibt_es: boolean; betrag_key?: string; hinweis_key?: string };
  cascade: CascadeStepConfig[];
  value_receipt: {
    behoerdengaenge_gespart: number;
    minuten_gespart: number;
    hinweis_key: string;
  };
  /**
   * Optionales Ergebnis-Dossier — nur der completed-state „Gesamtergebnis"-Band
   * (`VorgangAbgeschlossen`). Liefert zwei fachliche Outcome-Kennzahl-Zellen +
   * Lead-Satz; die dritte Zelle bleibt generisch „Beteiligte Stellen". Fehlt das
   * Feld, fällt die View auf die generischen Zellen (Stellen / Nachweise / Zeit)
   * zurück. Werte sind synthetische `[MOCK]`-Demo-Daten (Guardrail §8).
   */
  ergebnis?: {
    /** Lead-Satz unter „Abgeschlossen" (i18n-Key). */
    lead_key: string;
    /** Zelle 1 — primäre Outcome-Kennzahl (z. B. Pflegegrad). */
    kennzahl: {
      label_key: string;
      /** Anzeigewert (DE-Daten). Bei `mock: true` mit [MOCK]-Marker gerendert. */
      wert: string;
      /** Sub-Zeile (i18n-Key); `{date}` wird mit dem Abschlussdatum ersetzt. */
      sub_key: string;
      mock?: boolean;
    };
    /** Zelle 2 — sekundäres Outcome (z. B. Leistungseinrichtung). */
    status: {
      label_key: string;
      /** Wert-Zeile (i18n-Key); `{date}` wird substituiert. */
      wert_key: string;
      sub_key: string;
    };
  };
  /** For mode='antragslos': the "kein Antrag nötig" explainer key. */
  antragslos_note_key?: string;
  /**
   * Wie der Assistant diese Lebenslage anstößt (Tool-Kontrakt Move A §7):
   * - `'antragslos-cascade'` → `preview_lebenslage` + `starte_lebenslage`
   *   feuern die in-thread Kaskade (nur Kindergeld ist echt antragslos).
   * - `'antragsgebunden'` (Default für alle anderen: wohngeld/geburt/bafoeg/
   *   pflegegrad/reisepass/aufenthalt-verlaengerung) → klassischer Antrag,
   *   NIE als „auch automatisch" darstellen.
   */
  assistant_trigger?: 'antragslos-cascade' | 'antragsgebunden';
  /** i18n key for an estimated total duration string, e.g.
   *  `lebenslagen.{slug}.dauer_geschaetzt` → „30–45 Min". */
  dauer_geschaetzt_key?: string;

  // ── §2.1 additions: catalog routing ──────────────────────────────────────
  /** 'umzug-saga' = the existing resilient OrchestrationEngine + run page;
   *  'lebenslage-cascade' = the generic `runLebenslageCascade` (the 7 new ones). */
  engine: 'umzug-saga' | 'lebenslage-cascade';
  /** Detail-page href. Default `/lebenslagen/{slug}`; Umzug overrides to
   *  `/vorgaenge/umzug/run` so the router keeps the spine untouched. */
  href: string;
}

/**
 * Schlanker Katalog-Eintrag für die `/lebenslagen`-Grid-API (Phase 2 wired into
 * `api.getLebenslagen()`). Abgeleitet aus dem Config; trägt nur die Felder, die
 * die Kachel + das Routing brauchen — kein Cascade-/Form-Detail. `title`/`lead`
 * sind i18n-Key-Referenzen (`lebenslagen.{slug}.title` / `.lead`).
 */
export interface LebenslageCatalogEntry {
  slug: string;
  vorgangTyp: VorgangTyp;
  icon: string;
  kategorie: LebenslageConfig['kategorie'];
  mode: LebenslageConfig['mode'];
  zukunft: boolean;
  href: string;
  engine: LebenslageConfig['engine'];
  /** i18n key ref: `lebenslagen.{slug}.title`. */
  title_key: string;
  /** i18n key ref: `lebenslagen.{slug}.lead`. */
  lead_key: string;
  /** Cascade-Schritt-Zahl (= `config.cascade.length`). Für die Hub-Kachel
   *  („6 Schritte"). Der Umzug-Stub hat eine leere Cascade → 0 (die Hub zeigt
   *  dann „teilweise automatisch"). */
  schritte: number;
  /** Zahl der beteiligten Behörden (= `config.zustaendige_behoerden.length`).
   *  Für die Hub-Kachel („6 Behörden gebündelt"). */
  behoerden: number;
}
