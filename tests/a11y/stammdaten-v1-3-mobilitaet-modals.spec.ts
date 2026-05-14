/**
 * Stammdaten V1.3 a11y — Mobilität-Modale (Spec § 13).
 *
 *   - `<PunkteEidReauthModal>` (alertdialog; Spec § 4.1 / HL-MOB-2 / VL-8)
 *   - `<PunkteResultCard>` rendered after Reauth-Confirm (Spec § 4.1 / VL-8)
 *   - `<WalletMdlAttestationPreviewModal>` (dialog; Spec § 4.2 / VL-9)
 *   - `<KorrekturwegFeBehoerdeModal>` (dialog; Spec § 4.1 / VL-10)
 *
 * Pro Modal × 2 Viewports × axe-Scan auf `[role="dialog"]` / `[role="alertdialog"]`.
 * Pattern parallel zu `stammdaten-modals.spec.ts`.
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
          'stammdaten:mobilitaet',
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

async function warmAndExpandMobilitaet(page: Page) {
  await page.goto('/stammdaten', { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="stammdaten-hero"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
  const sektion = page.locator('[data-testid="sektion-mobilitaet"]');
  await sektion.waitFor({ state: 'visible', timeout: 15_000 });
  const summary = sektion.locator('details > summary').first();
  await summary.click();
  await sektion
    .locator('[data-testid="mobilitaet-disclaimer"]')
    .waitFor({ state: 'visible' });
}

async function expectAxeClean(page: Page, selector: string) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
}

const VIEWPORTS = [
  { width: 375, height: 800, label: 'mobile' },
  { width: 1280, height: 900, label: 'desktop' },
];

test.describe('V1.3 Stammdaten a11y — Mobilität-Modale', () => {
  for (const vp of VIEWPORTS) {
    test(`PunkteEidReauthModal axe-clean @${vp.label}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await warmAndExpandMobilitaet(page);
      await page.locator('[data-testid="punktestand-cta-pull"]').first().click();
      await page.locator('[role="alertdialog"]').waitFor({ state: 'visible' });
      await expectAxeClean(page, '[role="alertdialog"]');
    });

    test(`PunkteResultCard axe-clean (post-Reauth) @${vp.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await warmAndExpandMobilitaet(page);
      await page.locator('[data-testid="punktestand-cta-pull"]').first().click();
      await page.locator('[role="alertdialog"]').waitFor({ state: 'visible' });
      await page
        .locator('[data-testid="punkte-eid-reauth-consent-toggle"]')
        .check();
      await page.locator('[data-testid="punkte-eid-reauth-confirm"]').click();
      const resultCard = page.locator('[data-testid="punkte-result-card"]');
      await resultCard.waitFor({ state: 'visible', timeout: 5_000 });
      await expectAxeClean(page, '[data-testid="punkte-result-card"]');
    });

    test(`WalletMdlAttestationPreviewModal axe-clean @${vp.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await page.goto('/stammdaten?tab=wallet', { waitUntil: 'networkidle' });
      await page
        .locator('[data-testid="wallet-subtab"]')
        .waitFor({ state: 'visible', timeout: 15_000 });
      const cta = page.locator('[data-testid="wallet-mdl-preview-cta"]');
      await cta.waitFor({ state: 'visible', timeout: 10_000 });
      await cta.click();
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
      await expectAxeClean(page, '[role="dialog"]');
    });

    test(`KorrekturwegFeBehoerdeModal axe-clean @${vp.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await warmAndExpandMobilitaet(page);
      await page.locator('[data-testid="korrekturweg-fe-cta"]').first().click();
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
      await expectAxeClean(page, '[role="dialog"]');
    });
  }
});
