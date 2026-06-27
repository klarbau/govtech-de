import { test, type Page } from '@playwright/test';

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

// Drive to the RUNNING cascade and stop on the inline eID gate (.vlf-eid),
// WITHOUT clicking it — that is the screen whose gamut we are checking.
async function driveToEidGate(page: Page) {
  await page.goto('/lebenslagen/geburt/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', { name: /mit eid bestätigen & absenden/i });
  await submit.waitFor({ state: 'visible', timeout: 20000 });
  await fillRequiredEmpty(page);
  await submit.click();
  await confirmDialog(page);
  await page.waitForURL(/\/cascade/, { timeout: 20000 });
  // Wait for the inline eID gate to surface as the cascade reaches a gated step.
  await page.locator('.vlf-eid').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test('vlf eid light', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 1680, height: 1100 });
  await driveToEidGate(page);
  await page.screenshot({ path: '.tmp-shots/vlf-eid-fixed-light.png', fullPage: true });
});

test('vlf eid dark', async ({ page }) => {
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1680, height: 1100 });
  await driveToEidGate(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.tmp-shots/vlf-eid-fixed-dark.png', fullPage: true });
});
