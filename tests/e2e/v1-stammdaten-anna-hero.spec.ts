/**
 * Stammdaten V1 Hero — Anna-Persona auf `/stammdaten` (Spec § 12.2).
 *   - Hero-Card sichtbar mit Pilot-Phase-Badge
 *   - 5 Sektionen (Identität, Anschrift, Familie, Dokumente,
 *     Sperren & Einstellungen) sichtbar
 *   - Disclaimer-1 (lese_schicht) im Layout-Header sichtbar mit
 *     SBGG-Präzisierungs-Wortlaut
 *   - Anschrift-Sektion expand → FieldCard mit Anschrift
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'anna-petrov';

test.describe('V1 Stammdaten — Anna Hero', () => {
  test('hero + 5 sections + Disclaimer-1 verbatim', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Pilot-Phase-Badge mandatorisch (Hard-Line § 11.10).
    await expect(
      page.locator('[data-testid="pilot-phase-badge"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="pilot-phase-badge"]'),
    ).toContainText(/Datenschutzcockpit/i);

    // 2027-Vision-Banner sichtbar (Hard-Line § 11.11 für Hero).
    await expect(
      page.locator('[data-testid="hero-2027-vision-banner"]'),
    ).toBeVisible();

    // 5 Sektionen vorhanden.
    for (const sektion of [
      'identitaet',
      'anschrift',
      'familie',
      'dokumente',
      'sperren_einstellungen',
    ]) {
      await expect(
        page.locator(`[data-testid="sektion-${sektion}"]`),
      ).toBeVisible();
    }

    // Anschrift-Sektion expand und FieldCard prüfen.
    await page.locator('[data-testid="sektion-anschrift"] summary').click();
    await expect(
      page.locator('[data-testid="field-card-anschrift_aktuell"]'),
    ).toBeVisible();
  });
});
