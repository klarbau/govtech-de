/**
 * Proaktiver Wohngeld-Anspruch-Hinweis — Heuristik + deviceLocal-Gate
 * (Spec `proaktiver-wohngeld-anspruch.md` § 6).
 *
 * Diese Datei ist die EINZIGE Quelle für:
 *  1. `estimateWohngeldAnspruch(persona)` — reine Heuristik (Eligibility-Prädikat
 *     + Ableitungen). Die Euro-Range ist eine **deterministische, synthetische
 *     [MOCK]-Schätzung** aus `(haushaltsgroesse, mietstufe)`, hart begrenzt auf
 *     €180–370 (Destatis-Wohngeld-Ø Ende 2024 ~€287/Monat). NIE aus Seed-Daten — es gibt
 *     nirgends ein numerisches Einkommens-/Miet-Feld in den Stammdaten.
 *  2. den Consent-/Dismiss-/Snooze-Gate (`resolveWohngeldHinweis`), den sowohl
 *     `api.getWohngeldHinweis` als auch der `DashboardSnapshot.wohngeld_hinweis`-
 *     Pfad nutzen — so können Snapshot und Direct-Call nicht auseinanderlaufen.
 *  3. die persistierenden Mutatoren (dismiss/snooze/consent).
 *
 * Komponenten greifen NIE direkt hierauf zu — ausschließlich über `api.*`.
 */
import type { Persona, PersonaId, WohngeldAnspruchEstimate } from '@/types';
import { MockBackendError } from '../errors';
import { readOrInit, write, type CollectionKey } from '../persistence';
import {
  personasArraySchema,
  wohngeldHinweisConsentBucketSchema,
  wohngeldHinweisDismissedBucketSchema,
  wohngeldHinweisSnoozedBucketSchema,
} from '../schemas';

type Mietstufe = WohngeldAnspruchEstimate['mietstufe'];

// ---------------------------------------------------------------------------
// Reine Heuristik
// ---------------------------------------------------------------------------

/** Beschäftigungstypen, die typischerweise eine niedrige Einkommenslage indizieren. */
const NIEDRIGEINKOMMEN_BESCHAEFTIGUNG: ReadonlyArray<
  NonNullable<Persona['beschaeftigung']>['typ']
> = ['arbeitssuchend', 'student', 'rente'];

/**
 * Mietstufe leitet sich amtlich aus der registrierten Gemeinde ab (NICHT aus
 * Roh-PLZ-Präzision). Hier eine bewusst vereinfachte [MOCK]-Demo-Zuordnung:
 * Berlin → IV (4); alles übrige → III (3) als neutraler Default.
 */
function mietstufeFor(persona: Persona): Mietstufe {
  const ort = persona.adresse?.ort?.trim().toLowerCase() ?? '';
  if (ort === 'berlin') return 4;
  return 3;
}

/** Haushaltsgröße = 1 + Partner? + Anzahl Kinder (Melderegister-Proxy). */
function haushaltsgroesseFor(persona: Persona): number {
  const partner = persona.familie?.partner ? 1 : 0;
  const kinder = persona.familie?.kinder?.length ?? 0;
  return 1 + partner + kinder;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deterministische, synthetische [MOCK]-Monats-Range aus `(haushaltsgroesse,
 * mietstufe)`. Center wird auf ein realistisches Fenster geklemmt, sodass die
 * resultierende Range IMMER innerhalb des verifizierten Realismus-Korridors
 * €180–370 (Destatis-Wohngeld-Ø Ende 2024 ~€287) liegt. KEINE Anspruchsberechnung,
 * KEINE Seed-Quelle.
 *
 * Für Anna (HH 3, Mietstufe IV/4): center = 200 + 2·30 + 1·20 = 280
 *   → min 220, max 340.
 */
function schaetzeRange(
  haushaltsgroesse: number,
  mietstufe: Mietstufe,
): { min: number; max: number } {
  const HALF_WIDTH = 60;
  const rawCenter = 200 + (haushaltsgroesse - 1) * 30 + (mietstufe - 3) * 20;
  // Center auf [240, 310] klemmen → garantiert min ∈ [180, 250], max ∈ [300, 370].
  const center = clamp(Math.round(rawCenter / 10) * 10, 240, 310);
  // Defensive Hard-Cap (redundant zur center-Klemmung) — Honesty-Lock § 11:
  // niemals < 180, niemals > 370.
  const min = Math.max(180, center - HALF_WIDTH);
  const max = Math.min(370, center + HALF_WIDTH);
  return { min, max };
}

/**
 * Eligibility-Prädikat + Ableitungen — reine Funktion über echt vorhandene
 * Stammdaten. Nicht qualifiziert → `null` (Karte erscheint NICHT; nie eine
 * "kein Anspruch"-Aussage). Spec `proaktiver-wohngeld-anspruch.md` § 6.
 */
export function estimateWohngeldAnspruch(
  persona: Persona,
): WohngeldAnspruchEstimate | null {
  // (1) Mieter:in? Eigentümer / undefined → kein Hinweis.
  if (persona.wohnverhaeltnis !== 'miete') return null;

  // (2) Einkommens-Indikation: explizites Heuristik-Flag ODER ein
  //     niedrigeinkommen-indizierender Beschäftigungstyp.
  const beschaeftigungIndiziert =
    persona.beschaeftigung?.typ !== undefined &&
    NIEDRIGEINKOMMEN_BESCHAEFTIGUNG.includes(persona.beschaeftigung.typ);
  const einkommensIndikation =
    persona.wohngeld_indikation === true || beschaeftigungIndiziert;
  if (!einkommensIndikation) return null;

  // (3) Kein realer Ausschluss-Check (kein Grundsicherungsgeld-Feld in den Stammdaten;
  //     § 7 WoGG-Ausschluss wird erst im Antrag/§-33-Abgleich real geprüft).

  const haushaltsgroesse = haushaltsgroesseFor(persona);
  const mietstufe = mietstufeFor(persona);
  const { min, max } = schaetzeRange(haushaltsgroesse, mietstufe);

  return {
    qualifiziert: true,
    geschaetzt_min_eur: min,
    geschaetzt_max_eur: max,
    mietstufe,
    haushaltsgroesse,
    trigger_label_i18n_key: 'wohngeldHinweis.trigger_label',
    // Antragsanspruch; der proaktive Hinweis selbst stützt sich auf Einwilligung
    // (consent-Zeile), nicht auf eine Push-Norm.
    rechtsgrundlage: ['§ 22 Abs. 1 WoGG'],
    zukunft: true,
  };
}

// ---------------------------------------------------------------------------
// deviceLocal-State-Buckets (Persistenz)
// ---------------------------------------------------------------------------

function loadDismissedBucket(): Record<PersonaId, string> {
  return readOrInit(
    'wohngeld-hinweis:dismissed' as CollectionKey,
    wohngeldHinweisDismissedBucketSchema,
    {} as Record<PersonaId, string>,
  );
}

function loadSnoozedBucket(): Record<PersonaId, string> {
  return readOrInit(
    'wohngeld-hinweis:snoozed-until' as CollectionKey,
    wohngeldHinweisSnoozedBucketSchema,
    {} as Record<PersonaId, string>,
  );
}

function loadConsentBucket(): Record<PersonaId, boolean> {
  return readOrInit(
    'wohngeld-hinweis:consent' as CollectionKey,
    wohngeldHinweisConsentBucketSchema,
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
// Gate + Resolver (geteilt zwischen getWohngeldHinweis und buildDashboard)
// ---------------------------------------------------------------------------

/**
 * `true`, wenn der Hinweis für diese Persona unterdrückt wird:
 *  (a) Consent widerrufen (`consent === false`), oder
 *  (b) dauerhaft geschlossen (dismissed-Timestamp gesetzt), oder
 *  (c) Snooze-Datum liegt in der Zukunft.
 * Default-Consent ist `true` (kein Eintrag → Erkennung läuft).
 */
export function isWohngeldHinweisSuppressed(
  personaId: PersonaId,
  now: Date = new Date(),
): boolean {
  if (loadConsentBucket()[personaId] === false) return true;
  if (loadDismissedBucket()[personaId]) return true;
  const snoozedUntil = loadSnoozedBucket()[personaId];
  if (snoozedUntil && new Date(snoozedUntil).getTime() > now.getTime()) {
    return true;
  }
  return false;
}

/**
 * Estimate + Gate in einem: `null`, wenn nicht qualifiziert ODER unterdrückt.
 * Single source of truth, damit `DashboardSnapshot.wohngeld_hinweis` und
 * `api.getWohngeldHinweis` deckungsgleich bleiben.
 */
export function resolveWohngeldHinweis(
  persona: Persona,
  now: Date = new Date(),
): WohngeldAnspruchEstimate | null {
  const estimate = estimateWohngeldAnspruch(persona);
  if (!estimate) return null;
  if (isWohngeldHinweisSuppressed(persona.id, now)) return null;
  return estimate;
}

/** personaId-Variante für `api.getWohngeldHinweis`. */
export function resolveWohngeldHinweisById(
  personaId: PersonaId,
  now: Date = new Date(),
): WohngeldAnspruchEstimate | null {
  return resolveWohngeldHinweis(loadPersonaById(personaId), now);
}

// ---------------------------------------------------------------------------
// Mutatoren (persistieren deviceLocal-State)
// ---------------------------------------------------------------------------

/** Karte dauerhaft schließen ("nicht mehr anzeigen"). */
export function persistWohngeldDismiss(
  personaId: PersonaId,
  now: Date = new Date(),
): void {
  const bucket = loadDismissedBucket();
  bucket[personaId] = now.toISOString();
  write('wohngeld-hinweis:dismissed' as CollectionKey, bucket);
}

/** Karte für `tage` Tage verstecken (Test-Default 30). */
export function persistWohngeldSnooze(
  personaId: PersonaId,
  tage: number,
  now: Date = new Date(),
): void {
  const until = new Date(now.getTime() + tage * 24 * 60 * 60 * 1000);
  const bucket = loadSnoozedBucket();
  bucket[personaId] = until.toISOString();
  write('wohngeld-hinweis:snoozed-until' as CollectionKey, bucket);
}

/** Consent-Toggle für die proaktive Erkennung. `false` → Karte verschwindet dauerhaft. */
export function persistWohngeldConsent(
  personaId: PersonaId,
  consent: boolean,
): void {
  const bucket = loadConsentBucket();
  bucket[personaId] = consent;
  write('wohngeld-hinweis:consent' as CollectionKey, bucket);
}
