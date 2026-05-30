/**
 * RPC-Dispatcher-Kern (Stage 2). Vom Route-Handler `POST /api/mock` genutzt.
 *
 * Whitelist-Strategie: die erlaubten Methoden werden aus dem `api`-Objekt
 * abgeleitet (alle Function-Properties) MINUS `subscribe` (das ist der SSE-
 * Pfad, kein RPC). So kann keine interne Methode versehentlich exponiert
 * werden, die nicht ohnehin Teil der öffentlichen `api`-Oberfläche ist.
 *
 * Ausführung: jede Methode läuft innerhalb von
 *   runWithSession(sessionId, () => runWithEventBus(sessionBus, () =>
 *     runWithRequestContext({ reliable }, () => api[method](...args))))
 * — gebunden an den Session-Store, den Session-Bus (denselben, den die SSE-
 * Route abhört) und das per-Request aufgelöste Reliable-Flag.
 */
import { api } from '../api';
import { runWithEventBus } from '../events';
import {
  runWithRequestContext,
  runWithSession,
} from '../store-context';
import { seedStore } from '../seed';
import { getOrCreateSessionBus } from './bus-registry';
import {
  consumePreviewToken,
  GATED_WRITE_METHODS,
  recordPreviewToken,
} from './write-gate';
import type { InMemoryStore } from '../store';

type ApiRecord = Record<string, unknown>;

/** `api` als index-zugreifbares Record (das Objekt-Literal hat keinen Index-Signatur-Typ). */
const apiRecord = api as unknown as ApiRecord;

/**
 * Erlaubte RPC-Methoden: alle Function-Properties von `api` außer `subscribe`.
 * Einmal beim Modul-Load berechnet (das `api`-Objekt ist statisch).
 *
 * Hinweis: der Umlaut-Alias `bestätigeAutopilotSchritt` ist ebenfalls enthalten;
 * der Client (Stage 3) verwendet die ASCII-Form `bestaetigeAutopilotSchritt`.
 */
export const ALLOWED_METHODS: ReadonlySet<string> = new Set(
  Object.keys(apiRecord).filter(
    (key) => key !== 'subscribe' && typeof apiRecord[key] === 'function',
  ),
);

export interface DispatchInput {
  method: string;
  args: unknown[];
  sessionId: string;
  reliable: boolean;
}

export type DispatchResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: { code?: string; message: string } };

/** Seed-Funktion für eine frische Session — voller Persona-Seed + Migrationen. */
function seedFn(store: InMemoryStore): void {
  seedStore(store);
}

/**
 * Führt eine whitelisted `api`-Methode im Session-Kontext aus. Wirft nicht —
 * Fehler werden als `{ ok:false, status, error }` zurückgegeben.
 */
export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const { method, args, sessionId, reliable } = input;

  if (!ALLOWED_METHODS.has(method)) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Methode "${method}" ist nicht über die HTTP-Schnittstelle verfügbar.`,
      },
    };
  }

  // ── SERVER-SIDE CONFIRM GATE (audit defect #2) ──────────────────────────
  // This is THE enforcement point for the assistant's "structurally enforced"
  // safety claim (tools.ts §7.3). Irreversible writes (`startUmzug`) require a
  // single-use preview token that only a preceding `previewUmzug` in the SAME
  // session mints — so a raw `POST /api/mock {"method":"startUmzug"}` that
  // skips the React preview→confirm card is rejected here, not just in the UI.
  // The legit demo flow (previewUmzug → user confirms → startUmzug) carries a
  // matching token and passes untouched. See server/write-gate.ts.
  if (GATED_WRITE_METHODS.has(method)) {
    const allowed = consumePreviewToken(sessionId, args);
    if (!allowed) {
      return {
        ok: false,
        status: 403,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message:
            'Dieser Vorgang erfordert eine vorausgehende Vorschau-Bestätigung. ' +
            'Bitte zuerst die Vorschau aufrufen und im Bestätigungsdialog zustimmen.',
        },
      };
    }
  }

  const fn = apiRecord[method] as (...a: unknown[]) => unknown;
  const sessionBus = getOrCreateSessionBus(sessionId);

  try {
    const result = runWithSession(
      sessionId,
      () =>
        runWithEventBus(sessionBus, () =>
          runWithRequestContext({ reliable }, () => fn(...args)),
        ),
      seedFn,
    );
    const data = result instanceof Promise ? await result : result;
    // A successful `previewUmzug` mints the single-use token that the matching
    // `startUmzug` will consume above on the next RPC turn.
    if (method === 'previewUmzug') {
      recordPreviewToken(sessionId, args);
    }
    return { ok: true, data };
  } catch (err) {
    return toErrorResult(err);
  }
}

function toErrorResult(err: unknown): DispatchResult {
  // MockBackendError trägt `code` + `retryable`; alles andere → generischer 500.
  const isMockError =
    err !== null &&
    typeof err === 'object' &&
    (err as { name?: string }).name === 'MockBackendError';

  if (isMockError) {
    const e = err as { code?: string; message?: string; retryable?: boolean };
    // Validierungs-/Not-Found-Fehler sind Client-Fehler (400); ein
    // simulierter „Behörde nicht erreichbar"-Fehler ist retryable → 503.
    const status = e.retryable === false ? 400 : 503;
    return {
      ok: false,
      status,
      error: { code: e.code, message: e.message ?? 'Mock-Backend-Fehler.' },
    };
  }

  const message =
    err instanceof Error ? err.message : 'Unbekannter Server-Fehler.';
  return { ok: false, status: 500, error: { message } };
}
