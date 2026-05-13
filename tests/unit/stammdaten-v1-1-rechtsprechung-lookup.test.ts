/**
 * V1.1 — Rechtsprechungs-Lookup-Klasse (Hard-Line § 11.28).
 *
 * Coverage:
 *  - RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20'] enthält {kurz, aria_label,
 *    vollzitat, kernaussage_de} aus Spec § 6.5.
 *  - aria_label enthält „1. August 2022" und „C-184" für korrekte Screenreader-
 *    Pronunciation.
 *  - kernaussage_de enthält „weite Auslegung" und „indirekte Offenbarung".
 */
import { describe, expect, test } from 'vitest';
import {
  getRechtsprechungsAriaLabel,
  getRechtsprechungsZitat,
  RECHTSPRECHUNGS_LOOKUP,
} from '@/components/posteingang/rechtsprechungsLookup';

describe('Rechtsprechungs-Lookup — EuGH C-184/20 (§ 11.28)', () => {
  test('Lookup-Eintrag enthält alle 4 Spec-Felder', () => {
    const entry = RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20'];
    expect(entry).toBeDefined();
    expect(entry.kurz).toBe('EuGH C-184/20');
    expect(typeof entry.aria_label).toBe('string');
    expect(typeof entry.vollzitat).toBe('string');
    expect(typeof entry.kernaussage_de).toBe('string');
  });

  test('aria_label enthält „1. August 2022" und „C-184" für Screenreader', () => {
    const aria = RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20'].aria_label;
    expect(aria).toMatch(/1\. August 2022/);
    expect(aria).toMatch(/C-184/);
  });

  test('kernaussage_de enthält "weite Auslegung" und "indirekte Offenbarung"', () => {
    const kern = RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20'].kernaussage_de;
    expect(kern).toMatch(/weite Auslegung/);
    expect(kern).toMatch(/indirekte Offenbarung/);
  });

  test('vollzitat enthält Datum und Aktenzeichen', () => {
    const voll = RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20'].vollzitat;
    expect(voll).toMatch(/01\.08\.2022/);
    expect(voll).toMatch(/C-184\/20/);
  });

  test('Helper getRechtsprechungsAriaLabel returns aria-label', () => {
    expect(getRechtsprechungsAriaLabel('EuGH C-184/20')).toBe(
      RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20'].aria_label,
    );
    expect(getRechtsprechungsAriaLabel('UNKNOWN')).toBeUndefined();
  });

  test('Helper getRechtsprechungsZitat returns full Lookup entry', () => {
    const entry = getRechtsprechungsZitat('EuGH C-184/20');
    expect(entry).toEqual(RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20']);
    expect(getRechtsprechungsZitat('UNKNOWN')).toBeUndefined();
  });
});
