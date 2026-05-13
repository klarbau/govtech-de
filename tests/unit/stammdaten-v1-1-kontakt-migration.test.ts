/**
 * V1.2 — Kontakt-Schicht-Migration V1 → V1.2 (Spec § 4.1).
 *
 * Coverage:
 *  - V1-shape `kontakt: { email, mobil }` → V1.2-shape mit `bundid_email`,
 *    `bundid_mobil`, `bundid_postfach`, `notification_praeferenzen`.
 *  - Persona-spezifische Defaults (Anna postfach=aktiv; Schmidt
 *    postfach=teilaktiviert; Mehmet postfach=inaktiv).
 *  - Generic V1-shape (unbekannte Persona) → email-fallback + 5×brief.
 *  - Idempotenz: Re-Run auf bereits-V1.2-shape ändert nichts.
 *  - V1-shape mit `email` undefined: `bundid_email.value === ''`,
 *    `verified === false`.
 */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

beforeAll(() => {
  const storage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage, sessionStorage, location: { search: '' } },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorage,
    writable: true,
    configurable: true,
  });
});

let buildKontaktFromLegacyV1: typeof import('@/lib/mock-backend/persistence-migrations').buildKontaktFromLegacyV1;
let migrateKontaktV1ToV11: typeof import('@/lib/mock-backend/persistence-migrations').migrateKontaktV1ToV11;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/persistence-migrations');
  buildKontaktFromLegacyV1 = mod.buildKontaktFromLegacyV1;
  migrateKontaktV1ToV11 = mod.migrateKontaktV1ToV11;
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('buildKontaktFromLegacyV1 — Persona-spezifische Defaults (Spec § 4.5)', () => {
  test('Anna → postfach aktiv, bundid_email verified, mobil verified', () => {
    const result = buildKontaktFromLegacyV1('anna-petrov', undefined);
    expect(result.bundid_postfach.status).toBe('aktiv');
    expect(result.bundid_postfach.aktiviert).toBe(true);
    expect(result.bundid_email.verified).toBe(true);
    expect(result.bundid_email.quelle).toBe('bundid');
    expect(result.bundid_mobil?.verified).toBe(true);
    expect(result.bundid_mobil?.quelle).toBe('bundid_self_attested');
    expect(result.notification_praeferenzen).toEqual({
      steuer: 'brief',
      sozial: 'brief',
      familie: 'brief',
      verkehr: 'brief',
      sonstige: 'brief',
    });
  });

  test('Schmidt → postfach teilaktiviert, mobil unverified', () => {
    const result = buildKontaktFromLegacyV1('markus-schmidt', undefined);
    expect(result.bundid_postfach.status).toBe('teilaktiviert');
    expect(result.bundid_mobil?.verified).toBe(false);
  });

  test('Mehmet → postfach inaktiv', () => {
    const result = buildKontaktFromLegacyV1('mehmet-yildiz', undefined);
    expect(result.bundid_postfach.status).toBe('inaktiv');
    expect(result.bundid_postfach.aktiviert).toBe(false);
  });
});

describe('buildKontaktFromLegacyV1 — Legacy-Fallback (unbekannte Persona)', () => {
  test('mit email + mobil: bundid_email.value === email, verified=true; bundid_mobil.verified=false', () => {
    const result = buildKontaktFromLegacyV1('unknown-persona', {
      email: 'foo@example.com',
      mobil: '+49 0000 000',
    });
    expect(result.bundid_email.value).toBe('foo@example.com');
    expect(result.bundid_email.verified).toBe(true);
    expect(result.bundid_email.quelle).toBe('bundid');
    expect(result.bundid_mobil?.value).toBe('+49 0000 000');
    expect(result.bundid_mobil?.verified).toBe(false);
    expect(result.bundid_mobil?.quelle).toBe('bundid_self_attested');
    expect(result.bundid_postfach).toEqual({
      aktiviert: false,
      status: 'inaktiv',
    });
    expect(result.notification_praeferenzen).toEqual({
      steuer: 'brief',
      sozial: 'brief',
      familie: 'brief',
      verkehr: 'brief',
      sonstige: 'brief',
    });
  });

  test('email undefined: bundid_email.value === "", verified=false', () => {
    const result = buildKontaktFromLegacyV1('unknown-persona', {});
    expect(result.bundid_email.value).toBe('');
    expect(result.bundid_email.verified).toBe(false);
    expect(result.bundid_mobil).toBeUndefined();
  });

  test('mobil undefined: bundid_mobil ist undefined (kein leeres Objekt)', () => {
    const result = buildKontaktFromLegacyV1('unknown-persona', {
      email: 'a@b.de',
    });
    expect(result.bundid_mobil).toBeUndefined();
  });
});

describe('migrateKontaktV1ToV11 — Idempotenz und Lossless', () => {
  test('idempotent: Re-Run auf V1.2-shape ändert den Bucket nicht', () => {
    const personas = [
      {
        id: 'unknown-persona',
        kontakt: {
          bundid_email: {
            value: 'a@b.de',
            verified: true,
            quelle: 'bundid',
          },
          bundid_postfach: { aktiviert: true, status: 'aktiv' },
          notification_praeferenzen: {
            steuer: 'postfach',
            sozial: 'brief',
            familie: 'brief',
            verkehr: 'brief',
            sonstige: 'brief',
          },
        },
      },
    ];
    globalThis.localStorage.setItem(
      'govtech-de:v1:personas',
      JSON.stringify(personas),
    );

    migrateKontaktV1ToV11();
    const after1 = globalThis.localStorage.getItem(
      'govtech-de:v1:stammdaten:notification-praeferenzen',
    );
    migrateKontaktV1ToV11();
    const after2 = globalThis.localStorage.getItem(
      'govtech-de:v1:stammdaten:notification-praeferenzen',
    );
    expect(after2).toBe(after1);
    const parsed = JSON.parse(after2 as string);
    expect(parsed['unknown-persona'].notification_praeferenzen.steuer).toBe(
      'postfach',
    );
  });

  test('migrates V1-shape personas: notification_praeferenzen-Bucket wird befüllt', () => {
    const personas = [
      {
        id: 'unknown-persona',
        kontakt: { email: 'foo@bar.de', mobil: '+49 12 345' },
      },
    ];
    globalThis.localStorage.setItem(
      'govtech-de:v1:personas',
      JSON.stringify(personas),
    );

    migrateKontaktV1ToV11();
    const bucketRaw = globalThis.localStorage.getItem(
      'govtech-de:v1:stammdaten:notification-praeferenzen',
    );
    expect(bucketRaw).not.toBeNull();
    const bucket = JSON.parse(bucketRaw as string);
    expect(bucket['unknown-persona']).toBeDefined();
    expect(bucket['unknown-persona'].bundid_email.value).toBe('foo@bar.de');
    expect(bucket['unknown-persona'].bundid_postfach.status).toBe('inaktiv');
    expect(bucket['unknown-persona'].notification_praeferenzen.familie).toBe(
      'brief',
    );

    // Persona-Bucket selbst trägt jetzt V1.2-shape.
    const updatedPersonasRaw = globalThis.localStorage.getItem(
      'govtech-de:v1:personas',
    );
    const updatedPersonas = JSON.parse(updatedPersonasRaw as string);
    expect(updatedPersonas[0].kontakt.bundid_email).toBeDefined();
    expect(updatedPersonas[0].kontakt.bundid_postfach).toBeDefined();
  });

  test('no-op when personas bucket missing — V1.2-Bucket trotzdem initialisiert (leer)', () => {
    expect(
      globalThis.localStorage.getItem(
        'govtech-de:v1:stammdaten:notification-praeferenzen',
      ),
    ).toBeNull();
    migrateKontaktV1ToV11();
    const after = globalThis.localStorage.getItem(
      'govtech-de:v1:stammdaten:notification-praeferenzen',
    );
    expect(after).not.toBeNull();
    expect(JSON.parse(after as string)).toEqual({});
  });
});
