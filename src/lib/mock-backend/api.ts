/**
 * Public Mock-Backend-API für die GovTech-DE-Demo.
 *
 * ============================================================================
 * Hand-off note für assistant-engineer
 * ============================================================================
 * Diese Methoden müssen 1:1 in `src/lib/ai/tools.ts` als Tool-Definitionen
 * gespiegelt werden. Signaturen:
 *
 *   getProfile(): Promise<Persona>
 *   getLetters(filter?: LetterFilter): Promise<Letter[]>
 *   getLetter(id: string): Promise<Letter>
 *   getVorgang(id: string): Promise<Vorgang>
 *   getVorgaenge(filter?: VorgangFilter): Promise<Vorgang[]>
 *   getDocuments(): Promise<Document[]>
 *   getTermine(): Promise<Termin[]>
 *   getBehoerden(): Promise<Behoerde[]>
 *   getBehoerde(id: string): Promise<Behoerde>
 *
 *   startUmzug(input: UmzugInput): Promise<{ vorgangId: string }>
 *   previewUmzug(input: Pick<UmzugInput, 'neue_adresse' | 'stichtag'>): Promise<UmzugPreview>
 *   cancelUmzug(vorgangId: string): Promise<void>
 *   markiereLetterGelesen(id: string): Promise<void>
 *   bestaetigeAutopilotSchritt(vorgangId: string, schrittId: string): Promise<void>
 *   erledigeVorgangSchritt(vorgangId: string, schrittId: string): Promise<void>
 *
 *   subscribe(listener: (e: MockBackendEvent) => void): () => void
 *
 * Side-effects: jede Write-Methode emittiert mindestens ein `MockBackendEvent`
 * (siehe `src/types/mock-event.ts`).
 *
 * Latenz: alle Methoden laufen durch `withLatency()` (300–800 ms + 5 % Fehler);
 * der Umzug-Autopilot-Generator hat eigene Latenz-Choreografie pro Block.
 *
 * Note: `bestaetigeAutopilotSchritt` ist die ASCII-sichere Alias-Variante zu
 * `bestätigeAutopilotSchritt` (architecture.md). Beide zeigen auf dieselbe
 * Implementierung; Frontend-Code verwendet die ASCII-Form.
 * ============================================================================
 */
import type {
  AutopilotKatalogEntry,
  BehoerdeKategorie,
  Behoerde,
  BundidPostfachAnbindung,
  DashboardSnapshot,
  DashboardSortMode,
  DatenquellenEintrag,
  EudiExportPreview,
  ValueReceipt,
  DatenschutzEinwilligung,
  Document as VaultDocument,
  DocumentKategorie,
  DscSnapshot,
  EinwilligungEmpfaenger,
  EpaStatus,
  HaushaltView,
  LebenslagenHinweis,
  PrioritizedTopAction,
  Reminder,
  SteuerUebersicht,
  TopActionCandidateInput,
  Letter,
  LetterActivityEvent,
  LetterActivityLog,
  LetterActivityLogEntry,
  LetterAiSummaryPostOpen,
  LetterArchetype,
  LetterArchetypeAction,
  LetterAuthChannel,
  LetterFilter,
  LetterFrist,
  LetterReplyMap,
  MdlAttestationMock,
  MockBackendEvent,
  MockBackendEventListener,
  Mobilitaet,
  NotificationKanal,
  NotificationPraeferenzen,
  Persona,
  PersonaId,
  PersonaKontakt,
  PunktestandPullResult,
  Reply,
  ReplyDraft,
  Stammdaten,
  StammdatenSektionId,
  StammdatenUebermittlungssperreId,
  Termin,
  ToggleNotificationPraeferenzResult,
  UebermittlungsLogEntry,
  UmzugInput,
  UmzugPreview,
  Vorgang,
  VorgangFilter,
  VorgangsKategorie,
  WalletAttestation,
  WalletAttestationPreview,
  YellowLetterBridgeResult,
} from '@/types';
import { LETTER_ATTACHMENT_LIMITS } from '@/types';
import letterSummariesFixture from '@/data/letter-summaries.json';
import { z } from 'zod';
import {
  buildBlockDConfirmation,
  buildCascadeConfirmationLetter,
  buildUmzugPreview,
  emitStammdatenLogForStep,
  umzugAutopilot,
} from './autopilot/umzug';
import {
  buildUmzugSaga,
  getEngine,
  runRecoverOnBoot,
  setEngineHooks,
  verifyChain as engineVerifyChain,
  COMPENSATION_TARGET_BEHOERDE,
  __setEngineClock,
  makeFakeClock,
} from './orchestration';
import { isReliableModeForEngine } from './orchestration/reliable';
import type { EngineHooks } from './orchestration';
import { projectStep as projectSagaStep } from './orchestration/projection';
import type {
  AuditLogEntry,
  CircuitBreakerState,
  DeadLetterEntry,
  SagaInstance,
  SagaStep,
} from '@/types/orchestration';
import { appendLogEntry, stammdatenApi } from './stammdaten/api';
import { dashboardApi } from './dashboard/api';
import { datenschutzApi } from './datenschutz/api';
import { familieApi } from './familie/api';
import { remindersApi } from './reminders/api';
import { steuerApi } from './steuer/api';
import { stammdatenV11Api } from './stammdaten/v1-1-api';
import { stammdatenV12Api } from './stammdaten/v1-2-api';
import {
  stammdatenV13Api,
  type UmzugVorgangSummary,
} from './stammdaten/v1-3-api';
import { MockBackendError } from './errors';
import { emit, subscribe } from './events';
import {
  uuid,
  aktenzeichenForBehoerde,
  aktenzeichenBuergeramtTermin,
} from './id';
import { letzterSichererAnmeldungSlot } from './autopilot/termin-ranker';
import { computeValueReceipt } from './value-receipt';
import { withLatency } from './latency';
import { captureContext, runWithCapturedContext } from './store-context';
import {
  resolveReplyBody as resolveReplyBodyImpl,
  type ResolveReplyBodyInput,
} from './reply-templates';
import {
  read,
  readOrInit,
  write,
  type CollectionKey,
} from './persistence';
import {
  behoerdenArraySchema,
  consentSchema,
  documentsArraySchema,
  letterActivityAktionSchema,
  letterActivityLogSchema,
  letterRepliesMapSchema,
  letterSummariesMapSchema,
  lettersArraySchema,
  personasArraySchema,
  personaSchema,
  replySchema,
  remindersArraySchema,
  termineArraySchema,
  vorgaengeArraySchema,
} from './schemas';
import { getActivePersonaId, seedIfEmpty } from './seed';
import type { AutopilotStep, VorgangStatus } from '@/types/vorgang';

// ----------------------------------------------------------------------------
// Boot-Hook
// ----------------------------------------------------------------------------

let booted = false;
let recoveryRan = false;
function ensureBooted(): void {
  if (booted) return;
  booted = true;
  try {
    seedIfEmpty();
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error('[mock-backend] seed failed', err);
    }
  }
  // Resilient Orchestration Engine recovery-on-boot (Spec § 5.4): runs once per
  // page load, after seedIfEmpty, guarded by a sentinel. Fire-and-forget inside
  // the captured request context so deferred emits land on the right bus. On an
  // empty store (Node/test, no in-flight saga) it is a no-op.
  if (!recoveryRan) {
    recoveryRan = true;
    try {
      const snapshot = captureContext();
      void runWithCapturedContext(snapshot, () =>
        runRecoverOnBoot().catch((err) => {
          if (typeof console !== 'undefined') {
            console.warn('[mock-backend] recoverOnBoot failed', err);
          }
        }),
      );
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('[mock-backend] recoverOnBoot bootstrap failed', err);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Helpers (intern)
// ----------------------------------------------------------------------------

function loadProfile(): Persona {
  ensureBooted();
  const profile = read('profile' as CollectionKey, personaSchema);
  if (profile) return profile as Persona;
  // Fallback: Aktive Persona aus personas-Bucket finden.
  const personas = readOrInit(
    'personas' as CollectionKey,
    personasArraySchema,
    [],
  ) as Persona[];
  const id = getActivePersonaId();
  const persona = personas.find((p) => p.id === id);
  if (!persona) {
    throw new MockBackendError(
      'Aktive Persona nicht gefunden — bitte erneut anmelden.',
      { code: 'PERSONA_MISSING', retryable: false },
    );
  }
  write('profile' as CollectionKey, persona);
  return persona;
}

function loadLetters(): Letter[] {
  ensureBooted();
  return readOrInit('letters' as CollectionKey, lettersArraySchema, []) as Letter[];
}

function saveLetters(letters: Letter[]): void {
  write('letters' as CollectionKey, letters);
}

function loadVorgaenge(): Vorgang[] {
  ensureBooted();
  return readOrInit('vorgaenge' as CollectionKey, vorgaengeArraySchema, []) as Vorgang[];
}

function saveVorgaenge(vorgaenge: Vorgang[]): void {
  write('vorgaenge' as CollectionKey, vorgaenge);
}

function loadDocuments(): VaultDocument[] {
  ensureBooted();
  return readOrInit(
    'documents' as CollectionKey,
    documentsArraySchema,
    [],
  ) as VaultDocument[];
}

function saveDocuments(docs: VaultDocument[]): void {
  write('documents' as CollectionKey, docs);
}

/**
 * Leitet die Vault-Kategorie aus dem `typ` ab (Redesign-Dokumente § 4.2).
 * Wird in `getDocuments()` angewandt, falls `Document.kategorie` nicht gesetzt
 * ist — damit das Frontend die Logik nicht duplizieren muss.
 */
function deriveDocumentKategorie(typ: string): DocumentKategorie {
  switch (typ) {
    case 'aufenthaltstitel':
    case 'fuehrerschein':
    case 'krankenversicherungskarte':
    case 'sozialversicherungsausweis':
    case 'reisepass':
    case 'personalausweis':
      return 'ausweise';
    case 'steuerbescheid':
    case 'lohnsteuerbescheinigung':
    case 'kindergeldbescheid':
    case 'rentenauskunft':
    case 'meldebestaetigung':
    case 'wohnungsgeberbestaetigung':
      return 'bescheide';
    case 'geburtsurkunde':
    case 'eheurkunde':
      return 'familie';
    case 'arbeitsvertrag':
    case 'mietvertrag':
    case 'versicherungspolice':
    case 'mobilfunkvertrag':
    case 'zulassungsbescheinigung_teil_i':
      return 'vertraege';
    default:
      // Defensiver Default: unbekannte Typen → Bescheide-Sammelkategorie.
      return 'bescheide';
  }
}

function loadTermine(): Termin[] {
  ensureBooted();
  return readOrInit('termine' as CollectionKey, termineArraySchema, []) as Termin[];
}

function saveTermine(termine: Termin[]): void {
  write('termine' as CollectionKey, termine);
}

function loadBehoerden(): Behoerde[] {
  ensureBooted();
  return readOrInit(
    'behoerden' as CollectionKey,
    behoerdenArraySchema,
    [],
  ) as Behoerde[];
}

function loadConsent(): Record<string, string[]> {
  ensureBooted();
  return readOrInit('consent' as CollectionKey, consentSchema, {});
}

function saveConsent(consent: Record<string, string[]>): void {
  write('consent' as CollectionKey, consent);
}

function loadActivityLog(): LetterActivityLog {
  ensureBooted();
  return readOrInit(
    'letter-activity-log' as CollectionKey,
    letterActivityLogSchema,
    {} as LetterActivityLog,
  ) as LetterActivityLog;
}

function saveActivityLog(log: LetterActivityLog): void {
  write('letter-activity-log' as CollectionKey, log);
}

function loadReplies(): LetterReplyMap {
  ensureBooted();
  return readOrInit(
    'letter-replies' as CollectionKey,
    letterRepliesMapSchema as unknown as import('zod').ZodType<LetterReplyMap>,
    {} as LetterReplyMap,
  );
}

function saveReplies(map: LetterReplyMap): void {
  write('letter-replies' as CollectionKey, map);
}

// ----------------------------------------------------------------------------
// V1.5.1 — Reply-Bucket-Helpers (Array-Shape `Record<letterId, Reply[]>`).
// Spec § 8.4: Cross-Template-Versand-Pfad erzeugt 2 Reply-Records pro Letter.
// V1.5.0-Daten werden über `persistence-migrations.ts` zu Single-Element-
// Arrays migriert, bevor `loadReplies()` zum ersten Mal liest.
// ----------------------------------------------------------------------------

function listRepliesForLetter(letterId: string): Reply[] {
  const map = loadReplies();
  return map[letterId] ?? [];
}

/**
 * Liefert den (höchstens einen) aktiven Draft eines Briefs. Konvention:
 * höchstens **eine** Reply pro Letter mit `status === 'draft'`. Wenn mehrere
 * Drafts existieren würden (Bug-Pfad), wird der zuletzt erstellte zurückgegeben.
 */
function findDraftReply(letterId: string): Reply | undefined {
  const list = listRepliesForLetter(letterId);
  const drafts = list.filter((r) => r.status === 'draft');
  if (drafts.length === 0) return undefined;
  // Zuletzt erstellt = größtes created_at.
  return drafts.reduce((a, b) =>
    a.created_at.localeCompare(b.created_at) >= 0 ? a : b,
  );
}

/**
 * Liefert die zuletzt versandte Reply (oder den Draft, falls noch keine
 * versandt wurde) — semantisch „die aktuell relevante Reply" für den Letter.
 * Sortier-Schlüssel: `sent_at` (sent_simulated) bzw. `created_at` (Draft).
 */
function findLatestReply(letterId: string): Reply | undefined {
  const list = listRepliesForLetter(letterId);
  if (list.length === 0) return undefined;
  return list.reduce((a, b) => {
    const aKey = a.sent_at ?? a.created_at;
    const bKey = b.sent_at ?? b.created_at;
    return aKey.localeCompare(bKey) >= 0 ? a : b;
  });
}

/** Schreibt eine Reply in den Bucket — upsert by `id`, kein Delete. */
function upsertReply(letterId: string, reply: Reply): void {
  const map = loadReplies();
  const list = map[letterId] ?? [];
  const idx = list.findIndex((r) => r.id === reply.id);
  if (idx >= 0) {
    list[idx] = reply;
  } else {
    list.push(reply);
  }
  map[letterId] = list;
  saveReplies(map);
}

/** Löscht eine Reply aus dem Bucket (für deleteReplyDraft). */
function removeReplyById(letterId: string, replyId: string): void {
  const map = loadReplies();
  const list = map[letterId] ?? [];
  const filtered = list.filter((r) => r.id !== replyId);
  if (filtered.length === 0) {
    delete map[letterId];
  } else {
    map[letterId] = filtered;
  }
  saveReplies(map);
}

// ----------------------------------------------------------------------------
// V1.5 — Mock-Kanal-Lookup (Domain §3 B1, Verifier MUST-Cover binding)
// ----------------------------------------------------------------------------

/**
 * Liefert die Mock-Kanal-Bezeichnung für eine Behörde anhand der Behörden-
 * Kategorie + (für Spezialfälle) der Behörden-ID.
 *
 * Anker: `docs/domain/posteingang-antwort-verfassen.md` §3 B1 (Behörden-
 * Kanal-Matrix). Die Werte sind die Strings, die das UI im Versand-
 * Bestätigungs-Modal und im Datenschutz-Cockpit zeigt.
 */
export function getMockKanalForBehoerde(behoerdeId: string): string {
  const behoerde = loadBehoerden().find((b) => b.id === behoerdeId);
  if (!behoerde) return 'Briefpost (papierhaft)';

  // Spezialfälle, die per ID statt per Kategorie gemapt sind (Domain §3 B1).
  if (behoerde.id === 'beitragsservice-koeln') return 'Beitragsservice-Portal';
  if (behoerde.id.startsWith('familienkasse-')) return 'Familienkasse-Online';
  if (behoerde.id.startsWith('finanzamt-')) return 'ELSTER-Postfach';
  if (behoerde.id === 'aok-nordost' || behoerde.id === 'aok-rheinland-hamburg') {
    return 'Mein-AOK-Portal';
  }
  if (behoerde.id === 'tk-hamburg') return 'Mein-AOK-Portal'; // GKV-Sammel-Bezeichnung im Mock
  if (behoerde.id === 'bundesdruckerei') return 'Briefpost (papierhaft)';

  switch (behoerde.kategorie) {
    case 'bund':
      return 'BundID-Postfach (speculative 2027)';
    case 'land':
    case 'kommune':
      return 'Service-Portal des Bundeslandes';
    case 'sozialversicherung':
      // GKV via Kassen-Portal; IHK / BG / sonstige SV → Service-Portal des Landes.
      if (
        behoerde.zustaendige_themen.includes('krankenversicherung') ||
        behoerde.zustaendige_themen.includes('pflegeversicherung')
      ) {
        return 'Mein-AOK-Portal';
      }
      return 'Service-Portal des Bundeslandes';
    case 'privat':
    default:
      return 'Briefpost (papierhaft)';
  }
}

// ----------------------------------------------------------------------------
// Pre-baked AI-Summaries (deterministisch für Demo) — `src/data/letter-summaries.json`
// ----------------------------------------------------------------------------

type LetterSummaryEntry = z.infer<typeof letterSummariesMapSchema>[string];

let _summariesCache: Record<string, LetterSummaryEntry> | undefined;

/**
 * Lädt die pre-baked Summaries (validiert via zod) und cacht sie im Process-Speicher.
 * Citation-Mismatch zwischen `original_zitat` und `letter.body_de` wird geloggt,
 * aber nicht hart geworfen — `extrahiereAktion` liefert ein `citation_match`-Flag,
 * das die UI nutzt um „Frist im Kalender"-CTAs zu deaktivieren (Spec §4.4).
 */
function loadSummariesMap(): Record<string, LetterSummaryEntry> {
  if (_summariesCache) return _summariesCache;
  const parsed = letterSummariesMapSchema.safeParse(letterSummariesFixture);
  if (!parsed.success) {
    throw new MockBackendError(
      'letter-summaries.json schema invalid — ' +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.')}:${i.message}`)
          .join('; '),
      { code: 'SUMMARY_SCHEMA_INVALID', retryable: false },
    );
  }
  _summariesCache = parsed.data;
  return _summariesCache;
}

/**
 * Prüft, ob alle Bullet-Citations Substrings des `body_de` sind.
 * Liefert `false` bei mindestens einem Mismatch (Norm-Kontext-Bullets mit
 * `original_zitat: ""` zählen NICHT als Mismatch).
 */
function citationsMatchBody(
  summary: LetterAiSummaryPostOpen,
  body: string,
): boolean {
  for (const cit of summary.citations) {
    if (cit.original_zitat === '') continue;
    if (!body.includes(cit.original_zitat)) return false;
  }
  return true;
}

function appendActivityLogInternal(
  letterId: string,
  entry: LetterActivityLogEntry,
): void {
  const log = loadActivityLog();
  const list = log[letterId] ?? [];
  list.push(entry);
  log[letterId] = list;
  saveActivityLog(log);
}

function vorgangTitelFromArchetype(
  archetype: LetterArchetype,
  vorgangsTyp: string,
): string {
  const year = new Date().getUTCFullYear();
  switch (archetype) {
    case 'steuerbescheid':
      return `Steuer ${year - 1}`;
    case 'familienkasse-nachweis':
      return `Kindergeld-Nachweis ${year}`;
    case 'abh-verlaengerung':
      return `Aufenthaltstitel-Verlängerung ${year}`;
    case 'krankenkasse-beitrag':
      return `Krankenkassen-Beitrag ${year}`;
    case 'beitragsservice-mahnung':
      return `Rundfunkbeitrag ${year}`;
    case 'ihk-beitrag':
      return `IHK-Beitrag ${year}`;
    case 'berufsgenossenschaft-beitrag':
      return `BG-Beitrag ${year}`;
    case 'standesamt-urkunde':
      return `Standesamtliche Urkunde ${year}`;
    case 'buergeramt-meldung':
      return `Bürgeramt-Meldung ${year}`;
    default:
      return `Vorgang aus Brief (${vorgangsTyp})`;
  }
}

function appendLetter(letter: Letter): void {
  const letters = loadLetters();
  letters.unshift(letter);
  saveLetters(letters);
  emit({ type: 'letter_received', letter });
}

function updateVorgang(
  vorgangId: string,
  mutator: (v: Vorgang) => Vorgang,
): Vorgang | undefined {
  const vorgaenge = loadVorgaenge();
  const idx = vorgaenge.findIndex((v) => v.id === vorgangId);
  if (idx === -1) return undefined;
  const updated = mutator(vorgaenge[idx]);
  vorgaenge[idx] = updated;
  saveVorgaenge(vorgaenge);
  return updated;
}

function changeVorgangStatus(vorgangId: string, status: VorgangStatus): void {
  updateVorgang(vorgangId, (v) => ({
    ...v,
    status,
    abgeschlossen_am:
      status === 'abgeschlossen' ? new Date().toISOString() : v.abgeschlossen_am,
  }));
  emit({ type: 'vorgang_status_changed', vorgangId, status });
}

function upsertStep(vorgangId: string, step: AutopilotStep): void {
  updateVorgang(vorgangId, (v) => {
    const idx = v.schritte.findIndex((s) => s.id === step.id);
    const schritte =
      idx >= 0
        ? v.schritte.map((s, i) => (i === idx ? step : s))
        : [...v.schritte, step];
    const beteiligte = Array.from(
      new Set([...v.beteiligte_behoerden_ids, step.behoerde_id]),
    );
    return { ...v, schritte, beteiligte_behoerden_ids: beteiligte };
  });
  emit({ type: 'autopilot_step', vorgangId, step });
}

function recordConsent(behoerdeIds: string[], scope: string): void {
  if (behoerdeIds.length === 0) return;
  const consent = loadConsent();
  for (const id of behoerdeIds) {
    const existing = consent[id] ?? [];
    if (!existing.includes(scope)) existing.push(scope);
    consent[id] = existing;
  }
  saveConsent(consent);
}

function isVorgangFullyResolved(vorgang: Vorgang): boolean {
  return vorgang.schritte.every(
    (s) =>
      s.status === 'confirmed' ||
      s.status === 'failed' ||
      s.status === 'self_assigned',
  );
}

function createWohnungsgeberDoc(
  input: UmzugInput,
  vorgangId: string,
): VaultDocument | undefined {
  if (!input.wohnungsgeber_bestaetigung_dataurl) return undefined;
  // Wir speichern die Data-URL nicht (PII-Hygiene), sondern legen einen
  // Vault-Eintrag mit synthetischem QR-Payload an.
  return {
    id: `doc-${uuid()}`,
    typ: 'wohnungsgeberbestaetigung',
    titel: 'Wohnungsgeberbestätigung (§ 19 BMG) — hochgeladen',
    ausstellende_behoerde_id: 'buergeramt-berlin-mitte',
    ausgestellt_am: new Date().toISOString().slice(0, 10),
    qr_payload: `[MOCK-QR] wohnungsgeber://upload/${vorgangId}/${new Date()
      .toISOString()
      .slice(0, 10)}`,
    eudi_compatible: false,
    watermark: '[MOCK]',
    vorgang_id: vorgangId,
  };
}

// ----------------------------------------------------------------------------
// §C1 — Autopilot mintet durable, klickbare Artefakte (Document + Termin),
// kreuzverlinkt per vorgang_id, und EMITTIERT Events (document_added /
// termin_created), damit Dokumente-/Termine-Screen live reagieren.
// Idempotent: jeder Mint hat eine deterministische ID je Vorgang.
// ----------------------------------------------------------------------------

function upsertDocument(doc: VaultDocument): boolean {
  const docs = loadDocuments();
  if (docs.some((d) => d.id === doc.id)) return false; // schon gemintet
  docs.unshift(doc);
  saveDocuments(docs);
  emit({ type: 'document_added', document: doc });
  return true;
}

function upsertTermin(termin: Termin): boolean {
  const termine = loadTermine();
  if (termine.some((t) => t.id === termin.id)) return false;
  termine.unshift(termin);
  saveTermine(termine);
  emit({ type: 'termin_created', termin });
  return true;
}

/** §C2 — mutiert einen Termin in-place + emittiert `termin_updated`. */
function mutateTermin(terminId: string, mutator: (t: Termin) => Termin): void {
  const termine = loadTermine();
  const idx = termine.findIndex((t) => t.id === terminId);
  if (idx === -1) {
    throw new MockBackendError(`Termin "${terminId}" nicht gefunden.`, {
      code: 'TERMIN_NOT_FOUND',
      retryable: false,
    });
  }
  const updated = mutator(termine[idx]);
  termine[idx] = updated;
  saveTermine(termine);
  emit({ type: 'termin_updated', termin: updated });
}

/** §C4 — mutiert einen Reminder im Bucket (markReminderDone / snooze). */
function mutateReminder(
  reminderId: string,
  mutator: (r: Reminder) => Reminder,
): void {
  const reminders = readOrInit(
    'reminders' as CollectionKey,
    remindersArraySchema as unknown as import('zod').ZodType<Reminder[]>,
    [] as Reminder[],
  ) as Reminder[];
  const idx = reminders.findIndex((r) => r.id === reminderId);
  if (idx === -1) {
    throw new MockBackendError(`Reminder "${reminderId}" nicht gefunden.`, {
      code: 'REMINDER_NOT_FOUND',
      retryable: false,
    });
  }
  reminders[idx] = mutator(reminders[idx]);
  write('reminders' as CollectionKey, reminders);
}

/**
 * Bürgeramt-Block-A-Side-Effects (Termin-Autopilot, Spec §2/§4.1/§5 — Hero):
 * Meldebestätigung-Document + Anmeldung-Termin-Vorschlag (`'vorgeschlagen'`).
 *
 * MUSS **inline mit dem Block-A-Bürgeramt-Anmeldungsschritt** entstehen — also
 * SOBALD der `buergeramt-berlin-mitte`-Schritt erfolgreich ist, NICHT erst nach
 * den sensiblen Block-D-eID-Gates. Wird daher direkt am Step-Success-Hook
 * aufgerufen (Resilient-Engine: `onStepSucceeded`; Legacy: nach dem Generator,
 * vor Block D). Bleibt im Saga-Terminal `applyUmzugRipple` harmlos idempotent —
 * die deterministische `id` macht jeden Folge-Mint zu einem No-op.
 *
 * Datum deterministisch aus dem stichtag-abgeleiteten „letzter sicherer Slot vor
 * der Frist" (kein `Date.now()+7d`; live `nowIso` nur für die Past-Slot-Edge).
 */
function mintBuergeramtAnmeldungArtefakte(
  vorgang: Vorgang,
  persona: Persona,
): void {
  const stamp = new Date().toISOString().slice(0, 10);

  upsertDocument({
    id: `doc-meldebestaetigung-${vorgang.id}`,
    typ: 'meldebestaetigung',
    titel: 'Meldebestätigung Berlin-Mitte',
    ausstellende_behoerde_id: 'buergeramt-berlin-mitte',
    ausgestellt_am: stamp,
    kategorie: 'bescheide',
    dokument_nr: aktenzeichenForBehoerde('buergeramt-berlin-mitte'),
    qr_payload: `[MOCK-QR] meldung://berlin-mitte/${persona.id}/${stamp} [MOCK – Verwaltungsdemo, keine echten Daten]`,
    eudi_compatible: true,
    watermark: '[MOCK]',
    vorgang_id: vorgang.id,
    owner_persona_id: persona.id,
  });

  // Anmeldung-Termin-Vorschlag (Termin-Autopilot, Spec §5/§6). Status
  // 'vorgeschlagen' — NICHT 'gebucht'. stichtag liegt seit Kaskaden-Start im
  // Vorgang-Kontext und ist hier (Block-A-Step-Success) lesbar.
  const stichtag =
    (vorgang.context?.stichtag as string | undefined) ??
    vorgang.fristen.find((f) => f.typ === 'stichtag')?.datum ??
    stamp;
  const { slotIso } = letzterSichererAnmeldungSlot(stichtag, new Date().toISOString());
  upsertTermin({
    id: `termin-anmeldung-${vorgang.id}`,
    behoerde_id: 'buergeramt-berlin-mitte',
    vorgang_id: vorgang.id,
    datum: slotIso,
    ort: {
      typ: 'praesenz',
      details:
        'Bezirksamt Mitte von Berlin — Bürgeramt Müllerstraße, Müllerstraße 146, 13353 Berlin',
    },
    status: 'vorgeschlagen',
    betreff: 'Anmeldung neuer Wohnort (§ 17 BMG)',
    buchungsreferenz: `[MOCK] ${aktenzeichenBuergeramtTermin()}`,
    kategorie: 'behoerdentermin',
    owner_persona_id: persona.id,
  });
}

/**
 * §C1 — bei abgeschlossenem Umzug-Lauf: Meldebestätigung + (KFZ) Zulassungs-
 * bescheinigung Teil I minten, LEA-Termin (ABH) anlegen, alles vorgang_id-
 * verlinkt + owner-gestempelt, Events emittiert. Idempotent.
 *
 * Hinweis: die Bürgeramt-Artefakte (Meldebestätigung + Anmeldung-Termin)
 * entstehen jetzt bereits am Block-A-Step-Success (s. `mintBuergeramtAnmeldung-
 * Artefakte`), damit der Termin-Hero inline mit der Anmeldung erscheint. Der
 * Aufruf hier bleibt als Sicherheitsnetz/Legacy-Pfad und ist über die
 * deterministischen IDs idempotent (kein Doppel-Mint).
 */
function applyUmzugRipple(vorgang: Vorgang, persona: Persona): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const hasStep = (pred: (s: AutopilotStep) => boolean): boolean =>
    vorgang.schritte.some((s) => s.status === 'confirmed' && pred(s));

  // Bürgeramt-Schritt → Meldebestätigung-Document + Anmeldung-Termin-Vorschlag.
  // Idempotent: bei Block-A-Step-Success bereits gemintet (deterministische IDs).
  if (hasStep((s) => s.behoerde_id === 'buergeramt-berlin-mitte')) {
    mintBuergeramtAnmeldungArtefakte(vorgang, persona);
  }

  // KFZ-Schritt → Zulassungsbescheinigung Teil I (nur wenn KFZ-Hop lief).
  if (hasStep((s) => s.behoerde_id === 'kfz-berlin-labo')) {
    upsertDocument({
      id: `doc-zulassungsbescheinigung-${vorgang.id}`,
      typ: 'zulassungsbescheinigung_teil_i',
      titel: 'Zulassungsbescheinigung Teil I (neue Halteranschrift)',
      ausstellende_behoerde_id: 'kfz-berlin-labo',
      ausgestellt_am: stamp,
      kategorie: 'vertraege',
      dokument_nr: aktenzeichenForBehoerde('kfz-berlin-labo'),
      qr_payload: `[MOCK-QR] zb1://kfz-berlin-labo/${persona.id}/${stamp} [MOCK – Verwaltungsdemo, keine echten Daten]`,
      eudi_compatible: true,
      watermark: '[MOCK]',
      vorgang_id: vorgang.id,
      owner_persona_id: persona.id,
    });
  }

  // ABH/LEA-Schritt → KEIN Termin-Mint (Regression-Korrektur, Spec §12 Edit A).
  // Das Landesamt für Einwanderung hat die offene Online-Terminbuchung 2025
  // abgeschafft (Vorsprache nur auf Einladung); es gibt keinen Slot „zu buchen".
  // Die ABH-Block-D-Zeile produziert nur ihren Bestätigungs-Letter (Adress-
  // aktualisierung per eID, § 18 PAuswG) — OHNE Termin-Behauptung. Den Vorsprache-
  // termin vergibt die Behörde; diese Demo bucht dort nichts.

  // Run-Frist/Reminder auf erledigt setzen.
  try {
    const reminders = readOrInit(
      'reminders' as CollectionKey,
      remindersArraySchema as unknown as import('zod').ZodType<Reminder[]>,
      [] as Reminder[],
    ) as Reminder[];
    let touched = false;
    const next = reminders.map((r) => {
      if (r.vorgang_id === vorgang.id && !r.erledigt) {
        touched = true;
        return { ...r, erledigt: true };
      }
      return r;
    });
    if (touched) write('reminders' as CollectionKey, next);
  } catch {
    /* defensiv — Ripple darf den Run nicht crashen */
  }
}

/**
 * Verifiable Once-Only (§6c) — at the Umzug success point (Vorgang
 * `abgeschlossen`), mint the amtliche Meldebestätigung (§ 24 Abs. 2 BMG) as a
 * re-verifiable SD-JWT VC and land it in the vault + Posteingang.
 *
 * `[reference-ecosystem]` + `[ZUKUNFT]`: FORMAT + signature real (the Demo-Issuer
 * signs an ES256 SD-JWT VC the Tier-1 verifier re-verifies offline), AUTHORITY
 * Demo (not a German Meldebehörde, not eIDAS-trusted). Persona values per §6.2:
 * `anschrift` = the NEW Umzug address from the Vorgang; dates = the Umzug date.
 *
 * ADDITIVE + idempotent: the document id is deterministic (`mb-vono-${vorgangId}`)
 * so `upsertDocument` returns `false` on a duplicate run/re-open. Issuance runs
 * server-side via a dynamic import of the server-only `src/lib/eudi/issue` module
 * (keeps `node:crypto`/`jose` out of the client bundle). If ANYTHING throws, it
 * is swallowed — the cascade must NOT break (mirrors the FIT-Connect additive
 * pattern, `InlineCascade.tsx:543`).
 */
async function mintVerifiableOnceOnly(
  vorgang: Vorgang,
  persona: Persona,
): Promise<void> {
  // Only at the success point, and only for Umzug — no phantom credential.
  if (vorgang.typ !== 'umzug' || vorgang.status !== 'abgeschlossen') return;

  const docId = `mb-vono-${vorgang.id}`;
  // Fast idempotency guard: skip the (async) mint entirely if already present.
  if (loadDocuments().some((d) => d.id === docId)) return;

  try {
    // NOTE: the credential is NOT minted here. The mock-backend `api` runs in the
    // browser, and the issuer (`src/lib/eudi/issue`) pulls `node:crypto`/`jose`,
    // which must never enter a client bundle (a dynamic `import()` does NOT prevent
    // webpack from bundling it for a 'use client' graph). Minting + the offline
    // re-verify both happen SERVER-SIDE in the `verifyMeldebestaetigungCredential`
    // server action, which derives the SAME deterministic credential from the
    // persona fixture + canonical demo Umzug address. Here we only persist the
    // durable vault SHELL (+ the Posteingang Letter); the panel fetches the crypto
    // verdict via the server action, so `qr_payload` carries a marker, not a token.
    const stamp = new Date().toISOString();
    const minted = upsertDocument({
      id: docId,
      typ: 'meldebestaetigung',
      titel: 'Amtliche Meldebestätigung',
      ausstellende_behoerde_id: 'buergeramt-berlin-mitte',
      ausgestellt_am: stamp.slice(0, 10),
      gueltig_bis: new Date(Date.now() + 90 * 86400000)
        .toISOString()
        .slice(0, 10),
      kategorie: 'bescheide',
      // SD-JWT VC is minted + verified server-side (server action); the panel does
      // NOT read a token from here. Marker only — keeps `node:crypto`/`jose` out of
      // the client bundle.
      qr_payload:
        '[MOCK] SD-JWT VC — Signatur serverseitig geprüft (Panel „Verifizierbare Meldebestätigung")',
      eudi_compatible: true,
      watermark: '[MOCK]',
      vorgang_id: vorgang.id,
      owner_persona_id: persona.id,
    });

    // Posteingang „liegt vor"-Letter (only on a fresh mint — idempotent). The
    // body carries the short disclaimer (C9) verbatim from domain §6.
    if (minted) {
      const disclaimerShort =
        'Hinweis: Dieser Prototyp simuliert die Ausstellung. Die amtliche ' +
        'Meldebestätigung beruht real auf § 24 Abs. 2 BMG (elektronisch: § 10 ' +
        'BMeldDigiV). Hier ausgestellt von einem Demo-Issuer, nicht von einer ' +
        'deutschen Behörde — Format echt, Autorität Demo ([reference-ecosystem]). ' +
        'Wallet-Ausstellung durch Behörden = Zukunft ([ZUKUNFT], EUDI-Wallet ab ' +
        '2. Jan 2027). Once-Only hier wallet-basiert, nicht Register-Austausch (NOOTS).';
      // Gender-aware salutation from the persona Stammdaten (anna=w, markus/mehmet=m).
      const anrede =
        persona.geschlecht === 'm'
          ? `Sehr geehrter Herr ${persona.nachname}`
          : persona.geschlecht === 'w'
            ? `Sehr geehrte Frau ${persona.nachname}`
            : `Guten Tag ${persona.vorname} ${persona.nachname}`;
      appendLetter({
        id: `letter-mb-vono-${vorgang.id}`,
        absender_behoerde_id: 'buergeramt-berlin-mitte',
        empfaenger_persona_id: persona.id,
        aktenzeichen: aktenzeichenForBehoerde('buergeramt-berlin-mitte'),
        betreff: 'Ihre amtliche Meldebestätigung liegt vor',
        body_de: [
          '[MOCK – Verwaltungsdemo, keine echten Daten]',
          '',
          `${anrede},`,
          '',
          'Ihre amtliche Meldebestätigung (§ 24 Abs. 2 BMG · elektronisch i. V. m. ' +
            '§ 10 BMeldDigiV, § 23a BMG) liegt als re-verifizierbarer Wallet-Nachweis ' +
            'vor. Sie halten die Bestätigung und legen sie der nächsten Stelle selbst ' +
            'vor; die nächste Stelle prüft die Signatur.',
          '',
          'Sie finden den Nachweis in „Dokumente".',
          '',
          disclaimerShort,
        ].join('\n'),
        status: 'ungelesen',
        empfangen_am: stamp,
        vorgang_id: vorgang.id,
      });
    }
  } catch (err) {
    // Additiv — Ausstellung/Verifikation darf den Run NICHT crashen.
    if (typeof console !== 'undefined') {
      console.warn('[mock-backend] verifiable once-only mint failed', err);
    }
  }
}

// ----------------------------------------------------------------------------
// Public API surface
// ----------------------------------------------------------------------------

/**
 * Ergebnis von `extrahiereAktion` — siehe spec §6.2 / §7. Liefert Post-Open-
 * Summary, Fristen und Was-kann-ich-tun-Optionen aus dem deterministischen
 * Demo-Seed (`letter-summaries.json`). `citation_match` ist `false`, wenn
 * mindestens ein Bullet ein `original_zitat` enthält, das NICHT Substring von
 * `letter.body_de` ist — die UI deaktiviert dann „Frist im Kalender"-CTAs bis
 * zur manuellen Verifikation (Edge case #10).
 */
export interface ExtrahiereAktionResult {
  archetype: LetterArchetype;
  auth_channel: LetterAuthChannel;
  ai_summary_post_open: LetterAiSummaryPostOpen;
  fristen: LetterFrist[];
  was_kann_ich_tun_options: LetterArchetypeAction[];
  vorschlaege: Array<{ label: string; type?: string; i18n_key?: string }>;
  citation_match: boolean;
}

export type ErstelleVorgangAusBriefTyp =
  | 'steuer-jahr'
  | 'familienkasse'
  | 'aufenthaltstitel-verlaengerung'
  | 'kindergeburt'
  | 'sonstige';

export interface MockBackendApi {
  // Read
  getProfile(): Promise<Persona>;
  getBehoerden(): Promise<Behoerde[]>;
  getBehoerde(id: string): Promise<Behoerde>;
  getLetters(filter?: LetterFilter): Promise<Letter[]>;
  /** Wirft `MockBackendError` bei Nicht-Treffer. Für „lookup or 404" semantisch. */
  getLetter(id: string): Promise<Letter>;
  /** Liefert `null` statt zu werfen — für UI-Pfade, die keinen Treffer als Default behandeln. */
  getLetterById(id: string): Promise<Letter | null>;
  getVorgang(id: string): Promise<Vorgang>;
  getVorgaenge(filter?: VorgangFilter): Promise<Vorgang[]>;
  getDocuments(): Promise<VaultDocument[]>;
  getTermine(): Promise<Termin[]>;

  // Posteingang-Capability (NEW — spec §6.2)
  /**
   * Liefert die pre-baked Post-Open-Summary für einen Brief.
   * V1: liest aus `letter-summaries.json`-Seed (kein echter LLM-Call vom
   * Mock-Backend; die echte Tool-Use-Pipeline läuft über `/api/assistant`).
   * Latenz simuliert LLM-Feel (1.500–3.500 ms) bei kaltem Cache; ~200 ms wenn
   * `letter.ai_summary?.post_open` bereits gesetzt ist.
   */
  extrahiereAktion(letterId: string): Promise<ExtrahiereAktionResult>;
  /** Alle Briefe eines Vorgangs, chronologisch. */
  getLetterThread(vorgangId: string): Promise<Letter[]>;
  /** Substring-Suche auf `aktenzeichen` + `aktenzeichen_weitere`, ≥ 3 Zeichen, limit 20. */
  searchLettersByAktenzeichen(query: string): Promise<Letter[]>;
  /** Briefe aller Behörden einer Kategorie (Bund / Land / Kommune / Selbstverwaltung / Privat). */
  getLettersByBehoerdenKategorie(
    kategorie: BehoerdeKategorie,
  ): Promise<Letter[]>;
  /** Activity-Log eines Briefs (Datenschutz-Cockpit; reine App-Aktivität). */
  getLetterAktivitaet(letterId: string): Promise<LetterActivityLogEntry[]>;

  // Write
  startUmzug(input: UmzugInput): Promise<{ vorgangId: string }>;
  previewUmzug(
    input: Pick<UmzugInput, 'neue_adresse' | 'stichtag'>,
  ): Promise<UmzugPreview>;
  cancelUmzug(vorgangId: string): Promise<void>;
  /** Setzt `status: 'gelesen'` und schreibt einen `marked_read`-Activity-Log-Eintrag. */
  markiereLetterGelesen(id: string): Promise<void>;
  /** Englisch-Alias für `markiereLetterGelesen`. */
  markLetterAsRead(letterId: string): Promise<void>;
  bestaetigeAutopilotSchritt(
    vorgangId: string,
    schrittId: string,
  ): Promise<void>;
  /**
   * Generischer Bürger:innen-Schritt-Abschluss (WoW-1, „Schritt erledigen").
   * Markiert einen Vorgangs-Schritt als vom Bürger erledigt (`confirmed` +
   * `completed_at`). KEIN Block-D-/eID-Gate (anders als
   * `bestaetigeAutopilotSchritt`); idempotent bei bereits `confirmed` Schritt.
   * Lässt den Gesamt-`vorgang.status` unverändert (Behörde prüft weiter).
   * Emittiert `autopilot_step` für Live-Subscriber.
   */
  erledigeVorgangSchritt(vorgangId: string, schrittId: string): Promise<void>;

  // Posteingang-Capability — Write (NEW)
  /**
   * Legt einen neuen Vorgang aus einem Brief an, setzt `letter.vorgang_id` auf
   * die neue ID und gibt sie zurück. Vorgangstyp aus Mapping (steuerbescheid →
   * `steuer-jahr`, familienkasse-nachweis → `familienkasse`, …).
   */
  erstelleVorgangAusBrief(
    letterId: string,
    vorgangsTyp: ErstelleVorgangAusBriefTyp,
  ): Promise<{ vorgangId: string }>;
  /**
   * Schreibt einen Activity-Log-Eintrag pro Brief. App-interne Aktivität
   * — niemals „Lesebestätigung" oder Read-Receipt zur Behörde.
   */
  protokolliereLetterAktivitaet(
    letterId: string,
    event: LetterActivityEvent,
    options?: { rechtsgrundlage?: string; note?: string },
  ): Promise<void>;

  // V1.5 — Antwort verfassen
  /** Liefert den (einzigen) Draft für einen Brief oder `null`, wenn keiner existiert. */
  getReplyDraft(letterId: string): Promise<ReplyDraft | null>;
  /**
   * Upsert-Operation auf dem Draft eines Briefs. Ruft mehrfach hintereinander
   * sind idempotent — der Aufrufer (Frontend) ist für 2-s-Debounce zuständig.
   * Seteilt einen `reply_draft_saved`-Activity-Log-Eintrag pro Aufruf.
   */
  saveReplyDraft(
    letterId: string,
    partial: Partial<ReplyDraft>,
  ): Promise<ReplyDraft>;
  /** Löscht den Draft eines Briefs + schreibt `reply_draft_deleted`-Eintrag. */
  deleteReplyDraft(letterId: string): Promise<void>;
  /**
   * Mock-Versand: setzt `status === 'sent_simulated'`, `sent_at`, `kanal`.
   * Schreibt `reply_sent_simulated`-Activity-Log-Eintrag. Validiert
   * ELSTER-Realismus-Limits (Anzahl/Größe Anhänge, MIME) und wirft
   * `MockBackendError(REPLY_*)` bei Verletzung.
   *
   * V1.5.1: `receipt_text` wird nicht mehr persistiert (Code-Review BLOCKER #3,
   * 2026-05-09). Frontend rendert die Bestätigungs-Prosa aus `kanal + sent_at`
   * via i18n-Template `posteingang.compose.confirmation.full_receipt_template`.
   */
  sendReplySimulated(letterId: string, draft: ReplyDraft): Promise<Reply>;
  /**
   * Liefert die zuletzt versandte oder gespeicherte Reply für einen Brief
   * (oder `null`). Sortier-Schlüssel: `sent_at` bzw. `created_at`. V1.5.1:
   * Cross-Template-Versand erzeugt mehrere Replies pro Letter; diese
   * Methode gibt den jüngsten Eintrag zurück (Spec § 8.4 Architect-Empfehlung).
   */
  getReplyByLetterId(letterId: string): Promise<Reply | null>;
  /**
   * V1.5.1 — Liefert alle Replies eines Briefs in chronologischer Reihenfolge
   * (sortiert nach `sent_at` ?? `created_at`, aufsteigend). Wird vom
   * `<ReplyConfirmationView>` für den Cross-Template-Versand-Pfad konsumiert
   * (Spec § 8.3, Domain-Doc § 5.D2).
   */
  getRepliesForLetter(letterId: string): Promise<Reply[]>;
  /**
   * Resolves a Reply-Body-Template to a fully-substituted DE-citizen-letter
   * body. Reads the template from `de.json`, substitutes Persona /
   * Letter / Behörden tokens, ICU `{mode, select, …}` for `termin_antwort`,
   * and bracketed `[…]` placeholders for missing user input.
   *
   * `templateId === 'freitext'` → returns empty string.
   *
   * Latency: 100–200 ms; throws `MockBackendError` with code
   *   `PERSONA_NOT_FOUND` / `LETTER_NOT_FOUND` / `TEMPLATE_NOT_FOUND`.
   */
  resolveReplyBody(input: ResolveReplyBodyInput): Promise<string>;

  // ---------------------- V1 Stammdaten — Read ----------------------
  /** Single-Source-of-Truth Read-Model (Spec § 5.1; Hard-Line § 11.19). */
  getStammdaten(personaId: PersonaId): Promise<Stammdaten>;
  /** Activity-Log einer Persona; optional gefiltert nach Sektion / Kategorie. */
  getUebermittlungsLog(
    personaId: PersonaId,
    opts?: {
      limit?: number;
      sektion?: StammdatenSektionId;
      kategorie?: UebermittlungsLogEntry['kategorie'];
    },
  ): Promise<UebermittlungsLogEntry[]>;

  // ---------------------- V1 Stammdaten — Write ----------------------
  /** Hängt einen Eintrag ans Aktivitätsprotokoll an (Umzug-Cascade-Hook). */
  appendStammdatenLogEntry(
    personaId: PersonaId,
    entry: Omit<UebermittlungsLogEntry, 'id'> & { id?: string },
  ): Promise<UebermittlungsLogEntry>;
  /** Religion-Consent (session-only — Hard-Line § 11.4). */
  setReligionSessionConsent(
    personaId: PersonaId,
    consent: boolean,
  ): Promise<{ wert?: string }>;
  /** Auskunftssperre § 51 BMG; Begründung min 30 Zeichen pflicht (§ 11.14). */
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
  /** Wallet-Sub-Tab: 3 fixe Mock-Empfänger (Hard-Line § 11.18). */
  getWalletAttestations(personaId: PersonaId): Promise<WalletAttestation[]>;
  /** Mock-Attestation-Vorschau (preview-only, kein Versand). */
  getWalletAttestationPreview(
    personaId: PersonaId,
    attestationId: string,
  ): Promise<WalletAttestationPreview>;

  // ---------------------- V1.1 Stammdaten — Renten/KV ----------------------
  // Spec: docs/specs/stammdaten-v1-1-renten-kv.md § 5.1.
  // Hard-Lines § 11.21–§ 11.30 (verifier-locked).
  //
  // Hand-off note für assistant-engineer (V1.1):
  //   getAltersvorsorge(personaId)             → Track-A/B/C-Daten + Eckdaten
  //   getKrankenversicherungPflege(personaId)  → KVNR / ePA / Pflegegrad gated
  //   applyYellowLetterBridge({letterId, personaId})
  //                                            → idempotent (§ 11.25)
  //   consentPflegegrad(personaId, consent)    → sessionStorage (§ 11.22)
  //   revokePflegegradConsent(personaId)
  //   getEpaStatus(personaId)                  → Disclaimer-Banner (§ 11.26)

  /**
   * Liefert Altersvorsorge-Sektion einer Persona. Returns `null` für
   * Personas ohne ausreichend gepflegte V1.1-Daten (Track A ohne DRV,
   * unbekannter Track). Track C: returns mit `eckdaten === undefined`
   * (Hard-Line § 11.24 Mehmet-Empty-State).
   */
  getAltersvorsorge(
    personaId: PersonaId,
  ): Promise<NonNullable<Stammdaten['altersvorsorge']> | null>;

  /**
   * Liefert Krankenversicherung-&-Pflege-Sektion einer Persona. Pflegegrad
   * ist nur sichtbar bei `pflegegrad_consent.consent_session === true`
   * (Hard-Line § 11.22). Anrechnungszeit Pflege ist semantisch gekoppelt
   * (Hard-Line § 11.30 — gleicher Toggle).
   */
  getKrankenversicherungPflege(
    personaId: PersonaId,
  ): Promise<NonNullable<Stammdaten['krankenversicherung_pflege']> | null>;

  /**
   * Yellow-Letter-Bridge — übernimmt RentenEckdaten aus einem Posteingang-
   * Brief (§ 109 Abs. 3 SGB VI, 5 Pflicht-Inhalte) in die Stammdaten-Sektion
   * Altersvorsorge.
   *
   * Hard-Line § 11.25 Idempotenz: bei wiederholtem Aufruf mit demselben
   * `letter_id` returns `{ applied: false }` und emittiert
   * `stammdaten/yellow-letter-bridge-skipped-idempotent` ohne Activity-Log-
   * Eintrag. Page-Reload-stabil (Bucket persistiert in localStorage).
   */
  applyYellowLetterBridge(args: {
    letter_id: string;
    persona_id: PersonaId;
  }): Promise<YellowLetterBridgeResult>;

  /**
   * Pflegegrad-Consent (session-only, NICHT in localStorage — Hard-Line § 11.22).
   * Pattern erbt von V1-Religion-Consent (§ 11.4) mit separatem
   * sessionStorage-Key `govtech-de:v1:stammdaten:pflegegrad-consent-session`.
   *
   * Bei `consent === true`: schreibt Activity-Log-Eintrag mit
   * `Art. 9 Abs. 2 lit. a DSGVO i.V.m. § 14 SGB XI`. Bei `false`: Revoke
   * ohne Log.
   */
  consentPflegegrad(personaId: PersonaId, consent: boolean): Promise<void>;

  /** Hard-Reset Pflegegrad-Session-Consent (z. B. bei Persona-Switch). */
  revokePflegegradConsent(personaId: PersonaId): Promise<void>;

  /**
   * Liefert ePA-Status (für `<EpaStatusFieldCard>` Disclaimer-Banner).
   * Schreibt `epa-banner-seen`-Activity-Log-Eintrag mit zwei-Norm-Zitat
   * `§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V` (Hard-Line § 11.26).
   */
  getEpaStatus(personaId: PersonaId): Promise<EpaStatus>;

  // ---------------------- V1.2 Stammdaten — Kontakt-Schicht ----------------------
  // Spec: docs/specs/stammdaten-v1-1-kontakt-schicht.md § 5.1.
  // Hard-Lines § 11.31–§ 11.41 (verifier-locked).
  //
  // Hand-off note für assistant-engineer (V1.2):
  //   getKontakt(personaId)                       → BundID-Postfach + E-Mail + Mobilfunk + Notification
  //   getNotificationPraeferenzen(personaId)      → 5-Kategorien-Map
  //   getBehoerdeAnbindung(behoerdeId)            → 'angebunden' | 'in_pilotierung' | 'nicht_angebunden'
  //   toggleNotificationPraeferenz(personaId, kategorie, kanal)
  //                                               → counter + optional cascade (Hero: familie × postfach)
  //   simulatePostfachAktivierung(personaId)      → Demo-Only (Hard-Line § 11.32)
  //   simulateMobilOtpFlow(personaId, {code})     → Mock-OTP, akzeptiert MOCK_OTP_DEMO_CODE
  //   simulateFamilienkasseFollowupLetter(personaId)
  //                                               → Hero-Cascade-Bridge zum Posteingang

  /**
   * Liefert den V1.2-Kontakt-Snapshot der Persona (BundID-Postfach + E-Mail
   * + Mobilfunk + Notification-Präferenzen). Lazy-Init bei erstem Aufruf.
   * Spec § 5.1.
   */
  getKontakt(personaId: PersonaId): Promise<PersonaKontakt>;

  /** Liefert nur die Notification-Präferenzen (5-Kategorien-Map). */
  getNotificationPraeferenzen(
    personaId: PersonaId,
  ): Promise<NotificationPraeferenzen>;

  /**
   * Liefert den BundID-Postfach-Anbindungs-Status einer Behörde
   * (Pflicht-Feld; Hard-Line § 11.35). Wirft `BEHOERDE_NOT_FOUND` bei
   * unbekannter Behörde.
   */
  getBehoerdeAnbindung(
    behoerdeId: string,
  ): Promise<BundidPostfachAnbindung>;

  /**
   * Wechselt die Notification-Präferenz für eine Kategorie. Schreibt einen
   * Activity-Log-Eintrag Kategorie `speculative_2027` (Hard-Line § 11.40).
   *
   * Counter-Werte aus `SAVINGS_LOOKUP` (Spec § 5.5). Bei Hero-Pfad
   * (Anna × `familie` × `postfach`) wird zusätzlich `cascade`-Daten
   * zurückgegeben — Frontend triggert dann die Cross-fade-Animation und
   * `simulateFamilienkasseFollowupLetter()`.
   *
   * Hard-Lock § 11.35: drittstaatsangehörige Personas + Kategorie `sonstige`
   * + Kanal !== `brief` → wirft `BUNDID_HARD_LOCK_ABH`, wenn die zuständige
   * ABH `nicht_angebunden` ist.
   */
  toggleNotificationPraeferenz(
    personaId: PersonaId,
    kategorie: VorgangsKategorie,
    kanal: NotificationKanal,
  ): Promise<ToggleNotificationPraeferenzResult>;

  /**
   * Demo-Only: simuliert Postfach-Aktivierung (Hard-Line § 11.32 — in V1.2
   * NICHT im UI als CTA verfügbar; ausschließlich Test-Helper / DevTools).
   */
  simulatePostfachAktivierung(
    personaId: PersonaId,
  ): Promise<{ aktiviert_am: string }>;

  /**
   * Mock-OTP-Flow für Mobilfunk. Akzeptiert immer Code `124857`
   * (`MOCK_OTP_DEMO_CODE`); alle anderen Werte werfen `OTP_INVALID`.
   * Bei verified=true: Activity-Log Kategorie `app_aktivitaet`.
   * Spec § 5.1; kein echter SMS-Versand (Hard-Line § 11.37).
   */
  simulateMobilOtpFlow(
    personaId: PersonaId,
    args: { code: string },
  ): Promise<{ verified: boolean }>;

  /**
   * Hero-Demo-Specific: erzeugt nach Familie-Kategorie-Wechsel auf `postfach`
   * eine Mock-Postfach-Nachricht der Familienkasse als Bridge zum Posteingang.
   *
   * - Fügt `letter-familienkasse-bewilligung-postfach-followup` zum Letters-
   *   Bucket hinzu, mit `kanal: 'postfach'`.
   * - 1 Activity-Log-Eintrag Kategorie `behoerde_zu_buerger`.
   * - Idempotent: bei Re-Aufruf wird der existing letter zurückgegeben.
   *
   * Spec § 9 Mock-Letter-Bridge.
   */
  simulateFamilienkasseFollowupLetter(personaId: PersonaId): Promise<Letter>;

  // ---------------------- V1.3 Stammdaten — Mobilität ----------------------
  // Spec: docs/specs/stammdaten-v1-3-mobilitaet.md § 6.
  // Hard-Lines § 11.1–§ 11.14 (verifier-locked).
  //
  // Hand-off note für assistant-engineer (V1.3):
  //   getMobilitaet(personaId)              → Mobilitaet-Snapshot oder null
  //   getPunktestandOnDemand(personaId)     → FAER-on-demand-Result, TTL 5 min,
  //                                            niemals persistiert (HL-MOB-11)
  //   getMdlAttestation(personaId)          → mDL-Mock-Status, 'not_issued' Default
  //   getUmzugVorgaengeFinished(personaId)  → für Halter-Adresse-Bridge-Detection
  //   setHalterAdresseUebergangsMarker(personaId, vorgangId)
  //                                            → autopilot-callable, idempotent

  /**
   * Liefert den V1.3-Mobilität-Snapshot der Persona oder `null` für Sub-
   * Personas (Lena Schmidt — Empty-State-Render). Spec § 6.1.
   */
  getMobilitaet(personaId: PersonaId): Promise<Mobilitaet | null>;

  /**
   * On-demand FAER-Pull. Result hat `ttl_seconds === 300`, lebt component-
   * local und wird **niemals** in `localStorage` geschrieben (HL-MOB-11 / VL-8).
   * Schreibt einen `app_aktivitaet`-Activity-Log-Eintrag pro Pull.
   *
   * Spec § 6.2.
   */
  getPunktestandOnDemand(
    personaId: PersonaId,
  ): Promise<PunktestandPullResult>;

  /**
   * Liefert den Mock-Status der mDL-Attestation einer Persona. In V1.3 für
   * alle 3 Personas `status: 'not_issued'`; Preview-Data wird aus der
   * Fahrerlaubnis befüllt. Spec § 6.3.
   */
  getMdlAttestation(
    personaId: PersonaId,
  ): Promise<MdlAttestationMock | null>;

  /**
   * Hilfs-Read für `<HalterAdresseFieldCard>`-Übergangs-Marker-Detection.
   * Spec § 6.4.
   */
  getUmzugVorgaengeFinished(
    personaId: PersonaId,
  ): Promise<UmzugVorgangSummary[]>;

  /**
   * Autopilot-Hook (Spec § 9.3): nach erfolgreicher Block-D-eID-Bestätigung
   * für eine KFZ-Behörde setzt diese Methode den Übergangs-Marker auf der
   * Halter-Adresse + Activity-Log + Bucket-Persistenz. Idempotent
   * (Vorgang-Ref-Lookup).
   */
  setHalterAdresseUebergangsMarker(
    personaId: PersonaId,
    vorgangId: string,
  ): Promise<void>;

  // ---------------------- Redesign — Dashboard ----------------------
  // Spec: docs/specs/dashboard.md § 5.1 + docs/specs/redesign-dashboard.md.
  //
  // Hand-off note für assistant-engineer:
  //   getCandidatesForTopActions(personaId) liefert strukturierte Eingaben
  //   (KEINE Brief-Bodies). `prioritizeTopActions(candidates)` ist AI-seitig
  //   (Anthropic-Tool-Use); hier nur ein deterministischer Frist-Fallback-Stub
  //   (Hard-Line § 11.44) — assistant-engineer ersetzt die Implementierung.

  /** Aggregierter Dashboard-Snapshot. Latenz 600–900 ms. */
  getDashboard(
    personaId: PersonaId,
    opts?: { last_seen_at?: string },
  ): Promise<DashboardSnapshot>;
  /** Persistiert den deviceLocal lastSeenAt-Timestamp. */
  setLastSeen(personaId: PersonaId, timestamp: string): Promise<void>;
  /**
   * Liest den deviceLocal last-seen-Timestamp (oder den geseedeten prior-login
   * beim Erst-Load). `null` = echter Erst-Login ohne Seed. Damit kann das
   * Frontend den „Seit letztem Login"-Diff auf den realen gespeicherten Stand
   * stützen, statt einen Anker zu raten.
   */
  getLastSeen(personaId: PersonaId): Promise<string | null>;
  /** Liest den persistierten Sort-Mode der „Heute zu tun"-Liste. Default `'ki'`. */
  getDashboardSortMode(personaId: PersonaId): Promise<DashboardSortMode>;
  /** Persistiert den Sort-Mode der „Heute zu tun"-Liste. */
  setDashboardSortMode(
    personaId: PersonaId,
    mode: DashboardSortMode,
  ): Promise<void>;
  /** Datenschutz-Cockpit-Tile-Snapshot (App-Activity-Aggregat 30 Tage). */
  getDsc(personaId: PersonaId): Promise<DscSnapshot>;
  /** Strukturierte AI-Top-3-Kandidaten (keine Brief-Bodies). */
  getCandidatesForTopActions(
    personaId: PersonaId,
  ): Promise<TopActionCandidateInput[]>;
  /** Proaktive Lebenslagen-Hinweise (Empty-State + Below-Hero). */
  getLebenslagenHinweise(
    personaId: PersonaId,
  ): Promise<LebenslagenHinweis[]>;
  /**
   * AI-seitiger Ranking-Stub (assistant-engineer-owned). Liefert hier den
   * deterministischen Frist-Fallback; läuft NICHT durch `withLatency()`.
   */
  prioritizeTopActions(
    candidates: TopActionCandidateInput[],
  ): Promise<PrioritizedTopAction[]>;

  // ---------------------- Redesign — Dokumente ----------------------
  // `getDocuments()` (bestehend) reichert beim Laden eine abgeleitete
  // `kategorie` an, falls nicht gesetzt (Signatur unverändert).

  // ---------------------- Redesign — Termine ----------------------
  // Spec: docs/specs/redesign-termine.md § 6.
  //
  // Hand-off note für assistant-engineer: künftiges Tool `get_reminders`
  // spiegelt `getReminders()`.

  /** Erinnerungen/Fristen der aktiven Persona (Seed + abgeleitet aus Vorgang.fristen[]). */
  getReminders(): Promise<Reminder[]>;

  // ---------------------- Convenience-Pass-1 (§B1 / §A5 / §A-katalog / §C3) ----------------------
  /**
   * §B1 — Wertquittung eines Umzug-Laufs. `null` bis ≥ 1 Schritt bestätigt ist.
   * Alle Zahlen konservativ ("ca.") aus docs/domain/umzug-konvenienz-und-normen.md.
   */
  getValueReceipt(vorgangId: string): Promise<ValueReceipt | null>;
  /**
   * §A5 — alle vorgang_id-verlinkten Artefakte eines Vorgangs (für Detail-View +
   * "Gehört zu"-Chips). Owner-gefiltert über die bereits geseedeten Buckets.
   */
  getVorgangRelated(vorgangId: string): Promise<{
    letters: Letter[];
    documents: VaultDocument[];
    termine: Termin[];
    reminders: Reminder[];
  }>;
  /** §A-katalog — Teaser-Liste der Autopilot-Lebenslagen (Umzug live, Rest demnächst). */
  getAutopilotKatalog(): Promise<AutopilotKatalogEntry[]>;
  /** §C3 — CLEARLY-MOCKED EUDI-Wallet-Export-Vorschau (nie ein echter Export). */
  exportiereDokumentEudi(docId: string): Promise<EudiExportPreview>;

  // ---------------------- Convenience-Pass-1 (§C2 Termine-Ops) ----------------------
  bestaetigeTerminVorschlag(terminId: string): Promise<void>;
  verschiebeTermin(terminId: string, neuesDatumIso: string): Promise<void>;
  sageTerminAb(terminId: string): Promise<void>;

  // ---------------------- Convenience-Pass-1 (§C4 Reminder-Ops) ----------------------
  markReminderDone(reminderId: string): Promise<void>;
  snoozeReminder(reminderId: string, tage: number): Promise<void>;

  // ---------------------- Redesign — Steuer ----------------------
  // Spec: docs/specs/redesign-steuer.md § 6.

  /** Vorausgefüllte Steuer-Übersicht der aktiven Persona für ein Jahr. */
  getSteuerUebersicht(
    personaId: PersonaId,
    steuerjahr: number,
  ): Promise<SteuerUebersicht>;

  // ---------------------- Redesign — Familie ----------------------
  // Spec: docs/specs/redesign-familie.md § 6.

  /** „Mein Haushalt"-View (read-only, aus Persona abgeleitet). */
  getFamilie(personaId: PersonaId): Promise<HaushaltView>;

  // ---------------------- Redesign — Datenschutz-Cockpit ----------------------
  // Spec: docs/specs/redesign-datenschutz.md § 6. Reuse `getUebermittlungsLog`
  // für die Timeline (kein paralleler Log).

  /** Einwilligungs-Toggle-Zustände (lazy-init aus Seed-Defaults). */
  getDatenschutzEinwilligungen(
    personaId: PersonaId,
  ): Promise<DatenschutzEinwilligung[]>;
  /**
   * Persistiert den Einwilligungs-Toggle + emittiert einen
   * `UebermittlungsLogEntry` (Art. 6/7 DSGVO) in den bestehenden
   * uebermittlungs-log-Bucket.
   */
  setDatenschutzEinwilligung(
    personaId: PersonaId,
    empfaenger: EinwilligungEmpfaenger,
    erteilt: boolean,
  ): Promise<void>;
  /** Datenquellen & Empfänger (read-only, abgeleitet aus Persona + behoerden.json). */
  getDatenquellen(personaId: PersonaId): Promise<DatenquellenEintrag[]>;
  /** Ob der 2027-Vision-Banner für eine Persona dismissed wurde. */
  isVisionBannerDismissed(personaId: PersonaId): Promise<boolean>;
  /** Persistiert den Vision-Banner-Dismiss. */
  dismissVisionBanner(personaId: PersonaId): Promise<void>;

  // ---------------------- Resilient Orchestration Engine — Read ----------------
  // Locked read-contract the UI builds against (Spec § 6). Reads run through
  // `withLatency` (no fault-injection on reads); verify/replay/recovery are
  // direct engine calls (synchronous side-effects + their own events).
  //
  // Hand-off note für frontend-coder:
  //   getSaga(vorgangId)            → SagaInstance | null (sagaId === vorgangId)
  //   getOrchestrationAuditLog(id?) → AuditLogEntry[]   (the Laufzettel/hash-chain)
  //   getDlq()                      → DeadLetterEntry[]  ("Aktion erforderlich")
  //   getBreakers()                 → CircuitBreakerState[] (per-authority chips)
  //   verifyChain()                 → { ok, brokenAtSeq?, count } (tamper proof)
  //   replayDeadLetter(dlqId)       → void (one-tap "Erneut senden")
  //   recoverOnBoot()               → { recovered, degraded } (DR banner)

  /** Saga state machine for a Vorgang (sagaId === vorgangId). `null` if none. */
  getSaga(vorgangId: string): Promise<SagaInstance | null>;
  /** Append-only audit log (hash chain); optionally filtered to one saga. */
  getOrchestrationAuditLog(sagaId?: string): Promise<AuditLogEntry[]>;
  /** Dead-letter queue ("Aktion erforderlich"); replayable entries. */
  getDlq(): Promise<DeadLetterEntry[]>;
  /** Per-authority circuit-breaker states. */
  getBreakers(): Promise<CircuitBreakerState[]>;
  /** Tamper check on the audit hash chain. `ok:false` + brokenAtSeq on break. */
  verifyChain(): Promise<{ ok: boolean; brokenAtSeq?: number; count: number }>;
  /** One-tap DLQ replay: resets attempts → pending, re-enqueues, re-drives. */
  replayDeadLetter(dlqId: string): Promise<void>;
  /** Replay-on-boot recovery; returns count of in-flight sagas reconstructed. */
  recoverOnBoot(): Promise<{ recovered: number; degraded: boolean }>;

  // Subscribe
  subscribe(listener: MockBackendEventListener): () => void;
}

async function bestaetigeImpl(
  vorgangId: string,
  schrittId: string,
): Promise<void> {
  const persona = loadProfile();
  const vorgang = loadVorgaenge().find((v) => v.id === vorgangId);
  if (!vorgang) {
    throw new MockBackendError(`Vorgang "${vorgangId}" nicht gefunden.`, {
      code: 'VORGANG_NOT_FOUND',
      retryable: false,
    });
  }
  const step = vorgang.schritte.find((s) => s.id === schrittId);
  if (!step) {
    throw new MockBackendError(`Schritt "${schrittId}" nicht gefunden.`, {
      code: 'STEP_NOT_FOUND',
      retryable: false,
    });
  }
  if (step.block !== 'D') {
    throw new MockBackendError(
      'Dieser Schritt erfordert keine eID-Bestätigung.',
      { code: 'STEP_NOT_BLOCK_D', retryable: false },
    );
  }

  // Resilient Orchestration Engine (Spec § 5.2): die eID-Gate-Freigabe läuft
  // jetzt über `engine.authorizeStep` — der den Schritt in die Outbox einreiht,
  // durch den Transport treibt und auf positive Quittung die Block-D-Side-
  // Effects über den `onStepSucceeded`-Hook ausführt (identisch zum bisherigen
  // Verhalten: Brief, KFZ-Marker, Stammdaten-Log, Ripple, Completion-Check).
  // Wenn eine Saga für diesen Vorgang existiert, gewinnt der Engine-Pfad.
  const engine = getEngine();
  const saga = engine.getSaga(vorgangId);
  if (saga && saga.steps.some((s) => s.autopilotStepId === schrittId)) {
    const sagaStep = saga.steps.find((s) => s.autopilotStepId === schrittId)!;
    await engine.authorizeStep(vorgangId, sagaStep.stepId);
    return;
  }

  // Legacy-Pfad (kein Engine-Saga vorhanden — z. B. geseedeter Vorgang):
  // unverändertes bisheriges Verhalten.
  const eidConfirmedAt = new Date().toISOString();
  upsertStep(vorgangId, {
    ...step,
    status: 'in_progress',
    eid_confirmed_at: eidConfirmedAt,
  });

  const ms = 800 + Math.random() * 700;
  await new Promise((r) => setTimeout(r, ms));

  const ctxNeueAdresse = vorgang.context?.neue_adresse as
    | UmzugInput['neue_adresse']
    | undefined;
  const stichtag =
    (vorgang.context?.stichtag as string | undefined) ??
    vorgang.fristen.find((f) => f.typ === 'stichtag')?.datum ??
    new Date().toISOString().slice(0, 10);
  let letterId: string | undefined;
  if (ctxNeueAdresse) {
    const synthInput: UmzugInput = {
      neue_adresse: ctxNeueAdresse,
      stichtag,
      betroffene_personen: [persona.id],
    };
    const letter = buildBlockDConfirmation(step, synthInput, persona);
    if (letter) {
      const finalLetter: Letter = { ...letter, vorgang_id: vorgangId };
      appendLetter(finalLetter);
      letterId = finalLetter.id;
    }
  }

  upsertStep(vorgangId, {
    ...step,
    status: 'confirmed',
    eid_confirmed_at: eidConfirmedAt,
    completed_at: new Date().toISOString(),
    letter_id: letterId,
  });

  await applyBlockDSideEffectsLegacy(vorgangId, step, persona);
}

/**
 * Block-D-Side-Effects (KFZ-Marker, Stammdaten-Log, Ripple, Completion-Check) —
 * extrahiert aus `bestaetigeImpl`, damit BEIDE Pfade (Legacy-Generator +
 * Engine-`onStepSucceeded`-Hook) identisches Verhalten haben. Idempotent.
 */
async function applyBlockDSideEffectsLegacy(
  vorgangId: string,
  step: AutopilotStep,
  persona: Persona,
): Promise<void> {
  // V1.3 VL-13 (Spec § 9.3): nach erfolgreicher Block-D-eID-Bestätigung für
  // eine KFZ-Behörde setzt der Autopilot den Übergangs-Marker auf der
  // Halter-Adresse + Activity-Log-Eintrag `kfz_halter_adresse_prefilled_via_umzug`.
  // Idempotent (zweiter Aufruf für denselben Vorgang = no-op).
  if (
    step.behoerde_id.startsWith('kfz-') ||
    step.behoerde_id.startsWith('kfz_')
  ) {
    try {
      await stammdatenV13Api.setHalterAdresseUebergangsMarker(
        persona.id,
        vorgangId,
      );
      appendLogEntry(persona.id, {
        id: `log-${uuid()}`,
        timestamp: new Date().toISOString(),
        kategorie: 'behoerde_zu_buerger',
        field_id: 'kfz_halter_adresse',
        sektion: 'anschrift',
        empfaenger_id: persona.id,
        zweck_i18n_key:
          'stammdaten.aktivitaet.note.kfz_halter_adresse_prefilled_via_umzug',
        rechtsgrundlage: '§ 15 FZV (2023)',
        note: `persona_id:${persona.id}; field_id:kfz_halter_adresse; quelle:umzug_block_d; mock:true; vorgang_id:${vorgangId}`,
      });
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn(
          '[mock-backend] Block-D mobilitaet uebergangs-marker set failed',
          err,
        );
      }
    }
  }

  // Stammdaten-Activity-Log-Hook für Block D (Spec § 8.4): nach erfolgreicher
  // eID-Bestätigung wird eine `behoerde_zu_behoerde`-Übermittlung dokumentiert
  // (KFZ-Halter, Familienkasse, ABH-eAT — jeweils mit der für den Empfänger
  // einschlägigen Spezialnorm).
  try {
    const rechtsgrundlage = step.behoerde_id.startsWith('familienkasse-')
      ? '§§ 67/68 EStG i.V.m. § 36 BMG'
      : step.behoerde_id === 'kfz-berlin-labo'
        ? '§ 15 FZV i.V.m. § 36 BMG'
        : step.behoerde_id === 'abh-berlin-lea'
          // D2 — eID-Basis § 18 PAuswG; §86/§87 AufenthG entfernt (Strafverfolgungs-/
          // Erhebungskanal, NICHT Adresspflege). Kein Melderegister→ABH-Push, daher
          // KEIN § 36 BMG anhängen. Verbatim aus docs/domain/umzug-konvenienz-und-normen.md §2 D2
          // und kanonisch in autopilot/umzug.ts (BLOCK_D + emitStammdatenLogForCascadeStep).
          ? '§ 18 PAuswG'
          : '§ 36 BMG';
    // Generischer Fallback-zweck-Key für alle Block-D-Empfänger (Familienkasse, KFZ,
    // ABH) — es gibt keine empfängerspezifischen zweck-Keys; der kanonische Emitter in
    // autopilot/umzug.ts nutzt denselben Fallback für unzugeordnete Empfänger. (Die ABH-
    // Variante war fälschlich `…_bapersbw` = Bundeswehr-Wehrerfassung; korrigiert.)
    const zweck = 'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt';
    appendLogEntry(persona.id, {
      id: `log-${uuid()}`,
      timestamp: new Date().toISOString(),
      kategorie: 'behoerde_zu_behoerde',
      field_id: 'anschrift_aktuell',
      sektion: 'anschrift',
      absender_behoerde_id: 'buergeramt-berlin-mitte',
      empfaenger_id: step.behoerde_id,
      zweck_i18n_key: zweck,
      rechtsgrundlage,
      note: `persona_id:${persona.id}; field_id:anschrift_aktuell; quelle:umzug_cascade_block_d; mock:true`,
    });
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[mock-backend] Block-D stammdaten log emit failed', err);
    }
  }

  // §C1 — nach jedem bestätigten Block-D-Schritt durable Artefakte minten
  // (KFZ → Zulassungsbescheinigung, ABH → LEA-Termin). Idempotent.
  const afterStep = loadVorgaenge().find((v) => v.id === vorgangId);
  if (afterStep && afterStep.typ === 'umzug') {
    applyUmzugRipple(afterStep, persona);
  }

  const after = loadVorgaenge().find((v) => v.id === vorgangId);
  if (after && isVorgangFullyResolved(after) && after.status !== 'abgeschlossen') {
    changeVorgangStatus(vorgangId, 'abgeschlossen');
    const done = loadVorgaenge().find((v) => v.id === vorgangId);
    if (done && done.typ === 'umzug') {
      applyUmzugRipple(done, persona);
      // §6c — Verifiable Once-Only: mint the re-verifiable Meldebestätigung at
      // the success point. Additive: never blocks the cascade.
      await mintVerifiableOnceOnly(done, persona);
    }
  }
}

// ----------------------------------------------------------------------------
// Resilient Orchestration Engine — Hooks (Spec § 5.1–§ 5.2).
//
// Der Engine ruft diese Hooks, um seinen Saga-State auf den bestehenden
// `AutopilotStep`-Stream zu projizieren (`upsertStep` → `autopilot_step`-Event)
// und die bestehenden Umzug-Side-Effects (Brief-Mint, Block-D-Ripple,
// Stammdaten-Log, Completion) UNVERÄNDERT auszuführen. So sieht die UI denselben
// Event-Stream wie heute — die Engine ist für sie unsichtbar.
// ----------------------------------------------------------------------------

function sagaInputFor(saga: SagaInstance): UmzugInput | undefined {
  const neue = saga.context?.neue_adresse as
    | UmzugInput['neue_adresse']
    | undefined;
  const stichtag = saga.context?.stichtag as string | undefined;
  if (!neue || !stichtag) return undefined;
  return {
    neue_adresse: neue,
    stichtag,
    betroffene_personen: [saga.personaId],
    consents: (saga.context?.consents as string[] | undefined) ?? [],
  };
}

const engineHooks: EngineHooks = {
  projectStep(saga: SagaInstance, step: SagaStep): void {
    // Project the saga step onto the existing AutopilotStep and persist via
    // the unchanged upsertStep (which emits `autopilot_step`).
    upsertStep(saga.vorgangId, projectSagaStep(step));
  },

  async onStepSucceeded(
    saga: SagaInstance,
    step: SagaStep,
  ): Promise<string | undefined> {
    const persona = loadProfile();
    const input = sagaInputFor(saga);
    let letterId: string | undefined;

    // Mint the confirmation letter (Block A/B/D) exactly as the generator did.
    if (input && (step.block === 'A' || step.block === 'B' || step.block === 'D')) {
      const letter = buildCascadeConfirmationLetter({
        behoerdeId: step.behoerdeId,
        block: step.block,
        input,
        persona,
        vorgangId: saga.vorgangId,
      });
      if (letter) {
        const finalLetter: Letter = { ...letter, vorgang_id: saga.vorgangId };
        appendLetter(finalLetter);
        letterId = finalLetter.id;
      }
    }

    // Stammdaten-Activity-Log (Block A/B). Block D runs its dedicated log inside
    // applyBlockDSideEffectsLegacy below.
    if (step.block === 'A' || step.block === 'B') {
      emitStammdatenLogForStep({
        personaId: persona.id,
        empfaengerBehoerdeId: step.behoerdeId,
        block: step.block,
      });
    }

    // Termin-Autopilot-Hero (Spec §2/§4.1/§5): SOBALD der Block-A-Bürgeramt-
    // Anmeldungsschritt erfolgreich ist — d. h. JETZT, vor den sensiblen
    // Block-D-eID-Gates — Meldebestätigung + Anmeldung-Termin-Vorschlag minten,
    // damit die Termin-Folgezeile inline mit der Anmeldung erscheint („ohne
    // neuen Klick"). NICHT erst am Saga-Terminal (das wäre nach den eID-Taps).
    // Idempotent über die deterministischen IDs (Saga-Terminal-Ripple = No-op).
    if (step.block === 'A' && step.behoerdeId === 'buergeramt-berlin-mitte') {
      const v = loadVorgaenge().find((x) => x.id === saga.vorgangId);
      if (v && v.typ === 'umzug') {
        mintBuergeramtAnmeldungArtefakte(v, persona);
      }
    }

    // Block-D side-effects: KFZ marker, Block-D stammdaten log, ripple,
    // completion check (idempotent). The projected AutopilotStep already has
    // letter_id assigned by the engine; pass a confirmed AutopilotStep shape.
    if (step.block === 'D') {
      const autopilotStep: AutopilotStep = {
        ...projectSagaStep(step),
        status: 'confirmed',
        letter_id: letterId,
        completed_at: step.completedAt ?? new Date().toISOString(),
        eid_confirmed_at: step.startedAt ?? new Date().toISOString(),
      };
      // Persist the letter_id onto the projected step before side-effects read it.
      upsertStep(saga.vorgangId, autopilotStep);
      try {
        await applyBlockDSideEffectsLegacy(saga.vorgangId, autopilotStep, persona);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn('[mock-backend] engine Block-D side-effects failed', err);
        }
      }
    }

    return letterId;
  },

  async onSagaTerminal(saga: SagaInstance): Promise<void> {
    // Ripple after Block A/B (Meldebestätigung document etc.) + completion. The
    // Block-D ripple already ran per-step in applyBlockDSideEffectsLegacy.
    const persona = loadProfile();
    const v = loadVorgaenge().find((x) => x.id === saga.vorgangId);
    if (v && v.typ === 'umzug') applyUmzugRipple(v, persona);

    if (saga.status === 'completed') {
      // The SAGA itself is the completion authority: `completed` already means
      // all REQUIRED steps (Block-A statutory + Block-D eID) are terminal AND no
      // ENQUEUED optional step is in flight (engine.evaluateSaga, BLOCKER 1).
      // Do NOT re-gate on `isVorgangFullyResolved` over the projected steps here:
      // a consented-but-never-authorised Block-B recipient (Krankenkasse /
      // Arbeitgeber) stays projected as `pending_eid_confirmation`/pending — that
      // is the citizen's SEPARATE later action, not an unfinished required step,
      // and must not stop the value receipt / `abgeschlossen` transition from
      // mounting once the required cascade is done. (The legacy non-saga path
      // keeps its own `isVorgangFullyResolved` guard, unchanged.)
      const fresh = loadVorgaenge().find((x) => x.id === saga.vorgangId);
      if (fresh && fresh.status !== 'abgeschlossen') {
        changeVorgangStatus(saga.vorgangId, 'abgeschlossen');
        const done = loadVorgaenge().find((x) => x.id === saga.vorgangId);
        if (done && done.typ === 'umzug') {
          applyUmzugRipple(done, persona);
          // §6c — Verifiable Once-Only mint at the success point (additive).
          await mintVerifiableOnceOnly(done, persona);
        }
      }
    }
  },
};

// Wire the hooks into the engine once at module init.
setEngineHooks(engineHooks);
// Suppress unused-import lint for the compensation-target re-export (referenced
// in tests + documents which Behörde carries the demo compensation).
void COMPENSATION_TARGET_BEHOERDE;

/**
 * Generischer Bürger:innen-Schritt-Abschluss (WoW-1). Markiert einen einzelnen
 * Vorgangs-Schritt als vom Bürger erledigt — z. B. „Nachweis zur Fortzahlung
 * einreichen" bei der Familienkasse.
 *
 * Abgrenzung zu `bestaetigeImpl`: KEIN Block-D-/eID-Gate. Dies ist ein vom
 * Bürger selbst abgeschlossener Schritt (typischerweise `block: 'C'`,
 * `status: 'self_assigned'`). Der Gesamt-`vorgang.status` bleibt UNVERÄNDERT:
 * der Bürger hat SEINEN Teil erledigt, die Behörde prüft weiterhin (ehrliche
 * Rahmung). Idempotent: ein bereits `confirmed` Schritt bleibt unverändert.
 */
async function erledigeVorgangSchrittImpl(
  vorgangId: string,
  schrittId: string,
): Promise<void> {
  const vorgang = loadVorgaenge().find((v) => v.id === vorgangId);
  if (!vorgang) {
    throw new MockBackendError(`Vorgang "${vorgangId}" nicht gefunden.`, {
      code: 'VORGANG_NOT_FOUND',
      retryable: false,
    });
  }
  const step = vorgang.schritte.find((s) => s.id === schrittId);
  if (!step) {
    throw new MockBackendError(`Schritt "${schrittId}" nicht gefunden.`, {
      code: 'STEP_NOT_FOUND',
      retryable: false,
    });
  }

  // Idempotenz: bereits erledigte Schritte unverändert lassen.
  if (step.status === 'confirmed') return;

  // Nur den einen Schritt bestätigen; `upsertStep` emittiert `autopilot_step`,
  // sodass Live-Subscriber (Detail-Screen) refetchen können. Der Gesamt-Status
  // des Vorgangs wird bewusst NICHT angefasst (Behörde prüft weiter).
  upsertStep(vorgangId, {
    ...step,
    status: 'confirmed',
    completed_at: new Date().toISOString(),
  });
}

async function runAutopilotInBackground(ctx: {
  vorgangId: string;
  input: UmzugInput;
  persona: Persona;
}): Promise<void> {
  try {
    for await (const yieldVal of umzugAutopilot(ctx)) {
      const { step, letter } = yieldVal;
      if (letter) {
        // Bezug zum Vorgang sicherstellen.
        const finalLetter: Letter = { ...letter, vorgang_id: ctx.vorgangId };
        appendLetter(finalLetter);
        upsertStep(ctx.vorgangId, { ...step, letter_id: finalLetter.id });
      } else {
        upsertStep(ctx.vorgangId, step);
      }

      // Termin-Autopilot-Hero (Spec §2/§4.1/§5): SOBALD der Block-A-Bürgeramt-
      // Anmeldungsschritt im Stream bestätigt ist — d. h. inline mit der
      // Anmeldung, vor den späteren Block-D-eID-Bestätigungen (über bestaetige-
      // Impl) — Meldebestätigung + Anmeldung-Termin-Vorschlag minten. Idempotent
      // über die deterministischen IDs (späterer Ripple = No-op).
      if (
        step.behoerde_id === 'buergeramt-berlin-mitte' &&
        step.status === 'confirmed'
      ) {
        const v = loadVorgaenge().find((x) => x.id === ctx.vorgangId);
        if (v && v.typ === 'umzug') {
          mintBuergeramtAnmeldungArtefakte(v, ctx.persona);
        }
      }
    }
    // §C1 — Ripple nach Block A/B (Meldebestätigung-Document; KFZ/ABH folgen
    // beim Block-D-Confirm in bestaetigeImpl). Idempotent.
    const mid = loadVorgaenge().find((x) => x.id === ctx.vorgangId);
    if (mid && mid.typ === 'umzug') applyUmzugRipple(mid, ctx.persona);

    const v = loadVorgaenge().find((x) => x.id === ctx.vorgangId);
    if (v && isVorgangFullyResolved(v) && v.status !== 'abgeschlossen') {
      changeVorgangStatus(ctx.vorgangId, 'abgeschlossen');
      const done = loadVorgaenge().find((x) => x.id === ctx.vorgangId);
      if (done && done.typ === 'umzug') {
        applyUmzugRipple(done, ctx.persona);
        // §6c — Verifiable Once-Only mint at the success point (additive).
        await mintVerifiableOnceOnly(done, ctx.persona);
      }
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error('[mock-backend] umzug autopilot crashed', err);
    }
  }
}

/**
 * TEST-ONLY seam for the six resilience e2e proofs (Spec § 7). Delegates to the
 * SAME `getEngine()` singleton `startUmzug`/`authorizeStep` drive — so a re-drive
 * across the `'use client'` boundary reaches the live saga (proofs b/c/d). It is
 * NEVER attached in prod: see `attachOrchestrationTestSeam()` below, gated on the
 * orch-test/reliable flag.
 */
export interface OrchestrationTestSeam {
  /** Install + advance the fake engine clock so scheduled retries become drainable. */
  installFakeClock(): void;
  tick(ms: number): void;
  /** Re-drive the live saga's outbox on the engine `startUmzug` uses. */
  drain(sagaId: string): Promise<void>;
}

export const api: MockBackendApi & {
  /** Architecture.md-konformer Alias mit Umlaut. */
  bestätigeAutopilotSchritt(
    vorgangId: string,
    schrittId: string,
  ): Promise<void>;
  /** TEST-ONLY (§ 7) — present only behind the orch-test/reliable flag. */
  __orchestrationTest?: OrchestrationTestSeam;
} = {
  // ---------- Read ----------
  getProfile: () => withLatency(() => loadProfile()),

  getBehoerden: () => withLatency(() => loadBehoerden()),

  getBehoerde: (id: string) =>
    withLatency(() => {
      const found = loadBehoerden().find((b) => b.id === id);
      if (!found) {
        throw new MockBackendError(`Behörde "${id}" nicht gefunden.`, {
          code: 'BEHOERDE_NOT_FOUND',
          retryable: false,
        });
      }
      return found;
    }),

  getLetters: (filter?: LetterFilter) =>
    withLatency(() => {
      let letters = loadLetters();
      if (filter?.unread) letters = letters.filter((l) => l.status === 'ungelesen');
      if (filter?.vorgang_id)
        letters = letters.filter((l) => l.vorgang_id === filter.vorgang_id);
      if (filter?.archetype)
        letters = letters.filter((l) => l.archetype === filter.archetype);
      if (filter?.aktenzeichen_query) {
        const q = filter.aktenzeichen_query.toLowerCase();
        letters = letters.filter((l) => {
          if (l.aktenzeichen.toLowerCase().includes(q)) return true;
          return (l.aktenzeichen_weitere ?? []).some((a) =>
            a.toLowerCase().includes(q),
          );
        });
      }
      if (filter?.behoerden_kategorie) {
        const target = filter.behoerden_kategorie;
        const behoerden = loadBehoerden();
        const kategorieById = new Map(behoerden.map((b) => [b.id, b.kategorie]));
        letters = letters.filter(
          (l) => kategorieById.get(l.absender_behoerde_id) === target,
        );
      }
      if (filter?.frist_innerhalb_tage !== undefined) {
        const horizon = filter.frist_innerhalb_tage;
        const now = Date.now();
        const horizonMs = horizon * 24 * 60 * 60 * 1000;
        letters = letters.filter((l) =>
          (l.fristen ?? []).some((f) => {
            const d = new Date(f.datum).getTime();
            return !Number.isNaN(d) && d - now <= horizonMs && d - now >= 0;
          }),
        );
      }
      if (filter?.status && filter.status.length > 0) {
        const wanted = filter.status;
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        letters = letters.filter((l) => {
          for (const w of wanted) {
            if (w === 'ungelesen' || w === 'gelesen' || w === 'erledigt') {
              if (l.status === w) return true;
            } else if (w === 'frist_abgelaufen') {
              if (
                (l.fristen ?? []).some(
                  (f) => new Date(f.datum).getTime() < now,
                )
              ) {
                return true;
              }
            } else if (w === 'frist_unter_7d') {
              if (
                (l.fristen ?? []).some((f) => {
                  const d = new Date(f.datum).getTime();
                  return d - now > 0 && d - now <= sevenDaysMs;
                })
              ) {
                return true;
              }
            } else if (w === 'frist_ueber_7d') {
              if (
                (l.fristen ?? []).some(
                  (f) => new Date(f.datum).getTime() - now > sevenDaysMs,
                )
              ) {
                return true;
              }
            }
          }
          return false;
        });
      }
      if (filter?.vorgang_status && filter.vorgang_status.length > 0) {
        const vorgaenge = loadVorgaenge();
        const statusById = new Map(vorgaenge.map((v) => [v.id, v.status]));
        const wanted = new Set(filter.vorgang_status);
        letters = letters.filter((l) => {
          if (!l.vorgang_id) return false;
          const status = statusById.get(l.vorgang_id);
          return status !== undefined && wanted.has(status);
        });
      }
      return [...letters].sort((a, b) =>
        b.empfangen_am.localeCompare(a.empfangen_am),
      );
    }),

  getLetter: (id: string) =>
    withLatency(() => {
      const letter = loadLetters().find((l) => l.id === id);
      if (!letter) {
        throw new MockBackendError(`Brief "${id}" nicht gefunden.`, {
          code: 'LETTER_NOT_FOUND',
          retryable: false,
        });
      }
      return letter;
    }),

  getLetterById: (id: string) =>
    withLatency<Letter | null>(
      () => loadLetters().find((l) => l.id === id) ?? null,
    ),

  getVorgang: (id: string) =>
    withLatency(() => {
      const v = loadVorgaenge().find((x) => x.id === id);
      if (!v) {
        throw new MockBackendError(`Vorgang "${id}" nicht gefunden.`, {
          code: 'VORGANG_NOT_FOUND',
          retryable: false,
        });
      }
      return v;
    }),

  getVorgaenge: (filter?: VorgangFilter) =>
    withLatency(() => {
      let vorgaenge = loadVorgaenge();
      if (filter?.typ) vorgaenge = vorgaenge.filter((v) => v.typ === filter.typ);
      if (filter?.status) {
        const allowed = Array.isArray(filter.status) ? filter.status : [filter.status];
        vorgaenge = vorgaenge.filter((v) => allowed.includes(v.status));
      }
      return [...vorgaenge].sort((a, b) =>
        b.angelegt_am.localeCompare(a.angelegt_am),
      );
    }),

  getDocuments: () =>
    withLatency(() =>
      loadDocuments().map((d) =>
        d.kategorie ? d : { ...d, kategorie: deriveDocumentKategorie(d.typ) },
      ),
    ),

  getTermine: () =>
    withLatency(() =>
      [...loadTermine()].sort((a, b) => a.datum.localeCompare(b.datum)),
    ),

  // ---------- Write ----------
  previewUmzug: (input) =>
    withLatency(() => {
      const persona = loadProfile();
      return buildUmzugPreview(persona, input);
    }),

  startUmzug: (input: UmzugInput) =>
    withLatency(() => {
      ensureBooted();
      const persona = loadProfile();
      const vorgangId = `vorgang-${uuid()}`;
      const angelegtAm = new Date().toISOString();

      const wohnungsgeberDoc = createWohnungsgeberDoc(input, vorgangId);
      if (wohnungsgeberDoc) {
        const docs = loadDocuments();
        docs.push(wohnungsgeberDoc);
        saveDocuments(docs);
        emit({ type: 'document_added', document: wohnungsgeberDoc });
      }

      const stichtagDate = new Date(input.stichtag);
      const bmg17Frist = Number.isNaN(stichtagDate.getTime())
        ? new Date()
        : new Date(stichtagDate);
      bmg17Frist.setUTCDate(bmg17Frist.getUTCDate() + 14);

      const vorgang: Vorgang = {
        id: vorgangId,
        typ: 'umzug',
        titel: `Umzug nach ${input.neue_adresse.ort}`,
        status: 'angelegt',
        beteiligte_behoerden_ids: [],
        schritte: [],
        fristen: [
          { typ: 'bmg_17', datum: bmg17Frist.toISOString().slice(0, 10) },
          { typ: 'stichtag', datum: input.stichtag },
        ],
        angelegt_am: angelegtAm,
        persona_id: persona.id,
        context: {
          alte_adresse: input.alte_adresse ?? persona.adresse,
          neue_adresse: input.neue_adresse,
          stichtag: input.stichtag,
          consents: input.consents ?? [],
          source: input.source ?? 'ui',
        },
      };
      const vorgaenge = loadVorgaenge();
      vorgaenge.push(vorgang);
      saveVorgaenge(vorgaenge);
      emit({ type: 'vorgang_created', vorgangId });

      // Block C-Schritte direkt schreiben.
      for (const c of buildUmzugPreview(persona).block_c) {
        const cStep: AutopilotStep = {
          id: `step-${uuid()}`,
          behoerde_id: `self:${c.id}`,
          block: 'C',
          aktion: c.titel,
          rechtsgrundlage: '—',
          status: 'self_assigned',
          started_at: angelegtAm,
        };
        upsertStep(vorgangId, cStep);
      }

      recordConsent(input.consents ?? [], 'umzug:adressaenderung');

      // Resilient Orchestration Engine (Spec § 5.1): statt des fire-and-forget
      // Async-Generators (`runAutopilotInBackground`) baut + startet
      // `startUmzug` jetzt eine echte Saga. Der Engine treibt die Kaskade,
      // projiziert jeden Saga-Schritt über `upsertStep` zurück auf den
      // bestehenden `AutopilotStep`-Stream (`autopilot_step`-Event) und mintet
      // dieselben Briefe an denselben Erfolgs-Punkten — die UI sieht den
      // identischen Event-Stream. Block-A (auto) läuft sofort durch; Block-D
      // (eID) + Block-B (consent) warten auf `engine.authorizeStep`.
      //
      // Deferred-Emit-Fix (Stage 2) bleibt: der Saga-Lauf wird im gekapselten
      // Request-Kontext (Store + Bus + Reliable-Flag) ausgeführt, damit
      // verzögerte `emit()`-Aufrufe auf dem Session-Bus / Session-Store landen.
      // Im Browser/Default-Pfad ist der Snapshot leer → identisches Verhalten.
      const { saga } = buildUmzugSaga(persona, input, vorgangId);
      const ctxSnapshot = captureContext();
      void runWithCapturedContext(ctxSnapshot, () =>
        getEngine()
          .startSaga(saga)
          .catch((err) => {
            if (typeof console !== 'undefined') {
              console.error('[mock-backend] umzug saga crashed', err);
            }
          }),
      );

      return { vorgangId };
    }),

  cancelUmzug: (vorgangId: string) =>
    withLatency(() => {
      const v = updateVorgang(vorgangId, (vor) => ({
        ...vor,
        schritte: vor.schritte.map((s) =>
          s.status === 'confirmed' || s.status === 'self_assigned'
            ? s
            : {
                ...s,
                status: 'failed' as const,
                completed_at: new Date().toISOString(),
                failure_reason: 'Vom Nutzer abgebrochen',
              },
        ),
      }));
      if (!v) {
        throw new MockBackendError(`Vorgang "${vorgangId}" nicht gefunden.`, {
          code: 'VORGANG_NOT_FOUND',
          retryable: false,
        });
      }
      changeVorgangStatus(vorgangId, 'abgelehnt');
    }),

  markiereLetterGelesen: (id: string) =>
    withLatency(() => {
      const letters = loadLetters();
      const idx = letters.findIndex((l) => l.id === id);
      if (idx === -1) {
        throw new MockBackendError(`Brief "${id}" nicht gefunden.`, {
          code: 'LETTER_NOT_FOUND',
          retryable: false,
        });
      }
      if (letters[idx].status !== 'ungelesen') return;
      letters[idx] = { ...letters[idx], status: 'gelesen' };
      saveLetters(letters);
      emit({ type: 'letter_status_changed', letterId: id, status: 'gelesen' });
      // Activity-Log: rein App-interne Markierung — niemals „Lesebestätigung".
      appendActivityLogInternal(id, {
        letter_id: id,
        event: 'marked_read',
        at: new Date().toISOString(),
        by: 'app_internal',
        rechtsgrundlage: 'DSGVO Art. 6 lit. b — Vertrag App-Nutzung',
        note: 'App-interner Lesefortschritt — keine Bekanntgabe-Wirkung iSv § 41 Abs. 2a VwVfG.',
      });
    }),

  // Englisch-Alias — identische Semantik, derselbe Activity-Log-Eintrag.
  // Wir delegieren an die deutsche Methode statt Code zu duplizieren — beim
  // Aufruf ist `api` bereits initialisiert (lazy via Funktions-Body).
  markLetterAsRead(letterId: string) {
    return this.markiereLetterGelesen(letterId);
  },

  bestaetigeAutopilotSchritt: (vorgangId: string, schrittId: string) =>
    withLatency(() => bestaetigeImpl(vorgangId, schrittId)),

  bestätigeAutopilotSchritt: (vorgangId: string, schrittId: string) =>
    withLatency(() => bestaetigeImpl(vorgangId, schrittId)),

  erledigeVorgangSchritt: (vorgangId: string, schrittId: string) =>
    withLatency(() => erledigeVorgangSchrittImpl(vorgangId, schrittId)),

  // ---------- Posteingang-Capability — Read ----------
  extrahiereAktion: (letterId: string) => {
    // Cache-Hit-Pfad: kurz, ~200 ms (Spec §6.2 Note).
    const cached = loadLetters().find((l) => l.id === letterId);
    if (cached?.ai_summary?.post_open) {
      return withLatency<ExtrahiereAktionResult>(
        () => {
          const post = cached.ai_summary!.post_open!;
          return {
            archetype: cached.archetype ?? 'sonstiges',
            auth_channel: cached.auth_channel ?? 'briefpost',
            ai_summary_post_open: post,
            fristen: cached.fristen ?? [],
            was_kann_ich_tun_options: cached.was_kann_ich_tun_options ?? [],
            vorschlaege: [],
            citation_match: citationsMatchBody(post, cached.body_de),
          };
        },
        { min: 150, max: 250 },
      );
    }
    // Cold-Pfad: simulierte LLM-Latenz 1.500–3.500 ms.
    return withLatency<ExtrahiereAktionResult>(
      () => {
        const letter = loadLetters().find((l) => l.id === letterId);
        if (!letter) {
          throw new MockBackendError(`Brief "${letterId}" nicht gefunden.`, {
            code: 'LETTER_NOT_FOUND',
            retryable: false,
          });
        }
        const summaries = loadSummariesMap();
        const seed = summaries[letterId];
        if (!seed) {
          throw new MockBackendError(
            `Keine pre-baked Summary für "${letterId}" — Demo-Seed unvollständig.`,
            { code: 'SUMMARY_NOT_FOUND', retryable: false },
          );
        }
        const post: LetterAiSummaryPostOpen = seed.post_open;
        // Persistiere ai_summary.post_open + ai_summary.pre_open auf dem Brief.
        const letters = loadLetters();
        const idx = letters.findIndex((l) => l.id === letterId);
        if (idx >= 0) {
          const existing = letters[idx].ai_summary ?? { de: '' };
          letters[idx] = {
            ...letters[idx],
            ai_summary: {
              ...existing,
              de: existing.de || post.bullets.map((b) => b.text).join(' '),
              pre_open: seed.pre_open,
              post_open: post,
            },
          };
          saveLetters(letters);
        }
        // Activity-Log-Eintrag (Spec §6.3.5).
        appendActivityLogInternal(letterId, {
          letter_id: letterId,
          event: 'summary_generated',
          at: new Date().toISOString(),
          by: 'app_internal',
          rechtsgrundlage:
            'DSGVO Art. 6 lit. a Einwilligung + Art. 28 AVV mit Anthropic',
          note: `Zusammenfassung erstellt mit Anthropic Claude (${post.model})`,
        });
        return {
          archetype: letter.archetype ?? 'sonstiges',
          auth_channel: letter.auth_channel ?? 'briefpost',
          ai_summary_post_open: post,
          fristen: letter.fristen ?? [],
          was_kann_ich_tun_options: letter.was_kann_ich_tun_options ?? [],
          vorschlaege: seed.vorschlaege ?? [],
          citation_match: citationsMatchBody(post, letter.body_de),
        };
      },
      { min: 1500, max: 3500 },
    );
  },

  getLetterThread: (vorgangId: string) =>
    withLatency(
      () =>
        loadLetters()
          .filter((l) => l.vorgang_id === vorgangId)
          .sort((a, b) => a.empfangen_am.localeCompare(b.empfangen_am)),
      { min: 200, max: 500 },
    ),

  searchLettersByAktenzeichen: (query: string) =>
    withLatency(
      () => {
        const q = query.trim();
        if (q.length < 3) return [] as Letter[];
        const lower = q.toLowerCase();
        return loadLetters()
          .filter((l) => {
            if (l.aktenzeichen.toLowerCase().includes(lower)) return true;
            return (l.aktenzeichen_weitere ?? []).some((a) =>
              a.toLowerCase().includes(lower),
            );
          })
          .sort((a, b) => b.empfangen_am.localeCompare(a.empfangen_am))
          .slice(0, 20);
      },
      { min: 200, max: 400 },
    ),

  getLettersByBehoerdenKategorie: (kategorie: BehoerdeKategorie) =>
    withLatency(() => {
      const behoerden = loadBehoerden();
      const matchingIds = new Set(
        behoerden.filter((b) => b.kategorie === kategorie).map((b) => b.id),
      );
      return loadLetters()
        .filter((l) => matchingIds.has(l.absender_behoerde_id))
        .sort((a, b) => b.empfangen_am.localeCompare(a.empfangen_am));
    }),

  getLetterAktivitaet: (letterId: string) =>
    withLatency(
      () => {
        const log = loadActivityLog();
        return [...(log[letterId] ?? [])].sort((a, b) =>
          a.at.localeCompare(b.at),
        );
      },
      { min: 150, max: 350 },
    ),

  // ---------- Posteingang-Capability — Write ----------
  erstelleVorgangAusBrief: (
    letterId: string,
    vorgangsTyp: ErstelleVorgangAusBriefTyp,
  ) =>
    withLatency<{ vorgangId: string }>(
      () => {
        const persona = loadProfile();
        const letters = loadLetters();
        const idx = letters.findIndex((l) => l.id === letterId);
        if (idx === -1) {
          throw new MockBackendError(`Brief "${letterId}" nicht gefunden.`, {
            code: 'LETTER_NOT_FOUND',
            retryable: false,
          });
        }
        const letter = letters[idx];
        const vorgangId = `vorgang-${uuid()}`;
        const angelegtAm = new Date().toISOString();
        const titel = vorgangTitelFromArchetype(
          letter.archetype ?? 'sonstiges',
          vorgangsTyp,
        );

        const fristenForVorgang = (letter.fristen ?? []).map((f) => ({
          typ: f.typ,
          datum: f.datum,
        }));

        const vorgang: Vorgang = {
          id: vorgangId,
          typ: vorgangsTyp,
          titel,
          status: 'angelegt',
          beteiligte_behoerden_ids: [letter.absender_behoerde_id],
          schritte: [],
          fristen: fristenForVorgang,
          angelegt_am: angelegtAm,
          persona_id: persona.id,
          context: {
            source: 'posteingang.erstelleVorgangAusBrief',
            seed_letter_id: letterId,
            archetype: letter.archetype,
          },
        };
        const vorgaenge = loadVorgaenge();
        vorgaenge.push(vorgang);
        saveVorgaenge(vorgaenge);
        emit({ type: 'vorgang_created', vorgangId });

        // Letter mit Vorgang verknüpfen.
        letters[idx] = { ...letter, vorgang_id: vorgangId };
        saveLetters(letters);

        return { vorgangId };
      },
      { min: 500, max: 1000 },
    ),

  protokolliereLetterAktivitaet: (
    letterId: string,
    event: LetterActivityEvent,
    options?: { rechtsgrundlage?: string; note?: string },
  ) =>
    withLatency<void>(
      () => {
        // Hard-Boundary: Drift im Aufrufer (z. B. Legacy-Wert „opened" statt
        // „opened_in_app") wird hier sofort sichtbar statt stillschweigend in
        // den Log zu wandern und beim nächsten Re-Read den ganzen Bucket
        // zu invalidieren.
        const parsed = letterActivityAktionSchema.safeParse(event);
        if (!parsed.success) {
          throw new MockBackendError(
            `Ungültiger Activity-Log-Event "${String(event)}" — erlaubt sind: ${letterActivityAktionSchema.options.join(', ')}.`,
            { code: 'INVALID_ACTIVITY_EVENT', retryable: false },
          );
        }
        appendActivityLogInternal(letterId, {
          letter_id: letterId,
          event: parsed.data,
          at: new Date().toISOString(),
          by: 'app_internal',
          rechtsgrundlage: options?.rechtsgrundlage,
          note: options?.note,
        });
      },
      { min: 100, max: 250 },
    ),

  // ---------- V1.5 — Antwort verfassen (Reply / ReplyDraft) ----------
  getReplyDraft: (letterId: string) =>
    withLatency<ReplyDraft | null>(
      () => {
        // V1.5.1: höchstens ein Draft pro Letter; mehrere sent_simulated
        // sind nach Cross-Template-Versand möglich (Spec § 8.4).
        const draft = findDraftReply(letterId);
        if (!draft) return null;
        // Schema-Re-Validierung (V1-Pattern: niemals ungeprüft aus Storage zurückgeben).
        const parsed = replySchema.safeParse(draft);
        if (!parsed.success) return null;
        return parsed.data as ReplyDraft;
      },
      { min: 150, max: 350 },
    ),

  saveReplyDraft: (letterId: string, partial: Partial<ReplyDraft>) =>
    withLatency<ReplyDraft>(
      () => {
        // Brief muss existieren (Aktenzeichen-Anker; Verifier #2 — keine free-form).
        const letter = loadLetters().find((l) => l.id === letterId);
        if (!letter) {
          throw new MockBackendError(
            `Brief "${letterId}" nicht gefunden — Reply muss in-thread zu einem Brief sein.`,
            { code: 'LETTER_NOT_FOUND', retryable: false },
          );
        }

        // V1.5.1: höchstens ein Draft pro Letter (mehrere sent_simulated
        // möglich, aber Drafts werden upserted). „isFirstSave" meint hier:
        // gibt es überhaupt schon eine Reply für diesen Brief (egal ob
        // Draft oder Sent)? — Aktivitäts-Log-Konvention V1.5.0.
        const existingDraft = findDraftReply(letterId);
        const allReplies = listRepliesForLetter(letterId);
        const isFirstSave = allReplies.length === 0;
        const now = new Date().toISOString();

        const merged: Reply = {
          id: existingDraft?.id ?? `reply-${uuid()}`,
          letter_id: letterId,
          status: 'draft',
          template_id: partial.template_id ?? existingDraft?.template_id ?? null,
          mode: partial.mode ?? existingDraft?.mode,
          body_de: partial.body_de ?? existingDraft?.body_de ?? '',
          attachments: partial.attachments ?? existingDraft?.attachments ?? [],
          created_at: existingDraft?.created_at ?? now,
          updated_at: now,
          sent_at: null,
          kanal: null,
          // V1.5.1: receipt_text nicht mehr persistiert (Code-Review BLOCKER #3,
          // 2026-05-09). Frontend rendert Prosa aus i18n-Template.
        };

        // Bei freitext / nicht-termin_antwort: mode entfernen.
        if (merged.template_id !== 'termin_antwort') {
          delete merged.mode;
        }

        const validation = replySchema.safeParse(merged);
        if (!validation.success) {
          throw new MockBackendError(
            `Reply-Schema-Verletzung: ${validation.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join('.')}:${i.message}`)
              .join('; ')}`,
            { code: 'REPLY_SCHEMA_INVALID', retryable: false },
          );
        }

        upsertReply(letterId, validation.data as Reply);

        // Activity-Log-Einträge:
        //  - bei erstem Save: zusätzlich `reply_compose_started` (vorher unmöglich
        //    zu protokollieren, weil keine Brief-Reply-Beziehung existierte).
        if (isFirstSave) {
          appendActivityLogInternal(letterId, {
            letter_id: letterId,
            event: 'reply_compose_started',
            at: now,
            by: 'app_internal',
            rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung',
          });
        }
        // Wenn ein Template-ID übergeben wurde und es ein Wechsel ist → reply_template_inserted.
        // V1.5.1 Spec § 11.11: Note-Format ist `template_id:<id>`-Marker (semicolon-
        // getrennt für Multi-Marker). V1.5.0 hat `template:<id>` benutzt — wir
        // rotieren auf `template_id:<id>`, damit V1.5.1-Skelett-Templates
        // gleich aussehen wie V1.5.0-Templates.
        if (
          partial.template_id !== undefined &&
          partial.template_id !== null &&
          partial.template_id !== existingDraft?.template_id
        ) {
          appendActivityLogInternal(letterId, {
            letter_id: letterId,
            event: 'reply_template_inserted',
            at: now,
            by: 'app_internal',
            rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung',
            note: `template_id:${partial.template_id}`,
          });
        }
        appendActivityLogInternal(letterId, {
          letter_id: letterId,
          event: 'reply_draft_saved',
          at: now,
          by: 'app_internal',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung',
        });

        return validation.data as ReplyDraft;
      },
      { min: 200, max: 500 },
    ),

  deleteReplyDraft: (letterId: string) =>
    withLatency<void>(
      () => {
        // V1.5.1: nur den Draft löschen — sent_simulated-Replies bleiben
        // erhalten (Cross-Template-Versand-Pfad: Reply 1 ist bereits sent
        // wenn der User in den 3-Button-Switch den „Verwerfen"-Pfad wählt).
        const draft = findDraftReply(letterId);
        if (!draft) return;
        removeReplyById(letterId, draft.id);
        appendActivityLogInternal(letterId, {
          letter_id: letterId,
          event: 'reply_draft_deleted',
          at: new Date().toISOString(),
          by: 'app_internal',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung',
        });
      },
      { min: 150, max: 350 },
    ),

  sendReplySimulated: (letterId: string, draft: ReplyDraft) =>
    withLatency<Reply>(
      () => {
        // Brief muss existieren.
        const letter = loadLetters().find((l) => l.id === letterId);
        if (!letter) {
          throw new MockBackendError(
            `Brief "${letterId}" nicht gefunden — Versand abgebrochen.`,
            { code: 'LETTER_NOT_FOUND', retryable: false },
          );
        }

        // ELSTER-Realismus-Limits prüfen (Verifier-locked + spec §3).
        const attachments = draft.attachments ?? [];
        if (attachments.length > LETTER_ATTACHMENT_LIMITS.MAX_FILES) {
          throw new MockBackendError(
            `Zu viele Anhänge: ${attachments.length} (max. ${LETTER_ATTACHMENT_LIMITS.MAX_FILES}).`,
            { code: 'REPLY_ATTACHMENT_TOO_MANY', retryable: false },
          );
        }
        let total = 0;
        for (const att of attachments) {
          if (
            !(LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME as readonly string[]).includes(
              att.mime,
            )
          ) {
            throw new MockBackendError(
              `Anhang "${att.name}" hat unzulässigen MIME-Type "${att.mime}". Erlaubt: ${LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME.join(', ')}.`,
              { code: 'REPLY_ATTACHMENT_MIME_INVALID', retryable: false },
            );
          }
          if (att.size_bytes > LETTER_ATTACHMENT_LIMITS.MAX_BYTES_PER_FILE) {
            throw new MockBackendError(
              `Anhang "${att.name}" ist zu groß: ${att.size_bytes} Bytes (max. ${LETTER_ATTACHMENT_LIMITS.MAX_BYTES_PER_FILE} Bytes pro Datei).`,
              { code: 'REPLY_ATTACHMENT_TOO_LARGE', retryable: false },
            );
          }
          total += att.size_bytes;
        }
        if (total > LETTER_ATTACHMENT_LIMITS.MAX_BYTES_TOTAL) {
          throw new MockBackendError(
            `Anhänge in Summe zu groß: ${total} Bytes (max. ${LETTER_ATTACHMENT_LIMITS.MAX_BYTES_TOTAL} Bytes gesamt).`,
            { code: 'REPLY_ATTACHMENT_TOO_LARGE', retryable: false },
          );
        }

        const now = new Date().toISOString();
        const kanal = getMockKanalForBehoerde(letter.absender_behoerde_id);
        // V1.5.1 (Code-Review BLOCKER #3, 2026-05-09): receipt_text wird NICHT
        // mehr als hardcoded DE-String persistiert. Die Prosa rendert das
        // Frontend aus `kanal` + `sent_at` + i18n-Template (Domain §7,
        // posteingang.compose.confirmation.full_receipt_template). Storage
        // hält nur die strukturierten Felder; das `[MOCK]`-Watermark sitzt im
        // i18n-Template-Body, nicht in den Daten.

        const sent: Reply = {
          id: draft.id,
          letter_id: letterId,
          status: 'sent_simulated',
          template_id: draft.template_id,
          ...(draft.template_id === 'termin_antwort' && draft.mode
            ? { mode: draft.mode }
            : {}),
          body_de: draft.body_de,
          attachments,
          created_at: draft.created_at,
          updated_at: now,
          sent_at: now,
          kanal,
        };

        const validation = replySchema.safeParse(sent);
        if (!validation.success) {
          throw new MockBackendError(
            `Reply-Schema-Verletzung beim Versand: ${validation.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join('.')}:${i.message}`)
              .join('; ')}`,
            { code: 'REPLY_SCHEMA_INVALID', retryable: false },
          );
        }

        // V1.5.1: upsert statt overwrite — sent Replies werden zur Liste
        // hinzugefügt; existierende Drafts mit demselben `id` werden ersetzt
        // (Cross-Template-Versand-Pfad: Reply 1 sent + Reply 2 sent).
        upsertReply(letterId, validation.data as Reply);

        // V1.5.1 Spec § 11.11: Note-Format ist semicolon-getrennte
        // `<key>:<value>`-Paare. `template_id:<id>` ist der Pflicht-Marker
        // für die drei neuen Skelett-Templates; `channel:<resolved>` ergänzt
        // den Versand-Kanal für Datenschutz-Cockpit-Transparenz.
        const templateIdValue = draft.template_id ?? 'freitext';
        appendActivityLogInternal(letterId, {
          letter_id: letterId,
          event: 'reply_sent_simulated',
          at: now,
          by: 'app_internal',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung',
          note: `template_id:${templateIdValue}; channel:${kanal}`,
        });

        return validation.data as Reply;
      },
      { min: 600, max: 1200 },
    ),

  getReplyByLetterId: (letterId: string) =>
    withLatency<Reply | null>(
      () => {
        // V1.5.1: bei mehreren Replies (Cross-Template-Versand) den jüngsten
        // Eintrag zurückgeben (Spec § 8.4 Architect-Empfehlung). Sortier-
        // Schlüssel: sent_at ?? created_at.
        const reply = findLatestReply(letterId);
        if (!reply) return null;
        const parsed = replySchema.safeParse(reply);
        if (!parsed.success) return null;
        return parsed.data as Reply;
      },
      { min: 150, max: 350 },
    ),

  getRepliesForLetter: (letterId: string) =>
    withLatency<Reply[]>(
      () => {
        // Aufsteigend chronologisch sortiert (sent_at ?? created_at), damit
        // <ReplyConfirmationView> Replies in Versand-Reihenfolge rendern kann
        // (Cross-Template-Versand: Einspruch zuerst, Aussetzung danach).
        const list = listRepliesForLetter(letterId);
        const validated: Reply[] = [];
        for (const reply of list) {
          const parsed = replySchema.safeParse(reply);
          if (parsed.success) validated.push(parsed.data as Reply);
        }
        return [...validated].sort((a, b) => {
          const aKey = a.sent_at ?? a.created_at;
          const bKey = b.sent_at ?? b.created_at;
          return aKey.localeCompare(bKey);
        });
      },
      { min: 150, max: 350 },
    ),

  // ---------- V1.5 — Reply-Body-Resolver ----------
  resolveReplyBody: (input: ResolveReplyBodyInput) =>
    resolveReplyBodyImpl(input),

  // ---------- V1 — Stammdaten ----------
  // Delegate-Pattern: alle Methoden leben in `stammdaten/api.ts` und werden
  // hier nur durchgereicht. `ensureBooted()` wird beim ersten persona-Lookup
  // implizit über `loadPersonaById` → `readOrInit('personas')` ausgelöst,
  // weil persistence.ts auf `seedIfEmpty()` wartet.
  getStammdaten: (personaId: PersonaId) => {
    ensureBooted();
    return stammdatenApi.getStammdaten(personaId);
  },
  getUebermittlungsLog: (personaId, opts) => {
    ensureBooted();
    return stammdatenApi.getUebermittlungsLog(personaId, opts);
  },
  appendStammdatenLogEntry: (personaId, entry) => {
    ensureBooted();
    return stammdatenApi.appendStammdatenLogEntry(personaId, entry);
  },
  setReligionSessionConsent: (personaId, consent) => {
    ensureBooted();
    return stammdatenApi.setReligionSessionConsent(personaId, consent);
  },
  toggleAuskunftssperre: (personaId, aktiv, begruendung) => {
    ensureBooted();
    return stammdatenApi.toggleAuskunftssperre(personaId, aktiv, begruendung);
  },
  toggleUebermittlungssperre: (personaId, sperreId, aktiv) => {
    ensureBooted();
    return stammdatenApi.toggleUebermittlungssperre(personaId, sperreId, aktiv);
  },
  toggleSpeicherungssperre: (personaId, sperreId, aktiv) => {
    ensureBooted();
    return stammdatenApi.toggleSpeicherungssperre(personaId, sperreId, aktiv);
  },
  addIbanSpeculative: (personaId, iban) => {
    ensureBooted();
    return stammdatenApi.addIbanSpeculative(personaId, iban);
  },
  dismissIbanSpeculative: (personaId) => {
    ensureBooted();
    return stammdatenApi.dismissIbanSpeculative(personaId);
  },
  simulateIbanPush: (personaId, targets) => {
    ensureBooted();
    return stammdatenApi.simulateIbanPush(personaId, targets);
  },
  updateKontakt: (personaId, input) => {
    ensureBooted();
    return stammdatenApi.updateKontakt(personaId, input);
  },
  updateSprache: (personaId, sprache) => {
    ensureBooted();
    return stammdatenApi.updateSprache(personaId, sprache);
  },
  getWalletAttestations: (personaId) => {
    ensureBooted();
    return stammdatenApi.getWalletAttestations(personaId);
  },
  getWalletAttestationPreview: (personaId, attestationId) => {
    ensureBooted();
    return stammdatenApi.getWalletAttestationPreview(personaId, attestationId);
  },

  // ---------- V1.1 — Stammdaten Renten/KV ----------
  // Delegate-Pattern: alle V1.1-Methoden leben in `stammdaten/v1-1-api.ts`
  // und werden hier nur durchgereicht.
  getAltersvorsorge: (personaId) => {
    ensureBooted();
    return stammdatenV11Api.getAltersvorsorge(personaId);
  },
  getKrankenversicherungPflege: (personaId) => {
    ensureBooted();
    return stammdatenV11Api.getKrankenversicherungPflege(personaId);
  },
  applyYellowLetterBridge: (args) => {
    ensureBooted();
    return stammdatenV11Api.applyYellowLetterBridge(args);
  },
  consentPflegegrad: (personaId, consent) => {
    ensureBooted();
    return stammdatenV11Api.consentPflegegrad(personaId, consent);
  },
  revokePflegegradConsent: (personaId) => {
    ensureBooted();
    return stammdatenV11Api.revokePflegegradConsent(personaId);
  },
  getEpaStatus: (personaId) => {
    ensureBooted();
    return stammdatenV11Api.getEpaStatus(personaId);
  },

  // ---------- V1.2 — Stammdaten Kontakt-Schicht ----------
  // Delegate-Pattern: alle V1.2-Methoden leben in `stammdaten/v1-2-api.ts`
  // und werden hier nur durchgereicht.
  getKontakt: (personaId) => {
    ensureBooted();
    return stammdatenV12Api.getKontakt(personaId);
  },
  getNotificationPraeferenzen: (personaId) => {
    ensureBooted();
    return stammdatenV12Api.getNotificationPraeferenzen(personaId);
  },
  getBehoerdeAnbindung: (behoerdeId) => {
    ensureBooted();
    return stammdatenV12Api.getBehoerdeAnbindung(behoerdeId);
  },
  toggleNotificationPraeferenz: (personaId, kategorie, kanal) => {
    ensureBooted();
    return stammdatenV12Api.toggleNotificationPraeferenz(
      personaId,
      kategorie,
      kanal,
    );
  },
  simulatePostfachAktivierung: (personaId) => {
    ensureBooted();
    return stammdatenV12Api.simulatePostfachAktivierung(personaId);
  },
  simulateMobilOtpFlow: (personaId, args) => {
    ensureBooted();
    return stammdatenV12Api.simulateMobilOtpFlow(personaId, args);
  },
  simulateFamilienkasseFollowupLetter: (personaId) => {
    ensureBooted();
    return stammdatenV12Api.simulateFamilienkasseFollowupLetter(personaId);
  },

  // ---------- V1.3 — Stammdaten Mobilität ----------
  // Delegate-Pattern: alle V1.3-Methoden leben in `stammdaten/v1-3-api.ts`
  // und werden hier nur durchgereicht.
  getMobilitaet: (personaId) => {
    ensureBooted();
    return stammdatenV13Api.getMobilitaet(personaId);
  },
  getPunktestandOnDemand: (personaId) => {
    ensureBooted();
    return stammdatenV13Api.getPunktestandOnDemand(personaId);
  },
  getMdlAttestation: (personaId) => {
    ensureBooted();
    return stammdatenV13Api.getMdlAttestation(personaId);
  },
  getUmzugVorgaengeFinished: (personaId) => {
    ensureBooted();
    return stammdatenV13Api.getUmzugVorgaengeFinished(personaId);
  },
  setHalterAdresseUebergangsMarker: (personaId, vorgangId) => {
    ensureBooted();
    return stammdatenV13Api.setHalterAdresseUebergangsMarker(personaId, vorgangId);
  },

  // ---------- Redesign — Dashboard ----------
  // Delegate-Pattern: alle Methoden leben in `dashboard/api.ts`.
  getDashboard: (personaId, opts) => {
    ensureBooted();
    return dashboardApi.getDashboard(personaId, opts);
  },
  setLastSeen: (personaId, timestamp) => {
    ensureBooted();
    return dashboardApi.setLastSeen(personaId, timestamp);
  },
  getLastSeen: (personaId) => {
    ensureBooted();
    return dashboardApi.getLastSeen(personaId);
  },
  getDashboardSortMode: (personaId) => {
    ensureBooted();
    return dashboardApi.getDashboardSortMode(personaId);
  },
  setDashboardSortMode: (personaId, mode) => {
    ensureBooted();
    return dashboardApi.setDashboardSortMode(personaId, mode);
  },
  getDsc: (personaId) => {
    ensureBooted();
    return dashboardApi.getDsc(personaId);
  },
  getCandidatesForTopActions: (personaId) => {
    ensureBooted();
    return dashboardApi.getCandidatesForTopActions(personaId);
  },
  getLebenslagenHinweise: (personaId) => {
    ensureBooted();
    return dashboardApi.getLebenslagenHinweise(personaId);
  },
  prioritizeTopActions: (candidates) => {
    ensureBooted();
    return dashboardApi.prioritizeTopActions(candidates);
  },

  // ---------- Redesign — Termine ----------
  getReminders: () => {
    ensureBooted();
    return remindersApi.getReminders();
  },

  // ---------- Convenience-Pass-1 (§B1 / §A5 / §A-katalog / §C3) ----------
  getValueReceipt: (vorgangId: string) =>
    withLatency<ValueReceipt | null>(() => {
      const v = loadVorgaenge().find((x) => x.id === vorgangId);
      if (!v) return null;
      // Once-Only-Quellzeile (spec §5.2 Shape A): `verifiziert_am` der Persona-
      // Anschrift, sonst Fallback `vorgang.angelegt_am` (immer vorhanden).
      const persona = loadProfile();
      const anschriftVerifiziertAm = (
        persona.adresse as { verifiziert_am?: string }
      ).verifiziert_am;
      const stammdatenBestaetigtAm = anschriftVerifiziertAm ?? v.angelegt_am;
      return computeValueReceipt(v, stammdatenBestaetigtAm);
    }),

  getVorgangRelated: (vorgangId: string) =>
    withLatency(() => {
      const persona = loadProfile();
      const letters = loadLetters().filter((l) => l.vorgang_id === vorgangId);
      const documents = loadDocuments().filter(
        (d) => d.vorgang_id === vorgangId && d.owner_persona_id === persona.id,
      );
      const termine = loadTermine().filter(
        (t) => t.vorgang_id === vorgangId && t.owner_persona_id === persona.id,
      );
      const reminders = (
        readOrInit(
          'reminders' as CollectionKey,
          remindersArraySchema as unknown as import('zod').ZodType<Reminder[]>,
          [] as Reminder[],
        ) as Reminder[]
      ).filter(
        (r) => r.vorgang_id === vorgangId && r.owner_persona_id === persona.id,
      );
      return { letters, documents, termine, reminders };
    }),

  getAutopilotKatalog: () =>
    withLatency<AutopilotKatalogEntry[]>(() => [
      {
        id: 'umzug',
        status: 'live',
        titel_key: 'katalog.umzug.titel',
        beschreibung_key: 'katalog.umzug.beschreibung',
        behoerden_preview: [
          'buergeramt-berlin-mitte',
          'finanzamt-berlin-mitte-tiergarten',
          'kfz-berlin-labo',
          'aok-nordost',
          'familienkasse-berlin-brandenburg',
          'abh-berlin-lea',
        ],
        behoerden_count: 6,
        geschaetzte_zeitersparnis_min: 45,
      },
      {
        id: 'kindergeburt',
        status: 'demnaechst',
        titel_key: 'katalog.kindergeburt.titel',
        beschreibung_key: 'katalog.kindergeburt.beschreibung',
        behoerden_preview: [
          'standesamt-berlin-mitte',
          'familienkasse-berlin-brandenburg',
          'aok-nordost',
        ],
        behoerden_count: 7,
        geschaetzte_zeitersparnis_min: 60,
      },
      {
        id: 'steuererklaerung',
        status: 'demnaechst',
        titel_key: 'katalog.steuererklaerung.titel',
        beschreibung_key: 'katalog.steuererklaerung.beschreibung',
        behoerden_preview: ['finanzamt-berlin-mitte-tiergarten'],
        behoerden_count: 1,
        geschaetzte_zeitersparnis_min: 90,
      },
    ]),

  exportiereDokumentEudi: (docId: string) =>
    withLatency<EudiExportPreview>(() => {
      const doc = loadDocuments().find((d) => d.id === docId);
      if (!doc) {
        throw new MockBackendError(`Dokument "${docId}" nicht gefunden.`, {
          code: 'DOCUMENT_NOT_FOUND',
          retryable: false,
        });
      }
      // CLEARLY-MOCKED VC-förmige Vorschau — NIE ein echter Export.
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'MOCK_DemoCredential'],
        mock: true,
        issuer: `[MOCK] ${doc.ausstellende_behoerde_id}`,
        credentialSubject: {
          id: `[MOCK] did:example:${doc.owner_persona_id ?? 'demo'}`,
          dokument_typ: doc.typ,
          titel: doc.titel,
          dokument_nr: doc.dokument_nr,
          ausgestellt_am: doc.ausgestellt_am,
        },
        watermark: '[MOCK – Verwaltungsdemo, keine echten Daten]',
      };
      return {
        document_id: doc.id,
        mock: true,
        payload_preview: JSON.stringify(payload, null, 2),
        disclaimer_key: 'dokumente.eudi.disclaimer_2027',
      };
    }),

  // ---------- Convenience-Pass-1 (§C2 Termine-Ops) ----------
  bestaetigeTerminVorschlag: (terminId: string) =>
    withLatency<void>(() =>
      mutateTermin(terminId, (t) => ({ ...t, status: 'bestaetigt' })),
    ),

  verschiebeTermin: (terminId: string, neuesDatumIso: string) =>
    withLatency<void>(() =>
      mutateTermin(terminId, (t) => ({
        ...t,
        datum: neuesDatumIso,
        status: 'verschoben',
      })),
    ),

  sageTerminAb: (terminId: string) =>
    withLatency<void>(() =>
      mutateTermin(terminId, (t) => ({ ...t, status: 'abgesagt' })),
    ),

  // ---------- Convenience-Pass-1 (§C4 Reminder-Ops) ----------
  markReminderDone: (reminderId: string) =>
    withLatency<void>(() =>
      mutateReminder(reminderId, (r) => ({ ...r, erledigt: true })),
    ),

  snoozeReminder: (reminderId: string, tage: number) =>
    withLatency<void>(() =>
      mutateReminder(reminderId, (r) => {
        const d = new Date(r.datum);
        d.setUTCDate(d.getUTCDate() + tage);
        return { ...r, datum: d.toISOString().slice(0, 10) };
      }),
    ),

  // ---------- Redesign — Steuer ----------
  getSteuerUebersicht: (personaId, steuerjahr) => {
    ensureBooted();
    return steuerApi.getSteuerUebersicht(personaId, steuerjahr);
  },

  // ---------- Redesign — Familie ----------
  getFamilie: (personaId) => {
    ensureBooted();
    return familieApi.getFamilie(personaId);
  },

  // ---------- Redesign — Datenschutz-Cockpit ----------
  getDatenschutzEinwilligungen: (personaId) => {
    ensureBooted();
    return datenschutzApi.getDatenschutzEinwilligungen(personaId);
  },
  setDatenschutzEinwilligung: (personaId, empfaenger, erteilt) => {
    ensureBooted();
    return datenschutzApi.setDatenschutzEinwilligung(
      personaId,
      empfaenger,
      erteilt,
    );
  },
  getDatenquellen: (personaId) => {
    ensureBooted();
    return datenschutzApi.getDatenquellen(personaId);
  },
  isVisionBannerDismissed: (personaId) => {
    ensureBooted();
    return datenschutzApi.isVisionBannerDismissed(personaId);
  },
  dismissVisionBanner: (personaId) => {
    ensureBooted();
    return datenschutzApi.dismissVisionBanner(personaId);
  },

  // ---------- Resilient Orchestration Engine — Read ----------
  getSaga: (vorgangId: string) =>
    withLatency<SagaInstance | null>(() => {
      ensureBooted();
      return getEngine().getSaga(vorgangId) ?? null;
    }),

  getOrchestrationAuditLog: (sagaId?: string) =>
    withLatency<AuditLogEntry[]>(() => {
      ensureBooted();
      return getEngine().getAuditLog(sagaId);
    }),

  getDlq: () =>
    withLatency<DeadLetterEntry[]>(() => {
      ensureBooted();
      return getEngine().getDlq();
    }),

  getBreakers: () =>
    withLatency<CircuitBreakerState[]>(() => {
      ensureBooted();
      return getEngine().getBreakers();
    }),

  // verify/replay/recovery are direct (no fault injection): they are integrity
  // actions, not Behörden-reads. They emit their own events for live panels.
  verifyChain: async () => {
    ensureBooted();
    return engineVerifyChain();
  },

  replayDeadLetter: async (dlqId: string) => {
    ensureBooted();
    await getEngine().replayDeadLetter(dlqId);
  },

  recoverOnBoot: async () => {
    ensureBooted();
    return runRecoverOnBoot();
  },

  // ---------- Subscribe ----------
  subscribe: (listener: MockBackendEventListener) => subscribe(listener),
};

// ── TEST-ONLY orchestration seam (Spec § 7) ──────────────────────────────────
//
// BLOCKER 2 fix: the e2e harness re-drives the live saga across the `'use client'`
// boundary. The frontend test bridge previously imported `getEngine()` /
// `makeFakeClock` itself; under code-splitting that can resolve a DIFFERENT
// module instance than `api`'s, so its `drainAll` ran on an engine the saga is
// not on (transport singleton is shared — forceFail worked — but the draining
// engine was unreachable). Exposing the seam HERE, in api.ts's own module scope,
// guarantees `drain`/`tick` hit the exact `getEngine()` singleton that
// `startUmzug`/`authorizeStep` drive.
//
// Gated behind the orch-test/reliable flag so it is NEVER attached in prod: the
// reliable prod build the resilience e2e runs against sets
// NEXT_PUBLIC_ENABLE_ORCH_TEST=1; absent that (and absent reliable mode) the
// property stays `undefined` and no test code path ships.
function shouldAttachOrchestrationTestSeam(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_ENABLE_ORCH_TEST === '1'
  ) {
    return true;
  }
  // Defensive fallback: reliable mode (Loom/spine prod build) also enables it.
  try {
    return isReliableModeForEngine();
  } catch {
    return false;
  }
}

if (shouldAttachOrchestrationTestSeam()) {
  const fakeClock = makeFakeClock();
  let clockInstalled = false;
  api.__orchestrationTest = {
    installFakeClock() {
      if (clockInstalled) return;
      clockInstalled = true;
      __setEngineClock(fakeClock);
    },
    tick(ms: number) {
      fakeClock.tick(ms);
    },
    async drain(sagaId: string) {
      // Run inside the captured request context so deferred emit()s land on the
      // same Store/Bus the saga writes to (the Stage-2 deferred-emit fix).
      const snapshot = captureContext();
      await runWithCapturedContext(snapshot, () => getEngine().drainAll(sagaId));
    },
  };
}

// Re-exports.
export { MockBackendError } from './errors';
export type { MockBackendEvent };
export type { UmzugVorgangSummary } from './stammdaten/v1-3-api';
