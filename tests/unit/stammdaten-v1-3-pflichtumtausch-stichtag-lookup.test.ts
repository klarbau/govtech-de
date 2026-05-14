/**
 * V1.3 — Pflichtumtausch-Stichtag-Lookup (Spec § 5 / § 13.1; VL-6 / HL-MOB-6).
 *
 * Tabelle Anlage 8a FeV:
 *   - Geburtsjahr 1988 + Ausstellung 2002 → Stichtag 2027-01-19 (Schmidt)
 *   - Geburtsjahr 1990 + Ausstellung 2010 → Stichtag 2025-01-19 (Mehmet, past)
 *   - Geburtsjahr 1997 + Ausstellung 2024 → undefined (Anna, EU-konform
 *     ab 19.01.2014 → kein Pflichtumtausch-Stichtag)
 *   - Geburtsjahr 1965-1970 + Ausstellung pre-1999 → 2024-01-19 (past edge)
 *
 * VL-6-Pflicht: Banner sichtbar nur bei vollständigen Daten — wenn
 * `geburtsjahr` ODER `ausstellungsjahr` undefined sind, returns undefined.
 */
import { describe, expect, test } from 'vitest';
import { lookupPflichtumtauschStichtag } from '@/lib/mock-backend/mobilitaet/pflichtumtausch-stichtage';

describe('V1.3 lookupPflichtumtauschStichtag (Anlage 8a FeV)', () => {
  test('Schmidt — Geburtsjahr 1988 + Ausstellung 2002 → 2027-01-19', () => {
    expect(lookupPflichtumtauschStichtag(1988, 2002)).toBe('2027-01-19');
  });

  test('Schmidt — Ausstellung 2003/2004 (mittlere Spannweite) → 2027-01-19', () => {
    expect(lookupPflichtumtauschStichtag(1988, 2003)).toBe('2027-01-19');
    expect(lookupPflichtumtauschStichtag(1988, 2004)).toBe('2027-01-19');
  });

  test('Mehmet — Ausstellung 2010 → 2025-01-19 (already past)', () => {
    expect(lookupPflichtumtauschStichtag(1990, 2010)).toBe('2025-01-19');
  });

  test('Anna — Ausstellung 2024 → undefined (EU-konform, 15-Jahre-Rhythmus)', () => {
    expect(lookupPflichtumtauschStichtag(1997, 2024)).toBeUndefined();
  });

  test('VL-6 — Geburtsjahr fehlt → undefined (stiller Hinweis im UI)', () => {
    expect(lookupPflichtumtauschStichtag(undefined, 2002)).toBeUndefined();
  });

  test('VL-6 — Ausstellungsjahr fehlt → undefined', () => {
    expect(lookupPflichtumtauschStichtag(1988, undefined)).toBeUndefined();
  });

  test('VL-6 — Beide undefined → undefined', () => {
    expect(lookupPflichtumtauschStichtag(undefined, undefined)).toBeUndefined();
  });

  test('Demo-Edge-Case — Geburtsjahr 1965 + Ausstellung 1995 (graue Lappen pre-1999) → 2024-01-19', () => {
    expect(lookupPflichtumtauschStichtag(1965, 1995)).toBe('2024-01-19');
  });

  test('Demo-Edge-Case — Geburtsjahr 1970 + Ausstellung 1990 → 2024-01-19', () => {
    expect(lookupPflichtumtauschStichtag(1970, 1990)).toBe('2024-01-19');
  });

  test('Ausstellung 2013 (Grenztag) → 2033-01-19 (Karte ist noch alt-format)', () => {
    expect(lookupPflichtumtauschStichtag(1988, 2013)).toBe('2033-01-19');
  });

  test('Ausstellung 2014 → undefined (ab 19.01.2014 EU-konform)', () => {
    expect(lookupPflichtumtauschStichtag(1988, 2014)).toBeUndefined();
  });

  test('Ausstellung 2025 → undefined (klar EU-konform)', () => {
    expect(lookupPflichtumtauschStichtag(1997, 2025)).toBeUndefined();
  });

  test('Geburtsjahr 1971+ mit Ausstellung pre-1999 → 2025-01-19', () => {
    expect(lookupPflichtumtauschStichtag(1971, 1990)).toBe('2025-01-19');
    expect(lookupPflichtumtauschStichtag(1985, 1995)).toBe('2025-01-19');
  });
});
