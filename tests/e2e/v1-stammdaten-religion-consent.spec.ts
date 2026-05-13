/**
 * Stammdaten V1 — Religion-Consent-Modal-Flow (Spec § 12.2; Hard-Lines
 * § 11.3 + § 11.4 + § 11.20).
 *   - Religion-Card collapsed, „Anzeigen"-Button.
 *   - Modal öffnet, Toggle off → primary disabled.
 *   - Toggle on → primary enabled → confirm → Modal schließt.
 *   - Browser-Reload → Card wieder collapsed (session-only Hard-Line § 11.4).
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'markus-schmidt';

test.describe('V1 Stammdaten — Religion-Consent-Modal', () => {
  test('hidden-by-default + session-only consent', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Sperren & Einstellungen-Sektion expand.
    await page
      .locator('[data-testid="sektion-sperren_einstellungen"] summary')
      .click();

    // Religion-Card vorhanden, collapsed mit Reveal-Button.
    await expect(page.locator('[data-testid="field-card-religion"]')).toBeVisible();
    const reveal = page.locator('[data-testid="field-card-reveal-religion"]');
    await expect(reveal).toBeVisible();
    await reveal.click();

    // Modal sichtbar.
    const modal = page.locator('[role="alertdialog"]');
    await modal.waitFor({ state: 'visible' });

    // Toggle off → confirm disabled.
    const toggle = page.locator('[data-testid="religion-consent-toggle"]');
    const confirm = page.locator('[data-testid="religion-consent-confirm"]');
    await expect(toggle).not.toBeChecked();
    await expect(confirm).toBeDisabled();

    // Toggle on → confirm enabled.
    await toggle.click();
    await expect(toggle).toBeChecked();
    await expect(confirm).toBeEnabled();

    // Confirm.
    await confirm.click();
    await modal.waitFor({ state: 'hidden' });

    // Wert sichtbar (rk für Schmidt) — Card-Value wird gerendert.
    await expect(
      page.locator('[data-testid="field-card-value-religion"]'),
    ).toBeVisible();

    // Browser-Reload → wieder hidden (Hard-Line § 11.4).
    await page.reload({ waitUntil: 'networkidle' });
    await page
      .locator('[data-testid="stammdaten-view"]')
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page
      .locator('[data-testid="sektion-sperren_einstellungen"] summary')
      .click();
    await expect(
      page.locator('[data-testid="field-card-reveal-religion"]'),
    ).toBeVisible();

    // LocalStorage MUSS frei von religion-consent-Key sein.
    const ls = await page.evaluate(() => Object.keys(window.localStorage));
    const offending = ls.filter((k) => /religion-consent/.test(k));
    expect(offending, 'no religion-consent key in localStorage').toEqual([]);
  });
});
