/**
 * Stammdaten V1.1 — Yellow-Letter-Bridge (Anna-Track-A).
 *
 * Spec: docs/specs/stammdaten-v1-1-renten-kv.md § 8.1, Hard-Line § 11.20 +
 * § 11.25 (Idempotenz) + § 11.27 (Card-Top-3 / Tooltip-2 / Expandable-5).
 *
 * Flow:
 *   1. Anna öffnet Posteingang → erkennt `letter-renteninfo-anna-2026-05`
 *      mit Pre-Open-AISummary „DRV Berlin-Brandenburg · Renteninformation ·
 *      Keine Frist".
 *   2. Klick → LetterReader rendert Bridge-Section (separater CTA-Pfad,
 *      KEIN Reply-Template).
 *   3. Klick „Werte in meinen Stammdaten ablegen" → Toast + Navigation
 *      `/stammdaten#altersvorsorge`.
 *   4. Sektion „Altersvorsorge" expandiert auto, Card-Top-3 zeigt
 *      Entgeltpunkte/Regelalter/EM-Rente.
 *   5. Activity-Log enthält neuen Eintrag mit Rechtsgrundlage
 *      „§ 109 Abs. 1 + Abs. 3 SGB VI".
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'anna-petrov';
const LETTER_ID = 'letter-renteninfo-anna-2026-05';

test.describe('V1.1 Yellow-Letter-Bridge (Anna)', () => {
  test.skip(
    true,
    'V1.1 e2e-Scaffold — implementiert nach api/i18n-Land. ' +
      'Skipping bis i18n-Localizer DE-Keys + Mock-Letter im Seed gelandet sind.',
  );

  test('Posteingang → Bridge-CTA → Stammdaten#altersvorsorge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);

    // 1. Anna öffnet Posteingang.
    await page.goto('/posteingang');
    const letterCard = page.locator(`[data-testid="letter-${LETTER_ID}"]`);
    await letterCard.waitFor({ state: 'visible' });

    // 2. Letter-Reader.
    await letterCard.click();
    await page.waitForURL(`**/posteingang/${LETTER_ID}`);

    // 3. Bridge-Section sichtbar.
    const bridgeSection = page.locator('[data-testid="renten-bridge-section"]');
    await expect(bridgeSection).toBeVisible();
    const bridgeCta = page.locator('[data-testid="renten-bridge-cta"]');
    await expect(bridgeCta).toBeVisible();
    await bridgeCta.click();

    // 4. Navigation zu Stammdaten#altersvorsorge.
    await page.waitForURL('**/stammdaten#altersvorsorge');
    await warmStammdaten(page);

    // Sektion ist auto-expanded.
    const altSektion = page.locator('[data-testid="sektion-altersvorsorge"]');
    await expect(altSektion).toBeVisible();
    const cardTop3 = page.locator('[data-testid="yellow-letter-card-top-3"]');
    await expect(cardTop3).toBeVisible();
  });

  test('§ 11.25 Idempotenz — 2. Click zeigt Read-Only-Indikator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);

    await page.goto(`/posteingang/${LETTER_ID}`);
    const cta = page.locator('[data-testid="renten-bridge-cta"]');
    await cta.click();

    await page.waitForURL('**/stammdaten#altersvorsorge');
    await page.goBack();
    await page.goBack();

    // Re-open Letter — applied indicator statt CTA.
    await page.goto(`/posteingang/${LETTER_ID}`);
    const indicator = page.locator(
      '[data-testid="renten-bridge-applied-indicator"]',
    );
    await expect(indicator).toBeVisible();
  });
});
