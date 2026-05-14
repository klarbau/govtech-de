/**
 * V1.3 — FE-Nr-Format-Validator (Spec § 2 / § 5 / § 13.1).
 *
 * Bekannte Spec-Drift: Die architect-supplied Schema-Regex
 * `[A-Z]\d{3}[A-Z0-9]{5}[0-9X]\d` (Spec § 6.8) matched 11 Zeichen, aber alle
 * drei Persona-Seed-Werte sind 12 Zeichen lang:
 *   - `F0727RRE2I50` (Anna)   12 chars
 *   - `J0512SCH08X1` (Schmidt) 12 chars
 *   - `N0428MEH47K2` (Mehmet)  12 chars
 *
 * Resolution: Schema-Regex permissiver `[A-Z][A-Z0-9]{8,11}` (11-12 Zeichen
 * insgesamt nach Bundesland-Buchstabe). Die Seed-Werte sind source-of-truth
 * für die V1.3-Demo (architect-supplied verbatim). Dieser Spec-Konflikt ist
 * in der Hand-Off-Notiz an code-reviewer + product-architect dokumentiert.
 *
 * Positive cases (alle 3 Persona-Seed-FE-Nrs):
 *   - [MOCK] F0727RRE2I50  (Anna — Berlin)
 *   - [MOCK] J0512SCH08X1  (Schmidt — Hamburg)
 *   - [MOCK] N0428MEH47K2  (Mehmet — NRW)
 *
 * Negative cases:
 *   - zu kurz
 *   - fehlender [MOCK]-Prefix
 *   - Bundesland-Buchstabe ist Ziffer
 */
import { describe, expect, test } from 'vitest';
import { fahrerlaubnisSchema } from '@/lib/mock-backend/schemas';

describe('V1.3 FE-Nr Format (Spec § 2 / § 5)', () => {
  test('Anna [MOCK] F0727RRE2I50 passes', () => {
    expect(() =>
      fahrerlaubnisSchema.parse({
        fe_nr: '[MOCK] F0727RRE2I50',
        bundesland_kennzeichen: 'F',
        fe_behoerde_id: 'fe-berlin-labo',
        klassen: [{ klasse: 'B', erteilt_am: '2024-03-18', schluesselzahlen: [] }],
        ausstellungsdatum: '2024-03-18',
        pflichtumtausch_status: 'nicht_relevant',
        fe_aktenzeichen: '[MOCK] LABO-FE/2024-03-002831',
      }),
    ).not.toThrow();
  });

  test('Schmidt [MOCK] J0512SCH08X1 passes (Prüfziffer X allowed)', () => {
    expect(() =>
      fahrerlaubnisSchema.parse({
        fe_nr: '[MOCK] J0512SCH08X1',
        bundesland_kennzeichen: 'J',
        fe_behoerde_id: 'fe-hamburg-lbv',
        klassen: [{ klasse: 'B', erteilt_am: '2002-09-17', schluesselzahlen: [] }],
        ausstellungsdatum: '2002-09-17',
        pflichtumtausch_stichtag: '2027-01-19',
        pflichtumtausch_status: 'frist_aktiv',
        fe_aktenzeichen: '[MOCK] LBV-HH-FE/2002-09-007751',
      }),
    ).not.toThrow();
  });

  test('Mehmet [MOCK] N0428MEH47K2 passes (alphanumeric Pos. 2)', () => {
    expect(() =>
      fahrerlaubnisSchema.parse({
        fe_nr: '[MOCK] N0428MEH47K2',
        bundesland_kennzeichen: 'N',
        fe_behoerde_id: 'fe-koeln-stadt',
        klassen: [{ klasse: 'B', erteilt_am: '2010-11-15', schluesselzahlen: [] }],
        ausstellungsdatum: '2010-11-15',
        pflichtumtausch_status: 'umtausch_erfolgt',
        pflichtumtausch_erfolgt_am: '2025-01-14',
        fe_aktenzeichen: '[MOCK] STADT-K/STR-FE-2025-01-002831',
      }),
    ).not.toThrow();
  });

  test('Negative — fehlender [MOCK]-Prefix wirft', () => {
    expect(() =>
      fahrerlaubnisSchema.parse({
        fe_nr: 'F0727RRE2I50',
        bundesland_kennzeichen: 'F',
        fe_behoerde_id: 'fe-berlin-labo',
        klassen: [{ klasse: 'B', erteilt_am: '2024-03-18', schluesselzahlen: [] }],
        ausstellungsdatum: '2024-03-18',
        pflichtumtausch_status: 'nicht_relevant',
        fe_aktenzeichen: '[MOCK] X',
      }),
    ).toThrow();
  });

  test('Negative — deutlich zu kurz (5 Zeichen nach [MOCK] ) wirft', () => {
    expect(() =>
      fahrerlaubnisSchema.parse({
        fe_nr: '[MOCK] F0727', // nur 5 chars insgesamt → fails [A-Z][A-Z0-9]{8,11}
        bundesland_kennzeichen: 'F',
        fe_behoerde_id: 'fe-berlin-labo',
        klassen: [{ klasse: 'B', erteilt_am: '2024-03-18', schluesselzahlen: [] }],
        ausstellungsdatum: '2024-03-18',
        pflichtumtausch_status: 'nicht_relevant',
        fe_aktenzeichen: '[MOCK] X',
      }),
    ).toThrow();
  });

  test('Negative — Bundesland-Buchstabe-Position ist Ziffer wirft', () => {
    expect(() =>
      fahrerlaubnisSchema.parse({
        fe_nr: '[MOCK] 10727RRE2I50',
        bundesland_kennzeichen: '1',
        fe_behoerde_id: 'fe-berlin-labo',
        klassen: [{ klasse: 'B', erteilt_am: '2024-03-18', schluesselzahlen: [] }],
        ausstellungsdatum: '2024-03-18',
        pflichtumtausch_status: 'nicht_relevant',
        fe_aktenzeichen: '[MOCK] X',
      }),
    ).toThrow();
  });
});
