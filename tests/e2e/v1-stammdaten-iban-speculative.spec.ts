/**
 * Stammdaten V1 — IBAN-Speculative-Push-Modal (Spec § 12.2; Hard-Line § 11.12).
 *   - IBAN-FieldCard mit 2027-Vision-Badge sichtbar.
 *   - Klick „IBAN-Push simulieren" → Modal mit 3 Empfänger-Toggles.
 *   - 2 aktivieren → primary → Modal schließt.
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'mehmet-yildiz';

test.describe('V1 Stammdaten — IBAN-Speculative-Push', () => {
  test('IBAN-Push-Modal-Flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Sperren & Einstellungen-Sektion expand.
    await page
      .locator('[data-testid="sektion-sperren_einstellungen"] summary')
      .click();

    // IBAN-FieldCard mit 2027-Vision-Badge sichtbar.
    const ibanCard = page.locator(
      '[data-testid="field-card-iban_speculative"]',
    );
    await expect(ibanCard).toBeVisible();

    // Push-Trigger sichtbar (IBAN ist gesetzt für Mehmet).
    const trigger = page.locator('[data-testid="iban-push-trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Modal sichtbar.
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // 3 Empfänger-Toggles.
    const fk = page.locator('[data-testid="iban-target-familienkasse"]');
    const elster = page.locator('[data-testid="iban-target-elster"]');
    const gkv = page.locator('[data-testid="iban-target-gkv"]');
    await expect(fk).toBeVisible();
    await expect(elster).toBeVisible();
    await expect(gkv).toBeVisible();

    // Confirm initial disabled (kein Empfänger gewählt).
    const confirm = page.locator('[data-testid="iban-push-confirm"]');
    await expect(confirm).toBeDisabled();

    // 2 aktivieren.
    await fk.click();
    await elster.click();
    await expect(confirm).toBeEnabled();

    await confirm.click();
    await modal.waitFor({ state: 'hidden' });
  });
});
