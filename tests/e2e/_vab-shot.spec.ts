import { test, expect, type Page } from '@playwright/test';

const NS = 'govtech-de:v1:';
const PERSONA = 'anna-petrov';

async function boot(page: Page) {
  await page.context().addCookies([
    { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, persona]) => {
      try {
        window.localStorage.setItem(
          ns + 'meta',
          JSON.stringify({
            version: 1,
            active_persona_id: persona,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
      } catch {
        /* non-browser */
      }
    },
    [NS, PERSONA],
  );
}

async function confirmDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await dialog.getByRole('button', { name: /bestätigen/i }).first().click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
}

async function fillRequiredEmpty(page: Page) {
  const inputs = page.locator('form input');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const type = (await el.getAttribute('type')) ?? 'text';
    if (type === 'checkbox') continue;
    const val = await el.inputValue().catch(() => '');
    const req = await el.evaluate(
      (e: HTMLInputElement) => e.required || e.getAttribute('aria-required') === 'true',
    );
    if (req && !val) {
      if (type === 'date') await el.fill('2027-01-01').catch(() => undefined);
      else await el.fill('Testangabe').catch(() => undefined);
    }
  }
}

async function driveToDone(page: Page) {
  // REAL flow: antrag form (consents default-on) → eID submit → cascade → done.
  await page.goto('/lebenslagen/pflegegrad/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', { name: /mit eid bestätigen & absenden/i });
  await submit.waitFor({ state: 'visible', timeout: 20000 });
  await fillRequiredEmpty(page);
  await submit.click();
  await confirmDialog(page);
  await page.waitForURL(/\/cascade/, { timeout: 20000 });
  // Drain: each round, clear an inline eID gate if present; stop when the dossier mounts.
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.vab-layout').count()) break;
    const inline = page.getByRole('button', { name: /^mit eid bestätigen$/i }).first();
    if (await inline.isVisible().catch(() => false)) {
      await inline.click().catch(() => undefined);
      await confirmDialog(page);
    }
    await page.waitForTimeout(2500);
  }
  await page.locator('.vab-layout').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test('vab after light', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 1680, height: 1100 });
  await driveToDone(page);
  await page.screenshot({ path: '.tmp-shots/vab-after-light.png', fullPage: true });
  expect(await page.locator('.vab-layout').count()).toBeGreaterThan(0);
});

test('vab after dark', async ({ page }) => {
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1680, height: 1100 });
  await driveToDone(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.tmp-shots/vab-after-dark.png', fullPage: true });
});

test('vab after mobile', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 420, height: 900 });
  await driveToDone(page);
  await page.screenshot({ path: '.tmp-shots/vab-after-mobile.png', fullPage: true });
});
