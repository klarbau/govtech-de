/**
 * V1.2 — SAVINGS_LOOKUP Tabellen-Test (Spec § 5.5).
 *
 * Coverage:
 *  - Hero-Wert: `familie × postfach` ist verbindlich `{ 8, 4 }`.
 *  - KFZ-Realismus: `verkehr × postfach` ist `{ 0, 0 }`.
 *  - Alle 20 Kombinationen sind definiert (kein `undefined` im Lookup).
 *  - email_pilot / sms_pilot ergeben stets `0/0` (Hard-Line § 11.37).
 */
import { describe, expect, test } from 'vitest';
import {
  SAVINGS_LOOKUP,
  lookupSavingsCounter,
} from '@/lib/mock-backend/notification/savings-lookup';
import type {
  NotificationKanal,
  VorgangsKategorie,
} from '@/types/persona-kontakt';

const ALL_KATEGORIEN: VorgangsKategorie[] = [
  'steuer',
  'sozial',
  'familie',
  'verkehr',
  'sonstige',
];
const ALL_KANAELE: NotificationKanal[] = [
  'postfach',
  'email_pilot',
  'sms_pilot',
  'brief',
];

describe('SAVINGS_LOOKUP — Hard-Line-Werte', () => {
  test('familie × postfach === { briefe_pro_jahr_gespart: 8, tage_frist_gespart: 4 }', () => {
    expect(SAVINGS_LOOKUP.familie.postfach).toEqual({
      briefe_pro_jahr_gespart: 8,
      tage_frist_gespart: 4,
    });
  });

  test('verkehr × postfach === { 0, 0 } (KFZ nicht angebunden)', () => {
    expect(SAVINGS_LOOKUP.verkehr.postfach).toEqual({
      briefe_pro_jahr_gespart: 0,
      tage_frist_gespart: 0,
    });
  });

  test('steuer × postfach === { 4, 4 }', () => {
    expect(SAVINGS_LOOKUP.steuer.postfach).toEqual({
      briefe_pro_jahr_gespart: 4,
      tage_frist_gespart: 4,
    });
  });

  test('sozial × postfach === { 6, 4 }', () => {
    expect(SAVINGS_LOOKUP.sozial.postfach).toEqual({
      briefe_pro_jahr_gespart: 6,
      tage_frist_gespart: 4,
    });
  });

  test('sonstige × postfach === { 2, 4 }', () => {
    expect(SAVINGS_LOOKUP.sonstige.postfach).toEqual({
      briefe_pro_jahr_gespart: 2,
      tage_frist_gespart: 4,
    });
  });
});

describe('SAVINGS_LOOKUP — alle 20 Kombinationen sind definiert', () => {
  for (const kategorie of ALL_KATEGORIEN) {
    for (const kanal of ALL_KANAELE) {
      test(`${kategorie} × ${kanal} ist definiert mit numerischen Werten`, () => {
        const entry = SAVINGS_LOOKUP[kategorie]?.[kanal];
        expect(entry).toBeDefined();
        expect(typeof entry?.briefe_pro_jahr_gespart).toBe('number');
        expect(typeof entry?.tage_frist_gespart).toBe('number');
      });
    }
  }
});

describe('email_pilot / sms_pilot / brief ergeben stets 0/0 (Hard-Line § 11.37)', () => {
  for (const kategorie of ALL_KATEGORIEN) {
    for (const kanal of ['email_pilot', 'sms_pilot', 'brief'] as const) {
      test(`${kategorie} × ${kanal} === { 0, 0 }`, () => {
        expect(SAVINGS_LOOKUP[kategorie][kanal]).toEqual({
          briefe_pro_jahr_gespart: 0,
          tage_frist_gespart: 0,
        });
      });
    }
  }
});

describe('lookupSavingsCounter — defensive Helper', () => {
  test('liefert SAVINGS_LOOKUP-Werte für valide Argumente', () => {
    expect(lookupSavingsCounter('familie', 'postfach')).toEqual({
      briefe_pro_jahr_gespart: 8,
      tage_frist_gespart: 4,
    });
  });

  test('fällt auf 0/0 zurück bei unbekannten Kombinationen (defensive)', () => {
    // @ts-expect-error — Test-only: ungültige Kategorie.
    const result = lookupSavingsCounter('unknown_category', 'postfach');
    expect(result).toEqual({
      briefe_pro_jahr_gespart: 0,
      tage_frist_gespart: 0,
    });
  });
});
