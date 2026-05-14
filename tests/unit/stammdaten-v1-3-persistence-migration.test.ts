/**
 * V1.3 — Persistence-Migration V1.2 → V1.3 (Spec § 5.3 / VL-4).
 *
 * Coverage:
 *   (a) Migration idempotent (2× Aufruf = identisch).
 *   (b) Nach Migration kein `persona.mobilitaet.punkte` Feld (HL-MOB-11 / VL-4).
 *   (c) Lena Schmidt (`markus-schmidt.familie.partner.kfz_halter`) korrigiert
 *       auf `false` (V1.2-Drift; VL-12).
 *   (d) Anna `halter_adresse.uebergangs_marker_via_umzug === true` mit
 *       Vorgang-Ref `vg-anna-umzug-skalitzer-friedrichstr` (Block-D-Bridge).
 *   (e) Schema-Version-Marker auf `'1.3'`.
 *   (f) Migration kann auf V1.0-Persistenz aufgesetzt werden (V1.0 → V1.1 →
 *       V1.2 → V1.3 sequentiell läuft idempotent).
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

const NAMESPACE = 'govtech-de:v1:';
const PERSONAS_KEY = `${NAMESPACE}personas`;
const MOBILITAET_KEY = `${NAMESPACE}stammdaten:mobilitaet`;
const SCHEMA_VERSION_KEY = `${NAMESPACE}stammdaten:schema-version`;

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

let migratePersonaV12ToV13: typeof import('@/lib/mock-backend/persistence-migrations').migratePersonaV12ToV13;
let migrateMobilitaetV12ToV13: typeof import('@/lib/mock-backend/persistence-migrations').migrateMobilitaetV12ToV13;
let stripPunkteField: typeof import('@/lib/mock-backend/persistence-migrations').stripPunkteField;
let runStorageMigrations: typeof import('@/lib/mock-backend/persistence-migrations').runStorageMigrations;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/persistence-migrations');
  migratePersonaV12ToV13 = mod.migratePersonaV12ToV13;
  migrateMobilitaetV12ToV13 = mod.migrateMobilitaetV12ToV13;
  stripPunkteField = mod.stripPunkteField;
  runStorageMigrations = mod.runStorageMigrations;
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

// V1.2-baseline-state mit 2 Personas: Anna (kein mobilitaet-Block), Schmidt
// (Lena fälschlich kfz_halter:true). Mehmet bewusst weggelassen, um zu
// zeigen, dass die Migration auch bei nicht-alle-3-Personas läuft.
function seedV12PersonasBucket(): void {
  const v12Personas = [
    {
      id: 'anna-petrov',
      vorname: 'Anna',
      nachname: 'Petrov',
      familie: { kinder: [] },
      // kein mobilitaet-Block
    },
    {
      id: 'markus-schmidt',
      vorname: 'Markus',
      nachname: 'Schmidt',
      familie: {
        partner: {
          id: 'lena-schmidt',
          vorname: 'Lena',
          nachname: 'Schmidt',
          // V1.2-Drift: Lena fälschlich als Halter
          kfz_halter: true,
        },
        kinder: [],
      },
    },
  ];
  globalThis.localStorage.setItem(PERSONAS_KEY, JSON.stringify(v12Personas));
}

describe('V1.3 migratePersonaV12ToV13 (VL-4 / VL-12)', () => {
  test('Alias-Export: migrateMobilitaetV12ToV13 === migratePersonaV12ToV13', () => {
    expect(migrateMobilitaetV12ToV13).toBe(migratePersonaV12ToV13);
  });

  test('idempotent — 2× Aufruf produziert identischen Bucket-State', () => {
    seedV12PersonasBucket();
    migratePersonaV12ToV13();
    const after1Personas = globalThis.localStorage.getItem(PERSONAS_KEY);
    const after1Mob = globalThis.localStorage.getItem(MOBILITAET_KEY);
    const after1Version = globalThis.localStorage.getItem(SCHEMA_VERSION_KEY);

    migratePersonaV12ToV13();
    const after2Personas = globalThis.localStorage.getItem(PERSONAS_KEY);
    const after2Mob = globalThis.localStorage.getItem(MOBILITAET_KEY);
    const after2Version = globalThis.localStorage.getItem(SCHEMA_VERSION_KEY);

    expect(after2Personas).toBe(after1Personas);
    expect(after2Mob).toBe(after1Mob);
    expect(after2Version).toBe(after1Version);
  });

  test('Schema-Version-Marker = "1.3"', () => {
    seedV12PersonasBucket();
    migratePersonaV12ToV13();
    const raw = globalThis.localStorage.getItem(SCHEMA_VERSION_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { version?: string };
    expect(parsed.version).toBe('1.3');
  });

  test('Anna: mobilitaet-Block kopiert aus Seed; halter_adresse.uebergangs_marker_via_umzug === true', () => {
    seedV12PersonasBucket();
    migratePersonaV12ToV13();
    const personas = JSON.parse(
      globalThis.localStorage.getItem(PERSONAS_KEY) as string,
    ) as Array<{
      id: string;
      mobilitaet?: {
        fahrerlaubnis?: { fe_nr: string };
        halter?: unknown[];
        halter_adresse?: {
          uebergangs_marker_via_umzug?: boolean;
          via_umzug_vorgang_id?: string;
        };
      };
    }>;
    const anna = personas.find((p) => p.id === 'anna-petrov');
    expect(anna?.mobilitaet).toBeDefined();
    expect(anna?.mobilitaet?.fahrerlaubnis?.fe_nr).toBe('[MOCK] F0727RRE2I50');
    expect(anna?.mobilitaet?.halter_adresse?.uebergangs_marker_via_umzug).toBe(true);
    expect(anna?.mobilitaet?.halter_adresse?.via_umzug_vorgang_id).toBe(
      'vg-anna-umzug-skalitzer-friedrichstr',
    );
  });

  test('Lena Schmidt — kfz_halter-Korrektur auf false (VL-12)', () => {
    seedV12PersonasBucket();
    migratePersonaV12ToV13();
    const personas = JSON.parse(
      globalThis.localStorage.getItem(PERSONAS_KEY) as string,
    ) as Array<{
      id: string;
      familie?: { partner?: { id?: string; kfz_halter?: boolean } };
    }>;
    const schmidt = personas.find((p) => p.id === 'markus-schmidt');
    expect(schmidt?.familie?.partner?.id).toBe('lena-schmidt');
    expect(schmidt?.familie?.partner?.kfz_halter).toBe(false);
  });

  test('Kein `punkte`-Feld nach Migration in persona.mobilitaet (HL-MOB-11 / VL-4)', () => {
    // Seed mit einer Persona, die fälschlich ein `punkte`-Feld trägt.
    const polluted = [
      {
        id: 'anna-petrov',
        vorname: 'Anna',
        nachname: 'Petrov',
        familie: { kinder: [] },
        mobilitaet: {
          halter: [],
          // VL-4-Verstoß im Input — Migration MUSS das wegputzen.
          punkte: 3,
        },
      },
    ];
    globalThis.localStorage.setItem(PERSONAS_KEY, JSON.stringify(polluted));
    migratePersonaV12ToV13();
    const personas = JSON.parse(
      globalThis.localStorage.getItem(PERSONAS_KEY) as string,
    ) as Array<{ id: string; mobilitaet?: Record<string, unknown> }>;
    const anna = personas.find((p) => p.id === 'anna-petrov');
    expect(anna?.mobilitaet).toBeDefined();
    expect(anna?.mobilitaet && 'punkte' in anna.mobilitaet).toBe(false);
  });

  test('Mobilität-Bucket: existing values are preserved (idempotency on bucket merge)', () => {
    // V1.2-Anna persists with mobilitaet block already (e.g. user has expanded
    // the section before in V1.3). Migration must not stomp the existing value.
    seedV12PersonasBucket();
    const customAnnaMob = {
      halter: [
        {
          kennzeichen: '[MOCK] B-CUSTOM 1234',
          marke: 'Custom',
          modell: 'Edit',
          baujahr: '2025',
          fin_voll: '[MOCK] WAUZZZF40MA999999',
          fin_masked: 'WAUZZZ•••••••9999',
          zulassungsstelle_id: 'kfz-berlin-labo',
          hu_bis: '2027-01-01',
          evb_nummer: '[MOCK] CUS9999',
          zulassung_aktenzeichen: '[MOCK] CUST/2025-01-000001',
        },
      ],
    };
    globalThis.localStorage.setItem(
      MOBILITAET_KEY,
      JSON.stringify({ 'anna-petrov': customAnnaMob }),
    );
    migratePersonaV12ToV13();
    const bucket = JSON.parse(
      globalThis.localStorage.getItem(MOBILITAET_KEY) as string,
    ) as Record<string, { halter: Array<{ kennzeichen: string }> }>;
    expect(bucket['anna-petrov'].halter[0].kennzeichen).toBe('[MOCK] B-CUSTOM 1234');
  });

  test('Mobilität-Bucket: missing personas are seeded from SEED_MOBILITAET', () => {
    seedV12PersonasBucket();
    migratePersonaV12ToV13();
    const bucket = JSON.parse(
      globalThis.localStorage.getItem(MOBILITAET_KEY) as string,
    ) as Record<string, { fahrerlaubnis?: { fe_nr: string } }>;
    expect(bucket['anna-petrov']?.fahrerlaubnis?.fe_nr).toBe('[MOCK] F0727RRE2I50');
    expect(bucket['markus-schmidt']?.fahrerlaubnis?.fe_nr).toBe('[MOCK] J0512SCH08X1');
    expect(bucket['mehmet-yildiz']?.fahrerlaubnis?.fe_nr).toBe('[MOCK] N0428MEH47K2');
  });

  test('stripPunkteField removes punkte + punktezahl excess keys (HL-MOB-11)', () => {
    const polluted = {
      halter: [],
      punkte: 3,
      punktezahl: 5,
    } as unknown as import('@/types/mobilitaet').Mobilitaet;
    const stripped = stripPunkteField(polluted);
    expect(stripped).toBeDefined();
    const strippedRec = stripped as unknown as Record<string, unknown>;
    expect('punkte' in strippedRec).toBe(false);
    expect('punktezahl' in strippedRec).toBe(false);
  });

  test('V1.0 → V1.1 → V1.2 → V1.3 sequential chain via runStorageMigrations is idempotent', () => {
    // Simulate "V1.0 starting state": empty storage. runStorageMigrations runs
    // all 5 migrations in sequence; second call is no-op.
    runStorageMigrations();
    const version1 = globalThis.localStorage.getItem(SCHEMA_VERSION_KEY);

    runStorageMigrations();
    const version2 = globalThis.localStorage.getItem(SCHEMA_VERSION_KEY);

    expect(version1).not.toBeNull();
    expect(version2).toBe(version1);
    // Parsing as { version: '1.3' }.
    const parsed = JSON.parse(version1 as string) as { version?: string };
    expect(parsed.version).toBe('1.3');
  });
});
