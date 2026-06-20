/**
 * Generischer Lebenslagen-Kaskaden-Orchestrator (Spec `vorgaenge-functional.md`
 * §1.1 / §1.2 / §5.4).
 *
 * EIN Streamer, den alle sieben funktionalen Lebenslagen teilen — KEINE
 * per-Vertical-Saga (das ist die vom Prompt verbotene Falle; die Umzug-Saga
 * bleibt unberührt). Spiegelt das gelernte Umzug-Autopilot-Verhalten:
 *
 *  - mappt jeden `CascadeStepConfig` 1:1 auf einen `AutopilotStep`
 *    (`id = "${vorgangId}:${stepCfg.id}"`),
 *  - streamt über `upsertStep` (das bereits `emit('autopilot_step')` feuert) auf
 *    der `latencyMs`-Choreografie (über `wait()` aus latency.ts, das im
 *    Reliable-Mode-Pfad deterministisch bleibt — die `wait`-Sleeps werden via
 *    Fake-Timer in Tests kollabiert),
 *  - leitet die EINE headline Forward-Submission (`isPrimarySubmission`) über
 *    `getTransport().deliver()` und ankert das `[MOCK]`-Aktenzeichen an die
 *    zurückgegebene Quittung,
 *  - mintet pro erfolgreichem Hop Letter / Document (`[MOCK]`-Watermark) / Termin
 *    (`status:'vorgeschlagen'`, nie 'gebucht').
 *
 * Gate-State-Machine (Run-Reihenfolge A → D → B, ganzer Cascade, KEIN Slice):
 *  - gate 'auto'    → nach `latencyMs`: in_progress → Hop-Arbeit → confirmed.
 *  - gate 'consent' → nur falls Einwilligung erteilt (form-time, in `consents`):
 *                     läuft wie 'auto' (agent_label „mit Einwilligung"); sonst
 *                     bleibt der Schritt `self_assigned` (übersprungen, blockt
 *                     den Abschluss NICHT) und mintet nichts.
 *  - gate 'eid'     → status `pending_eid_confirmation` und PAUSE; die Kaskade
 *                     wird erst durch `bestaetigeLebenslageSchritt` fortgesetzt.
 *
 * Mehrere eID-Schritte je Config sind erlaubt (geburt 1/4/5, aufenthalt 1/7) —
 * die Kaskade pausiert an JEDEM in Reihenfolge.
 *
 * Realismus-Guardrails (§8): kein echter Versand, jedes Az./QR/Dokument trägt
 * `[MOCK]`, Termine immer `'vorgeschlagen'`. Forward-Transport ausschließlich
 * über den leichten `getTransport()` — NICHT den FIT-Connect-Tier-1/2-Adapter.
 */
import type { AutopilotStep, Vorgang } from '@/types/vorgang';
import type { Persona } from '@/types/persona';
import type { Letter } from '@/types/letter';
import type { Document as VaultDocument } from '@/types/document';
import type { Termin } from '@/types/termin';
import type { TransportEnvelope } from '@/types/orchestration';
import type {
  CascadeStepConfig,
  DocumentTemplate,
  LebenslageConfig,
  LetterTemplate,
  TerminTemplate,
} from './types';
import { uuid } from '../id';
import { wait } from '../latency';
import { __orchestrationInternals } from '../orchestration';

const MOCK_FOOTER = '[MOCK – Verwaltungsdemo, keine echten Daten]';

/**
 * Side-effect-Ports, die `api.ts` der Engine injiziert. Bewusst schmal: die
 * Engine kennt weder `persistence` noch `events` direkt — sie ruft dieselben
 * `upsertStep`/`appendLetter`/`upsertDocument`/`upsertTermin`/
 * `changeVorgangStatus`-Pfade, die der Umzug-Autopilot benutzt. So bleibt die
 * Engine in Unit-Tests trivial steuerbar und teilt sich exakt den Event-Stream
 * der UI (`autopilot_step`, `letter_received`, `document_added`, `termin_created`,
 * `vorgang_status_changed`).
 */
export interface LebenslageCascadePorts {
  upsertStep: (vorgangId: string, step: AutopilotStep) => void;
  appendLetter: (letter: Letter) => void;
  upsertDocument: (doc: VaultDocument) => boolean;
  upsertTermin: (termin: Termin) => boolean;
  changeVorgangStatus: (
    vorgangId: string,
    status: Vorgang['status'],
  ) => void;
}

/** Laufender Kontext einer Kaskade — gehalten bis zum Abschluss/Abbruch. */
interface CascadeRun {
  config: LebenslageConfig;
  persona: Persona;
  ports: LebenslageCascadePorts;
  /** Run-geordnete Schritt-Configs (A → D → B → C), persona-gefiltert. */
  steps: CascadeStepConfig[];
  /** Erteilte Einwilligungen je Cascade-Step-`id` (form-time). */
  consents: Set<string>;
  /** Bereits aufgelöste Step-`id`s (idempotenz + Doppel-Confirm-Guard). */
  resolved: Set<string>;
}

/** vorgangId → laufender Kontext. Modul-lokal (eine Engine-Instanz/Prozess). */
const RUNS = new Map<string, CascadeRun>();

/** Block-Rang für die Run-Reihenfolge (Umzug-Parität: A → D → B, C zuletzt). */
const BLOCK_RANK: Record<string, number> = { A: 0, D: 1, B: 2, C: 3 };

/**
 * Run-geordnete, persona-gefilterte Schritt-Configs. Stabil sortiert nach
 * Block-Rang (A → D → B → C); innerhalb eines Rangs bleibt die Authoring-
 * Reihenfolge des Config-`cascade`-Arrays erhalten. KEIN Slice-Cap.
 */
export function orderCascadeSteps(
  config: LebenslageConfig,
  persona: Persona,
): CascadeStepConfig[] {
  return config.cascade
    .filter((s) => !s.visibleIf || s.visibleIf(persona))
    .map((step, idx) => ({ step, idx }))
    .sort((a, b) => {
      const ra = BLOCK_RANK[a.step.block] ?? 9;
      const rb = BLOCK_RANK[b.step.block] ?? 9;
      return ra !== rb ? ra - rb : a.idx - b.idx;
    })
    .map((x) => x.step);
}

/** Stabile AutopilotStep-ID aus Vorgang + Config-Step (§5.4). */
export function stepIdFor(vorgangId: string, stepCfg: CascadeStepConfig): string {
  return `${vorgangId}:${stepCfg.id}`;
}

function personaFullName(persona: Persona): string {
  return `${persona.vorname} ${persona.nachname}`.trim();
}

function todayDe(): string {
  const d = new Date();
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

/** Substituiert `{name}` / `{az}` / `{datum}` in einem Template-String. */
function fill(
  template: string,
  vars: { name: string; az: string; datum: string },
): string {
  return template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{az\}/g, vars.az)
    .replace(/\{datum\}/g, vars.datum);
}

/**
 * Mappt einen Config-Step auf den initialen `AutopilotStep` (status `pending`).
 * `requires_eid`/`requires_consent` leiten sich aus dem Gate ab (Umzug-Parität).
 */
export function toAutopilotStep(
  vorgangId: string,
  stepCfg: CascadeStepConfig,
): AutopilotStep {
  return {
    id: stepIdFor(vorgangId, stepCfg),
    behoerde_id: stepCfg.behoerdeId,
    block: stepCfg.block,
    aktion: stepCfg.aktion,
    rechtsgrundlage: stepCfg.rechtsgrundlage,
    agent_label: stepCfg.agentLabel,
    datenkategorien: stepCfg.datenkategorien,
    requires_eid: stepCfg.gate === 'eid',
    requires_consent: stepCfg.gate === 'consent',
    status: 'pending',
  };
}

// ── Mint-Helfer ───────────────────────────────────────────────────────────────

function buildLetter(
  run: CascadeRun,
  vorgangId: string,
  stepCfg: CascadeStepConfig,
  tpl: LetterTemplate,
  az: string,
): Letter {
  const name = personaFullName(run.persona);
  const datum = todayDe();
  const body = [
    MOCK_FOOTER,
    '',
    tpl.absender,
    '',
    fill(tpl.floskel, { name, az, datum }),
    '',
    fill(tpl.abschluss, { name, az, datum }),
  ].join('\n');
  return {
    id: `letter-${uuid()}`,
    absender_behoerde_id: stepCfg.behoerdeId,
    empfaenger_persona_id: run.persona.id,
    aktenzeichen: az,
    betreff: fill(tpl.betreffTemplate, { name, az, datum }),
    body_de: body,
    status: 'ungelesen',
    empfangen_am: new Date().toISOString(),
    vorgang_id: vorgangId,
    // `tpl.archetype` der Configs ist freitextlich (z. B. 'bescheid',
    // 'mitteilung') und NICHT im strengen `LetterArchetype`-Union — daher hier
    // bewusst NICHT auf `Letter.archetype` gemappt (Posteingang rendert ohne
    // Archetyp robust). Würde sonst ungültige Enum-Werte in den Brief schreiben.
  };
}

function buildDocument(
  run: CascadeRun,
  vorgangId: string,
  stepCfg: CascadeStepConfig,
  tpl: DocumentTemplate,
  az: string,
): VaultDocument {
  const name = personaFullName(run.persona);
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    id: `doc-${vorgangId}-${stepCfg.id}`,
    typ: tpl.typ as VaultDocument['typ'],
    titel: fill(tpl.titelTemplate, { name, az, datum: todayDe() }),
    ausstellende_behoerde_id: stepCfg.behoerdeId,
    ausgestellt_am: stamp,
    dokument_nr: az,
    qr_payload: `[MOCK-QR] ll://${run.config.slug}/${stepCfg.id}/${run.persona.id}/${stamp} ${MOCK_FOOTER}`,
    eudi_compatible: tpl.eudi_compatible,
    watermark: '[MOCK]',
    vorgang_id: vorgangId,
    owner_persona_id: run.persona.id,
  };
}

function buildTermin(
  run: CascadeRun,
  vorgangId: string,
  stepCfg: CascadeStepConfig,
  tpl: TerminTemplate,
  az: string,
): Termin {
  // Vorschlags-Slot: deterministisch 14 Tage in der Zukunft (kein echter Slot).
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14);
  return {
    id: `termin-${vorgangId}-${stepCfg.id}`,
    behoerde_id: stepCfg.behoerdeId,
    vorgang_id: vorgangId,
    datum: d.toISOString(),
    ort: { typ: 'praesenz', details: tpl.ort_details },
    status: 'vorgeschlagen', // G5: nie 'gebucht'
    betreff: tpl.betreff,
    buchungsreferenz: `[MOCK] ${az}`,
    kategorie: 'behoerdentermin',
    owner_persona_id: run.persona.id,
  };
}

/**
 * Führt die „Arbeit" eines Hops aus (Transport bei `isPrimarySubmission`,
 * dann Mints) und schreibt den Schritt auf `confirmed`. Gibt das geankerte
 * Aktenzeichen zurück (für Diagnostik/Tests). Idempotent über `run.resolved`.
 */
async function performStepWork(
  run: CascadeRun,
  vorgangId: string,
  stepCfg: CascadeStepConfig,
  base: AutopilotStep,
): Promise<void> {
  // Aktenzeichen: das Config-`[MOCK]`-Az., sonst ein deterministisches Fallback.
  let az = stepCfg.aktenzeichen ?? `[MOCK] AZ-${stepCfg.id.toUpperCase().slice(0, 8)}`;

  // §1.2 — die EINE headline Forward-Submission über getTransport() ankern.
  if (stepCfg.isPrimarySubmission) {
    const transport = __orchestrationInternals.getTransport();
    const envelope: TransportEnvelope = {
      messageId: `msg-${uuid()}`,
      behoerdeId: stepCfg.behoerdeId,
      idempotencyKey: `${vorgangId}:${stepCfg.id}`,
      intent: 'deliver',
      datenkategorien: stepCfg.datenkategorien,
      mock: true,
    };
    try {
      const receipt = await transport.deliver(envelope);
      // Az. an die Quittung ankern: das gezeigte Az. bleibt das Config-`[MOCK]`-
      // Az., aber die Anbindung an die Quittung macht „Übermittelt — Quittung
      // {receiptId}, Az. {az}" möglich (UI liest beides).
      az = stepCfg.aktenzeichen ?? `[MOCK] ${receipt.receiptId}`;
    } catch {
      // Im Reliable-Mode (Tests/Loom) feuert der Transport nie negativ; ein
      // negativer Fall darf die Demo-Kaskade nicht crashen — wir behalten das
      // Config-Az. und fahren fort (kein echter Versand, kein harter Fehler).
    }
  }

  const startedAt = base.started_at ?? new Date().toISOString();
  let letterId: string | undefined;

  if (stepCfg.mints.letter) {
    const letter = buildLetter(run, vorgangId, stepCfg, stepCfg.mints.letter, az);
    run.ports.appendLetter(letter);
    letterId = letter.id;
  }
  if (stepCfg.mints.document) {
    run.ports.upsertDocument(
      buildDocument(run, vorgangId, stepCfg, stepCfg.mints.document, az),
    );
  }
  if (stepCfg.mints.termin) {
    run.ports.upsertTermin(
      buildTermin(run, vorgangId, stepCfg, stepCfg.mints.termin, az),
    );
  }

  run.ports.upsertStep(vorgangId, {
    ...base,
    status: 'confirmed',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    letter_id: letterId,
    ...(stepCfg.gate === 'eid'
      ? { eid_confirmed_at: new Date().toISOString() }
      : {}),
    ...(stepCfg.gate === 'consent'
      ? { consent_given_at: startedAt }
      : {}),
  });

  run.resolved.add(stepCfg.id);
}

/**
 * Treibt die Kaskade ab dem ersten noch nicht aufgelösten Schritt:
 *  - 'auto'    → wartet `latencyMs`, dann `performStepWork`.
 *  - 'consent' → falls erteilt: wie 'auto'; sonst `self_assigned` (skip).
 *  - 'eid'     → setzt `pending_eid_confirmation` und PAUSIERT (return).
 * Wenn alle Schritte aufgelöst sind → `changeVorgangStatus('abgeschlossen')`.
 */
async function drive(vorgangId: string): Promise<void> {
  const run = RUNS.get(vorgangId);
  if (!run) return;

  for (const stepCfg of run.steps) {
    if (run.resolved.has(stepCfg.id)) continue;
    const base = toAutopilotStep(vorgangId, stepCfg);

    if (stepCfg.gate === 'eid') {
      // PAUSE: pending_eid_confirmation; resume via bestaetigeLebenslageSchritt.
      run.ports.upsertStep(vorgangId, {
        ...base,
        status: 'pending_eid_confirmation',
        started_at: new Date().toISOString(),
      });
      return;
    }

    if (stepCfg.gate === 'consent' && !run.consents.has(stepCfg.id)) {
      // Optionaler consent nicht erteilt → übersprungen, blockt Abschluss nicht.
      run.ports.upsertStep(vorgangId, {
        ...base,
        status: 'self_assigned',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      run.resolved.add(stepCfg.id);
      continue;
    }

    // 'auto' oder erteilter 'consent': in_progress → Arbeit → confirmed.
    run.ports.upsertStep(vorgangId, {
      ...base,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      ...(stepCfg.gate === 'consent'
        ? { consent_given_at: new Date().toISOString() }
        : {}),
    });
    await wait(stepCfg.latencyMs);
    await performStepWork(run, vorgangId, stepCfg, base);
  }

  finalizeIfDone(vorgangId);
}

function finalizeIfDone(vorgangId: string): void {
  const run = RUNS.get(vorgangId);
  if (!run) return;
  const allDone = run.steps.every((s) => run.resolved.has(s.id));
  if (allDone) {
    run.ports.changeVorgangStatus(vorgangId, 'abgeschlossen');
    RUNS.delete(vorgangId);
  }
}

/**
 * Startet die generische Kaskade für einen frisch angelegten Vorgang. Streamt
 * Block-A (auto) sofort und pausiert am ersten eID-Gate. Läuft asynchron
 * (fire-and-forget vom Aufrufer wie Umzug) — gibt zurück, sobald die erste
 * Pause/Abschluss erreicht ist.
 */
export async function runLebenslageCascade(
  config: LebenslageConfig,
  vorgang: Vorgang,
  persona: Persona,
  ports: LebenslageCascadePorts,
  consents: string[] = [],
): Promise<void> {
  const run: CascadeRun = {
    config,
    persona,
    ports,
    steps: orderCascadeSteps(config, persona),
    consents: new Set(consents),
    resolved: new Set<string>(),
  };
  RUNS.set(vorgang.id, run);
  await drive(vorgang.id);
}

/**
 * Gibt ein eID-Gate frei (Parität zu `bestätigeAutopilotSchritt`): führt die
 * Arbeit des Schritts aus (inkl. Primär-Submission + Mints) und SETZT die
 * Kaskade FORT, bis zum nächsten eID-Gate oder Abschluss. Guards gegen
 * Doppel-Confirm + unbekannte Schritt-IDs.
 *
 * `stepId` ist die volle AutopilotStep-ID (`"${vorgangId}:${stepCfg.id}"`).
 * Gibt `false` zurück, wenn keine laufende Kaskade / kein passender eID-Schritt
 * existiert (der Aufrufer in api.ts fällt dann NICHT in den Umzug-Pfad — die
 * Lebenslagen-Schritte sind disjunkt von Block-D-Umzug-Schritten).
 */
export async function confirmEidStep(
  vorgangId: string,
  stepId: string,
): Promise<boolean> {
  const run = RUNS.get(vorgangId);
  if (!run) return false;
  const stepCfg = run.steps.find(
    (s) => stepIdFor(vorgangId, s) === stepId,
  );
  if (!stepCfg) return false;
  if (stepCfg.gate !== 'eid') return false;
  if (run.resolved.has(stepCfg.id)) return true; // Doppel-Confirm: idempotent.

  const base = toAutopilotStep(vorgangId, stepCfg);
  run.ports.upsertStep(vorgangId, {
    ...base,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    eid_confirmed_at: new Date().toISOString(),
  });
  await wait(stepCfg.latencyMs);
  await performStepWork(run, vorgangId, stepCfg, base);

  // Kaskade nach dem freigegebenen eID-Schritt weitertreiben (nächstes Gate /
  // Abschluss). `drive` überspringt bereits aufgelöste Schritte.
  await drive(vorgangId);
  return true;
}

/** Ob für diesen Vorgang eine generische Lebenslagen-Kaskade läuft. */
export function hasLebenslageRun(vorgangId: string): boolean {
  return RUNS.has(vorgangId);
}
