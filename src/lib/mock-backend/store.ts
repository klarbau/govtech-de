/**
 * Storage-Abstraktion für die Mock-Backend-Schicht (Stage 1 der HTTP-Migration).
 *
 * Hintergrund: bisher hing der Persistenz-Kern hart an `window.localStorage`.
 * Damit derselbe Kern serverseitig pro Session mit einem In-Memory-Store laufen
 * kann (Route-Handler in Stage 2), reden `persistence.ts` und
 * `persistence-migrations.ts` jetzt gegen dieses minimale Interface statt direkt
 * gegen `window.localStorage`.
 *
 * Das Interface spiegelt bewusst die Teilmenge der Web-`Storage`-API, die der
 * Kern tatsächlich nutzt (`getItem` / `setItem` / `removeItem` / `key` /
 * `length`). Dadurch ist die Refactor-Diff in den Konsumenten nahezu mechanisch
 * (`window.localStorage` → `getCurrentStore()`).
 */

/**
 * Minimaler, string-basierter Key-Value-Store. Werte sind immer bereits
 * JSON-serialisierte Strings — die Schicht darüber (`persistence.ts`) übernimmt
 * Encoding/Decoding + Zod-Validierung.
 */
export interface MockStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Zugriff nach Index — wird von `purgeAll()` zum Namespace-Scan gebraucht. */
  key(index: number): string | null;
  /** Anzahl der Keys — wird von `purgeAll()` zum Namespace-Scan gebraucht. */
  readonly length: number;
}

/**
 * Browser-Implementierung: dünner Wrapper um ein `Storage`-Objekt (im Normal-
 * fall `window.localStorage`). Existiert als eigene Klasse, damit der Kern nie
 * mehr direkt `window` referenziert — die `isBrowser()`-Auflösung passiert
 * zentral in `store-context.ts`.
 */
export class LocalStorageStore implements MockStore {
  constructor(private readonly backing: Storage) {}

  getItem(key: string): string | null {
    return this.backing.getItem(key);
  }
  setItem(key: string, value: string): void {
    this.backing.setItem(key, value);
  }
  removeItem(key: string): void {
    this.backing.removeItem(key);
  }
  key(index: number): string | null {
    return this.backing.key(index);
  }
  get length(): number {
    return this.backing.length;
  }
}

/**
 * Map-basierte In-Memory-Implementierung.
 *
 * Zwei Einsatzorte:
 *   1. Serverseitig pro Session (Stage 2): jede Request-Session bekommt eine
 *      frisch geseedete Instanz, gehalten in der Session-Registry in
 *      `store-context.ts`.
 *   2. Node-/Test-Fallback: wenn kein `window` und kein async-Kontext gesetzt
 *      sind, dient eine Default-Instanz als Prozess-weiter Store.
 */
export class InMemoryStore implements MockStore {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  get length(): number {
    return this.map.size;
  }
  /** Test-Hilfe: leert den Store vollständig. */
  clearAll(): void {
    this.map.clear();
  }
}
