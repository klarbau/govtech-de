/**
 * Genuiner „nicht gefunden"-Fehler (nicht wiederholbar, z. B. `VORGANG_NOT_FOUND`)
 * vs. transienter Latenzfehler. Das Mock-Backend wirft via `withLatency` mit 5%
 * Wahrscheinlichkeit einen `MockBackendError` mit `retryable: true`; echte
 * Not-Found-Fehler tragen `retryable: false`. Nur Letztere dürfen `notFound()`
 * auslösen.
 */
export function isGenuineNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { retryable?: boolean }).retryable === false
  );
}

/**
 * Lädt mit Wiederholung gegen die simulierte 5%-Mock-Backend-Fehlerquote.
 * Transiente Fehler (`retryable !== false`) werden bis zu `tries`-mal mit kurzem
 * Backoff wiederholt; ein genuiner Not-Found-Fehler schlägt SOFORT durch (kein
 * Retry), damit der Aufrufer korrekt `notFound()` rendern kann. Verhindert das
 * frühere Verhalten, bei dem ein transienter „Behörde nicht erreichbar"-Fehler
 * fälschlich als 404 interpretiert wurde (≈10% der Lebenslagen-Seitenaufrufe).
 */
export async function loadWithRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isGenuineNotFound(err)) throw err; // echter Not-Found: nicht wiederholen
      if (attempt < tries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Auflösung eines Dot-Pfads gegen ein Objekt (Once-Only-Prefill). Unterstützt
 * `a.b` und `a.b[0].c`. Gibt `undefined` bei fehlendem Pfad/Segment zurück —
 * der Aufrufer rendert dann ein leeres, genuines Eingabefeld.
 */
export function resolvePath(source: unknown, path: string | null): unknown {
  if (!path) return undefined;
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((s) => s.length > 0);
  let current: unknown = source;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Macht einen aufgelösten Wert anzeigbar: Adresse → einzeilig, primitive Werte
 * → String, alles andere → leer (kein „[object Object]").
 */
export function formatPrefillValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const a = value as Record<string, unknown>;
    const looksLikeAdresse =
      typeof a.strasse === 'string' || typeof a.plz === 'string' || typeof a.ort === 'string';
    if (looksLikeAdresse) {
      const line1 = [a.strasse, a.hausnummer, a.zusatz].filter((p) => typeof p === 'string').join(' ');
      const line2 = [a.plz, a.ort].filter((p) => typeof p === 'string').join(' ');
      return [line1, line2].filter((p) => p.length > 0).join(', ');
    }
  }
  return '';
}
