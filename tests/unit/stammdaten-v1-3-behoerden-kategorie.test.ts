/**
 * V1.3 — Behörden-Kategorie-Audit (Spec § 5.6 / VL-5).
 *
 * Coverage:
 *   (a) Alle Entries mit Name matching `/Fahrerlaubnis|Fahrerlaubnisstelle|
 *       Zulassungsstelle|Kfz-Zulassung|KFZ-Zulassung/i` haben
 *       `kategorie === 'kommune'`.
 *   (b) `kba-flensburg` hat `kategorie === 'bund'`.
 *   (c) Alle 7 in V1.3 hinzugefügten Behörden-IDs sind im Fixture vorhanden.
 *   (d) Alle V1.3-Behörden tragen `bundid_postfach_anbindung` (HL § 11.35).
 */
import { describe, expect, test } from 'vitest';
import behoerdenFixture from '@/data/behoerden.json';

interface BehoerdeFixture {
  id: string;
  name_de: string;
  kategorie: string;
  bundid_postfach_anbindung?: string;
}

const behoerden = behoerdenFixture as unknown as BehoerdeFixture[];

const V13_NEW_IDS = [
  'kba-flensburg',
  'fe-berlin-labo',
  'fe-hamburg-lbv',
  'fe-koeln-stadt',
  'kfz-hamburg-lbv',
  'kfz-koeln-stadt',
  'labo-berlin',
];

describe('V1.3 Behörden-Kategorie-Audit (§ 5.6 / VL-5)', () => {
  test('alle 7 V1.3-Behörden-IDs sind im behoerden.json-Fixture vorhanden', () => {
    for (const id of V13_NEW_IDS) {
      const entry = behoerden.find((b) => b.id === id);
      expect(entry, `expected behoerde "${id}" in behoerden.json`).toBeDefined();
    }
  });

  test('KBA-Flensburg hat kategorie === "bund"', () => {
    const kba = behoerden.find((b) => b.id === 'kba-flensburg');
    expect(kba).toBeDefined();
    expect(kba?.kategorie).toBe('bund');
  });

  test('alle FE-/KFZ-Behörden (Pattern-match) haben kategorie === "kommune"', () => {
    const pattern =
      /Fahrerlaubnis|Fahrerlaubnisstelle|Zulassungsstelle|Kfz-Zulassung|KFZ-Zulassung/i;
    const matchingFeKfz = behoerden.filter((b) => pattern.test(b.name_de));
    expect(matchingFeKfz.length).toBeGreaterThan(0);
    for (const b of matchingFeKfz) {
      expect(
        b.kategorie,
        `Behörde "${b.id}" name "${b.name_de}" should have kategorie === "kommune", got "${b.kategorie}"`,
      ).toBe('kommune');
    }
  });

  test('die V1.3-FE-Behörden tragen kategorie === "kommune"', () => {
    const feIds = ['fe-berlin-labo', 'fe-hamburg-lbv', 'fe-koeln-stadt'];
    for (const id of feIds) {
      const b = behoerden.find((x) => x.id === id);
      expect(b?.kategorie, `FE-Behörde ${id}`).toBe('kommune');
    }
  });

  test('die V1.3-KFZ-Zulassungsstellen tragen kategorie === "kommune"', () => {
    const kfzIds = ['kfz-hamburg-lbv', 'kfz-koeln-stadt', 'kfz-berlin-labo'];
    for (const id of kfzIds) {
      const b = behoerden.find((x) => x.id === id);
      expect(b?.kategorie, `KFZ-Zulassungsstelle ${id}`).toBe('kommune');
    }
  });

  test('alle V1.3-Behörden tragen bundid_postfach_anbindung (HL § 11.35)', () => {
    for (const id of V13_NEW_IDS) {
      const b = behoerden.find((x) => x.id === id);
      expect(b?.bundid_postfach_anbindung).toBeDefined();
    }
  });
});
