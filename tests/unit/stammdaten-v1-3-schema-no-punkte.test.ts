/**
 * V1.3 — Schema-Level „No `punkte` Field"-Lock (Spec § 5.2 / § 6.8;
 * HL-MOB-11 / VL-4).
 *
 * Pflicht-Assertions:
 *   (a) `mobilitaetSchema.parse({ punkte: 3, halter: [] })` wirft (strict-mode
 *       reject von Excess-Keys).
 *   (b) `mobilitaetSchema.parse({ halter: [] })` ohne `punkte` ist OK.
 *   (c) Persona-Schema-Validation auf einem Mobilität-Block mit `punkte`-Excess
 *       schlägt **am `mobilitaetSchema`-Strict-Mode** fehl, sobald wir den
 *       Block in `mobilitaetSchema.parse` füttern.
 *   (d) `'punkte' in persona.mobilitaet === false` für alle 3 Persona-Seed-
 *       Werte (statische assertion).
 */
import { describe, expect, test } from 'vitest';
import { mobilitaetSchema } from '@/lib/mock-backend/schemas';
import { SEED_MOBILITAET } from '@/lib/mock-backend/mobilitaet/seed-mobilitaet';

describe('V1.3 mobilitaetSchema rejects `punkte` excess key (HL-MOB-11 / VL-4)', () => {
  test('mobilitaetSchema.parse({ punkte: 3, halter: [] }) throws', () => {
    expect(() =>
      mobilitaetSchema.parse({ punkte: 3, halter: [] } as unknown),
    ).toThrow();
  });

  test('mobilitaetSchema.parse({ punktezahl: 5, halter: [] }) throws', () => {
    expect(() =>
      mobilitaetSchema.parse({ punktezahl: 5, halter: [] } as unknown),
    ).toThrow();
  });

  test('mobilitaetSchema.parse({ halter: [] }) without punkte passes', () => {
    expect(() => mobilitaetSchema.parse({ halter: [] })).not.toThrow();
  });

  test('mobilitaetSchema accepts a fully-formed Mobilitaet (Anna seed)', () => {
    expect(() => mobilitaetSchema.parse(SEED_MOBILITAET['anna-petrov'])).not.toThrow();
  });

  test('mobilitaetSchema accepts a fully-formed Mobilitaet (Schmidt seed)', () => {
    expect(() =>
      mobilitaetSchema.parse(SEED_MOBILITAET['markus-schmidt']),
    ).not.toThrow();
  });

  test('mobilitaetSchema accepts a fully-formed Mobilitaet (Mehmet seed)', () => {
    expect(() => mobilitaetSchema.parse(SEED_MOBILITAET['mehmet-yildiz'])).not.toThrow();
  });

  test('seed-Mobilität für alle 3 Personas hat KEINEN punkte-Key', () => {
    for (const personaId of Object.keys(SEED_MOBILITAET)) {
      const mob = SEED_MOBILITAET[personaId];
      expect('punkte' in (mob as unknown as Record<string, unknown>)).toBe(false);
      expect('punktezahl' in (mob as unknown as Record<string, unknown>)).toBe(false);
    }
  });

  test('mobilitaetSchema rejects extra top-level keys beyond fahrerlaubnis/halter/halter_adresse', () => {
    // Strict-mode catches any excess key, not only `punkte`/`punktezahl`.
    expect(() =>
      mobilitaetSchema.parse({
        halter: [],
        bezirk_der_fe_behoerde: 'whatever',
      } as unknown),
    ).toThrow();
    expect(() =>
      mobilitaetSchema.parse({
        halter: [],
        mpu_status: 'positiv',
      } as unknown),
    ).toThrow();
    expect(() =>
      mobilitaetSchema.parse({
        halter: [],
        faer_eintragungen: [],
      } as unknown),
    ).toThrow();
  });
});
