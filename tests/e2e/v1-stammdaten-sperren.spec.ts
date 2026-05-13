/**
 * Stammdaten V1 — Sperren-Aktivieren-Confirm-Dialog (Spec § 12.2;
 * Hard-Lines § 11.13 + § 11.14).
 *   - Übermittlungssperre § 42 Abs. 3: Toggle → Modal → primary → aktiv.
 *   - Auskunftssperre § 51: Toggle → Modal mit Begründungs-Textarea →
 *     5 Zeichen → primary disabled / Validation-Hinweis. 35 Zeichen →
 *     primary enabled → success.
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'anna-petrov';

test.describe('V1 Stammdaten — Sperren-Aktivieren', () => {
  test('Auskunftssperre verlangt Begründung ≥ 30 Zeichen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    await page
      .locator('[data-testid="sektion-sperren_einstellungen"] summary')
      .click();

    const trigger = page.locator(
      '[data-testid="sperre-toggle-auskunftssperre"]',
    );
    await expect(trigger).toBeVisible();
    await trigger.click();

    const modal = page.locator('[role="alertdialog"]');
    await modal.waitFor({ state: 'visible' });

    const textarea = page.locator('[data-testid="sperren-begruendung-textarea"]');
    const confirm = page.locator('[data-testid="sperren-confirm-button"]');
    await expect(textarea).toBeVisible();
    await expect(confirm).toBeDisabled();

    // 5 Zeichen → still disabled, error helper.
    await textarea.fill('Hallo');
    await expect(confirm).toBeDisabled();
    await expect(
      page.locator('[data-testid="sperren-begruendung-helper"]'),
    ).toContainText(/zu kurz|Min/i);

    // 35 Zeichen → enabled.
    await textarea.fill(
      'Begründung mit ausreichend Mindestlänge zur Aktivierung.',
    );
    await expect(confirm).toBeEnabled();

    await confirm.click();
    await modal.waitFor({ state: 'hidden' });
  });

  test('Übermittlungssperre § 42 Abs. 3 ohne Begründung', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    await page
      .locator('[data-testid="sektion-sperren_einstellungen"] summary')
      .click();

    const trigger = page.locator('[data-testid="sperre-toggle-42-3"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const modal = page.locator('[role="alertdialog"]');
    await modal.waitFor({ state: 'visible' });
    await expect(
      page.locator('[data-testid="sperren-begruendung-textarea"]'),
    ).toHaveCount(0);
    const confirm = page.locator('[data-testid="sperren-confirm-button"]');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await modal.waitFor({ state: 'hidden' });
  });
});
