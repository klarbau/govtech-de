import { test, type Page } from '@playwright/test';

const NS = 'govtech-de:v1:';
const PERSONA = 'anna-petrov';

test('diagnose vab render', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.context().addCookies([
    { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, persona]) => {
      window.localStorage.setItem(
        ns + 'meta',
        JSON.stringify({ version: 1, active_persona_id: persona, seeded_at: new Date().toISOString(), reliable_mode: true }),
      );
    },
    [NS, PERSONA],
  );

  await page.goto('/lebenslagen/pflegegrad/cascade', { waitUntil: 'networkidle' });
  for (let i = 0; i < 4; i++) {
    const cta = page.getByRole('button', { name: /mit eid bestätigen/i }).first();
    const seen = await cta.waitFor({ state: 'visible', timeout: 12000 }).then(() => true, () => false);
    if (!seen) break;
    await cta.click().catch(() => undefined);
    const confirm = page.getByRole('button', { name: /bestätigen/i }).last();
    await confirm.click().catch(() => undefined);
    await page.waitForTimeout(1500);
    if (await page.locator('.vab-layout').count()) break;
  }
  await page.waitForTimeout(2500);
  const hasVab = await page.locator('.vab-layout').count();
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 400);
  console.log('=== HAS .vab-layout: ' + hasVab);
  console.log('=== CONSOLE ERRORS:\n' + errors.slice(0, 8).join('\n---\n'));
  console.log('=== BODY TEXT:\n' + bodyText);
});
