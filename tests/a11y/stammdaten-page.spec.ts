/**
 * Stammdaten a11y — full-page axe (Spec § 12.3).
 * 0 critical, 0 serious violations × 2 viewports.
 *
 * Anchors updated 2026-07-24 for the „Datenblatt" redesign
 * (`stammdaten-datenblatt.md` § 10), re-described 2026-07-25 for the band
 * composition (`stammdaten-blatt-dense.md` § 2): the page is three full-width
 * bands — identity, the data sheet (`sd-datenblatt`) and the change log as the
 * foot band (`sd-protokoll`), which is still the last module to render. Waiting
 * for both keeps the scan on the fully hydrated page, not a mid-mount snapshot.
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
    .locator('[data-testid="sd-datenblatt"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
  // The foot band's „Änderungsprotokoll" is the last module to render; wait for
  // it so the axe pass covers the whole page, not a mid-mount snapshot.
  await page
    .locator('[data-testid="sd-protokoll"]')
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
