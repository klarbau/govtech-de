/**
 * Klartext-Rückkanal — graceful offline fallback (klartext-rueckkanal.md §7.3,
 * Correction #9).
 *
 * Pins the HARD guarantee that the demo never breaks offline AND never silently
 * legal-phrases: with no `ANTHROPIC_API_KEY` set, `formulateSachverhalt` returns
 * the citizen's RAW text unchanged with `source: 'fallback'` and never throws —
 * purely, no network.
 *
 * Also confirms the new `SACHVERHALT_RATE_LIMIT` bucket + `maxSachverhaltRohtextChars`
 * cap exist (the route relies on both), and that the locked boundary block
 * contains its non-negotiable MUST-NOT lines.
 *
 * Pure functions, no localStorage/window/network — vitest `node` env.
 */
import { beforeEach, describe, expect, test } from 'vitest';

import { CAPS, SACHVERHALT_RATE_LIMIT } from '@/lib/ai/rate-limit';
import {
  formulateSachverhalt,
  SACHVERHALT_SYSTEM_PROMPT,
  type SachverhaltNormFamilie,
} from '@/lib/ai/sachverhalt';

beforeEach(() => {
  // Force the no-key path: `getAnthropicClient()` reads `process.env` lazily,
  // so deleting the var here exercises the offline fallback without any
  // network call. (The SDK client is never constructed.)
  delete process.env.ANTHROPIC_API_KEY;
});

describe('formulateSachverhalt — offline fallback (no API key)', () => {
  const ROHTEXT = 'stimmt nicht, ich war im mai schon umgezogen';
  const FAMILIES: SachverhaltNormFamilie[] = ['ao', 'sgg', 'vwgo'];

  test('drops the raw text VERBATIM with source:"fallback"', async () => {
    const result = await formulateSachverhalt({
      rohtext: ROHTEXT,
      normFamilie: 'ao',
    });
    expect(result.source).toBe('fallback');
    expect(result.sachverhalt).toBe(ROHTEXT);
  });

  test('every norm family falls back to the unchanged raw text when the key is unset', async () => {
    for (const normFamilie of FAMILIES) {
      const result = await formulateSachverhalt({ rohtext: ROHTEXT, normFamilie });
      expect(result.source).toBe('fallback');
      expect(result.sachverhalt).toBe(ROHTEXT);
    }
  });

  test('never throws — resolves cleanly even with no key', async () => {
    await expect(
      formulateSachverhalt({ rohtext: ROHTEXT, normFamilie: 'sgg' }),
    ).resolves.toMatchObject({ source: 'fallback' });
  });

  test('an empty rohtext short-circuits to fallback (no spend, no throw)', async () => {
    const result = await formulateSachverhalt({
      rohtext: '   ',
      normFamilie: 'vwgo',
    });
    expect(result.source).toBe('fallback');
    expect(result.sachverhalt).toBe('   ');
  });
});

describe('rate-limit + cap additive exports for /api/reply/sachverhalt', () => {
  test('SACHVERHALT_RATE_LIMIT bucket exists with a sane budget', () => {
    expect(SACHVERHALT_RATE_LIMIT).toBeDefined();
    expect(SACHVERHALT_RATE_LIMIT.limit).toBeGreaterThan(0);
    expect(SACHVERHALT_RATE_LIMIT.windowMs).toBeGreaterThan(0);
  });

  test('CAPS.maxSachverhaltRohtextChars caps the raw fact text', () => {
    expect(CAPS.maxSachverhaltRohtextChars).toBeGreaterThan(0);
    expect(CAPS.maxSachverhaltRohtextChars).toBeGreaterThanOrEqual(1_000);
  });
});

describe('SACHVERHALT_SYSTEM_PROMPT — locked boundary (Correction #4)', () => {
  test('carries the verbatim contract sentence', () => {
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain(
      'Restate ONLY the facts the user asserts',
    );
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain(
      'Do not evaluate, recommend, predict, or cite any norm.',
    );
  });

  test('carries the clean output template', () => {
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain(
      'Nach meinem Kenntnisstand trifft der zugrunde gelegte Sachverhalt nicht zu',
    );
  });

  test('forbids the merits / norm / Frist / recommendation lines (MUST NOT)', () => {
    // The boundary must explicitly fence each MUST-NOT axis.
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain('Erfolgsaussichten');
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain('Norm');
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain('Frist');
    expect(SACHVERHALT_SYSTEM_PROMPT).toContain('§-Zitat');
  });
});
