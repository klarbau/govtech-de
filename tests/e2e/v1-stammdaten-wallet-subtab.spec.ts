/**
 * Stammdaten V1 — Wallet-Sub-Tab + Mock-Attestation-Vorschau (Spec § 12.2;
 * Hard-Lines § 11.8 + § 11.11 + § 11.18).
 *   - Sub-Tab „Wallet & Externe Empfänger" sichtbar mit 2027-Vision-Banner.
 *   - 3 Mock-Drittanbieter-Cards.
 *   - Klick „Anfrage simulieren" → Preview-Modal mit `[MOCK]`-Watermark.
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'anna-petrov';

test.describe('V1 Stammdaten — Wallet-Sub-Tab', () => {
  test('2027-Vision-Banner + Preview-Modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Tab wechseln.
    await page.locator('[data-testid="tab-wallet"]').click();
    await page
      .locator('[data-testid="wallet-subtab"]')
      .waitFor({ state: 'visible' });

    // 2027-Vision-Banner.
    await expect(
      page.locator('[data-testid="wallet-2027-banner"]'),
    ).toBeVisible();

    // 3 Mock-Cards.
    const cards = page.locator('[data-testid^="wallet-mock-card-"]');
    await expect(cards).toHaveCount(3);

    // Erstes Simulate-CTA klicken.
    const simulateButtons = page.locator(
      '[data-testid^="wallet-simulate-"]',
    );
    await simulateButtons.first().click();

    // Modal sichtbar mit [MOCK]-Watermark.
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    await expect(modal).toContainText('[MOCK]');

    // Pflicht- und Optional-Block sichtbar (sobald geladen).
    await page
      .locator('[data-testid="wallet-preview-pflicht"]')
      .waitFor({ state: 'visible', timeout: 10_000 });
    await expect(
      page.locator('[data-testid="wallet-preview-optional"]'),
    ).toBeVisible();
  });
});
