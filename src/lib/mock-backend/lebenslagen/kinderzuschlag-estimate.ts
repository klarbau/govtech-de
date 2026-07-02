/**
 * Proaktiver Kinderzuschlag-Anspruch-Radar — Heuristik + deviceLocal-Gate
 * (Spec `anspruch-arc.md` § 6, Beat c). Analog zu `wohngeld-estimate.ts`.
 *
 * Diese Datei ist die EINZIGE Quelle für:
 *  1. `estimateKinderzuschlagAnspruch(persona)` — reine Heuristik. Die Euro-Range
 *     ist eine **deterministische, synthetische [MOCK]-Haushalts-Schätzung**, hart
 *     auf den § 6a-BKGG-Höchstbetrag (297 €/Kind/Monat) je Kind geklemmt → nie
 *     über der Haushalts-Obergrenze `297 · kinder`. NIE aus Seed-Daten — es gibt
 *     nirgends ein numerisches Einkommensfeld in den Stammdaten.
 *  2. den Consent-/Dismiss-Gate (`resolveKinderzuschlagRadar`), den sowohl
 *     `api.getKinderzuschlagRadar` als auch der `DashboardSnapshot.anspruch_lane`-
 *     Pfad nutzen — so bleiben Snapshot und Direct-Call deckungsgleich.
 *  3. die persistierenden Mutatoren (dismiss/consent).
 *
 * Realismus (Spec § 11 Honesty-Locks): KiZ ist antragsgebunden (§ 6a Abs. 7
 * BKGG) → nie „läuft schon"; der Betrag ist einkommensgeprüft und wird per
 * Bescheid festgesetzt → nur „geschätzt ca."-Range, nie ein fixer Betrag.
 * Komponenten greifen NIE direkt hierauf zu — ausschließlich über `api.*`.
 */
import type {
  KinderzuschlagAnspruchEstimate,
  Persona,
  PersonaId,
} from '@/types';
import { MockBackendError } from '../errors';
import { readOrInit, write, type CollectionKey } from '../persistence';
import {
  kinderzuschlagRadarConsentBucketSchema,
  kinderzuschlagRadarDismissedBucketSchema,
  personasArraySchema,
} from '../schemas';

/** § 6a BKGG-Höchstbetrag je Kind/Monat (2025+2026, inkl. 25 € Sofortzuschlag). */
const KIZ_HOECHSTBETRAG_JE_KIND_EUR = 297;

/** BMFSFJ-Schätzung: ~35 % der berechtigten Kinder beziehen die Leistung tatsächlich. */
const KIZ_INANSPRUCHNAHME_QUOTE = 0.35;

const DATENPUNKT_I18N_KEYS = [
  'kinderzuschlagRadar.datenpunkt.kindergeld',
  'kinderzuschlagRadar.datenpunkt.einkommen',
  'kinderzuschlagRadar.datenpunkt.kein_bezug',
];

/**
 * Deterministische, synthetische [MOCK]-Haushalts-Range. Konservativ je Kind
 * (Demo: 2 Kinder → 180–360 €/Monat), hart geklemmt auf die Haushalts-Obergrenze
 * `297 · kinder` (§ 6a BKGG-Höchstbetrag). KEINE Anspruchsberechnung, KEINE
 * Seed-Quelle. Betrags-Framing durchgängig haushaltsweise (nie „bis zu 297 €
 * je Kind" mischen).
 */
function schaetzeKizRange(kinder: number): { min: number; max: number } {
  const haushaltsCap = KIZ_HOECHSTBETRAG_JE_KIND_EUR * kinder;
  const min = Math.min(90 * kinder, haushaltsCap);
  const max = Math.min(180 * kinder, haushaltsCap);
  return { min, max };
}

/**
 * Eligibility-Prädikat + Ableitungen — reine Funktion über echt vorhandene
 * Stammdaten. Nicht qualifiziert → `null` (Card erscheint NICHT; nie eine
 * „kein Anspruch"-Aussage). § 6a-BKGG-Voraussetzungen (aus dem Domain-Memo):
 * unverheiratetes Kind < 25 im HH, Kindergeldanspruch, Mindesteinkommen
 * (900 € / Alleinerz. 600 €), keine SGB-II-Hilfebedürftigkeit, Höchsteinkommens-
 * grenze — die einkommens-/vermögensabhängigen Kriterien sind NICHT register-
 * bestimmbar; der Radar gated rein auf dem synthetischen `[MOCK]`-Flag.
 */
export function estimateKinderzuschlagAnspruch(
  persona: Persona,
): KinderzuschlagAnspruchEstimate | null {
  // (1) Laufender Kindergeld-Bezug (§ 6a BKGG-Voraussetzung).
  if (persona.kindergeld_bezug !== true) return null;

  // (2) Mindestens ein Kind im Haushalt.
  const kinder = persona.familie?.kinder?.length ?? 0;
  if (kinder < 1) return null;

  // (3) Synthetische [MOCK]-„könnte-berechtigt-sein"-Indikation. KEINE
  //     numerische Einkommens-/Vermögensprüfung (die gibt es in den Stammdaten
  //     nicht); nur das explizite Heuristik-Flag.
  if (persona.kinderzuschlag_indikation !== true) return null;

  const { min, max } = schaetzeKizRange(kinder);

  return {
    qualifiziert: true,
    geschaetzt_min_eur: min,
    geschaetzt_max_eur: max,
    kinder_im_haushalt: kinder,
    kindergeld_bezug: true,
    datenpunkt_i18n_keys: DATENPUNKT_I18N_KEYS,
    inanspruchnahme_quote: KIZ_INANSPRUCHNAHME_QUOTE,
    rechtsgrundlage: ['§ 6a BKGG'],
    cta_route: '/lebenslagen/kinderzuschlag',
    zukunft: true,
  };
}

// ---------------------------------------------------------------------------
// deviceLocal-State-Buckets (Persistenz)
// ---------------------------------------------------------------------------

function loadDismissedBucket(): Record<PersonaId, string> {
  return readOrInit(
    'kinderzuschlag-radar:dismissed' as CollectionKey,
    kinderzuschlagRadarDismissedBucketSchema,
    {} as Record<PersonaId, string>,
  );
}

function loadConsentBucket(): Record<PersonaId, boolean> {
  return readOrInit(
    'kinderzuschlag-radar:consent' as CollectionKey,
    kinderzuschlagRadarConsentBucketSchema,
    {} as Record<PersonaId, boolean>,
  );
}

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

// ---------------------------------------------------------------------------
// Gate + Resolver (geteilt zwischen getKinderzuschlagRadar und buildDashboard)
// ---------------------------------------------------------------------------

/**
 * `true`, wenn der Radar für diese Persona unterdrückt wird:
 *  (a) Consent widerrufen (`consent === false`), oder
 *  (b) dauerhaft geschlossen (dismissed-Timestamp gesetzt).
 * Default-Consent ist `true` (kein Eintrag → Erkennung läuft).
 */
export function isKinderzuschlagRadarSuppressed(personaId: PersonaId): boolean {
  if (loadConsentBucket()[personaId] === false) return true;
  if (loadDismissedBucket()[personaId]) return true;
  return false;
}

/**
 * Estimate + Gate in einem: `null`, wenn nicht qualifiziert ODER unterdrückt.
 * Single source of truth, damit `DashboardSnapshot.anspruch_lane` und
 * `api.getKinderzuschlagRadar` deckungsgleich bleiben.
 */
export function resolveKinderzuschlagRadar(
  persona: Persona,
): KinderzuschlagAnspruchEstimate | null {
  const estimate = estimateKinderzuschlagAnspruch(persona);
  if (!estimate) return null;
  if (isKinderzuschlagRadarSuppressed(persona.id)) return null;
  return estimate;
}

/** personaId-Variante für `api.getKinderzuschlagRadar`. */
export function resolveKinderzuschlagRadarById(
  personaId: PersonaId,
): KinderzuschlagAnspruchEstimate | null {
  return resolveKinderzuschlagRadar(loadPersonaById(personaId));
}

// ---------------------------------------------------------------------------
// Mutatoren (persistieren deviceLocal-State)
// ---------------------------------------------------------------------------

/** Radar dauerhaft schließen („nicht mehr anzeigen"). */
export function persistKinderzuschlagDismiss(
  personaId: PersonaId,
  now: Date = new Date(),
): void {
  const bucket = loadDismissedBucket();
  bucket[personaId] = now.toISOString();
  write('kinderzuschlag-radar:dismissed' as CollectionKey, bucket);
}

/** Consent-Toggle für die proaktive Erkennung. `false` → Radar verschwindet dauerhaft. */
export function persistKinderzuschlagConsent(
  personaId: PersonaId,
  consent: boolean,
): void {
  const bucket = loadConsentBucket();
  bucket[personaId] = consent;
  write('kinderzuschlag-radar:consent' as CollectionKey, bucket);
}
