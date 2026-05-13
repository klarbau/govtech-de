/**
 * Stammdaten V1 a11y — Modale (Spec § 12.3).
 *   - ReligionConsent / SperrenAktivieren / IbanSpeculativePush /
 *     WalletAttestationPreview × 2 Viewports × axe-Scan auf
 *     `[role="dialog"]` / `[role="alertdialog"]`.
 *   - Focus-trap Plausibilitäts-Probe.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';

interface SetupPersonaOptions {
  /**
   * Pre-seed `stammdaten:iban-speculative`-Bucket für die aktive Persona, damit
   * `iban-push-trigger` rendert. Default-Seed enthält keine IBAN für Mehmet,
   * darum brauchen Tests die `IbanSpeculativePushModal` rendern eine explizite
   * IBAN-Vorbelegung.
   */
  ibanSeed?: boolean;
}

async function setupPersona(
  page: Page,
  personaId: string,
  options: SetupPersonaOptions = {},
) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id, ibanSeed]) => {
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
        if (ibanSeed) {
          window.localStorage.setItem(
            `${ns}stammdaten:iban-speculative`,
            JSON.stringify({
              [id]: {
                iban: '[MOCK] DE89 3704 0044 0532 0130 00',
                consented_pushes: {
                  familienkasse: false,
                  elster: false,
                  gkv: false,
                },
              },
            }),
          );
        }
      } catch {
        // ignore
      }
    },
    [NS, personaId, options.ibanSeed === true] as const,
  );
}

async function warm(page: Page) {
  await page.goto('/stammdaten', { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="stammdaten-hero"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
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

test.describe('V1 Stammdaten a11y — Modale', () => {
  for (const vp of VIEWPORTS) {
    test(`ReligionConsentModal axe-clean @${vp.label}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'markus-schmidt');
      await warm(page);
      await page
        .locator('[data-testid="sektion-sperren_einstellungen"] summary')
        .click();
      await page
        .locator('[data-testid="field-card-reveal-religion"]')
        .click();
      await page.locator('[role="alertdialog"]').waitFor({ state: 'visible' });
      await expectAxeClean(page, '[role="alertdialog"]');
    });

    test(`SperrenAktivierenConfirmDialog axe-clean @${vp.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await warm(page);
      await page
        .locator('[data-testid="sektion-sperren_einstellungen"] summary')
        .click();
      await page
        .locator('[data-testid="sperre-toggle-auskunftssperre"]')
        .click();
      await page.locator('[role="alertdialog"]').waitFor({ state: 'visible' });
      await expectAxeClean(page, '[role="alertdialog"]');
    });

    test(`IbanSpeculativePushModal axe-clean @${vp.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'mehmet-yildiz', { ibanSeed: true });
      await warm(page);
      await page
        .locator('[data-testid="sektion-sperren_einstellungen"] summary')
        .click();
      const trigger = page.locator('[data-testid="iban-push-trigger"]');
      await trigger.waitFor({ state: 'visible' });
      await trigger.click();
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
      await expectAxeClean(page, '[role="dialog"]');
    });

    test(`WalletAttestationPreviewModal axe-clean @${vp.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await warm(page);
      await page.locator('[data-testid="tab-wallet"]').click();
      await page
        .locator('[data-testid="wallet-subtab"]')
        .waitFor({ state: 'visible' });
      const simulate = page
        .locator('[data-testid^="wallet-simulate-"]')
        .first();
      await simulate.waitFor({ state: 'visible' });
      await simulate.click();
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
      // Wait for either preview content or loading state to settle.
      await page.waitForTimeout(500);
      await expectAxeClean(page, '[role="dialog"]');
    });
  }
});
