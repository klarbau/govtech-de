/**
 * Stammdaten Mock-Backend-API (Spec § 5.1). Co-located in `stammdaten/`-Folder
 * for cleanliness; re-exported from the top-level `api.ts` so that the rest of
 * the app can keep importing through `@/lib/mock-backend`.
 *
 * Hard-Lines:
 *   - § 11.2 Lese-/Wegweiser-Architektur — KEINE `setStammdatenField()`-API.
 *     Self-Edit ist auf Kontakt/Sprache/Sperren/IBAN/Religion-Consent begrenzt.
 *   - § 11.3 Religion hidden-by-default + session-only.
 *   - § 11.4 Religion-Consent NIEMALS persistiert (kein localStorage-Bucket).
 *   - § 11.6 Activity-Log-Notes: `<key>:<value>;`-Marker.
 *   - § 11.8 `[MOCK]`-Watermark auf Werten mit echt-aussehendem Charakter.
 *   - § 11.10 Pilot-Phase-Status-Badge → `pilot_phase`-Flag in `disclaimer_meta`.
 *   - § 11.11 ARF v2.0 in `disclaimer_meta.arf_version`.
 *   - § 11.18 Wallet minimal-statisch — 3 fixe Empfänger.
 *   - § 11.19 `getStammdaten()` ist Single-Source-of-Truth.
 *
 * Latenz: alle Methoden laufen durch `withLatency()` (300–800 ms + 5 % Fehler);
 * Reliable-Mode (`NEXT_PUBLIC_RELIABLE=1` oder `?reliable=1`) deaktiviert die
 * Fehler-Injektion für Loom-Aufzeichnungen + Tests.
 */
import type {
  Persona,
  PersonaId,
  Stammdaten,
  StammdatenIbanSpeculative,
  StammdatenSektionId,
  StammdatenSperren,
  StammdatenUebermittlungssperreId,
  UebermittlungsLogEntry,
  WalletAttestation,
  WalletAttestationPreview,
} from '@/types';
import { MockBackendError } from '../errors';
import { emit } from '../events';
import { uuid } from '../id';
import { withLatency } from '../latency';
import {
  read,
  readOrInit,
  write,
  type CollectionKey,
} from '../persistence';
import {
  personasArraySchema,
  stammdatenIbanSpeculativeBucketSchema,
  stammdatenKontaktBucketSchema,
  stammdatenSperrenBucketSchema,
  stammdatenUebermittlungsLogBucketSchema,
} from '../schemas';
import { STAMMDATEN_DEFAULT_LOG_ENTRIES } from './seed-log-entries';

// ---------------------------------------------------------------------------
// Religion-Consent — session-only (Hard-Line § 11.3 + § 11.4)
// ---------------------------------------------------------------------------

/**
 * Religion-Consent lebt strikt session-only. In der Browser-Umgebung nutzen
 * wir `sessionStorage` (überlebt Tab-Switch, NICHT Reload — Hard-Line § 11.4).
 * In Node-Tests fallen wir auf einen In-Memory-Cache zurück.
 *
 * **Niemals** localStorage. Niemals einen `…stammdaten:religion-consent`-Key.
 */
const SESSION_KEY = 'govtech-de:v1:stammdaten:religion-consent-session';
const inMemoryReligionConsent = new Map<PersonaId, { consent_session: boolean; last_shown_at?: string }>();

function readSessionConsent(personaId: PersonaId): {
  consent_session: boolean;
  last_shown_at?: string;
} {
  // SSR / Node-Test ohne sessionStorage: in-memory Map.
  const ss =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { sessionStorage?: Storage }).sessionStorage !==
      'undefined'
      ? (globalThis as { sessionStorage: Storage }).sessionStorage
      : undefined;
  if (!ss) {
    return inMemoryReligionConsent.get(personaId) ?? { consent_session: false };
  }
  try {
    const raw = ss.getItem(SESSION_KEY);
    if (!raw) return { consent_session: false };
    const parsed = JSON.parse(raw) as Record<
      PersonaId,
      { consent_session: boolean; last_shown_at?: string }
    >;
    return parsed[personaId] ?? { consent_session: false };
  } catch {
    return { consent_session: false };
  }
}

function writeSessionConsent(
  personaId: PersonaId,
  value: { consent_session: boolean; last_shown_at?: string },
): void {
  const ss =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { sessionStorage?: Storage }).sessionStorage !==
      'undefined'
      ? (globalThis as { sessionStorage: Storage }).sessionStorage
      : undefined;
  if (!ss) {
    inMemoryReligionConsent.set(personaId, value);
    return;
  }
  try {
    const raw = ss.getItem(SESSION_KEY);
    const parsed: Record<
      PersonaId,
      { consent_session: boolean; last_shown_at?: string }
    > = raw ? JSON.parse(raw) : {};
    parsed[personaId] = value;
    ss.setItem(SESSION_KEY, JSON.stringify(parsed));
  } catch {
    inMemoryReligionConsent.set(personaId, value);
  }
}

/** Test-only Reset (für vitest `beforeEach`). */
export function _resetReligionConsentForTests(): void {
  inMemoryReligionConsent.clear();
  const ss =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { sessionStorage?: Storage }).sessionStorage !==
      'undefined'
      ? (globalThis as { sessionStorage: Storage }).sessionStorage
      : undefined;
  if (ss) {
    try {
      ss.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Persistence-Helpers (4 LocalStorage-Buckets aus Spec § 5.4)
// ---------------------------------------------------------------------------

const DEFAULT_SPERREN: StammdatenSperren = {
  auskunftssperre_aktiv: false,
  uebermittlungssperren: [],
};

const DEFAULT_IBAN: StammdatenIbanSpeculative = {
  consented_pushes: { familienkasse: false, elster: false, gkv: false },
};

function loadSperrenBucket(): Record<PersonaId, StammdatenSperren> {
  return readOrInit(
    'stammdaten:sperren' as CollectionKey,
    stammdatenSperrenBucketSchema,
    {} as Record<PersonaId, StammdatenSperren>,
  );
}

function saveSperrenBucket(
  bucket: Record<PersonaId, StammdatenSperren>,
): void {
  write('stammdaten:sperren' as CollectionKey, bucket);
}

function loadIbanBucket(): Record<PersonaId, StammdatenIbanSpeculative> {
  return readOrInit(
    'stammdaten:iban-speculative' as CollectionKey,
    stammdatenIbanSpeculativeBucketSchema,
    {} as Record<PersonaId, StammdatenIbanSpeculative>,
  );
}

function saveIbanBucket(
  bucket: Record<PersonaId, StammdatenIbanSpeculative>,
): void {
  write('stammdaten:iban-speculative' as CollectionKey, bucket);
}

interface KontaktBucketEntry {
  email?: string;
  mobil?: string;
  sprachpraeferenz: string;
}

function loadKontaktBucket(): Record<PersonaId, KontaktBucketEntry> {
  return readOrInit(
    'stammdaten:kontakt' as CollectionKey,
    stammdatenKontaktBucketSchema,
    {} as Record<PersonaId, KontaktBucketEntry>,
  );
}

function saveKontaktBucket(
  bucket: Record<PersonaId, KontaktBucketEntry>,
): void {
  write('stammdaten:kontakt' as CollectionKey, bucket);
}

const MAX_LOG_ENTRIES_PER_PERSONA = 200;

function loadLogBucket(): Record<PersonaId, UebermittlungsLogEntry[]> {
  return readOrInit(
    'stammdaten:uebermittlungs-log' as CollectionKey,
    stammdatenUebermittlungsLogBucketSchema,
    {} as Record<PersonaId, UebermittlungsLogEntry[]>,
  );
}

function saveLogBucket(
  bucket: Record<PersonaId, UebermittlungsLogEntry[]>,
): void {
  write('stammdaten:uebermittlungs-log' as CollectionKey, bucket);
}

/**
 * Hängt einen Eintrag an den (per-Persona) Log an. FIFO-Eviction bei mehr
 * als `MAX_LOG_ENTRIES_PER_PERSONA`.
 *
 * Idempotent: wenn `entry.id` schon im Bucket steht, wird der Eintrag durch
 * den neuen ersetzt (Test-Re-Runs).
 */
export function appendLogEntry(
  personaId: PersonaId,
  entry: UebermittlungsLogEntry,
): void {
  const bucket = loadLogBucket();
  const existing = bucket[personaId] ?? [];
  const dedup = existing.filter((e) => e.id !== entry.id);
  const next = [...dedup, entry];
  // FIFO: drop oldest entries.
  while (next.length > MAX_LOG_ENTRIES_PER_PERSONA) next.shift();
  bucket[personaId] = next;
  saveLogBucket(bucket);
}

/**
 * Initial-Seed der Stammdaten-Buckets pro Persona. Idempotent — wenn der
 * Persona-Eintrag schon existiert, wird er nicht überschrieben (Demo darf
 * Sperren/IBAN-Push behalten).
 */
export function seedStammdatenForPersona(personaId: PersonaId): void {
  const sperren = loadSperrenBucket();
  if (!sperren[personaId]) {
    sperren[personaId] = { ...DEFAULT_SPERREN };
    saveSperrenBucket(sperren);
  }

  const iban = loadIbanBucket();
  if (!iban[personaId]) {
    iban[personaId] = { ...DEFAULT_IBAN };
    saveIbanBucket(iban);
  }

  const kontakt = loadKontaktBucket();
  if (!kontakt[personaId]) {
    // Default-Sprache: 'de'. Frontend kann das bei Login override.
    kontakt[personaId] = { sprachpraeferenz: 'de' };
    saveKontaktBucket(kontakt);
  }

  // Initial-Aktivitätsprotokoll: nur wenn noch keine Einträge da sind.
  const log = loadLogBucket();
  if (!log[personaId] || log[personaId].length === 0) {
    const seed = STAMMDATEN_DEFAULT_LOG_ENTRIES[personaId] ?? [];
    log[personaId] = [...seed];
    saveLogBucket(log);
  }
}

/** Reseed-Pfad: bei Persona-Switch Sperren/IBAN/Kontakt zurücksetzen. */
export function reseedStammdatenForPersona(personaId: PersonaId): void {
  const sperren = loadSperrenBucket();
  sperren[personaId] = { ...DEFAULT_SPERREN };
  saveSperrenBucket(sperren);

  const iban = loadIbanBucket();
  iban[personaId] = { ...DEFAULT_IBAN };
  saveIbanBucket(iban);

  const kontakt = loadKontaktBucket();
  kontakt[personaId] = { sprachpraeferenz: 'de' };
  saveKontaktBucket(kontakt);

  const log = loadLogBucket();
  const seed = STAMMDATEN_DEFAULT_LOG_ENTRIES[personaId] ?? [];
  log[personaId] = [...seed];
  saveLogBucket(log);

  // Religion-Consent auch zurücksetzen (per-Persona-Switch).
  writeSessionConsent(personaId, { consent_session: false });
}

// ---------------------------------------------------------------------------
// Persona-Lookup (read-only, durchgereicht für Stammdaten-Read-Model)
// ---------------------------------------------------------------------------

function loadPersonaById(personaId: PersonaId): Persona {
  const personas = readOrInit<Persona[]>(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    [] as Persona[],
  );
  const persona = personas.find((p) => p.id === personaId);
  if (!persona) {
    throw new MockBackendError(
      `Persona "${personaId}" nicht gefunden.`,
      { code: 'PERSONA_NOT_FOUND', retryable: false },
    );
  }
  return persona;
}

// ---------------------------------------------------------------------------
// Stammdaten-Snapshot-Builder
// ---------------------------------------------------------------------------

function buildStammdaten(personaId: PersonaId): Stammdaten {
  // Sicher-stellen: Per-Persona-Buckets sind gefüllt.
  seedStammdatenForPersona(personaId);

  const persona = loadPersonaById(personaId);
  const sperren = loadSperrenBucket()[personaId] ?? { ...DEFAULT_SPERREN };
  const iban = loadIbanBucket()[personaId] ?? { ...DEFAULT_IBAN };
  const kontakt = loadKontaktBucket()[personaId] ?? { sprachpraeferenz: 'de' };
  const log = loadLogBucket()[personaId] ?? [];
  const religionConsent = readSessionConsent(personaId);

  // Religion-Wert nur surfacen, wenn consent_session === true.
  const religionWert =
    religionConsent.consent_session && persona.religion
      ? persona.religion
      : undefined;

  // Historische Anschriften: V1 hat keine echten Persona-Historien; bleibt
  // leer, kann aber durch Umzug-Cascade befüllt werden (Spec § 8.4).
  const anschriftenHistorisch: Array<
    Stammdaten['anschriften_historisch'][number]
  > = [];

  const familieKinder = (persona.familie?.kinder ?? []).map((k) => ({
    vorname: k.vorname,
    nachname: k.nachname,
    geburtsdatum: k.geburtsdatum,
    idnr_mock: k.steuer_id,
  }));

  const familiePartner = persona.familie?.partner
    ? {
        vorname: persona.familie.partner.vorname,
        nachname: persona.familie.partner.nachname,
        geburtsdatum: persona.familie.partner.geburtsdatum,
        idnr_mock: persona.familie.partner.steuer_id,
      }
    : undefined;

  const stammdaten: Stammdaten = {
    persona_id: personaId,
    identitaet: {
      familienname: persona.nachname,
      fruehere_namen: persona.fruehere_namen ?? [],
      vornamen: persona.vorname,
      doktorgrad: persona.doktorgrad,
      geburtsdatum: persona.geburtsdatum,
      geburtsort: persona.geburtsort,
      geschlecht: persona.geschlecht ?? 'unbestimmt',
      staatsangehoerigkeit: persona.staatsangehoerigkeit,
      steuer_id: persona.steuer_id,
    },
    anschrift_aktuell: persona.adresse,
    anschriften_historisch: anschriftenHistorisch,
    familie: {
      partner: familiePartner,
      kinder: familieKinder,
      eheschliessung: persona.eheschliessung,
    },
    dokumente_refs: {
      personalausweis: persona.personalausweis_nr,
      reisepass: persona.reisepass,
      eat_can: persona.eat_can,
      azr_nr: persona.azr_nr,
    },
    kontakt: {
      // V1-Read-Model: einfache `email/mobil`-Felder. V1.2-Persona-Block trägt
      // jetzt `kontakt.bundid_email.value` + `kontakt.bundid_mobil.value`;
      // wir leiten die V1-Werte aus dem Bucket-Snapshot (für Self-Edit) und
      // aus der V1.2-Struktur ab (Read-Side).
      email: kontakt.email ?? persona.kontakt?.bundid_email?.value,
      mobil: kontakt.mobil ?? persona.kontakt?.bundid_mobil?.value,
      sprachpraeferenz: kontakt.sprachpraeferenz,
    },
    beschaeftigung_readonly: persona.beschaeftigung
      ? {
          typ: persona.beschaeftigung.typ,
          arbeitgeber: persona.beschaeftigung.arbeitgeber,
          drv_versicherungsnummer: persona.rentenversicherungsnummer,
          krankenversicherung_traeger: persona.krankenversicherung?.traeger,
          kvnr: persona.krankenversicherung?.versichertennummer,
        }
      : undefined,
    religion: {
      wert: religionWert,
      consent: religionConsent,
    },
    sperren,
    iban_speculative: iban,
    // UI-Sicht: nur die jüngsten 50 Einträge (chronologisch absteigend),
    // vollständige Historie liegt im Bucket (max 200 mit FIFO).
    uebermittlungs_log: [...log]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50),
    disclaimer_meta: {
      lese_schicht_i18n_key: 'stammdaten.disclaimer.lese_schicht',
      audit_log_app_internal_i18n_key:
        'stammdaten.disclaimer.audit_log_app_internal',
      eudi_speculative_i18n_key: 'stammdaten.disclaimer.eudi_speculative',
      pilot_phase: 'pilot',
      arf_version: 'v2.0',
    },
  };

  return stammdaten;
}

// ---------------------------------------------------------------------------
// Wallet-Attestation (Mock, V1 minimal-statisch — Hard-Line § 11.18)
// ---------------------------------------------------------------------------

const STATIC_WALLET_ATTESTATIONS: WalletAttestation[] = [
  {
    empfaenger_id: 'berliner-sparkasse',
    name_i18n_key:
      'stammdaten.subtab.wallet_externe_empfaenger.empfaenger.berliner_sparkasse.name',
    kategorie: 'bank',
    zweck_i18n_key:
      'stammdaten.subtab.wallet_externe_empfaenger.empfaenger.berliner_sparkasse.zweck',
  },
  {
    empfaenger_id: 'mock-hausverwaltung',
    name_i18n_key:
      'stammdaten.subtab.wallet_externe_empfaenger.empfaenger.hausverwaltung.name',
    kategorie: 'hausverwaltung',
    zweck_i18n_key:
      'stammdaten.subtab.wallet_externe_empfaenger.empfaenger.hausverwaltung.zweck',
  },
  {
    empfaenger_id: 'vattenfall-strom',
    name_i18n_key:
      'stammdaten.subtab.wallet_externe_empfaenger.empfaenger.vattenfall.name',
    kategorie: 'energieversorger',
    zweck_i18n_key:
      'stammdaten.subtab.wallet_externe_empfaenger.empfaenger.vattenfall.zweck',
  },
];

/**
 * Deterministischer Mock-Attestation-ID-Generator (per Persona × Empfänger).
 * Wir nehmen einen einfachen DJB2-Hash; das reicht für Test-Determinismus
 * ohne Krypto-Abhängigkeit.
 */
function mockAttestationId(personaId: PersonaId, empfaengerId: string): string {
  let h = 5381;
  const s = `${personaId}::${empfaengerId}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `[MOCK] ATT-${hex}-${empfaengerId.slice(0, 6).toUpperCase()}`;
}

function buildWalletPreview(
  persona: Persona,
  empfaengerId: string,
): WalletAttestationPreview {
  // PID-Pflicht (8 Felder gemäß ARF v2.0 PID-Rulebook).
  const pid_pflicht: Record<string, string> = {
    family_name: persona.nachname,
    given_name: persona.vorname,
    birth_date: persona.geburtsdatum,
    age_over_18: 'true',
    nationality: persona.staatsangehoerigkeit,
    issuing_country: 'DE',
    issuance_date: new Date().toISOString().slice(0, 10),
    expiry_date: '2032-12-31',
  };
  // PID-Hilfsattribute (4-aus-6 — Spec § 4.4 Loom-Cut).
  const pid_optional: Record<string, string> = {
    resident_address: `${persona.adresse.strasse} ${persona.adresse.hausnummer}, ${persona.adresse.plz} ${persona.adresse.ort}`,
    resident_postal_code: persona.adresse.plz,
    resident_city: persona.adresse.ort,
    resident_country: persona.adresse.land ?? 'DE',
  };

  return {
    empfaenger_id: empfaengerId,
    pid_pflicht,
    pid_optional,
    mock_attestation_id: mockAttestationId(persona.id, empfaengerId),
    watermark: '[MOCK]',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Public Stammdaten-API. Wird vom Top-Level `api.ts` re-exportiert.
 */
export interface StammdatenApi {
  getStammdaten(personaId: PersonaId): Promise<Stammdaten>;
  getUebermittlungsLog(
    personaId: PersonaId,
    opts?: {
      limit?: number;
      sektion?: StammdatenSektionId;
      kategorie?: UebermittlungsLogEntry['kategorie'];
    },
  ): Promise<UebermittlungsLogEntry[]>;
  appendStammdatenLogEntry(
    personaId: PersonaId,
    entry: Omit<UebermittlungsLogEntry, 'id'> & { id?: string },
  ): Promise<UebermittlungsLogEntry>;
  setReligionSessionConsent(
    personaId: PersonaId,
    consent: boolean,
  ): Promise<{ wert?: string }>;
  toggleAuskunftssperre(
    personaId: PersonaId,
    aktiv: boolean,
    begruendung?: string,
  ): Promise<void>;
  toggleUebermittlungssperre(
    personaId: PersonaId,
    sperreId: StammdatenUebermittlungssperreId,
    aktiv: boolean,
  ): Promise<void>;
  toggleSpeicherungssperre(
    personaId: PersonaId,
    sperreId: StammdatenUebermittlungssperreId,
    aktiv: boolean,
  ): Promise<void>;
  addIbanSpeculative(personaId: PersonaId, iban: string): Promise<void>;
  dismissIbanSpeculative(personaId: PersonaId): Promise<void>;
  simulateIbanPush(
    personaId: PersonaId,
    targets: { familienkasse: boolean; elster: boolean; gkv: boolean },
  ): Promise<void>;
  updateKontakt(
    personaId: PersonaId,
    input: { email?: string; mobil?: string },
  ): Promise<void>;
  updateSprache(personaId: PersonaId, sprache: string): Promise<void>;
  getWalletAttestations(
    personaId: PersonaId,
  ): Promise<WalletAttestation[]>;
  getWalletAttestationPreview(
    personaId: PersonaId,
    attestationId: string,
  ): Promise<WalletAttestationPreview>;
}

const NOW = (): string => new Date().toISOString();

/**
 * Build a fully-shaped log entry from a partial draft. Frontend-friendly
 * helper used by `appendStammdatenLogEntry` and the umzug-autopilot hook.
 *
 * Both `id` and `timestamp` are auto-defaulted; callers may override either.
 */
type LogEntryDraft = Pick<
  UebermittlungsLogEntry,
  'kategorie' | 'zweck_i18n_key' | 'rechtsgrundlage'
> &
  Partial<UebermittlungsLogEntry>;

function makeLogEntry(draft: LogEntryDraft): UebermittlungsLogEntry {
  return {
    id: draft.id ?? `log-${uuid()}`,
    timestamp: draft.timestamp ?? NOW(),
    kategorie: draft.kategorie,
    field_id: draft.field_id,
    sektion: draft.sektion,
    absender_behoerde_id: draft.absender_behoerde_id,
    empfaenger_id: draft.empfaenger_id,
    zweck_i18n_key: draft.zweck_i18n_key,
    rechtsgrundlage: draft.rechtsgrundlage,
    note: draft.note,
  };
}

export const stammdatenApi: StammdatenApi = {
  // ---------------------- Read ----------------------
  getStammdaten: (personaId: PersonaId) =>
    withLatency(() => buildStammdaten(personaId)),

  getUebermittlungsLog: (personaId: PersonaId, opts) =>
    withLatency(() => {
      seedStammdatenForPersona(personaId);
      const log = loadLogBucket()[personaId] ?? [];
      let filtered = [...log];
      if (opts?.kategorie) {
        filtered = filtered.filter((e) => e.kategorie === opts.kategorie);
      }
      if (opts?.sektion) {
        filtered = filtered.filter((e) => e.sektion === opts.sektion);
      }
      filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (opts?.limit !== undefined) {
        filtered = filtered.slice(0, opts.limit);
      }
      return filtered;
    }),

  // ---------------------- Write — Activity-Log ----------------------
  appendStammdatenLogEntry: (personaId: PersonaId, draft) =>
    withLatency<UebermittlungsLogEntry>(
      () => {
        const entry = makeLogEntry(draft);
        appendLogEntry(personaId, entry);
        emit({
          type: 'stammdaten/log-entry-appended',
          persona_id: personaId,
          entry,
        });
        return entry;
      },
      { min: 100, max: 250 },
    ),

  // ---------------------- Write — Religion-Consent (session-only) ----------------------
  setReligionSessionConsent: (personaId: PersonaId, consent: boolean) =>
    withLatency<{ wert?: string }>(
      () => {
        const persona = loadPersonaById(personaId);
        if (consent) {
          const now = NOW();
          writeSessionConsent(personaId, {
            consent_session: true,
            last_shown_at: now,
          });
          // Activity-Log: app_aktivitaet, mit `consent:art_9_lit_a`-Marker.
          const entry = makeLogEntry({
            timestamp: now,
            kategorie: 'app_aktivitaet',
            field_id: 'religionszugehoerigkeit',
            sektion: 'sperren_einstellungen',
            zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_religion_angezeigt',
            rechtsgrundlage: 'Art. 9 Abs. 2 lit. a DSGVO',
            note: `persona_id:${personaId}; field_id:religionszugehoerigkeit; consent:art_9_lit_a; quelle:user_self_view; mock:true`,
          });
          appendLogEntry(personaId, entry);
          emit({
            type: 'stammdaten/religion-consented',
            persona_id: personaId,
            session_only: true,
          });
          emit({
            type: 'stammdaten/log-entry-appended',
            persona_id: personaId,
            entry,
          });
          return { wert: persona.religion };
        }
        writeSessionConsent(personaId, { consent_session: false });
        emit({
          type: 'stammdaten/religion-consent-revoked',
          persona_id: personaId,
        });
        return {};
      },
      { min: 200, max: 400 },
    ),

  // ---------------------- Write — Sperren ----------------------
  toggleAuskunftssperre: (
    personaId: PersonaId,
    aktiv: boolean,
    begruendung?: string,
  ) =>
    withLatency<void>(
      () => {
        if (aktiv) {
          // § 51 Abs. 1 BMG: Begründung Pflicht (Min. 30 Zeichen, Hard-Line § 11.14).
          if (!begruendung || begruendung.trim().length < 30) {
            throw new MockBackendError(
              `Begründung muss mindestens 30 Zeichen umfassen (§ 51 Abs. 1 BMG).`,
              { code: 'BEGRUENDUNG_ZU_KURZ', retryable: false },
            );
          }
        }
        const bucket = loadSperrenBucket();
        const current = bucket[personaId] ?? { ...DEFAULT_SPERREN };
        const next: StammdatenSperren = {
          ...current,
          auskunftssperre_aktiv: aktiv,
          auskunftssperre_begruendung: aktiv ? begruendung : undefined,
        };
        bucket[personaId] = next;
        saveSperrenBucket(bucket);

        const entry = makeLogEntry({
          kategorie: 'app_aktivitaet',
          field_id: 'auskunftssperre',
          sektion: 'sperren_einstellungen',
          zweck_i18n_key: aktiv
            ? 'stammdaten.aktivitaet.zweck.app_sperre_aktiviert'
            : 'stammdaten.aktivitaet.zweck.app_sperre_deaktiviert',
          rechtsgrundlage: '§ 51 Abs. 1 BMG',
          note: `persona_id:${personaId}; field_id:auskunftssperre; quelle:user_self_edit; mock:true`,
        });
        appendLogEntry(personaId, entry);
        emit({
          type: 'stammdaten/sperre-updated',
          persona_id: personaId,
          sperre_typ: 'auskunftssperre',
          aktiv,
        });
        emit({
          type: 'stammdaten/log-entry-appended',
          persona_id: personaId,
          entry,
        });
      },
      { min: 300, max: 600 },
    ),

  toggleUebermittlungssperre: (
    personaId: PersonaId,
    sperreId,
    aktiv: boolean,
  ) =>
    withLatency<void>(
      () => {
        const bucket = loadSperrenBucket();
        const current = bucket[personaId] ?? { ...DEFAULT_SPERREN };
        const set = new Set(current.uebermittlungssperren);
        if (aktiv) set.add(sperreId);
        else set.delete(sperreId);
        bucket[personaId] = {
          ...current,
          uebermittlungssperren: Array.from(set),
        };
        saveSperrenBucket(bucket);

        const entry = makeLogEntry({
          kategorie: 'app_aktivitaet',
          field_id: sperreId,
          sektion: 'sperren_einstellungen',
          zweck_i18n_key: aktiv
            ? 'stammdaten.aktivitaet.zweck.app_sperre_aktiviert'
            : 'stammdaten.aktivitaet.zweck.app_sperre_deaktiviert',
          rechtsgrundlage:
            sperreId === 'religionsgesellschaften_42_3'
              ? '§ 42 Abs. 3 BMG'
              : sperreId === 'adressbuch_verlage_50_5'
                ? '§ 50 Abs. 5 BMG'
                : sperreId === 'wahlwerbung_50_1'
                  ? '§ 50 Abs. 1 BMG'
                  : '§ 42 BMG',
          note: `persona_id:${personaId}; field_id:${sperreId}; quelle:user_self_edit; mock:true`,
        });
        appendLogEntry(personaId, entry);
        emit({
          type: 'stammdaten/sperre-updated',
          persona_id: personaId,
          sperre_typ: sperreId,
          aktiv,
        });
        emit({
          type: 'stammdaten/log-entry-appended',
          persona_id: personaId,
          entry,
        });
      },
      { min: 200, max: 500 },
    ),

  // Spec § 5.1 nennt `toggleSpeicherungssperre` (Synonym zu Übermittlungssperre
  // im Domänen-Sprech). Wir delegieren dorthin, damit das Frontend frei wählen
  // kann.
  toggleSpeicherungssperre: (personaId, sperreId, aktiv) =>
    stammdatenApi.toggleUebermittlungssperre(personaId, sperreId, aktiv),

  // ---------------------- Write — IBAN-Speculative ----------------------
  addIbanSpeculative: (personaId: PersonaId, iban: string) =>
    withLatency<void>(
      () => {
        // Hard-Line § 11.8: jeder IBAN-Wert trägt `[MOCK]`-Watermark.
        const watermarked = iban.startsWith('[MOCK]')
          ? iban
          : `[MOCK] ${iban}`;
        const bucket = loadIbanBucket();
        const current = bucket[personaId] ?? { ...DEFAULT_IBAN };
        bucket[personaId] = { ...current, iban: watermarked };
        saveIbanBucket(bucket);
        emit({
          type: 'stammdaten/iban-speculative-updated',
          persona_id: personaId,
        });
      },
      { min: 200, max: 500 },
    ),

  dismissIbanSpeculative: (personaId: PersonaId) =>
    withLatency<void>(
      () => {
        const bucket = loadIbanBucket();
        bucket[personaId] = { ...DEFAULT_IBAN };
        saveIbanBucket(bucket);
        emit({
          type: 'stammdaten/iban-speculative-updated',
          persona_id: personaId,
        });
      },
      { min: 200, max: 500 },
    ),

  simulateIbanPush: (personaId: PersonaId, targets) =>
    withLatency<void>(
      () => {
        const bucket = loadIbanBucket();
        const current = bucket[personaId] ?? { ...DEFAULT_IBAN };
        bucket[personaId] = {
          ...current,
          consented_pushes: { ...current.consented_pushes, ...targets },
        };
        saveIbanBucket(bucket);

        // Pro aktiver Push-Target: ein speculative_2027-Log-Eintrag.
        const activeTargets = (
          ['familienkasse', 'elster', 'gkv'] as const
        ).filter((t) => targets[t]);
        for (const t of activeTargets) {
          const entry = makeLogEntry({
            kategorie: 'speculative_2027',
            field_id: 'iban_speculative',
            sektion: 'sperren_einstellungen',
            empfaenger_id: t,
            zweck_i18n_key: 'stammdaten.aktivitaet.zweck.spec_iban_push_simuliert',
            rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO (2027-Vision)',
            note: `persona_id:${personaId}; field_id:iban_speculative; quelle:user_self_edit; mock:true`,
          });
          appendLogEntry(personaId, entry);
          emit({
            type: 'stammdaten/log-entry-appended',
            persona_id: personaId,
            entry,
          });
        }
        emit({
          type: 'stammdaten/iban-push-simulated',
          persona_id: personaId,
          targets: activeTargets,
        });
      },
      { min: 400, max: 800 },
    ),

  // ---------------------- Write — Kontakt / Sprache ----------------------
  updateKontakt: (personaId: PersonaId, input) =>
    withLatency<void>(
      () => {
        const bucket = loadKontaktBucket();
        const current = bucket[personaId] ?? { sprachpraeferenz: 'de' };
        const fields: Array<'email' | 'mobil'> = [];
        if (input.email !== undefined) {
          current.email = input.email;
          fields.push('email');
        }
        if (input.mobil !== undefined) {
          current.mobil = input.mobil;
          fields.push('mobil');
        }
        bucket[personaId] = current;
        saveKontaktBucket(bucket);

        const entry = makeLogEntry({
          kategorie: 'app_aktivitaet',
          field_id: 'kontakt',
          sektion: 'identitaet',
          zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_kontakt_geaendert',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO (Vertrag App-Nutzung)',
          note: `persona_id:${personaId}; field_id:kontakt; quelle:user_self_edit; mock:true`,
        });
        appendLogEntry(personaId, entry);
        emit({
          type: 'stammdaten/kontakt-updated',
          persona_id: personaId,
          fields,
        });
        emit({
          type: 'stammdaten/log-entry-appended',
          persona_id: personaId,
          entry,
        });
      },
      { min: 200, max: 500 },
    ),

  updateSprache: (personaId: PersonaId, sprache: string) =>
    withLatency<void>(
      () => {
        const bucket = loadKontaktBucket();
        const current = bucket[personaId] ?? { sprachpraeferenz: 'de' };
        current.sprachpraeferenz = sprache;
        bucket[personaId] = current;
        saveKontaktBucket(bucket);

        const entry = makeLogEntry({
          kategorie: 'app_aktivitaet',
          field_id: 'sprachpraeferenz',
          sektion: 'identitaet',
          zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_sprache_geaendert',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO (Vertrag App-Nutzung)',
          note: `persona_id:${personaId}; field_id:sprachpraeferenz; quelle:user_self_edit; mock:true`,
        });
        appendLogEntry(personaId, entry);
        emit({
          type: 'stammdaten/sprache-updated',
          persona_id: personaId,
          sprache,
        });
        emit({
          type: 'stammdaten/log-entry-appended',
          persona_id: personaId,
          entry,
        });
      },
      { min: 200, max: 400 },
    ),

  // ---------------------- Wallet (Mock-Preview) ----------------------
  getWalletAttestations: () =>
    withLatency<WalletAttestation[]>(
      () => [...STATIC_WALLET_ATTESTATIONS],
      { min: 200, max: 500 },
    ),

  getWalletAttestationPreview: (
    personaId: PersonaId,
    attestationId: string,
  ) =>
    withLatency<WalletAttestationPreview>(
      () => {
        const known = STATIC_WALLET_ATTESTATIONS.find(
          (a) => a.empfaenger_id === attestationId,
        );
        if (!known) {
          throw new MockBackendError(
            `Wallet-Empfänger "${attestationId}" nicht gefunden.`,
            { code: 'WALLET_EMPFAENGER_NOT_FOUND', retryable: false },
          );
        }
        const persona = loadPersonaById(personaId);
        const preview = buildWalletPreview(persona, attestationId);
        // Activity-Log-Eintrag (speculative_2027).
        const entry = makeLogEntry({
          kategorie: 'speculative_2027',
          field_id: 'wallet_attestation',
          sektion: 'sperren_einstellungen',
          empfaenger_id: attestationId,
          zweck_i18n_key:
            'stammdaten.aktivitaet.zweck.spec_wallet_attestation_preview',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO (2027-Vision)',
          note: `persona_id:${personaId}; field_id:wallet_attestation; quelle:wallet_preview; mock:true`,
        });
        appendLogEntry(personaId, entry);
        emit({
          type: 'stammdaten/wallet-attestation-previewed',
          persona_id: personaId,
          empfaenger_id: attestationId,
        });
        emit({
          type: 'stammdaten/log-entry-appended',
          persona_id: personaId,
          entry,
        });
        return preview;
      },
      { min: 400, max: 800 },
    ),
};
