/**
 * Stammdaten V1 — Mehmet (Drittstaatsangehöriger) AZR + eAT (Spec § 12.2).
 *   - Sektion „Dokumente" zeigt eAT-CAN + AZR-Nr. mit Art-9-Hinweis-Badge
 *   - Korrigieren-CTA auf eAT-Card öffnet ABH-Wizard (V2-Stub akzeptabel)
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'mehmet-yildiz';

test.describe('V1 Stammdaten — Mehmet AZR + eAT', () => {
  test('AZR + eAT mit Art-9-Badge sichtbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Sektion Dokumente expanden.
    await page.locator('[data-testid="sektion-dokumente"] summary').click();

    // eAT-CAN sichtbar mit Art-9-Hinweis-Badge.
    const eatCard = page.locator('[data-testid="field-card-eat_can"]');
    await expect(eatCard).toBeVisible();
    await expect(
      page.locator('[data-testid="art9-badge-eat_can"]'),
    ).toBeVisible();
    await expect(eatCard).toContainText(/T0123456X|MOCK/);

    // AZR-Nr sichtbar mit Art-9-Hinweis-Badge.
    const azrCard = page.locator('[data-testid="field-card-azr_nr"]');
    await expect(azrCard).toBeVisible();
    await expect(
      page.locator('[data-testid="art9-badge-azr_nr"]'),
    ).toBeVisible();
  });
});
