import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Committed a11y coverage for the SHARED Lebenslagen dossier surfaces — the
// `VorgangInBearbeitung` running-dossier eID gate (.vlf-eid) and the
// `VorgangAbgeschlossen` completed dossier (.vab-layout). These were previously
// only covered by untracked scratch specs (tests/e2e/_v{ab,lf}-axe.spec.ts) that
// vanished on a clean checkout; promoted here so the new shared components have
// real, durable axe coverage (light + dark + mobile + the recolored eID band).

const NS = 'govtech-de:v1:';
const PERSONA = 'anna-petrov';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function boot(page: Page) {
  await page.context().addCookies([
    { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, persona]) => {
      window.localStorage.setItem(
        ns + 'meta',
        JSON.stringify({
          version: 1,
          active_persona_id: persona,
          seeded_at: new Date().toISOString(),
          reliable_mode: true,
        }),
      );
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
      (e: HTMLInputElement) =>
        e.required || e.getAttribute('aria-required') === 'true',
    );
    if (req && !val) {
      if (type === 'date') await el.fill('2027-01-01').catch(() => undefined);
      else await el.fill('Testangabe').catch(() => undefined);
    }
  }
}

async function runAxe(page: Page, label: string, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(axeTags);
  if (include) builder.include(include);
  const results = await builder.analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target,
  }));
  console.log(`[AXE ${label}] blockers=${blockers.length} all=${JSON.stringify(summary)}`);
  expect(blockers, `serious/critical: ${label}`).toHaveLength(0);
}

/* ── VorgangInBearbeitung: the inline eID gate band (.vlf-eid) ──────────── */

async function driveToEidGate(page: Page) {
  await page.goto('/lebenslagen/geburt/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', {
    name: /mit eid bestätigen & absenden/i,
  });
  await submit.waitFor({ state: 'visible', timeout: 20000 });
  await fillRequiredEmpty(page);
  await submit.click();
  await confirmDialog(page);
  await page.waitForURL(/\/cascade/, { timeout: 20000 });
  await page.locator('.vlf-eid').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.waitForTimeout(600);
}

test('dossier eID gate (.vlf-eid) — axe light', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToEidGate(page);
  await runAxe(page, 'eid-gate LIGHT', '.vlf-eid');
});

test('dossier eID gate (.vlf-eid) — axe dark', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToEidGate(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await runAxe(page, 'eid-gate DARK', '.vlf-eid');
});

/* ── VorgangAbgeschlossen: the completed dossier (.vab-layout) ──────────── */

async function driveToDone(page: Page) {
  await page.goto('/lebenslagen/pflegegrad/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', {
    name: /mit eid bestätigen & absenden/i,
  });
  await submit.waitFor({ state: 'visible', timeout: 20000 });
  await fillRequiredEmpty(page);
  await submit.click();
  await confirmDialog(page);
  await page.waitForURL(/\/cascade/, { timeout: 20000 });
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.vab-layout').count()) break;
    const inline = page
      .getByRole('button', { name: /^mit eid bestätigen$/i })
      .first();
    if (await inline.isVisible().catch(() => false)) {
      await inline.click().catch(() => undefined);
      await confirmDialog(page);
    }
    await page.waitForTimeout(2500);
  }
  await page.locator('.vab-layout').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
}

test('completed dossier (.vab-layout) — axe light', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToDone(page);
  await runAxe(page, 'dossier LIGHT');
});

test('completed dossier (.vab-layout) — axe dark', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToDone(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await runAxe(page, 'dossier DARK');
});

test('completed dossier (.vab-layout) — axe mobile 420 + no main overflow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 420, height: 900 });
  await driveToDone(page);
  const mainOverflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    let max = 0;
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) max = Math.max(max, Math.round(r.right - vw));
    }
    return max;
  });
  console.log('[MAIN OVERFLOW dossier 420] ' + mainOverflow);
  expect(mainOverflow, 'no <main> horizontal overflow @420').toBeLessThanOrEqual(1);
  await runAxe(page, 'dossier MOBILE');
});
