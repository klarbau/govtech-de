/**
 * Document-detail dialog (/dokumente eye-icon → right-anchored credential view).
 *
 * Covers the rich Meldebestätigung detail panel: it re-verifies the SD-JWT VC
 * credential (server action), renders the verification readout + a faux „Urkunde"
 * preview, and exposes three keyboard-navigable tabs (Übersicht/Vorschau/Verlauf).
 * The closed-page axe of /dokumente lives in `redesign-dokumente.spec.ts`; this
 * suite scans the OPEN dialog (light + dark) and checks the tab ARIA pattern.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

/** Open the Meldebestätigung row's detail dialog and wait for verification. */
async function openMelde(page: Page) {
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await page.locator('main table').first().waitFor({ state: 'visible', timeout: 20000 });
  // The mock-backend hydrates rows asynchronously — wait before targeting one.
  await expect
    .poll(async () => page.locator('main tbody tr').count(), { timeout: 20000 })
    .toBeGreaterThan(3);
  const row = page
    .locator('main tbody tr', { hasText: 'Meldebestätigung Berlin-Mitte' })
    .first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.getByRole('button', { name: /ansehen/i }).first().click();
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await dialog.getByText('Echtheit geprüft').waitFor({ state: 'visible', timeout: 10000 });
  return dialog;
}

function blockers(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('open dialog renders verified credential data + axe LIGHT clean', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await setLocale(page, 'de');
  const dialog = await openMelde(page);

  await expect(dialog.getByText('Petrov', { exact: false }).first()).toBeVisible();
  await expect(dialog.getByText('Müllerstr', { exact: false }).first()).toBeVisible();
  await expect(dialog.getByText('Hauptwohnung', { exact: false }).first()).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  console.log('[DETAIL AXE-LIGHT] ' + JSON.stringify(results.violations.map((v) => v.id)));
  expect(blockers(results), 'serious-or-critical (light)').toHaveLength(0);
});

test('open dialog axe DARK clean', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => document.documentElement.classList.add('dark'));
  await openMelde(page);

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  console.log('[DETAIL AXE-DARK] ' + JSON.stringify(results.violations.map((v) => v.id)));
  expect(blockers(results), 'serious-or-critical (dark)').toHaveLength(0);
});

test('detail tabs: ARIA tab pattern with roving tabindex + arrow-key nav', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await setLocale(page, 'de');
  const dialog = await openMelde(page);

  const tabs = dialog.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  const uebersicht = dialog.getByRole('tab', { name: 'Übersicht' });
  const vorschau = dialog.getByRole('tab', { name: 'Vorschau' });
  await expect(uebersicht).toHaveAttribute('aria-selected', 'true');

  // Roving tabindex: only the active tab is in the Tab sequence.
  expect(await uebersicht.getAttribute('tabindex')).toBe('0');
  expect(await vorschau.getAttribute('tabindex')).toBe('-1');

  await uebersicht.focus();
  await page.keyboard.press('ArrowRight');
  await expect(vorschau).toHaveAttribute('aria-selected', 'true');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(focused).toBe('Vorschau');

  // The Vorschau tabpanel now shows the document preview.
  await expect(dialog.getByRole('tabpanel').filter({ hasText: 'Meldebestätigung' }).first()).toBeVisible();
});
