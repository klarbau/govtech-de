/**
 * Stammdaten V1.1 — Track-C Empty-State (Mehmet-Persona).
 *
 * Spec: docs/specs/stammdaten-v1-1-renten-kv.md § 11.24 Hard-Line.
 *
 * Mehmet-Persona hat `renten_track: 'C'` → Sektion „Altersvorsorge" rendert
 * `<TrackCEmptyStateCard>` mit Wording-verbatim:
 *
 *   „Sie haben keine Renteninformation, weil Sie nicht in der GRV
 *    pflichtversichert sind. Im PKV-Bereich existiert kein zentraler
 *    Aggregator wie ZfDR — Sie müssen die App Ihres Versicherers nutzen.
 *    Optionen: 1) freiwillige GRV (§ 7 SGB VI), 2) Privatvorsorge prüfen,
 *    3) Falls Pflichtversicherten-Beruf (§ 2 SGB VI), Pflichtversicherung
 *    beantragen."
 *
 * KEIN Yellow-Letter-Mock für Mehmet im Posteingang; KEIN Bridge-CTA.
 */
import { test, expect } from '@playwright/test';

import { setupStammdatenPersona, warmStammdaten } from './v1-stammdaten-helpers';

const ACTIVE_PERSONA = 'mehmet-yildiz';

test.describe('V1.1 Track-C Empty-State (Mehmet)', () => {
  test.skip(
    true,
    'V1.1 e2e-Scaffold — implementiert nach i18n-Land + Mehmet-Persona ' +
      '`renten_track: C`-Override im Seed.',
  );

  test('Empty-State-Card rendert mit Wording verbatim', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await warmStammdaten(page);

    // Altersvorsorge-Sektion expandieren.
    await page.locator('[data-testid="sektion-altersvorsorge"] summary').click();

    // Track-C Empty-State sichtbar.
    const emptyState = page.locator(
      '[data-testid="track-c-empty-state-card"]',
    );
    await expect(emptyState).toBeVisible();

    // Wording-Test: Spec-Hard-Line § 11.24 verbatim-Schlüsselsätze.
    await expect(emptyState).toContainText(
      'nicht in der GRV pflichtversichert',
    );
    await expect(emptyState).toContainText('zentraler Aggregator wie ZfDR');
    await expect(emptyState).toContainText('§ 7 SGB VI');
    await expect(emptyState).toContainText('§ 2 SGB VI');
  });

  test('KEIN Yellow-Letter im Posteingang für Mehmet', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupStammdatenPersona(page, ACTIVE_PERSONA);
    await page.goto('/posteingang');
    const renteninfoLetter = page.locator(
      '[data-testid="letter-letter-renteninfo-anna-2026-05"]',
    );
    await expect(renteninfoLetter).toHaveCount(0);
  });
});
