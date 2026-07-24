import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Committed a11y coverage for the Lebenslagen dossier — now the canonical Akte
// `/vorgaenge/[id]` (`VorgangDetail`), reached after an Antrag is submitted.
// Covers the running eID-gate band (the `.vd-next` NextStepBanner, mode eID)
// and the completed non-Umzug dossier (`.vd-next.is-done` + the all-done
// `.vd-timeline`). light + dark + mobile.

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

/* ── Running dossier: the eID gate band (NextStepBanner `.vd-next`) ──────── */

// Antragslos-Start (kindergeld: a single Stufe-1 eID gate, then a clean
// completion — no consent-skip steps) → lands on the Akte; the cascade pauses
// at the eID gate, surfaced full-width as the NextStepBanner CTA.
async function startKindergeldOnAkte(page: Page) {
  await page.goto('/lebenslagen/kindergeld', { waitUntil: 'networkidle' });
  const cta = page.getByRole('button', {
    name: 'Automatische Bearbeitung starten',
  });
  await cta.waitFor({ state: 'visible', timeout: 20000 });
  await cta.click();
  await page.waitForURL(/\/vorgaenge\//, { timeout: 20000 });
}

async function driveToEidGate(page: Page) {
  await startKindergeldOnAkte(page);
  await page
    .getByRole('button', { name: /^mit eid bestätigen$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 40000 });
  await page.waitForTimeout(600);
}

test('dossier eID gate (.vd-next) — axe light', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToEidGate(page);
  await runAxe(page, 'eid-gate LIGHT', '.vd-next');
});

test('dossier eID gate (.vd-next) — axe dark', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToEidGate(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await runAxe(page, 'eid-gate DARK', '.vd-next');
});

/* ── Completed dossier: `.vd-next.is-done` + the all-done timeline ───────── */

async function driveToDone(page: Page) {
  await startKindergeldOnAkte(page);
  // Authorise every eID gate via the NextStepBanner CTA → the cascade runs to
  // completion (`.vd-next.is-done`).
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.vd-next.is-done').count()) break;
    const gate = page
      .getByRole('button', { name: /^mit eid bestätigen$/i })
      .first();
    if (await gate.isVisible().catch(() => false)) {
      await gate.click().catch(() => undefined);
      await confirmDialog(page);
    }
    await page.waitForTimeout(2500);
  }
  await page.locator('.vd-next.is-done').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
}

test('completed dossier (.vd-next.is-done) — axe light', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToDone(page);
  await runAxe(page, 'dossier LIGHT');
});

test('completed dossier (.vd-next.is-done) — axe dark', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToDone(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await runAxe(page, 'dossier DARK');
});

test('completed dossier — axe mobile 420 + no main overflow', async ({
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
