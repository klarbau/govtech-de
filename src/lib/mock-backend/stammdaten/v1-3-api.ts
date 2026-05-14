/**
 * V1.3 Stammdaten — Mobilität API-Implementation.
 *
 * Spec: `docs/specs/stammdaten-v1-3-mobilitaet.md` § 6.
 * Hard-Lines § 11.1–§ 11.14 (verifier-locked).
 *
 *   getMobilitaet(personaId)
 *   getPunktestandOnDemand(personaId)
 *   getMdlAttestation(personaId)
 *   getUmzugVorgaengeFinished(personaId)
 *   setHalterAdresseUebergangsMarker(personaId, vorgangId)  // internal, autopilot-callable
 *
 * Latenz: alle Methoden laufen durch `withLatency()` (300–800 ms + 5 % Fehler).
 *
 * Critical invariants:
 *   - HL-MOB-11 / VL-4 / VL-8: `getPunktestandOnDemand`-Result wird **niemals**
 *     in `localStorage` geschrieben. Activity-Log bekommt einen Eintrag pro
 *     erfolgreichem Pull.
 *   - HL-MOB-10: keine Mutation von `fe_nr` / `fin_voll` / `kennzeichen` über
 *     die API; sämtliche Lese-Pfade liefern die Seed-Werte unverändert.
 */
import type {
  Letter,
  MdlAttestationMock,
  Mobilitaet,
  Persona,
  PersonaId,
  PunktestandPullResult,
  UebermittlungsLogEntry,
  Vorgang,
} from '@/types';
import { MockBackendError } from '../errors';
import { emit } from '../events';
import { uuid } from '../id';
import { withLatency } from '../latency';
import {
  PUNKTE_MOCK,
  PUNKTE_STICHTAG_MOCK,
  SEED_MOBILITAET,
} from '../mobilitaet/seed-mobilitaet';
import {
  read,
  readOrInit,
  write,
  type CollectionKey,
} from '../persistence';
import {
  behoerdenArraySchema,
  lettersArraySchema,
  personasArraySchema,
  stammdatenMobilitaetBucketSchema,
  vorgaengeArraySchema,
} from '../schemas';
import { stripPunkteField } from '../persistence-migrations';
import { appendLogEntry } from './api';

// ---------------------------------------------------------------------------
// Mobilität-Bucket
// ---------------------------------------------------------------------------

function loadMobilitaetBucket(): Record<PersonaId, Mobilitaet> {
  const existing = read(
    'stammdaten:mobilitaet' as CollectionKey,
    stammdatenMobilitaetBucketSchema,
  );
  if (existing) return existing as Record<PersonaId, Mobilitaet>;
  // Default-Init aus Seed.
  const seeded: Record<PersonaId, Mobilitaet> = JSON.parse(
    JSON.stringify(SEED_MOBILITAET),
  ) as Record<PersonaId, Mobilitaet>;
  write('stammdaten:mobilitaet' as CollectionKey, seeded);
  return seeded;
}

function saveMobilitaetBucket(bucket: Record<PersonaId, Mobilitaet>): void {
  write('stammdaten:mobilitaet' as CollectionKey, bucket);
}

// ---------------------------------------------------------------------------
// Persona-/Vorgang-Lookup
// ---------------------------------------------------------------------------

function loadPersonaById(personaId: PersonaId): Persona | undefined {
  const personas = readOrInit<Persona[]>(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    [] as Persona[],
  );
  return personas.find((p) => p.id === personaId);
}

function loadVorgaenge(): Vorgang[] {
  return readOrInit<Vorgang[]>(
    'vorgaenge' as CollectionKey,
    vorgaengeArraySchema as unknown as import('zod').ZodType<Vorgang[]>,
    [] as Vorgang[],
  );
}

// ---------------------------------------------------------------------------
// FAER-Aktenzeichen-Generator (für Punktestand-Result)
// ---------------------------------------------------------------------------

function buildFaerAktenzeichen(now: Date): string {
  const yyyy = now.getUTCFullYear();
  const seq = Math.floor(Math.random() * 9_999_999)
    .toString()
    .padStart(7, '0');
  return `[MOCK] FAER-AK-${yyyy}-${seq}`;
}

const NOW = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export interface UmzugVorgangSummary {
  vorgang_id: string;
  abgeschlossen_am?: string;
  /** Wahr, wenn ein Block-D-Schritt mit `kfz-*`-Behörde im Vorgang lief. */
  hat_block_d_kfz_schritt: boolean;
}

export interface StammdatenV13Api {
  /**
   * Liefert den V1.3-Mobilität-Snapshot der Persona oder `null` (Empty-State).
   * `null`-Fall: Sub-Personas (Lena Schmidt) ohne eigenen Bucket-Eintrag.
   *
   * Defensive-Guard (VL-4): bei Read prüft die Implementation, dass kein
   * `punkte`-Excess-Key im Result steht; falls doch (sollte nicht passieren),
   * wird er entfernt und ein `console.warn` emittiert.
   */
  getMobilitaet(personaId: PersonaId): Promise<Mobilitaet | null>;

  /**
   * On-demand-Pull aus dem Fahreignungsregister (Mock). Liefert immer einen
   * fresh Result mit `ttl_seconds === 300`; Result wird **niemals** in
   * `localStorage` geschrieben (HL-MOB-11 / VL-8).
   *
   * Side-effect: 1 Activity-Log-Eintrag der Kategorie `app_aktivitaet` mit
   * Note `kfz_faer_punkte_pulled`, Rechtsgrundlage `§ 30 Abs. 8 StVG i.V.m.
   * § 30a StVG`. Bei Mock-Error (5 %) wird kein Log-Eintrag erzeugt.
   *
   * Wirft `MockBackendError('PUNKTESTAND_KEINE_FAHRERLAUBNIS')`, wenn die
   * Persona keinen FE-Eintrag hat.
   */
  getPunktestandOnDemand(personaId: PersonaId): Promise<PunktestandPullResult>;

  /**
   * Liefert den Mock-Status der mDL-Attestation einer Persona. In V1.3 für
   * alle 3 Personas `status: 'not_issued'` mit Preview-Data aus der
   * Fahrerlaubnis. Wirft `MockBackendError('MOBILITAET_NOT_FOUND')`, wenn
   * der Mobilität-Block fehlt.
   */
  getMdlAttestation(personaId: PersonaId): Promise<MdlAttestationMock | null>;

  /**
   * Hilfs-Read für `<HalterAdresseFieldCard>`. Liefert die abgeschlossenen
   * Umzug-Vorgänge dieser Persona, die einen Block-D-KFZ-Schritt hatten
   * (Detection: irgendein `schritt.behoerde_id` startet mit `'kfz-'` ODER
   * `'kfz_'`).
   */
  getUmzugVorgaengeFinished(
    personaId: PersonaId,
  ): Promise<UmzugVorgangSummary[]>;

  /**
   * Internal: setzt den Übergangs-Marker auf `mobilitaet.halter_adresse.
   * uebergangs_marker_via_umzug = true` mit Timestamp + Vorgang-Ref.
   * Idempotent (zweiter Aufruf für denselben Vorgang = no-op).
   *
   * Aufgerufen aus dem Umzug-Autopilot nach erfolgreicher Block-D-eID-
   * Bestätigung für eine KFZ-Behörde (Spec § 9.3).
   */
  setHalterAdresseUebergangsMarker(
    personaId: PersonaId,
    vorgangId: string,
  ): Promise<void>;
}

export const stammdatenV13Api: StammdatenV13Api = {
  getMobilitaet: (personaId: PersonaId) =>
    withLatency<Mobilitaet | null>(
      () => {
        const bucket = loadMobilitaetBucket();
        const mob = bucket[personaId];
        if (!mob) return null;
        // Defensive `punkte`-Strip (HL-MOB-11 / VL-4).
        const stripped = stripPunkteField(JSON.parse(JSON.stringify(mob)) as Mobilitaet);
        return stripped ?? null;
      },
      { min: 200, max: 500 },
    ),

  getPunktestandOnDemand: (personaId: PersonaId) =>
    withLatency<PunktestandPullResult>(
      () => {
        const bucket = loadMobilitaetBucket();
        const mob = bucket[personaId];
        if (!mob || !mob.fahrerlaubnis) {
          throw new MockBackendError(
            'Punktestand-Abruf nicht möglich — keine Fahrerlaubnis im Profil hinterlegt.',
            { code: 'PUNKTESTAND_KEINE_FAHRERLAUBNIS', retryable: false },
          );
        }
        const punkteValue = PUNKTE_MOCK[personaId];
        if (punkteValue === undefined) {
          throw new MockBackendError(
            `Persona "${personaId}" hat keinen FAER-Mock-Wert.`,
            { code: 'PUNKTESTAND_PERSONA_UNKNOWN', retryable: false },
          );
        }
        const now = new Date();
        const aktenzeichen = buildFaerAktenzeichen(now);
        const stichtag = PUNKTE_STICHTAG_MOCK[personaId] ?? now.toISOString().slice(0, 10);
        const result: PunktestandPullResult = {
          punkte: punkteValue,
          abgerufen_am: now.toISOString(),
          ttl_seconds: 300,
          stichtag,
          aktenzeichen,
        };

        // Activity-Log (Kategorie `app_aktivitaet`; VL-8 / HL-MOB-11).
        const logEntry: UebermittlungsLogEntry = {
          id: `log-${uuid()}`,
          timestamp: result.abgerufen_am,
          kategorie: 'app_aktivitaet',
          field_id: 'faer_punkte',
          zweck_i18n_key: 'stammdaten.aktivitaet.note.kfz_faer_punkte_pulled',
          rechtsgrundlage: '§ 30 Abs. 8 StVG i.V.m. § 30a StVG',
          note: `persona_id:${personaId}; field_id:faer_punkte; quelle:user_punkte_reveal; mock:true; result:${result.punkte}; aktenzeichen:${result.aktenzeichen}; ttl_seconds:300`,
        };
        try {
          appendLogEntry(personaId, logEntry);
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.warn('[v1-3-api] punktestand log emit failed', err);
          }
        }

        emit({
          type: 'stammdaten/mobilitaet-punkte-pulled',
          persona_id: personaId,
          punkte: result.punkte,
          aktenzeichen: result.aktenzeichen,
        });

        return result;
      },
      { min: 600, max: 1200 },
    ),

  getMdlAttestation: (personaId: PersonaId) =>
    withLatency<MdlAttestationMock | null>(
      () => {
        const bucket = loadMobilitaetBucket();
        const mob = bucket[personaId];
        if (!mob) return null;
        // Default: not_issued. Preview-Data aus der Fahrerlaubnis falls vorhanden.
        const persona = loadPersonaById(personaId);
        if (!mob.fahrerlaubnis || !persona) {
          return { status: 'not_issued' };
        }
        // FE-Behörde-Name für `issuing_authority`.
        const behoerden = readOrInit(
          'behoerden' as CollectionKey,
          behoerdenArraySchema,
          [],
        );
        const behoerde = behoerden.find(
          (b) => b.id === mob.fahrerlaubnis!.fe_behoerde_id,
        );
        const issuingAuthority =
          behoerde?.name_de ?? mob.fahrerlaubnis.fe_behoerde_id;

        // Ausstellungs- und Ablauf-Datum aus Ausstellungsdatum + 15 Jahre
        // (§ 6 Abs. 7 FeV EU-konforme Karten-Laufzeit).
        const issueDate = mob.fahrerlaubnis.ausstellungsdatum;
        const issueDateObj = new Date(issueDate);
        const expiryDateObj = new Date(issueDateObj);
        expiryDateObj.setUTCFullYear(issueDateObj.getUTCFullYear() + 15);
        const expiryDate = expiryDateObj.toISOString().slice(0, 10);

        return {
          status: 'not_issued',
          preview_data: {
            given_name: persona.vorname,
            family_name: persona.nachname,
            birth_date: persona.geburtsdatum,
            driving_privileges: mob.fahrerlaubnis.klassen.map((k) => ({
              klasse: k.klasse,
              erteilt_am: k.erteilt_am,
              gueltig_bis: k.gueltig_bis,
              schluesselzahlen: k.schluesselzahlen,
            })),
            issuing_authority: issuingAuthority,
            issuing_country: 'DE',
            document_number: mob.fahrerlaubnis.fe_nr,
            issue_date: issueDate,
            expiry_date: expiryDate,
          },
        };
      },
      { min: 200, max: 500 },
    ),

  getUmzugVorgaengeFinished: (personaId: PersonaId) =>
    withLatency<UmzugVorgangSummary[]>(
      () => {
        const vorgaenge = loadVorgaenge();
        const out: UmzugVorgangSummary[] = [];
        for (const v of vorgaenge) {
          if (v.persona_id !== personaId) continue;
          if (v.typ !== 'umzug') continue;
          if (v.status !== 'abgeschlossen' && v.status !== 'genehmigt') continue;
          const hatBlockDKfz = v.schritte.some(
            (s) =>
              s.block === 'D' &&
              s.status === 'confirmed' &&
              (s.behoerde_id.startsWith('kfz-') ||
                s.behoerde_id.startsWith('kfz_')),
          );
          out.push({
            vorgang_id: v.id,
            abgeschlossen_am: v.abgeschlossen_am,
            hat_block_d_kfz_schritt: hatBlockDKfz,
          });
        }
        return out;
      },
      { min: 200, max: 400 },
    ),

  setHalterAdresseUebergangsMarker: (personaId: PersonaId, vorgangId: string) =>
    withLatency<void>(
      () => {
        const bucket = loadMobilitaetBucket();
        const mob = bucket[personaId];
        if (!mob || !mob.halter_adresse) {
          // Defensiv: keine Halter-Adresse → no-op + warn.
          if (typeof console !== 'undefined') {
            console.warn(
              `[v1-3-api] setHalterAdresseUebergangsMarker: no halter_adresse for persona "${personaId}".`,
            );
          }
          return;
        }
        // Idempotenz: bereits gesetzt mit derselben Vorgang-Ref?
        if (
          mob.halter_adresse.uebergangs_marker_via_umzug === true &&
          mob.halter_adresse.via_umzug_vorgang_id === vorgangId
        ) {
          return;
        }
        mob.halter_adresse.uebergangs_marker_via_umzug = true;
        mob.halter_adresse.uebergangs_marker_seit = NOW();
        mob.halter_adresse.via_umzug_vorgang_id = vorgangId;
        saveMobilitaetBucket(bucket);

        emit({
          type: 'stammdaten/mobilitaet-halter-adresse-marker-set',
          persona_id: personaId,
          vorgang_id: vorgangId,
        });
      },
      { min: 100, max: 250 },
    ),
};

// ---------------------------------------------------------------------------
// Letter-Lookup-Helfer für Tests (re-export)
// ---------------------------------------------------------------------------

/** Re-Export der Letters-Fixture-Lese-Funktion für V1.3-Tests. */
export function loadLettersForTests(): Letter[] {
  return readOrInit<Letter[]>(
    'letters' as CollectionKey,
    lettersArraySchema as unknown as import('zod').ZodType<Letter[]>,
    [] as Letter[],
  );
}
