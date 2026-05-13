/**
 * V1.1 Stammdaten — Renten/KV API-Implementation.
 *
 * Spec: `docs/specs/stammdaten-v1-1-renten-kv.md` § 5.1.
 * Hard-Lines § 11.21–§ 11.30 (Verifier-Locked).
 *
 * Diese Datei kapselt alle V1.1-Lese-/Schreib-Pfade hinter den fünf neuen
 * API-Methoden. `api.ts` re-exportiert sie nur durch (Delegate-Pattern wie V1).
 *
 *   getAltersvorsorge(personaId)
 *   getKrankenversicherungPflege(personaId)
 *   applyYellowLetterBridge(args)
 *   consentPflegegrad(personaId, consent)
 *   revokePflegegradConsent(personaId)
 *   getEpaStatus(personaId)
 *
 * Pflegegrad-Consent: sessionStorage-only (Hard-Line § 11.22) — kein
 * localStorage-Bucket. Pattern erbt von V1-Religion-Consent (§ 11.4).
 */
import type {
  EpaStatus,
  FamilienversicherteEintrag,
  Letter,
  Persona,
  PersonaId,
  PflegegradConsent,
  Stammdaten,
  YellowLetterBridgeResult,
} from '@/types';
import { applyYellowLetterBridgeImpl, readEckdatenForPersona } from '../autopilot/posteingang-renten-bridge';
import { MockBackendError } from '../errors';
import { emit } from '../events';
import { uuid } from '../id';
import { withLatency } from '../latency';
import { readOrInit, type CollectionKey } from '../persistence';
import {
  lettersArraySchema,
  personasArraySchema,
} from '../schemas';
import { appendLogEntry } from './api';

// ---------------------------------------------------------------------------
// Pflegegrad-Consent — sessionStorage-only (Hard-Line § 11.22)
// ---------------------------------------------------------------------------

/**
 * Eigener Storage-Key (separat zu Religion-V1 § 11.4).
 * **Niemals** in localStorage. Nie ohne `consent-session`-Suffix.
 */
const PFLEGEGRAD_SESSION_KEY =
  'govtech-de:v1:stammdaten:pflegegrad-consent-session';
const inMemoryPflegegradConsent = new Map<PersonaId, PflegegradConsent>();

function readPflegegradConsent(personaId: PersonaId): PflegegradConsent {
  const ss =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { sessionStorage?: Storage }).sessionStorage !== 'undefined'
      ? (globalThis as { sessionStorage: Storage }).sessionStorage
      : undefined;
  if (!ss) {
    return inMemoryPflegegradConsent.get(personaId) ?? { consent_session: false };
  }
  try {
    const raw = ss.getItem(PFLEGEGRAD_SESSION_KEY);
    if (!raw) return { consent_session: false };
    const parsed = JSON.parse(raw) as Record<PersonaId, PflegegradConsent>;
    return parsed[personaId] ?? { consent_session: false };
  } catch {
    return { consent_session: false };
  }
}

function writePflegegradConsent(
  personaId: PersonaId,
  value: PflegegradConsent,
): void {
  const ss =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { sessionStorage?: Storage }).sessionStorage !== 'undefined'
      ? (globalThis as { sessionStorage: Storage }).sessionStorage
      : undefined;
  if (!ss) {
    inMemoryPflegegradConsent.set(personaId, value);
    return;
  }
  try {
    const raw = ss.getItem(PFLEGEGRAD_SESSION_KEY);
    const parsed: Record<PersonaId, PflegegradConsent> = raw
      ? JSON.parse(raw)
      : {};
    parsed[personaId] = value;
    ss.setItem(PFLEGEGRAD_SESSION_KEY, JSON.stringify(parsed));
  } catch {
    inMemoryPflegegradConsent.set(personaId, value);
  }
}

/** Test-only Reset (für vitest `beforeEach`). */
export function _resetPflegegradConsentForTests(): void {
  inMemoryPflegegradConsent.clear();
  const ss =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { sessionStorage?: Storage }).sessionStorage !== 'undefined'
      ? (globalThis as { sessionStorage: Storage }).sessionStorage
      : undefined;
  if (ss) {
    try {
      ss.removeItem(PFLEGEGRAD_SESSION_KEY);
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Persona-Lookup
// ---------------------------------------------------------------------------

function loadPersonaById(personaId: PersonaId): Persona {
  const personas = readOrInit<Persona[]>(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    [] as Persona[],
  );
  const persona = personas.find((p) => p.id === personaId);
  if (!persona) {
    throw new MockBackendError(`Persona "${personaId}" nicht gefunden.`, {
      code: 'PERSONA_NOT_FOUND',
      retryable: false,
    });
  }
  return persona;
}

function loadLetterById(letterId: string): Letter | undefined {
  const letters = readOrInit<Letter[]>(
    'letters' as CollectionKey,
    lettersArraySchema as unknown as import('zod').ZodType<Letter[]>,
    [] as Letter[],
  ) as Letter[];
  return letters.find((l) => l.id === letterId);
}

// ---------------------------------------------------------------------------
// Track-Resolution (Persona → Renten-Track)
// ---------------------------------------------------------------------------

function resolveRentenTrack(persona: Persona): 'A' | 'B' | 'C' {
  if (persona.renten_track) return persona.renten_track;
  if (persona.versorgungswerk_v1_1) return 'B';
  return 'A';
}

// ---------------------------------------------------------------------------
// Familienversicherten-Liste pro Persona (aus persona.familie + V1.1-Markern)
// ---------------------------------------------------------------------------

function buildFamilienversicherteListe(
  persona: Persona,
): FamilienversicherteEintrag[] {
  const out: FamilienversicherteEintrag[] = [];
  const partner = persona.familie?.partner;
  if (partner && partner.familienversichert_ueber === persona.id) {
    out.push({
      persona_id: partner.id,
      vorname: partner.vorname,
      nachname: partner.nachname,
      familienversichert_bis:
        partner.familienversichert_bis ?? '',
      art: 'partner',
    });
  }
  for (const kind of persona.familie?.kinder ?? []) {
    if (kind.familienversichert_ueber === persona.id) {
      out.push({
        persona_id: kind.id,
        vorname: kind.vorname,
        nachname: kind.nachname,
        familienversichert_bis: kind.familienversichert_bis ?? '',
        art: 'kind',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Behoerde-ID-Defaults (statisches Mapping pro Krankenkasse → Pflegekasse)
// ---------------------------------------------------------------------------

const KASSE_TO_PFLEGEKASSE: Record<string, { id: string; name: string }> = {
  'AOK Nordost': { id: 'aok-nordost-pflegekasse', name: 'AOK Nordost — Pflegekasse' },
  'Techniker Krankenkasse': { id: 'tk-pflegekasse', name: 'TK-Pflegekasse' },
  'Barmer': { id: 'barmer-pflegekasse', name: 'Barmer Pflegekasse' },
};

const KASSE_NAME_TO_BEHOERDE_ID: Record<string, string> = {
  'AOK Nordost': 'aok-nordost',
  'Techniker Krankenkasse': 'tk-hamburg',
  'Barmer': 'barmer-koeln',
};

const PERSONA_TO_DRV: Record<PersonaId, string | undefined> = {
  'anna-petrov': 'drv-berlin-brandenburg',
  'markus-schmidt': 'drv-nord',
  'mehmet-yildiz': 'drv-rheinland',
};

// ---------------------------------------------------------------------------
// Builder — Altersvorsorge & KV-Pflege
// ---------------------------------------------------------------------------

function buildAltersvorsorge(
  persona: Persona,
): NonNullable<Stammdaten['altersvorsorge']> {
  const track = resolveRentenTrack(persona);
  const eckdatenFromBucket = readEckdatenForPersona(
    persona.id,
    persona.renten_eckdaten_v1_1,
  );
  return {
    track,
    drv_traeger_id:
      track === 'A' ? PERSONA_TO_DRV[persona.id] ?? undefined : undefined,
    versorgungswerk:
      track === 'B' ? persona.versorgungswerk_v1_1 : undefined,
    eckdaten: track === 'A' ? eckdatenFromBucket : undefined,
    yellow_letter_id: eckdatenFromBucket?.quelle_letter_id,
  };
}

function buildKrankenversicherungPflege(
  persona: Persona,
): NonNullable<Stammdaten['krankenversicherung_pflege']> {
  const kasseName = persona.krankenversicherung?.traeger ?? 'Unbekannte Kasse';
  const kasseBehoerdeId = KASSE_NAME_TO_BEHOERDE_ID[kasseName] ?? 'unknown-kasse';
  const pflegekasse = KASSE_TO_PFLEGEKASSE[kasseName] ?? {
    id: 'unknown-pflegekasse',
    name: `${kasseName} — Pflegekasse`,
  };

  const versichertenStatus: 'pflicht' | 'freiwillig' | 'familienversichert' | 'privat' =
    persona.krankenversicherung?.typ === 'pkv'
      ? 'privat'
      : persona.familienversichert_ueber
        ? 'familienversichert'
        : persona.beschaeftigung?.typ === 'selbstaendig'
          ? 'freiwillig'
          : 'pflicht';

  const epaStatus: EpaStatus =
    persona.epa_status_v1_1 ?? {
      eingerichtet: true,
      widerspruch_gesetzt: false,
      eingerichtet_am: '2025-01-15',
    };

  const consent = readPflegegradConsent(persona.id);
  // REVISE-Wave 2026-05-10: separater Existenz-Marker (Frontend-Modal-Pfad-Fix).
  // `pflegegrad_exists` ist independant vom Session-Consent; Frontend nutzt es,
  // um den Reveal-Button (Modal-Trigger) zu rendern. Ohne diesen Flag konnte
  // der User ohne pre-existing Consent niemals den Pflegegrad-Modal öffnen
  // (a11y-tester + code-reviewer-Befund).
  const pflegegradExists = !!persona.pflegegrad_v1_1;
  // Hard-Line § 11.22: Pflegegrad-OBJECT nur sichtbar bei consent_session === true.
  const pflegegradVisible =
    consent.consent_session && persona.pflegegrad_v1_1
      ? persona.pflegegrad_v1_1
      : undefined;
  // Hard-Line § 11.30: Anrechnungszeit Pflege gekoppelt an denselben Toggle.
  const anrechnungszeitVisible =
    consent.consent_session && persona.anrechnungszeit_pflege_v1_1
      ? persona.anrechnungszeit_pflege_v1_1
      : undefined;

  return {
    krankenkasse: { id: kasseBehoerdeId, name: kasseName },
    kvnr_v1_1: persona.kvnr_v1_1,
    versicherten_status: versichertenStatus,
    familienversichert_ueber: persona.familienversichert_ueber,
    familienversichert_bis: persona.familienversichert_bis,
    familienversicherte_personen: buildFamilienversicherteListe(persona),
    epa_status: epaStatus,
    erezept_modus: persona.erezept_modus_v1_1 ?? 'app',
    pflegekasse,
    pflegegrad_exists: pflegegradExists,
    pflegegrad: pflegegradVisible,
    pflegegrad_consent: consent,
    anrechnungszeit_pflege: anrechnungszeitVisible,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StammdatenV11Api {
  /**
   * Liefert Altersvorsorge-Sektion für eine Persona. Track A: ggf. mit
   * Eckdaten aus Bridge. Track C: `eckdaten === undefined` (Empty-State,
   * Hard-Line § 11.24 Mehmet-Default).
   */
  getAltersvorsorge(
    personaId: PersonaId,
  ): Promise<NonNullable<Stammdaten['altersvorsorge']> | null>;

  /** Liefert Krankenversicherung-&-Pflege-Sektion. */
  getKrankenversicherungPflege(
    personaId: PersonaId,
  ): Promise<NonNullable<Stammdaten['krankenversicherung_pflege']> | null>;

  /**
   * Yellow-Letter-Bridge. Hard-Line § 11.25 Idempotenz: bei wiederholtem
   * Aufruf mit gleichem `letter_id` returns `{ applied: false }` und emittiert
   * `stammdaten/yellow-letter-bridge-skipped-idempotent` ohne Activity-Log-
   * Eintrag.
   */
  applyYellowLetterBridge(args: {
    letter_id: string;
    persona_id: PersonaId;
  }): Promise<YellowLetterBridgeResult>;

  /**
   * Pflegegrad-Consent (session-only — Hard-Line § 11.22). Bei `consent === true`
   * wird ein Activity-Log-Eintrag mit `Art. 9 Abs. 2 lit. a DSGVO i.V.m. § 14
   * SGB XI` geschrieben; bei `false` revoke ohne Log.
   */
  consentPflegegrad(personaId: PersonaId, consent: boolean): Promise<void>;

  /** Revoke (= Hard-Reset) Pflegegrad-Session-Consent. */
  revokePflegegradConsent(personaId: PersonaId): Promise<void>;

  /**
   * Liefert nur den ePA-Status (Disclaimer-Banner-Trigger). Schreibt einen
   * `epa-banner-seen`-Activity-Log-Eintrag (max 1× pro Aufruf — Frontend
   * dedup'd per Page-Load). Hard-Line § 11.26 zwei-Norm-Zitat.
   */
  getEpaStatus(personaId: PersonaId): Promise<EpaStatus>;
}

export const stammdatenV11Api: StammdatenV11Api = {
  getAltersvorsorge: (personaId: PersonaId) =>
    withLatency(() => {
      const persona = loadPersonaById(personaId);
      const result = buildAltersvorsorge(persona);
      // Track C: explizit null-eckdaten signalisieren — Frontend rendert
      // `<TrackCEmptyStateCard>` (Hard-Line § 11.24).
      if (result.track === 'C') {
        return { ...result, eckdaten: undefined, yellow_letter_id: undefined };
      }
      return result;
    }),

  getKrankenversicherungPflege: (personaId: PersonaId) =>
    withLatency(() => {
      const persona = loadPersonaById(personaId);
      return buildKrankenversicherungPflege(persona);
    }),

  applyYellowLetterBridge: (args) =>
    withLatency<YellowLetterBridgeResult>(
      () => {
        const letter = loadLetterById(args.letter_id);
        if (!letter) {
          throw new MockBackendError(
            `Letter "${args.letter_id}" nicht gefunden.`,
            { code: 'LETTER_NOT_FOUND', retryable: false },
          );
        }
        // Persona muss existieren (für Idempotenz-Bucket).
        loadPersonaById(args.persona_id);
        return applyYellowLetterBridgeImpl({
          letterId: args.letter_id,
          personaId: args.persona_id,
          letter,
        });
      },
      { min: 400, max: 800 },
    ),

  consentPflegegrad: (personaId: PersonaId, consent: boolean) =>
    withLatency<void>(
      () => {
        // Persona-Existenz validieren (NotFound surface).
        loadPersonaById(personaId);
        if (consent) {
          const now = new Date().toISOString();
          writePflegegradConsent(personaId, {
            consent_session: true,
            last_shown_at: now,
          });
          appendLogEntry(personaId, {
            id: `log-${uuid()}`,
            timestamp: now,
            kategorie: 'app_aktivitaet',
            field_id: 'pflegegrad',
            sektion: 'krankenversicherung_pflege',
            zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_pflegegrad_angezeigt',
            rechtsgrundlage: 'Art. 9 Abs. 2 lit. a DSGVO i.V.m. § 14 SGB XI',
            note: `persona_id:${personaId}; field_id:pflegegrad; consent:art_9_lit_a; quelle:user_pflegegrad_reveal; mock:true`,
          });
          emit({
            type: 'stammdaten/pflegegrad-consented',
            persona_id: personaId,
            session_only: true,
          });
        } else {
          writePflegegradConsent(personaId, { consent_session: false });
          emit({
            type: 'stammdaten/pflegegrad-consent-revoked',
            persona_id: personaId,
          });
        }
      },
      { min: 200, max: 400 },
    ),

  revokePflegegradConsent: (personaId: PersonaId) =>
    withLatency<void>(
      () => {
        writePflegegradConsent(personaId, { consent_session: false });
        emit({
          type: 'stammdaten/pflegegrad-consent-revoked',
          persona_id: personaId,
        });
      },
      { min: 150, max: 300 },
    ),

  getEpaStatus: (personaId: PersonaId) =>
    withLatency<EpaStatus>(
      () => {
        const persona = loadPersonaById(personaId);
        const status: EpaStatus =
          persona.epa_status_v1_1 ?? {
            eingerichtet: true,
            widerspruch_gesetzt: false,
            eingerichtet_am: '2025-01-15',
          };
        // Activity-Log: ePA-Banner gesehen (Hard-Line § 11.26 zwei-Norm-Zitat).
        appendLogEntry(personaId, {
          id: `log-${uuid()}`,
          timestamp: new Date().toISOString(),
          kategorie: 'app_aktivitaet',
          field_id: 'epa_status',
          sektion: 'krankenversicherung_pflege',
          zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_epa_banner_gesehen',
          rechtsgrundlage: '§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V',
          note: `persona_id:${personaId}; field_id:epa_status; quelle:section_render; mock:true`,
        });
        emit({ type: 'stammdaten/epa-banner-seen', persona_id: personaId });
        return status;
      },
      { min: 200, max: 400 },
    ),
};

