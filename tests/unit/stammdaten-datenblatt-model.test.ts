/**
 * `buildDatenblattModel()` — Honesty-Invarianten des Stammdaten-Datenblatts
 * (Spec `stammdaten-datenblatt.md` § 3 + § 10) über alle drei Personas.
 *
 * Geprüft wird, was der Screen behauptet:
 *   - `angabenCount` == tatsächlich gerenderte Wertzeilen (Band 1 ohne die
 *     selbst erklärte Zeile „Sprachen" + alle Datenblatt-Zeilen) — keine
 *     Checkliste, kein Sollwert, keine Prozentzahl.
 *   - Keine Zeile ohne Wert, keine leere Sektion.
 *   - Persona-Degradation (§ 6): Anna/Mehmet ohne Personalausweis-Zeile und mit
 *     Sektionstitel „Dokumente & Aufenthalt"; Schmidt ohne Aufenthaltstitel-
 *     Zeile und mit Sektionstitel „Dokumente".
 */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  alterInJahren,
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
  sprachen: 'Russisch, Deutsch, Englisch',
  gesetzlicheRente: 'Gesetzliche Rentenversicherung',
  kind: (name, datum) => `${name} · geb. ${datum}`,
};

/** Identity rows the „{N} Angaben"-Subline must not count (Spec § 7). */
const NICHT_GEZAEHLT = ['identitaet.sprachen'];

async function inputFor(personaId: string) {
  reseedForActivePersona(personaId);
  const persona = await api.getProfile();
  const [stammdaten, log, behoerden] = await Promise.all([
    api.getStammdaten(personaId),
    api.getUebermittlungsLog(personaId, { limit: 5 }),
    api.getBehoerden(),
  ]);
  const behoerdenById = Object.fromEntries(behoerden.map((b) => [b.id, b]));
  return { persona, stammdaten, log, behoerdenById, texte: TEXTE };
}

async function buildFor(personaId: string): Promise<DatenblattModel> {
  return buildDatenblattModel(await inputFor(personaId));
}

function rowIds(model: DatenblattModel): string[] {
  return model.sektionen.flatMap((s) => s.rows.map((r) => r.id));
}

const PERSONAS = ['anna-petrov', 'markus-schmidt', 'mehmet-yildiz'];

describe('buildDatenblattModel — Invarianten über alle Personas', () => {
  for (const personaId of PERSONAS) {
    test(`${personaId}: angabenCount == gerenderte Wertzeilen`, async () => {
      const model = await buildFor(personaId);
      const gezaehlt = model.identitaet.filter(
        (r) => !NICHT_GEZAEHLT.includes(r.id),
      ).length;
      const datenblattZeilen = model.sektionen.reduce(
        (sum, s) => sum + s.rows.length,
        0,
      );
      /* Die Invariante, die das a11y-Subline-Gate spiegelt: alle drei Personas
         führen „Sprachen", also genau EINE ungezählte Zeile (Spec § 7; die
         Provenienz-Zeile führt das Modell seit dem Review 2026-07-29 nicht
         mehr — sie lebt nur im Porträt-Fuß). Erst die Existenz prüfen, dann die
         −1 — sonst würde eine verschwundene Zeile als grünes Gate durchgehen. */
      for (const id of NICHT_GEZAEHLT) {
        expect(model.identitaet.map((r) => r.id)).toContain(id);
      }
      expect(model.identitaet.length - 1).toBe(gezaehlt);
      expect(model.angabenCount).toBe(gezaehlt + datenblattZeilen);
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

    test(`${personaId}: die Fakten-Leiste führt fünf Zeilen in fester Reihenfolge`, async () => {
      const model = await buildFor(personaId);
      expect(model.identitaet.map((r) => r.id)).toEqual([
        'identitaet.geburtsdatum',
        'identitaet.geburtsort',
        'identitaet.staatsangehoerigkeit',
        'identitaet.familienstand',
        'identitaet.sprachen',
      ]);
      expect(model.identitaet[0].value).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });
  }
});

describe('Geburtsort und Sprachen (Spec § 7)', () => {
  test('Geburtsort ist eine gezählte Registerangabe (§ 3 Abs. 1 Nr. 6 BMG)', async () => {
    const input = await inputFor('anna-petrov');
    expect(input.stammdaten.identitaet.geburtsort).toBe('Sofia, Bulgarien');

    const mit = buildDatenblattModel(input);
    expect(
      mit.identitaet.find((r) => r.id === 'identitaet.geburtsort')?.value,
    ).toBe('Sofia, Bulgarien');

    const ohne = buildDatenblattModel({
      ...input,
      stammdaten: {
        ...input.stammdaten,
        identitaet: { ...input.stammdaten.identitaet, geburtsort: undefined },
      },
    });
    expect(
      ohne.identitaet.some((r) => r.id === 'identitaet.geburtsort'),
    ).toBe(false);
    expect(ohne.angabenCount).toBe(mit.angabenCount - 1);
  });

  test('Sprachen tragen die Selbstauskunfts-Quelle und zählen nicht mit', async () => {
    const input = await inputFor('anna-petrov');
    const mit = buildDatenblattModel(input);
    const sprachen = mit.identitaet.find((r) => r.id === 'identitaet.sprachen');
    expect(sprachen?.value).toBe(TEXTE.sprachen);
    expect(sprachen?.quelle).toEqual({ key: 'quelle.selbstauskunft' });

    const ohne = buildDatenblattModel({
      ...input,
      texte: { ...TEXTE, sprachen: '' },
    });
    expect(ohne.identitaet.some((r) => r.id === 'identitaet.sprachen')).toBe(
      false,
    );
    expect(ohne.angabenCount).toBe(mit.angabenCount);
  });
});

/* Die EINZIGE abgeleitete Angabe des Screens (Spec `stammdaten-akte-v2.md`
   § 7.1): reine Kalenderrechnung, keine Registerbehauptung — und sie darf die
   „{N} Angaben"-Zusage nicht verschieben.

   Die Erwartungen sind zeitzonenunabhängig: das Geburtsdatum zerlegt das Modell
   stringseitig, und die `heute`-Argumente sind Ortszeit-Literale (ohne `Z`) —
   die Suite braucht deshalb keinen `TZ`-Pin. */
describe('alterInJahren (Spec akte-v2 § 7.1)', () => {
  test('am Geburtstag ist das Jahr voll, einen Tag davor noch nicht', () => {
    expect(alterInJahren('1997-03-22', new Date('2026-03-22T09:00:00'))).toBe(29);
    expect(alterInJahren('1997-03-22', new Date('2026-03-21T09:00:00'))).toBe(28);
    expect(alterInJahren('1997-03-22', new Date('2026-03-23T09:00:00'))).toBe(29);
  });

  test('Monatsgrenze: der Vormonat zählt nicht mit', () => {
    expect(alterInJahren('1997-03-22', new Date('2026-02-28T09:00:00'))).toBe(28);
    expect(alterInJahren('1997-03-22', new Date('2026-04-01T09:00:00'))).toBe(29);
  });

  test('29.02.: im Nicht-Schaltjahr fällt der Geburtstag auf den 1. März', () => {
    expect(alterInJahren('2000-02-29', new Date('2025-02-28T09:00:00'))).toBe(24);
    expect(alterInJahren('2000-02-29', new Date('2025-03-01T09:00:00'))).toBe(25);
    expect(alterInJahren('2000-02-29', new Date('2024-02-29T09:00:00'))).toBe(24);
  });
});

describe('Geburtsdatum trägt die Jahre-Fußnote', () => {
  for (const personaId of PERSONAS) {
    test(`${personaId}: Fußnote gesetzt, angabenCount unverändert`, async () => {
      const input = await inputFor(personaId);
      const model = buildDatenblattModel(input);
      const geburtsdatum = model.identitaet.find(
        (r) => r.id === 'identitaet.geburtsdatum',
      );
      expect(geburtsdatum?.quelle?.key).toBe('value.alter');
      /* Der ICU-Plural-Parameter ist eine echte Zahl (kein String, den der
         Formatter zurückrechnen muss), nie negativ — ein Tippfehler im
         Datumsfeld würde hier auffallen. */
      const jahre = geburtsdatum?.quelle?.params?.jahre;
      expect(typeof jahre).toBe('number');
      expect(Number.isInteger(jahre)).toBe(true);
      expect(jahre).toBeGreaterThan(0);
      expect(jahre).toBe(
        alterInJahren(input.stammdaten.identitaet.geburtsdatum),
      );

      /* Eine Fußnote ist keine Angabe: die Zählung bleibt exakt die Summe der
         gerenderten Wertzeilen (Spec § 7.3). */
      const gezaehlt = model.identitaet.filter(
        (r) => !NICHT_GEZAEHLT.includes(r.id),
      ).length;
      const datenblattZeilen = model.sektionen.reduce(
        (sum, s) => sum + s.rows.length,
        0,
      );
      expect(model.angabenCount).toBe(gezaehlt + datenblattZeilen);
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
