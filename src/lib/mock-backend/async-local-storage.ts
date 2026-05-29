/**
 * Isomorpher Zugriff auf Node `AsyncLocalStorage`.
 *
 * Problem: ein statischer `import ... from 'node:async_hooks'` zwingt Webpack,
 * das Node-Core-Modul auch in den *Client*-Bundle zu ziehen (api.ts wird von
 * Client-Komponenten importiert) → Build-Fehler „Unhandled scheme node:".
 *
 * Lösung: Wir laden `AsyncLocalStorage` nur serverseitig per `require` und
 * liefern im Browser einen No-op-Stub mit identischer Mini-Oberfläche
 * (`run` / `getStore`). Im Browser gibt es ohnehin nie einen async-Kontext —
 * `getStore()` liefert `undefined`, und die Auflösung in `store-context.ts` /
 * `events.ts` fällt korrekt auf localStorage- bzw. Default-Bus zurück.
 */

/** Minimal-Oberfläche, die store-context.ts + events.ts tatsächlich nutzen. */
export interface AsyncStore<T> {
  run<R>(value: T, fn: () => R): R;
  getStore(): T | undefined;
}

/** No-op-Implementierung für den Browser: kein Kontext, immer Fallback. */
class NoopAsyncStore<T> implements AsyncStore<T> {
  run<R>(_value: T, fn: () => R): R {
    return fn();
  }
  getStore(): T | undefined {
    return undefined;
  }
}

const isServer = typeof window === 'undefined';

/**
 * Liefert eine `AsyncStore<T>`-Instanz: echte `AsyncLocalStorage` auf dem
 * Server, No-op im Browser.
 */
export function createAsyncStore<T>(): AsyncStore<T> {
  const ctor = resolveAsyncLocalStorageCtor<T>();
  if (ctor) return new ctor();
  // Browser / Edge-Runtime ohne async_hooks → No-op-Fallback.
  return new NoopAsyncStore<T>();
}

/**
 * Löst die `AsyncLocalStorage`-Klasse server-seitig auf, ohne Webpack zu
 * zwingen, `node:async_hooks` in den *Client*-Bundle zu ziehen.
 *
 * Die frühere Variante (`eval('require')`) scheiterte im gebündelten Next-
 * Server-Runtime mit „require is not defined" und fiel still auf den No-op-Stub
 * zurück — was die Per-Session-Isolation unbemerkt deaktivierte (alle Sessions
 * teilten den Default-Store/-Bus). Stattdessen:
 *
 *   1. `process.getBuiltinModule('node:async_hooks')` (Node ≥ 22) — der robuste
 *      Pfad. Es ist ein reiner Laufzeit-Aufruf auf `process`; Webpack erkennt
 *      darin keine statische Modul-Abhängigkeit, der Client-Bundle bleibt sauber.
 *   2. Fallback `globalThis.AsyncLocalStorage`, falls eine Runtime die Klasse
 *      direkt bereitstellt.
 */
function resolveAsyncLocalStorageCtor<T>():
  | (new () => AsyncStore<T>)
  | undefined {
  if (!isServer) return undefined;

  const proc = (globalThis as { process?: NodeJS.Process }).process;
  const getBuiltin = (
    proc as
      | (NodeJS.Process & {
          getBuiltinModule?: (id: string) => unknown;
        })
      | undefined
  )?.getBuiltinModule;

  if (typeof getBuiltin === 'function') {
    try {
      const mod = getBuiltin('node:async_hooks') as
        | { AsyncLocalStorage?: new () => AsyncStore<T> }
        | undefined;
      if (mod?.AsyncLocalStorage) return mod.AsyncLocalStorage;
    } catch {
      // weiter zum globalThis-Fallback
    }
  }

  const globalCtor = (
    globalThis as { AsyncLocalStorage?: new () => AsyncStore<T> }
  ).AsyncLocalStorage;
  if (typeof globalCtor === 'function') return globalCtor;

  return undefined;
}
