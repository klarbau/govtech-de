import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const PANEL = '[data-testid="meldebestaetigung-credential-panel"]';
const STATUS = '[data-testid="meldebestaetigung-status"]';
const SEEDED_DOC_TITLE = 'Meldebestätigung Berlin-Mitte — Friedrichstraße 100';

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

function summarize(results: AxeResults) {
  return {
    total: results.violations.length,
    bySeverity: {
      critical: results.violations.filter((v) => v.impact === 'critical').length,
      serious: results.violations.filter((v) => v.impact === 'serious').length,
      moderate: results.violations.filter((v) => v.impact === 'moderate').length,
      minor: results.violations.filter((v) => v.impact === 'minor').length,
    },
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.map((n) => n.target).slice(0, 4),
      sampleFailure: v.nodes[0]?.failureSummary,
    })),
  };
}

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForDokumente(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('table, [data-slot="empty-state"]')
      .first()
      .waitFor({ state: 'visible', timeout: 9000 })
      .catch(() => undefined);
    await page.waitForTimeout(700);
    const hasTable = await page.locator('main table').count();
    if (hasTable > 0) return;
    const retry = page
      .getByRole('button', { name: /erneut versuchen|retry|wiederholen/i })
      .first();
    if ((await retry.count()) > 0) {
      await retry.click().catch(() => undefined);
      await page.waitForTimeout(500);
    } else {
      return;
    }
  }
}

async function openCredentialPanel(page: Page) {
  const viewBtn = page
    .getByRole('button', { name: new RegExp(SEEDED_DOC_TITLE + ' ansehen') })
    .first();
  // Cold first load (or the 5% mock-error empty state) can leave the seeded row
  // not-yet-rendered. Re-drive waitForDokumente until the seeded view button is
  // visible (the doc is seed-guaranteed for the default persona).
  let visible = false;
  for (let attempt = 0; attempt < 5 && !visible; attempt++) {
    visible = await viewBtn
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true, () => false);
    if (!visible) await waitForDokumente(page);
  }
  await expect(
    viewBtn,
    'seeded EUDI Meldebestaetigung view button',
  ).toBeVisible({ timeout: 6000 });

  for (let attempt = 0; attempt < 4; attempt++) {
    await viewBtn.click();
    const dialog = page
      .locator('[role="dialog"], [data-slot="dialog-content"]')
      .first();
    await expect(dialog).toBeVisible({ timeout: 4000 });

    const panel = page.locator(PANEL);
    await expect(panel, 'credential panel mounted').toBeVisible({ timeout: 4000 });

    const ready = await page
      .locator(STATUS)
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    if (ready) return { viewBtn, dialog, panel };

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 4000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
  throw new Error('Credential panel never reached the ready (status) state');
}

test('axe LIGHT — credential panel (WCAG 2.1 AA)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const statusText = (await page.locator(STATUS).textContent())?.trim() ?? '';
  expect(statusText.length, 'verified verdict has text').toBeGreaterThan(3);

  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const summary = summarize(results);
  console.log('[AXE-LIGHT once-only] ' + JSON.stringify(summary));

  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blockers, 'serious-or-critical (light)').toHaveLength(0);
});

test('axe DARK — credential panel (WCAG 2.1 AA)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const summary = summarize(results);
  console.log('[AXE-DARK once-only] ' + JSON.stringify(summary));

  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blockers, 'serious-or-critical (dark)').toHaveLength(0);
});

test('colour-contrast clean on emerald card + amber honesty block (both modes)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);
  const light = await new AxeBuilder({ page })
    .withTags(axeTags)
    .include(PANEL)
    .analyze();
  const lightContrast = light.violations.filter((v) => v.id === 'color-contrast');
  console.log(
    '[CONTRAST-LIGHT once-only] ' +
      JSON.stringify(
        lightContrast.map((v) => ({
          nodes: v.nodes.length,
          t: v.nodes.map((n) => n.target),
        })),
      ),
  );
  expect(lightContrast, 'color-contrast within panel (light)').toHaveLength(0);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(200);
  const dark = await new AxeBuilder({ page })
    .withTags(axeTags)
    .include(PANEL)
    .analyze();
  const darkContrast = dark.violations.filter((v) => v.id === 'color-contrast');
  console.log(
    '[CONTRAST-DARK once-only] ' +
      JSON.stringify(
        darkContrast.map((v) => ({
          nodes: v.nodes.length,
          t: v.nodes.map((n) => n.target),
        })),
      ),
  );
  expect(darkContrast, 'color-contrast within panel (dark)').toHaveLength(0);
});

test('status icons decorative (aria-hidden) + paired with text — WCAG 1.4.1', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const info = await page.evaluate((panelSel) => {
    const panel = document.querySelector(panelSel);
    if (!panel) return { found: false as const };
    const svgs = Array.from(panel.querySelectorAll('svg'));
    // Effective AT-hiding: a decorative status icon counts as hidden if the svg
    // itself OR any ancestor inside the panel carries aria-hidden="true". lucide
    // renders the <Home> header svg inside an aria-hidden <span>, so its hiding is
    // inherited, not on the svg node — the correct WCAG 1.4.1 semantics.
    const isEffectivelyHidden = (el) => {
      let node = el;
      while (node && node !== panel.parentElement) {
        if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };
    const allSvgHidden = svgs.every((s) => isEffectivelyHidden(s));
    const checkRows = Array.from(panel.querySelectorAll('ul > li'));
    const everyRowHasText = checkRows.every(
      (li) => (li.textContent ?? '').trim().length > 2,
    );
    const statusEl = panel.querySelector(
      '[data-testid="meldebestaetigung-status"]',
    );
    return {
      found: true as const,
      svgCount: svgs.length,
      allSvgHidden,
      checkRowCount: checkRows.length,
      everyRowHasText,
      statusText: (statusEl?.textContent ?? '').trim(),
    };
  }, PANEL);
  console.log('[1.4.1 once-only] ' + JSON.stringify(info));

  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.svgCount, 'panel has status icons').toBeGreaterThan(0);
    expect(info.allSvgHidden, 'every status icon is aria-hidden').toBe(true);
    expect(info.checkRowCount, 'three check rows').toBeGreaterThanOrEqual(3);
    expect(info.everyRowHasText, 'every check row carries text').toBe(true);
    expect(info.statusText.length, 'status verdict carries text').toBeGreaterThan(
      3,
    );
  }
});

test('heading order: panel h3 title + h4 fields-heading, no skipped levels', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  const { dialog } = await openCredentialPanel(page);

  const info = await page.evaluate((panelSel) => {
    const dlg =
      document.querySelector('[data-slot="dialog-content"]') ||
      document.querySelector('[role="dialog"]');
    const panel = document.querySelector(panelSel);
    if (!dlg || !panel) return { found: false as const };
    const dialogLevels = Array.from(
      dlg.querySelectorAll('h1,h2,h3,h4,h5,h6'),
    ).map((h) => Number(h.tagName.slice(1)));
    const panelTop = panel.querySelector('h3');
    const fieldsHeading = panel.querySelector('h4');
    return {
      found: true as const,
      dialogLevels,
      panelTopTag: panelTop?.tagName ?? null,
      fieldsHeadingTag: fieldsHeading?.tagName ?? null,
    };
  }, PANEL);
  console.log('[HEADINGS once-only] ' + JSON.stringify(info));

  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.panelTopTag, 'panel title is h3').toBe('H3');
    expect(info.fieldsHeadingTag, 'fields heading is h4').toBe('H4');
    for (let i = 1; i < info.dialogLevels.length; i++) {
      const delta =
        (info.dialogLevels[i] ?? 0) - (info.dialogLevels[i - 1] ?? 0);
      expect(delta, 'heading delta at index ' + i).toBeLessThanOrEqual(1);
    }
  }

  const dlgAxe = await new AxeBuilder({ page })
    .withTags(axeTags)
    .include('[role="dialog"], [data-slot="dialog-content"]')
    .analyze();
  const headingOrder = dlgAxe.violations.find((v) => v.id === 'heading-order');
  console.log(
    '[HEADING-ORDER axe once-only] ' +
      JSON.stringify(
        headingOrder ? headingOrder.nodes.map((n) => n.target) : 'none',
      ),
  );
  expect(headingOrder, 'no heading-order violation').toBeUndefined();
  expect(dialog).toBeTruthy();
});

test('aria-live polite + aria-busy on load region; list semantics on rows', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const info = await page.evaluate((panelSel) => {
    const panel = document.querySelector(panelSel);
    if (!panel) return { found: false as const };
    const live = panel.querySelector('[aria-live]');
    const checkList = panel.querySelector('ul');
    const checkItems = checkList
      ? Array.from(checkList.children).filter((c) => c.tagName === 'LI').length
      : 0;
    const fieldsDl = panel.querySelector(
      '[data-testid="meldebestaetigung-fields"] dl',
    );
    return {
      found: true as const,
      liveValue: live?.getAttribute('aria-live') ?? null,
      ariaBusyPresent: live?.hasAttribute('aria-busy') ?? false,
      ariaBusyValue: live?.getAttribute('aria-busy') ?? null,
      checkListIsUl: checkList?.tagName === 'UL',
      checkItems,
      fieldsIsDl: fieldsDl?.tagName === 'DL',
    };
  }, PANEL);
  console.log('[LIVE+LIST once-only] ' + JSON.stringify(info));

  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.liveValue, 'aria-live=polite present').toBe('polite');
    expect(
      info.ariaBusyPresent,
      'aria-busy attribute present on live region',
    ).toBe(true);
    expect(info.ariaBusyValue, 'aria-busy false once ready').toBe('false');
    expect(info.checkListIsUl, 'check rows in a <ul>').toBe(true);
    expect(info.checkItems, 'three <li> check rows').toBeGreaterThanOrEqual(3);
    expect(info.fieldsIsDl, 'disclosed fields in a <dl>').toBe(true);
  }
});
