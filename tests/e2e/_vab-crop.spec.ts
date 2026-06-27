import { test, type Page } from '@playwright/test';

const NS = 'govtech-de:v1:';
const PERSONA = 'anna-petrov';

async function boot(page: Page) {
  await page.context().addCookies([
    { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(([ns, persona]) => {
    window.localStorage.setItem(ns + 'meta', JSON.stringify({ version: 1, active_persona_id: persona, seeded_at: new Date().toISOString(), reliable_mode: true }));
  }, [NS, PERSONA]);
}
async function confirmDialog(page: Page) {
  const d = page.getByRole('dialog');
  await d.waitFor({ state: 'visible', timeout: 8000 });
  await d.getByRole('button', { name: /bestätigen/i }).first().click();
  await d.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
}
async function driveToDone(page: Page) {
  await page.goto('/lebenslagen/pflegegrad/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', { name: /mit eid bestätigen & absenden/i });
  await submit.waitFor({ state: 'visible', timeout: 20000 });
  await submit.click();
  await confirmDialog(page);
  await page.waitForURL(/\/cascade/, { timeout: 20000 });
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.vab-layout').count()) break;
    const inline = page.getByRole('button', { name: /^mit eid bestätigen$/i }).first();
    if (await inline.isVisible().catch(() => false)) { await inline.click().catch(() => undefined); await confirmDialog(page); }
    await page.waitForTimeout(2500);
  }
  await page.locator('.vab-layout').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
}

test('crops', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1400, height: 1000 });
  await driveToDone(page);
  await page.locator('.vab-result').screenshot({ path: '.tmp-shots/crop-result.png' });
  await page.locator('.vab-timeline-card').screenshot({ path: '.tmp-shots/crop-timeline.png' });
  await page.locator('.vab-rail').screenshot({ path: '.tmp-shots/crop-rail.png' });
});
