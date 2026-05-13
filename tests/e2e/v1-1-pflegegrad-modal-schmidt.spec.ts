/**
 * Stammdaten V1.1 — Pflegegrad-Modal-Pattern-Konsistenz (Schmidt-Track-A).
 *
 * Spec: docs/specs/stammdaten-v1-1-renten-kv.md § 11.22 (sessionStorage-
 * Pattern) + § 11.30 (Anrechnungszeit-Pflege-Coupling) + § 11.28 (EuGH-Zitat).
 *
 * Erbt Pattern von V1 `<ReligionConsentModal>`:
 *   - Modal-Body verbatim aus `stammdaten.disclaimer.pflegegrad_art9`
 *   - Toggle initial off → primary disabled
 *   - Toggle on → primary enabled → confirm → Modal schließt
 *   - F5/Page-Reload survive (sessionStorage); Tab-Close resets
 *   - localStorage-Sentinel: pflegegrad-Key NIE in localStorage
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'markus-schmidt';

test.describe('V1.1 Pflegegrad-Modal (Schmidt)', () => {
  test.skip(
    true,
    'V1.1 e2e-Scaffold — implementiert nach i18n-Land + Schmidt-Persona-' +
      'Pflegegrad-Mock-Daten im Seed.',
  );

  test('hidden-by-default + session-only consent + sessionStorage-only', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // KV-Pflege-Sektion expandieren.
    await page.locator('[data-testid="sektion-kv-pflege"] summary').click();

    // Pflege-Card vorhanden, Reveal-Button sichtbar.
    const pflegeCard = page.locator('[data-testid="pflege-field-card"]');
    await expect(pflegeCard).toBeVisible();
    const reveal = page.locator('[data-testid="pflegegrad-reveal-button"]');
    await expect(reveal).toBeVisible();
    await reveal.click();

    // Modal sichtbar.
    const modal = page.locator('[role="alertdialog"]');
    await modal.waitFor({ state: 'visible' });

    // Toggle off → confirm disabled.
    const toggle = page.locator('[data-testid="pflegegrad-consent-toggle"]');
    const confirm = page.locator('[data-testid="pflegegrad-consent-confirm"]');
    await expect(toggle).not.toBeChecked();
    await expect(confirm).toBeDisabled();

    // Toggle on → confirm enabled.
    await toggle.check();
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // Modal closed; Pflegegrad-Sub-Card sichtbar.
    await modal.waitFor({ state: 'hidden' });
    await expect(page.locator('[data-testid="pflegegrad-revealed"]')).toBeVisible();

    // Hard-Line § 11.22 sentinel: localStorage darf KEINEN pflegegrad-consent-
    // Key haben (nur sessionStorage erlaubt).
    const lsHasPflegegradKey = await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.includes('pflegegrad-consent')),
    );
    expect(lsHasPflegegradKey).toBe(false);

    // F5-Reload: sessionStorage survives; Pflegegrad bleibt sichtbar.
    await page.reload();
    await warmStammdaten(page);
    await page.locator('[data-testid="sektion-kv-pflege"] summary').click();
    await expect(page.locator('[data-testid="pflegegrad-revealed"]')).toBeVisible();
  });
});
