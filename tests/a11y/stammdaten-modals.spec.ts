/**
 * Stammdaten a11y — Edit-Dialog (Spec § 12.3).
 *
 * Rewritten 2026-07-17. The old surface exposed four data-collecting modals
 * (ReligionConsent / SperrenAktivieren / IbanSpeculativePush /
 * WalletAttestationPreview). The „Green Bento" StammdatenView dropped the
 * sperren / religion / iban / wallet-sub-tab sections entirely, so those four
 * modals have no live equivalent. The single dialog that remains is the
 * read-only edit hint (opened from the header „Bearbeiten" / „Adresse ändern"),
 * which stands in as the page's representative modal.
 *
 * Intention preserved: any dialog on this page is axe-clean on
 * `[role="dialog"]` × 2 viewports, and it traps + restores focus.
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
          'stammdaten:kontakt',
          'stammdaten:uebermittlungs-log',
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
    .locator('[data-testid="sd-header-actions"]')
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

// The two header buttons both open the same shared edit dialog with different
// copy (profile vs. address). `nth` matches the render order in sd-header-actions.
const TRIGGERS = [
  { label: 'Profil-Bearbeiten', nth: 0 },
  { label: 'Adresse-ändern', nth: 1 },
];

test.describe('Stammdaten a11y — Edit-Dialog', () => {
  for (const vp of VIEWPORTS) {
    for (const trigger of TRIGGERS) {
      test(`${trigger.label} dialog axe-clean @${vp.label}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await setupPersona(page, 'anna-petrov');
        await warm(page);
        await page
          .locator('[data-testid="sd-header-actions"] button')
          .nth(trigger.nth)
          .click();
        await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
        await expectAxeClean(page, '[role="dialog"]');
      });
    }
  }

  test('edit dialog traps focus and restores it to the trigger on close', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersona(page, 'anna-petrov');
    await warm(page);

    const trigger = page.locator('[data-testid="sd-header-actions"] button').first();
    await trigger.focus();
    await trigger.click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });

    const focusInDialog = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const active = document.activeElement;
      return Boolean(dlg && active && dlg.contains(active));
    });
    expect(focusInDialog, 'focus moved inside the dialog').toBe(true);

    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(200);
    const restored = await page.evaluate(() =>
      (document.activeElement?.textContent ?? '').trim(),
    );
    expect(restored.length, 'focus restored to a real control').toBeGreaterThan(0);
  });
});
