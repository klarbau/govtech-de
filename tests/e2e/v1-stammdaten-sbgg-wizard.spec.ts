/**
 * Stammdaten V1 — SBGG-Wizard-Hand-off (Spec § 12.2; Hard-Line § 11.5).
 *   - Geschlechts-FieldCard hat Korrigieren-CTA.
 *   - Klick auf Korrigieren-CTA navigiert zu /vorgaenge/neu/sbgg-3-stufen
 *     (V2-Stub akzeptabel — Hauptsache Pfad korrekt).
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'anna-petrov';

test.describe('V1 Stammdaten — SBGG-Wizard-Hand-off', () => {
  test('Korrigieren-CTA auf Geschlechts-Card navigiert zum SBGG-Wizard-Pfad', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Identitäts-Sektion ist default geöffnet.
    const cta = page.locator('[data-testid="korrigieren-cta-geschlecht"]');
    await expect(cta).toBeVisible();

    await cta.click();
    await page.waitForURL(/\/vorgaenge\/neu\/sbgg-3-stufen/, {
      timeout: 10_000,
    });
    expect(page.url()).toContain('/vorgaenge/neu/sbgg-3-stufen');
    expect(page.url()).toContain('from=stammdaten');
    expect(page.url()).toContain('field=geschlecht');
  });
});
