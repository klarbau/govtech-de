/**
 * Stammdaten V1.1 — Yellow-Letter-Bridge Page-Reload-Idempotenz.
 *
 * Spec: docs/specs/stammdaten-v1-1-renten-kv.md § 11.25 Hard-Line.
 *
 * Activity-Log-Eintrag pro `letter_id` höchstens 1× erzeugt, auch bei
 * Page-Reload. Implementiert über Bucket
 * `govtech-de:v1:stammdaten:yellow-letter-bridge-applied[persona_id]`.
 *
 * Negativ-Tests:
 *   1. 2× hintereinander aufrufen → 1 Activity-Log-Eintrag.
 *   2. F5-Reload nach 1. Aufruf → 2. Aufruf returns `applied: false`.
 *   3. Bucket muss nach 1. Aufruf den `letter_id` in `applied`-Liste haben.
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'anna-petrov';
const LETTER_ID = 'letter-renteninfo-anna-2026-05';
const NS = 'govtech-de:v1:';

test.describe('V1.1 Bridge-Idempotenz (Hard-Line § 11.25)', () => {
  test.skip(
    true,
    'V1.1 e2e-Scaffold — implementiert nach api/i18n-Land + Mock-Letter im Seed.',
  );

  test('Page-Reload survives — 2. Aufruf no-op + Bucket persistiert', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);

    // 1. Aufruf.
    await page.goto(`/posteingang/${LETTER_ID}`);
    const cta = page.locator('[data-testid="renten-bridge-cta"]');
    await cta.click();
    await page.waitForURL('**/stammdaten#altersvorsorge');

    // Bucket-Sentinel.
    const bucketAfterFirst = await page.evaluate((ns) => {
      return localStorage.getItem(
        `${ns}stammdaten:yellow-letter-bridge-applied`,
      );
    }, NS);
    expect(bucketAfterFirst).toBeTruthy();
    if (bucketAfterFirst) {
      expect(bucketAfterFirst).toContain(LETTER_ID);
    }

    // F5-Reload + 2. Aufruf via Posteingang.
    await page.reload();
    await page.goto(`/posteingang/${LETTER_ID}`);
    const indicator = page.locator(
      '[data-testid="renten-bridge-applied-indicator"]',
    );
    await expect(indicator).toBeVisible();

    // Activity-Log: nur 1 Eintrag mit dieser letter_id.
    await warmStammdaten(page);
    await page.goto('/stammdaten#altersvorsorge');
    const logEntries = page.locator(
      '[data-testid$="-aktivitaetslog"] li',
    );
    const renteninfoEntries = await logEntries.evaluateAll(
      (nodes, lid) => nodes.filter((n) => n.textContent?.includes(lid)).length,
      LETTER_ID,
    );
    expect(renteninfoEntries).toBeLessThanOrEqual(1);
  });
});
