import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * a11y + interactive verification for the funktionale Lebenslagen feature.
 * Run via playwright.vorg.config.ts against the worktree's :3100 prod build.
 */

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
function summarize(results: AxeResults) {
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target,
  }));
}
async function runAxe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  console.log(`[AXE ${label}] ` + JSON.stringify(summarize(results)));
  expect(blockers, `serious-or-critical: ${label}`).toHaveLength(0);
}

async function gotoDetail(page: Page, slug: string) {
  await page.goto(`/lebenslagen/${slug}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(600);
}

// ── axe: detail pages (light / dark / mobile) ───────────────────────────────
const DETAIL_SLUGS = [
  'aufenthalt-verlaengerung',
  'kindergeld',
  'geburt',
  'reisepass',
  'bafoeg',
  'pflegegrad',
  'wohngeld',
];

for (const slug of DETAIL_SLUGS) {
  test(`axe LIGHT detail ${slug} de`, async ({ page }) => {
    await setLocale(page, 'de');
    await gotoDetail(page, slug);
    await runAxe(page, `LIGHT detail ${slug}`);
  });
}

test('axe DARK detail aufenthalt de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/lebenslagen/aufenthalt-verlaengerung', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(600);
  await runAxe(page, 'DARK detail aufenthalt');
});

test('axe DARK detail kindergeld de (antragslos band)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/lebenslagen/kindergeld', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(600);
  await expect(page.getByText('Kein Antrag nötig').first()).toBeVisible();
  await runAxe(page, 'DARK detail kindergeld');
});

test('axe MOBILE 420 detail pflegegrad de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 420, height: 900 });
  await gotoDetail(page, 'pflegegrad');
  // Scope to MY content (<main>). The green redesign's top-nav shell
  // (.landing-header-actions) overflows ~44px at 420 on EVERY page — pre-existing
  // brandbook-shell debt, not this feature — so assert no <main> element overflows.
  const mainOverflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    let max = 0;
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) max = Math.max(max, Math.round(r.right - vw));
    }
    return max;
  });
  console.log('[MAIN OVERFLOW pflegegrad 420] ' + mainOverflow);
  expect(mainOverflow, 'no <main> horizontal overflow @420').toBeLessThanOrEqual(1);
  await runAxe(page, 'MOBILE detail pflegegrad');
});

// ── axe: antrag form ────────────────────────────────────────────────────────
test('axe LIGHT antrag aufenthalt de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/lebenslagen/aufenthalt-verlaengerung/antrag', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Mit eID bestätigen & absenden/i }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await runAxe(page, 'LIGHT antrag aufenthalt');
});

test('axe DARK antrag wohngeld de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/lebenslagen/wohngeld/antrag', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByRole('button', { name: /Mit eID bestätigen & absenden/i }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await runAxe(page, 'DARK antrag wohngeld');
});

// ── structure: landmarks + Once-Only prefill provenance ─────────────────────
test('detail has single main + single h1 + register provenance chips', async ({ page }) => {
  await setLocale(page, 'de');
  await gotoDetail(page, 'aufenthalt-verlaengerung');
  const info = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length,
    h1: document.querySelectorAll('main h1').length,
  }));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  // antrag form prefills from Stammdaten and shows provenance chips
  await page.goto('/lebenslagen/aufenthalt-verlaengerung/antrag', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Mit eID bestätigen & absenden/i }).waitFor({ timeout: 15000 });
  const chips = await page.locator('.ll-prefill-chip').count();
  console.log('[PREFILL CHIPS aufenthalt] ' + chips);
  expect(chips, 'prefill provenance chips present').toBeGreaterThan(0);
  // at least one input pre-filled from the persona (Once-Only)
  const filled = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('form input')) as HTMLInputElement[];
    return inputs.filter((i) => i.value && i.value.trim().length > 0).length;
  });
  console.log('[PREFILLED INPUTS aufenthalt] ' + filled);
  expect(filled, 'at least one Once-Only prefilled input').toBeGreaterThan(0);
});

test('detail RTL ar', async ({ page }) => {
  await setLocale(page, 'ar');
  await gotoDetail(page, 'kindergeld');
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL kindergeld] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
});

// ── eID dialog focus containment (real Tab sweep) ───────────────────────────
// Mirrors the project's modal-inert-containment methodology: a BODY tick is the
// transient base-ui FocusGuard wrap (acceptable); the real defects are reaching
// the skip-link or any interactive control OUTSIDE the dialog (WCAG 2.4.3).
test('eID confirm dialog contains focus (no skip-link / real outside control)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/lebenslagen/aufenthalt-verlaengerung/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', { name: /Mit eID bestätigen & absenden/i });
  await submit.waitFor({ timeout: 15000 });
  await submit.click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 8000 });
  const visited: Array<{ tag: string; body: boolean; skip: boolean; inDlg: boolean; devPortal: boolean }> = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    visited.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return { tag: 'NONE', body: true, skip: false, inDlg: false, devPortal: false };
        const tag = el.tagName;
        const dlg = document.querySelector('[role=dialog],[role=alertdialog]');
        return {
          tag,
          body: tag === 'BODY' || el === document.documentElement,
          skip: tag === 'A' && (el.getAttribute('href') ?? '').startsWith('#'),
          inDlg: dlg ? dlg.contains(el) : false,
          devPortal: tag.includes('-PORTAL') || tag.startsWith('NEXTJS-'),
        };
      }),
    );
  }
  console.log('[EID TRAP sweep] ' + JSON.stringify(visited.map((v) => v.tag)));
  expect(visited.filter((v) => v.skip), 'focus never reaches the skip-link').toEqual([]);
  const realOutside = visited.filter((v) => !v.inDlg && !v.body && !v.devPortal && v.tag !== 'NONE');
  expect(realOutside, 'focus never lands on a real control outside the dialog').toEqual([]);
});

// ── interactive: antragslos kindergeld end-to-end ──────────────────────────
async function confirmDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await dialog.getByRole('button', { name: /bestätigen/i }).first().click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
}

async function drainCascade(page: Page) {
  for (let i = 0; i < 12; i++) {
    const done = await page
      .getByText(/Erledigt — Ihre Nachweise|Bearbeitung abgeschlossen/)
      .first()
      .isVisible()
      .catch(() => false);
    if (done) return;
    const inline = page.getByRole('button', { name: 'Mit eID bestätigen' }).first();
    const hasInline = await inline.isVisible().catch(() => false);
    if (hasInline) {
      await inline.click();
      await confirmDialog(page);
    }
    await page.waitForTimeout(3000);
  }
}

test('interactive: kindergeld antragslos → cascade → abgeschlossen + Aktenzeichen', async ({ page }) => {
  test.setTimeout(120_000);
  await setLocale(page, 'de');
  await gotoDetail(page, 'kindergeld');
  await page.locator(':is(a,button)', { hasText: 'Automatische Bearbeitung ansehen' }).first().click();
  await page.waitForURL(/\/lebenslagen\/kindergeld\/cascade/, { timeout: 15000 });
  await drainCascade(page);
  await expect(
    page.getByText(/Erledigt — Ihre Nachweise|Bearbeitung abgeschlossen/).first(),
    'cascade completed',
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Aktenzeichen').first(), 'Aktenzeichen shown').toBeVisible();
});

// ── interactive: aufenthalt antrag → eID submit → cascade → done ────────────
async function fillRequiredEmpty(page: Page) {
  const inputs = page.locator('form input');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const type = (await el.getAttribute('type')) ?? 'text';
    if (type === 'checkbox') {
      const req = await el.evaluate((e: HTMLInputElement) => e.required || e.getAttribute('aria-required') === 'true');
      if (req && !(await el.isChecked())) await el.check().catch(() => undefined);
      continue;
    }
    const val = await el.inputValue().catch(() => '');
    const req = await el.evaluate((e: HTMLInputElement) => e.required || e.getAttribute('aria-required') === 'true');
    if (req && !val) {
      if (type === 'date') await el.fill('2027-01-01').catch(() => undefined);
      else await el.fill('Testangabe').catch(() => undefined);
    }
  }
}

test('interactive: aufenthalt antrag → eID absenden → cascade drains → abgeschlossen', async ({ page }) => {
  test.setTimeout(120_000);
  await setLocale(page, 'de');
  await page.goto('/lebenslagen/aufenthalt-verlaengerung/antrag', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', { name: /Mit eID bestätigen & absenden/i });
  await submit.waitFor({ timeout: 15000 });
  await fillRequiredEmpty(page);
  await submit.click();
  await confirmDialog(page);
  await page.waitForURL(/\/cascade/, { timeout: 20000 });
  await drainCascade(page);
  await expect(
    page.getByText(/Erledigt — Ihre Nachweise|Bearbeitung abgeschlossen/).first(),
    'cascade completed',
  ).toBeVisible({ timeout: 30000 });
});

// ── axe DARK on the completed cascade (green completion card + gate chips) ───
test('axe DARK kindergeld cascade completion', async ({ page }) => {
  test.setTimeout(120_000);
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/lebenslagen/kindergeld', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('main h1').first().waitFor({ timeout: 15000 });
  await page.locator(':is(a,button)', { hasText: 'Automatische Bearbeitung ansehen' }).first().click();
  await page.waitForURL(/\/lebenslagen\/kindergeld\/cascade/, { timeout: 15000 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await drainCascade(page);
  await expect(
    page.getByText(/Erledigt — Ihre Nachweise|Bearbeitung abgeschlossen/).first(),
  ).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await runAxe(page, 'DARK kindergeld cascade completion');
});
