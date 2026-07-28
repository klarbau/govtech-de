/**
 * `buildDatenblattModel()` — Honesty-Invarianten des Stammdaten-Datenblatts
 * (Spec `stammdaten-datenblatt.md` § 3 + § 10) über alle drei Personas.
 *
 * Geprüft wird, was der Screen behauptet:
 *   - `angabenCount` == tatsächlich gerenderte Wertzeilen (Band 1 ohne die
 *     Zeile „Führende Quelle" + alle Datenblatt-Zeilen) — keine Checkliste,
 *     kein Sollwert, keine Prozentzahl.
 *   - Keine Zeile ohne Wert, keine leere Sektion.
 *   - Persona-Degradation (§ 6): Anna/Mehmet ohne Personalausweis-Zeile und mit
 *     Sektionstitel „Dokumente & Aufenthalt"; Schmidt ohne Aufenthaltstitel-
 *     Zeile und mit Sektionstitel „Dokumente".
 */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  buildDatenblattModel,
  findMeldebehoerde,
  type DatenblattModel,
  type DatenblattTexte,
} from '@/components/stammdaten/datenblatt/datenblatt-model';

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

let api: typeof import('@/lib/mock-backend/test-core').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
});

/** Stand-in für die vom View gelieferten, bereits lokalisierten Fragmente. */
const TEXTE: DatenblattTexte = {
  familienstand: 'ledig',
  staatsangehoerigkeit: 'Russisch',
  fuehrendeQuelle: 'Bürgeramt (Meldebehörde)',
  gesetzlicheRente: 'Gesetzliche Rentenversicherung',
  kind: (name, datum) => `${name} · geb. ${datum}`,
};

async function buildFor(personaId: string): Promise<DatenblattModel> {
  reseedForActivePersona(personaId);
  const persona = await api.getProfile();
  const [stammdaten, log, behoerden] = await Promise.all([
    api.getStammdaten(personaId),
    api.getUebermittlungsLog(personaId, { limit: 5 }),
    api.getBehoerden(),
  ]);
  const behoerdenById = Object.fromEntries(behoerden.map((b) => [b.id, b]));
  return buildDatenblattModel({
    persona,
    stammdaten,
    log,
    behoerdenById,
    texte: TEXTE,
  });
}

function rowIds(model: DatenblattModel): string[] {
  return model.sektionen.flatMap((s) => s.rows.map((r) => r.id));
}

const PERSONAS = ['anna-petrov', 'markus-schmidt', 'mehmet-yildiz'];

describe('buildDatenblattModel — Invarianten über alle Personas', () => {
  for (const personaId of PERSONAS) {
    test(`${personaId}: angabenCount == gerenderte Wertzeilen`, async () => {
      const model = await buildFor(personaId);
      const identitaetOhneQuelle = model.identitaet.filter(
        (r) => r.id !== 'identitaet.quelle',
      ).length;
      const datenblattZeilen = model.sektionen.reduce(
        (sum, s) => sum + s.rows.length,
        0,
      );
      expect(model.identitaet.length - 1).toBe(identitaetOhneQuelle);
      expect(model.angabenCount).toBe(identitaetOhneQuelle + datenblattZeilen);
    });

    test(`${personaId}: keine Zeile ohne Wert, keine leere Sektion`, async () => {
      const model = await buildFor(personaId);
      expect(model.sektionen.length).toBeGreaterThan(0);
      for (const sektion of model.sektionen) {
        expect(sektion.rows.length).toBeGreaterThan(0);
        for (const row of sektion.rows) {
          expect(row.value.trim().length).toBeGreaterThan(0);
        }
      }
      for (const row of model.identitaet) {
        expect(row.value.trim().length).toBeGreaterThan(0);
      }
    });

    test(`${personaId}: Band 1 führt Geburtsdatum, Staatsangehörigkeit, Familienstand und Quelle`, async () => {
      const model = await buildFor(personaId);
      expect(model.identitaet.map((r) => r.id)).toEqual([
        'identitaet.geburtsdatum',
        'identitaet.staatsangehoerigkeit',
        'identitaet.familienstand',
        'identitaet.quelle',
      ]);
      expect(model.identitaet[0].value).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });
  }
});

describe('Persona-Degradation (§ 6)', () => {
  test('anna-petrov: kein Personalausweis, Aufenthaltstitel + Sektionstitel „Dokumente & Aufenthalt"', async () => {
    const model = await buildFor('anna-petrov');
    const ids = rowIds(model);
    expect(ids).not.toContain('dokumente.personalausweis');
    expect(ids).toContain('dokumente.reisepass');
    expect(ids).toContain('dokumente.aufenthaltstitel');
    const dokumente = model.sektionen.find((s) => s.id === 'dokumente');
    expect(dokumente?.titleKey).toBe('sektion.dokumente_aufenthalt');
  });

  test('markus-schmidt: kein Aufenthaltstitel, Sektionstitel „Dokumente"', async () => {
    const model = await buildFor('markus-schmidt');
    const ids = rowIds(model);
    expect(ids).not.toContain('dokumente.aufenthaltstitel');
    expect(ids).toContain('dokumente.personalausweis');
    const dokumente = model.sektionen.find((s) => s.id === 'dokumente');
    expect(dokumente?.titleKey).toBe('sektion.dokumente');
  });

  test('mehmet-yildiz: Reisepass + Aufenthaltstitel, kein Personalausweis', async () => {
    const model = await buildFor('mehmet-yildiz');
    const ids = rowIds(model);
    expect(ids).not.toContain('dokumente.personalausweis');
    expect(ids).toContain('dokumente.reisepass');
    expect(ids).toContain('dokumente.aufenthaltstitel');
  });
});

describe('Partner-Label folgt dem Familienstand', () => {
  test('anna-petrov (ledig, unverheiratete Partnerschaft): neutrales „Partner:in"-Label', async () => {
    const model = await buildFor('anna-petrov');
    const partnerRow = model.sektionen
      .find((s) => s.id === 'familie')
      ?.rows.find((r) => r.id === 'familie.partner');
    expect(partnerRow?.labelKey).toBe('label.partner_unverheiratet');
  });

  test('markus-schmidt (verheiratet): „Ehegatte / Lebenspartner:in"-Label', async () => {
    const model = await buildFor('markus-schmidt');
    const partnerRow = model.sektionen
      .find((s) => s.id === 'familie')
      ?.rows.find((r) => r.id === 'familie.partner');
    expect(partnerRow?.labelKey).toBe('label.partner');
  });
});

describe('Quellen-Attribution', () => {
  test('Kennungen zitieren BZSt / DRV / Krankenkasse, Familie erfindet keine Quelle', async () => {
    const model = await buildFor('anna-petrov');
    const kennungen = model.sektionen.find((s) => s.id === 'kennungen');
    expect(
      kennungen?.rows.find((r) => r.id === 'kennungen.steuer_id')?.quelle?.key,
    ).toBe('quelle.bzst');
    expect(
      kennungen?.rows.find((r) => r.id === 'kennungen.sozialversicherungsnummer')
        ?.quelle?.key,
    ).toBe('quelle.drv');
    expect(
      kennungen?.rows.find((r) => r.id === 'kennungen.kvnr')?.quelle,
    ).toEqual({ key: 'quelle.traeger', params: { traeger: 'AOK Nordost' } });

    const familie = model.sektionen.find((s) => s.id === 'familie');
    expect(familie?.quelle).toBeUndefined();
    for (const row of familie?.rows ?? []) {
      expect(row.quelle).toBeUndefined();
    }
  });

  test('Kontakt trägt die BundID-Sektionszeile, Anschrift das Melderegister', async () => {
    const model = await buildFor('anna-petrov');
    expect(model.sektionen.find((s) => s.id === 'kontakt')?.quelle?.key).toBe(
      'quelle.bundid',
    );
    const anschrift = model.sektionen.find((s) => s.id === 'anschrift');
    expect(anschrift?.rows[0].quelle?.key).toMatch(/^quelle\.melderegister/);
  });
});

describe('findMeldebehoerde', () => {
  test('trifft die Meldebehörde am Wohnort und erfindet sonst keine', async () => {
    const behoerden = await api.getBehoerden();
    expect(findMeldebehoerde(behoerden, 'Berlin')?.id).toBe(
      'buergeramt-berlin-mitte',
    );
    expect(findMeldebehoerde(behoerden, 'Hamburg')?.id).toBe(
      'bezirksamt-hamburg-eimsbuettel',
    );
    expect(findMeldebehoerde(behoerden, 'Köln')).toBeUndefined();
    expect(findMeldebehoerde(behoerden, undefined)).toBeUndefined();
  });
});

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    [
      'govtech-de:v1:stammdaten:sperren',
      'govtech-de:v1:stammdaten:iban-speculative',
      'govtech-de:v1:stammdaten:kontakt',
      'govtech-de:v1:stammdaten:uebermittlungs-log',
      'govtech-de:v1:stammdaten:religion-consent-session',
    ].forEach((k) => window.localStorage.removeItem(k));
  }
});
