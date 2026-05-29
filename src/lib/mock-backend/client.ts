/**
 * HTTP-Fetch-Client für die Mock-Backend-`api` (Stage 3).
 *
 * ============================================================================
 * Zweck
 * ============================================================================
 * Ersetzt im Browser die In-Process-`api` (`./api`) durch einen Proxy, der jede
 * Methode über `fetch('/api/mock')` (RPC) bzw. `EventSource('/api/mock/events')`
 * (subscribe) an die Server-Route-Handler delegiert. Die Oberfläche ist
 * identisch zu `MockBackendApi` — Komponenten rufen weiterhin `await api.getX()`
 * auf, ohne zu wissen, dass die Daten jetzt über HTTP laufen.
 *
 * Wire-Contract (siehe `src/app/api/mock/route.ts` + `.../events/route.ts`):
 *   POST /api/mock  body { method, args?, reliable? }
 *     → 200 { ok:true, data }
 *     → 4xx/5xx { ok:false, error:{ code?, message } }
 *   GET  /api/mock/events  → text/event-stream; jede `data:`-Zeile ein
 *     JSON-serialisierter `MockBackendEvent`; `:`-Zeilen sind Heartbeats.
 *
 * Session: Cookie `mock_sid` (httpOnly, same-origin) — `credentials:'same-origin'`
 * sorgt dafür, dass RPC- und SSE-Pfad dieselbe Server-Session teilen.
 *
 * Reliable-Mode: dieselben clientseitigen Signale, die `latency.ts` schon
 * auswertet (`?reliable=1`, `localStorage['govtech-de:v1:meta'].reliable_mode`,
 * `NEXT_PUBLIC_RELIABLE`). Wir senden bei aktivem Flag `x-mock-reliable: 1`,
 * damit der Server die Fehler-Injektion deterministisch abschaltet (Spine-e2e).
 *
 * Fehler: bei `ok:false` rekonstruieren wir einen `MockBackendError` mit
 * identischem `code` / `message` / `retryable`, das die bestehenden UI-
 * `try/catch`-Pfade erwarten (retryable aus dem HTTP-Status abgeleitet:
 * 503 → retryable, alles andere → nicht-retryable).
 * ============================================================================
 */
import type { MockBackendApi } from './api';
import { MockBackendError } from './errors';
import type {
  MockBackendEvent,
  MockBackendEventListener,
} from '@/types/mock-event';

const RPC_ENDPOINT = '/api/mock';
const SSE_ENDPOINT = '/api/mock/events';

/**
 * Reliable-Mode-Detection — spiegelt exakt die Quellen, die `latency.ts`
 * serverseitig per Request-Kontext erhält, aber clientseitig auflöst. Hat keine
 * Server-Komponente; läuft nur im Browser (SSR-sicher durch `typeof`-Guards).
 */
function isReliableMode(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_RELIABLE === '1'
  ) {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reliable') === '1') return true;
      const meta = window.localStorage.getItem('govtech-de:v1:meta');
      if (meta) {
        const parsed = JSON.parse(meta) as { reliable_mode?: boolean };
        if (parsed?.reliable_mode === true) return true;
      }
    } catch {
      // URL-/localStorage-Lesefehler ignorieren — Default 'unreliable'.
    }
  }
  return false;
}

interface RpcOkResponse {
  ok: true;
  data: unknown;
}
interface RpcErrResponse {
  ok: false;
  error?: { code?: string; message?: string };
}
type RpcResponse = RpcOkResponse | RpcErrResponse;

/**
 * Generischer RPC-Aufruf. Wirft `MockBackendError` bei `ok:false` (oder bei
 * Netzwerk-/Parse-Fehlern) mit den Feldern, die die UI erwartet.
 */
async function call(method: string, args: unknown[]): Promise<unknown> {
  const reliable = isReliableMode();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (reliable) headers['x-mock-reliable'] = '1';

  let res: Response;
  try {
    res = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ method, args, reliable }),
    });
  } catch (networkErr) {
    // Echtes Netzwerk-Problem (Offline o. Ä.) — als retryable behandeln, damit
    // die UI-Retry-Pfade greifen, identisch zum simulierten "Behörde nicht
    // erreichbar".
    throw new MockBackendError(
      networkErr instanceof Error
        ? networkErr.message
        : 'Mock-Backend nicht erreichbar.',
      { code: 'NETWORK_ERROR', retryable: true },
    );
  }

  let payload: RpcResponse;
  try {
    payload = (await res.json()) as RpcResponse;
  } catch {
    throw new MockBackendError(
      `Ungültige Antwort vom Mock-Backend (HTTP ${res.status}).`,
      { code: 'INVALID_RESPONSE', retryable: res.status >= 500 },
    );
  }

  if (res.ok && payload.ok) {
    return payload.data;
  }

  // Fehlerpfad: code/message vom Server übernehmen; retryable aus dem Status
  // ableiten (Dispatcher: 503 = retryable simuliert, 400 = client-Fehler).
  const error = (payload as RpcErrResponse).error ?? {};
  throw new MockBackendError(error.message ?? `HTTP ${res.status}`, {
    code: error.code,
    retryable: res.status === 503,
  });
}

/**
 * `subscribe` — öffnet synchron eine `EventSource` auf den SSE-Stream und ruft
 * `listener` pro `MockBackendEvent` auf. Gibt eine Unsubscribe-Funktion zurück,
 * die die Verbindung schließt. Signatur 1:1 wie die Core-`api.subscribe`.
 *
 * Hinweis: `EventSource` parst SSE selbst; `event.data` enthält bereits nur die
 * `data:`-Nutzlast (Heartbeat-/Kommentar-Zeilen mit führendem `:` werden vom
 * Browser verworfen und erreichen `onmessage` nie). Wir parsen die JSON-Nutzlast
 * und ignorieren defekte Frames defensiv.
 */
function subscribe(listener: MockBackendEventListener): () => void {
  // SSR-Guard: außerhalb des Browsers ist kein SSE möglich → No-op-Unsubscribe.
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  const source = new EventSource(SSE_ENDPOINT, { withCredentials: true });
  source.onmessage = (ev: MessageEvent<string>) => {
    if (!ev.data) return;
    try {
      const parsed = JSON.parse(ev.data) as MockBackendEvent;
      listener(parsed);
    } catch {
      // Defekter Frame — ignorieren, Stream bleibt offen.
    }
  };
  // onerror: EventSource reconnectet automatisch; kein Teardown nötig.

  return () => {
    source.close();
  };
}

/**
 * Der Fetch-Client als `MockBackendApi`. Wir nutzen einen `Proxy`, damit die
 * Oberfläche garantiert identisch zu `MockBackendApi` bleibt (keine 80
 * handgeschriebenen Delegationen, die mit der Core-`api` driften können):
 * jeder Methoden-Zugriff `client.foo` liefert eine Funktion
 * `(...args) => call('foo', args)` — außer `subscribe`, das gesondert behandelt
 * wird. Der Umlaut-Alias `bestätigeAutopilotSchritt` funktioniert dadurch
 * automatisch; der App-Code verwendet die ASCII-Form.
 */
const methodCache = new Map<string, (...args: unknown[]) => Promise<unknown>>();

export const apiClient: MockBackendApi = new Proxy(
  {} as MockBackendApi,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'subscribe') {
        return subscribe;
      }
      // Promise-/Thenable-Interop-Guard: niemand soll den Proxy als Thenable
      // missverstehen (z. B. wenn er versehentlich ge-`await`ed wird).
      if (prop === 'then') return undefined;

      let fn = methodCache.get(prop);
      if (!fn) {
        fn = (...args: unknown[]) => call(prop, args);
        methodCache.set(prop, fn);
      }
      return fn;
    },
  },
);
