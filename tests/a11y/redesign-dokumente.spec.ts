import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForDokumente(page: Page) {
  // The mock-backend has a 5% simulated error rate; on the error EmptyState a
  // 'Retry' button reloads. Wait for the table (or empty-state), and if the
  // error state shows, click retry until the table renders.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('table, [data-slot="empty-state"]')
      .first()
      .waitFor({ state: 'visible', timeout: 9000 })
      .catch(() => undefined);
    await page.waitForTimeout(700);
    const hasTable = await page.locator('main table').count();
    if (hasTable > 0) return;
    const retry = page.getByRole('button', { name: /erneut versuchen|retry|wiederholen/i }).first();
    if ((await retry.count()) > 0) {
      await retry.click().catch(() => undefined);
      await page.waitForTimeout(500);
    } else {
      return;
    }
  }
}

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

function summarize(results: AxeResults) {
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target,
  }));
}

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  return { results, blockers };
}

test('axe LIGHT dokumente de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT dokumente de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK dokumente de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await waitForDokumente(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK dokumente de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT dokumente ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL dokumente] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT dokumente ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('exactly one main, one h1, no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const info = await page.evaluate(() => {
    const levels = Array.from(
      document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'),
    ).map((h) => Number(h.tagName.slice(1)));
    return {
      main: document.querySelectorAll('main').length,
      h1: document.querySelectorAll('main h1').length,
      levels,
    };
  });
  console.log('[LANDMARKS dokumente] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    const delta = (info.levels[i] ?? 0) - (info.levels[i - 1] ?? 0);
    expect(delta).toBeLessThanOrEqual(1);
  }
});

test('DataTable is a real table with th scope=col and aria-sort on sortable headers', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const info = await page.evaluate(() => {
    const table = document.querySelector('main table');
    if (!table) return { hasTable: false as const };
    const ths = Array.from(table.querySelectorAll('thead th'));
    return {
      hasTable: true as const,
      thCount: ths.length,
      allScopeCol: ths.every((th) => th.getAttribute('scope') === 'col'),
      ariaSorts: ths.map((th) => th.getAttribute('aria-sort')),
      sortableButtons: ths.filter((th) => th.querySelector('button')).length,
    };
  });
  console.log('[DATATABLE dokumente] ' + JSON.stringify(info));
  expect(info.hasTable).toBe(true);
  if (info.hasTable) {
    expect(info.thCount).toBe(5);
    expect(info.allScopeCol).toBe(true);
    const sortable = info.ariaSorts.filter((s) => s !== null);
    expect(sortable.length).toBeGreaterThanOrEqual(1);
    expect(info.sortableButtons).toBeGreaterThanOrEqual(1);
  }
});

test('sortable header is keyboard operable and toggles aria-sort', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const headerButton = page.locator('main thead th button').first();
  await expect(headerButton).toBeVisible();
  await headerButton.focus();
  const focused = await page.evaluate(
    () => document.activeElement?.tagName ?? 'NONE',
  );
  expect(focused).toBe('BUTTON');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const ariaSort = await page.evaluate(() => {
    const th = document.querySelector('main thead th button')?.closest('th');
    return th?.getAttribute('aria-sort') ?? null;
  });
  console.log('[SORT dokumente] dokument aria-sort after Enter = ' + ariaSort);
  expect(ariaSort).toBe('ascending');
});

test('pagination is a labelled nav with aria-current page and live range', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const info = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('main nav'));
    const pag = navs.find((n) => n.querySelector('[aria-current="page"]'));
    if (!pag) return { found: false as const, navCount: navs.length };
    const live = pag.querySelector('[aria-live="polite"]');
    const current = pag.querySelector('[aria-current="page"]');
    return {
      found: true as const,
      hasLabel: Boolean(pag.getAttribute('aria-label')),
      hasLiveRange: Boolean(live && (live.textContent ?? '').trim().length > 0),
      currentText: (current?.textContent ?? '').trim(),
    };
  });
  console.log('[PAGINATION dokumente] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.hasLabel).toBe(true);
    expect(info.hasLiveRange).toBe(true);
    expect(info.currentText).toBe('1');
  }
});

test('pagination page buttons meet 44px minimum target size', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const current = page.locator('main nav [aria-current="page"]');
  await expect(current).toBeVisible();
  const box = await current.boundingBox();
  console.log('[PAGINATION TARGET] ' + JSON.stringify(box));
  expect(box).not.toBeNull();
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(43.5);
    expect(box.height).toBeGreaterThanOrEqual(43.5);
  }
});

test('row action icon buttons are 44px with individual aria-labels incl. doc name', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const firstRow = page.locator('main tbody tr').first();
  await expect(firstRow).toBeVisible();
  const viewBtn = firstRow.getByRole('button').first();
  const label = await viewBtn.getAttribute('aria-label');
  const box = await viewBtn.boundingBox();
  console.log('[ROW-ACTION] label=' + label + ' box=' + JSON.stringify(box));
  expect(Boolean(label && label.length > 4)).toBe(true);
  expect(box).not.toBeNull();
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(43.5);
    expect(box.height).toBeGreaterThanOrEqual(43.5);
  }
});

test('preview dialog traps focus, exposes MOCK watermark, restores focus on close', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const firstRow = page.locator('main tbody tr').first();
  const viewBtn = firstRow.getByRole('button').first();
  await viewBtn.focus();
  await viewBtn.click();

  const dialog = page.locator('[role="dialog"], [data-slot="dialog-content"]');
  await expect(dialog.first()).toBeVisible({ timeout: 4000 });

  const watermark = await page.evaluate(() => {
    const note = document.querySelector(
      '[data-slot="dialog-content"] [role="note"], [role="dialog"] [role="note"]',
    );
    if (!note) return { found: false as const };
    let el: Element | null = note;
    let hidden = false;
    while (el) {
      if (el.getAttribute('aria-hidden') === 'true') hidden = true;
      el = el.parentElement;
    }
    const text = (note.textContent ?? '').toUpperCase();
    return { found: true as const, hidden, hasMockText: text.includes('MOCK') };
  });
  console.log('[PREVIEW WATERMARK] ' + JSON.stringify(watermark));
  expect(watermark.found).toBe(true);
  if (watermark.found) {
    expect(watermark.hidden).toBe(false);
    expect(watermark.hasMockText).toBe(true);
  }

  const focusInside = await page.evaluate(() => {
    const dlg =
      document.querySelector('[data-slot="dialog-content"]') ||
      document.querySelector('[role="dialog"]');
    return dlg ? dlg.contains(document.activeElement) : false;
  });
  expect(focusInside).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog.first()).toBeHidden({ timeout: 4000 });
  await page.waitForTimeout(200);
  const restored = await viewBtn.evaluate((el) => el === document.activeElement);
  console.log('[PREVIEW FOCUS-RESTORE] restored=' + restored);
  expect(restored).toBe(true);
});

test('sort radios and status checkboxes have accessible semantics in filter popover', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'networkidle' });
  await waitForDokumente(page);
  const filterTrigger = page.getByRole('button', { name: /Filter/i }).first();
  await expect(filterTrigger).toBeVisible();
  await filterTrigger.click();
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const radiogroup = document.querySelector('[role="radiogroup"]');
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    const checkboxes = Array.from(
      document.querySelectorAll('[role="checkbox"], input[type="checkbox"]'),
    );
    const radioLabelled = radios.every((r) => {
      const id = r.getAttribute('id');
      return id ? Boolean(document.querySelector('label[for="' + id + '"]')) : false;
    });
    return {
      hasRadiogroup: Boolean(radiogroup),
      radioCount: radios.length,
      radioLabelled,
      checkboxCount: checkboxes.length,
    };
  });
  console.log('[FILTER-POPOVER dokumente] ' + JSON.stringify(info));
  expect(info.hasRadiogroup).toBe(true);
  expect(info.radioCount).toBeGreaterThanOrEqual(3);
  expect(info.radioLabelled).toBe(true);
  expect(info.checkboxCount).toBeGreaterThanOrEqual(4);
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dokumente', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const pulse = document.querySelector('.animate-pulse');
    if (!pulse) return { found: false as const };
    const cs = getComputedStyle(pulse);
    return { found: true as const, animationDuration: cs.animationDuration };
  });
  console.log('[REDUCED-MOTION dokumente] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
