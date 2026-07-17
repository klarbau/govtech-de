/**
 * Stammdaten a11y — full-page axe (Spec § 12.3).
 * 0 critical, 0 serious violations × 2 viewports.
 *
 * Rewritten 2026-07-17 against the live „Green Bento" StammdatenView: the old
 * hero+tabs surface (`stammdaten-hero`, `tab-wallet`, `wallet-subtab`) was
 * replaced by a flat v2 card grid. The wallet sub-tab no longer exists as a
 * separate surface — its card (`v2-nachweise-card` „Verbundene Nachweise &
 * Wallet") is one of the cards scanned by this full-page pass — so the former
 * per-tab split collapses into a single full-page scan per viewport.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';

async function setupPersona(page: Page, personaId: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        for (const key of [
          'profile',
          'stammdaten:sperren',
          'stammdaten:iban-speculative',
          'stammdaten:kontakt',
          'stammdaten:uebermittlungs-log',
          'stammdaten:religion-consent',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        // ignore
      }
    },
    [NS, personaId],
  );
}

async function warm(page: Page) {
  await page.goto('/stammdaten', { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="v2-profil-card"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
  // Right-rail „Änderungsprotokoll" is the last card to hydrate; wait for it so
  // the axe pass covers the whole grid, not a mid-mount snapshot.
  await page
    .locator('[data-testid="v2-protokoll-card"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
}

test.describe('Stammdaten a11y — full page', () => {
  for (const viewport of [
    { width: 375, height: 800, label: 'mobile' },
    { width: 1280, height: 900, label: 'desktop' },
  ]) {
    test(`axe scan full page @${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await setupPersona(page, 'anna-petrov');
      await warm(page);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const blockers = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
    });
  }
});
