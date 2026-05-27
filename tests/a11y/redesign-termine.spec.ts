import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForTermine(page: Page) {
  // The mock-backend has a 5% simulated error rate -> TermineView may render an
  // error EmptyState with a 'Erneut versuchen' button (no calendar grid). Retry
  // until the grid (with its roving-tabindex day button) is mounted.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('[role="grid"] button[tabindex="0"]')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 })
      .catch(() => undefined);
    await page.waitForTimeout(600);
    const hasGrid = await page.locator('[role="grid"]').count();
    if (hasGrid > 0) return;
    const retry = page.getByRole('button', { name: /erneut versuchen|retry|wiederholen/i }).first();
    if ((await retry.count()) > 0) {
      await retry.click().catch(() => undefined);
      await page.waitForTimeout(600);
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

test('axe LIGHT termine de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT termine de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK termine de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await waitForTermine(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK termine de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT termine ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL termine] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT termine ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('exactly one main, one h1, no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
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
  console.log('[LANDMARKS termine] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    const delta = (info.levels[i] ?? 0) - (info.levels[i - 1] ?? 0);
    expect(delta).toBeLessThanOrEqual(1);
  }
});

test('MonthCalendar is a grid with gridcells, aria-selected/current on cell, roving tabindex', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { hasGrid: false as const };
    const cells = Array.from(grid.querySelectorAll('[role="gridcell"]'));
    const columnheaders = grid.querySelectorAll('[role="columnheader"]').length;
    const focusableButtons = Array.from(
      grid.querySelectorAll('button[tabindex="0"]'),
    );
    // aria-selected / aria-current live on the gridcell, not the inner button.
    const cellWithCurrent = cells.find(
      (c) => c.getAttribute('aria-current') === 'date',
    );
    return {
      hasGrid: true as const,
      gridLabelled: Boolean(grid.getAttribute('aria-label')),
      cellCount: cells.length,
      columnheaders,
      rovingFocusable: focusableButtons.length,
      hasTodayCell: Boolean(cellWithCurrent),
    };
  });
  console.log('[CALENDAR-GRID termine] ' + JSON.stringify(info));
  expect(info.hasGrid).toBe(true);
  if (info.hasGrid) {
    expect(info.gridLabelled).toBe(true);
    expect(info.cellCount).toBe(42);
    expect(info.columnheaders).toBe(7);
    // Roving tabindex: exactly one focusable day button.
    expect(info.rovingFocusable).toBe(1);
  }
});

test('MonthCalendar keyboard navigation moves focus and selects with Enter', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  // Focus the single roving-tabindex day button.
  const activeDay = page.locator('[role="grid"] button[tabindex="0"]');
  await expect(activeDay).toHaveCount(1);
  await activeDay.focus();
  const startLabel = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? '',
  );
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const afterRight = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? '',
  );
  console.log('[CALENDAR-KBD] start=' + startLabel + ' afterRight=' + afterRight);
  expect(afterRight).not.toBe('');
  expect(afterRight).not.toBe(startLabel);
  // Still exactly one focusable button after move (roving tabindex preserved).
  await expect(page.locator('[role="grid"] button[tabindex="0"]')).toHaveCount(1);
  // Enter toggles selection -> the focused cell becomes aria-selected.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const selectedCount = await page.evaluate(
    () =>
      document.querySelectorAll('[role="gridcell"][aria-selected="true"]').length,
  );
  console.log('[CALENDAR-KBD] selectedCount after Enter = ' + selectedCount);
  expect(selectedCount).toBe(1);
  // ArrowDown / Home / PageDown do not throw and keep one focusable button.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(150);
  await expect(page.locator('[role="grid"] button[tabindex="0"]')).toHaveCount(1);
});

test('out-of-month day text colour meets >= 4.5:1 (prior fix: text-text-muted not /60)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  // Out-of-month days are the trailing/leading days that are NOT primary text.
  // The prior bug used text-text-muted/60 (2.72:1). Now solid text-text-muted.
  const sample = await page.evaluate(() => {
    function srgb(c: number) {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function lum(r: number, g: number, b: number) {
      return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
    }
    function parse(str: string): [number, number, number, number] {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return [255, 255, 255, 1];
      const p = m[1].split(',').map((x) => parseFloat(x.trim()));
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
    }
    function composite(
      fg: [number, number, number, number],
      bg: [number, number, number],
    ): [number, number, number] {
      const a = fg[3];
      return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a)),
      ];
    }
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { found: false as const };
    // Find day buttons whose computed colour differs from the primary text
    // colour — those are out-of-month (muted) days.
    const buttons = Array.from(
      grid.querySelectorAll('[role="gridcell"] button'),
    ) as HTMLElement[];
    // Page background to composite any alpha against.
    const pageBg = parse(getComputedStyle(document.body).backgroundColor);
    const pageBgRgb: [number, number, number] = [pageBg[0], pageBg[1], pageBg[2]];
    let worst = 999;
    let worstColor = '';
    for (const b of buttons) {
      const cs = getComputedStyle(b);
      // Skip selected day (has its own bg) — check plain day text only.
      const fg = parse(cs.color);
      const fgRgb = composite(fg, pageBgRgb);
      const ratio =
        (Math.max(lum(...fgRgb), lum(...pageBgRgb)) + 0.05) /
        (Math.min(lum(...fgRgb), lum(...pageBgRgb)) + 0.05);
      if (ratio < worst) {
        worst = ratio;
        worstColor = cs.color;
      }
    }
    return { found: true as const, worst, worstColor };
  });
  console.log('[CALENDAR-CONTRAST termine] ' + JSON.stringify(sample));
  expect(sample.found).toBe(true);
  if (sample.found) {
    // All day text (incl. out-of-month muted) must clear 4.5:1 vs page bg.
    expect(sample.worst).toBeGreaterThanOrEqual(4.5);
  }
});

test('event-bearing days expose the count in the cell aria-label (text, not colour-only)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { found: false as const };
    const buttons = Array.from(
      grid.querySelectorAll('[role="gridcell"] button'),
    ) as HTMLElement[];
    // Days with an event marker dot (aria-hidden) must mention "Termin" in label.
    const withDot = buttons.filter((b) => {
      const dots = Array.from(b.querySelectorAll('span[aria-hidden="true"]'));
      return dots.some((d) => d.className.includes('rounded-full'));
    });
    const allHaveTextMarker = withDot.every((b) =>
      /Termin/i.test(b.getAttribute('aria-label') ?? ''),
    );
    return {
      found: true as const,
      dotDays: withDot.length,
      allHaveTextMarker,
    };
  });
  console.log('[CALENDAR-MARKER termine] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  if (info.found && info.dotDays > 0) {
    expect(info.allHaveTextMarker).toBe(true);
  }
});

test('filter checkboxes are labelled and the colour dots are decorative (aria-hidden)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    const fieldsets = Array.from(document.querySelectorAll('main fieldset'));
    const filterFs = fieldsets.find((fs) =>
      fs.querySelector('[data-slot="checkbox"]'),
    );
    if (!filterFs) return { found: false as const };
    const labels = Array.from(filterFs.querySelectorAll('label'));
    const checkboxes = filterFs.querySelectorAll(
      '[data-slot="checkbox"]',
    ).length;
    const labelledCount = labels.filter(
      (l) => (l.textContent ?? '').trim().length > 0,
    ).length;
    // Each label has a decorative colour dot marked aria-hidden.
    const dotsHidden = labels.every((l) => {
      const dot = l.querySelector('span.rounded-full');
      return !dot || dot.getAttribute('aria-hidden') === 'true';
    });
    return {
      found: true as const,
      checkboxes,
      labelledCount,
      dotsHidden,
    };
  });
  console.log('[FILTER termine] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.checkboxes).toBe(4);
    expect(info.labelledCount).toBe(4);
    expect(info.dotsHidden).toBe(true);
  }
});

test('Fristen badge text colour meets contrast in light and conveys number+word', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    function srgb(c: number) {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function lum(r: number, g: number, b: number) {
      return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
    }
    function parse(str: string): [number, number, number] {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0];
      const p = m[1].split(',').map((x) => parseFloat(x.trim()));
      return [p[0], p[1], p[2]];
    }
    function ratio(fg: string, bg: string) {
      const f = parse(fg);
      const b = parse(bg);
      const lf = lum(f[0], f[1], f[2]);
      const lb = lum(b[0], b[1], b[2]);
      return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    }
    // The Fristen list lives in the right rail; badges carry "In X Tagen".
    const badges = Array.from(document.querySelectorAll('main [data-slot="badge"]'));
    const fristBadges = badges.filter((b) =>
      /Tag|heute|überfällig/i.test(b.textContent ?? ''),
    ) as HTMLElement[];
    if (fristBadges.length === 0) return { found: false as const };
    let worst = 999;
    let sampleText = '';
    for (const b of fristBadges) {
      const cs = getComputedStyle(b);
      const r = ratio(cs.color, cs.backgroundColor);
      if (r < worst) {
        worst = r;
        sampleText = (b.textContent ?? '').trim();
      }
    }
    const hasNumberOrWord = fristBadges.some((b) =>
      /\d|heute|überfällig/i.test(b.textContent ?? ''),
    );
    return { found: true as const, worst, sampleText, hasNumberOrWord };
  });
  console.log('[FRIST-BADGE termine] ' + JSON.stringify(info));
  if (info.found) {
    expect(info.worst).toBeGreaterThanOrEqual(4.5);
    expect(info.hasNumberOrWord).toBe(true);
  }
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/termine', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const pulse = document.querySelector('.animate-pulse');
    if (!pulse) return { found: false as const };
    const cs = getComputedStyle(pulse);
    return { found: true as const, animationDuration: cs.animationDuration };
  });
  console.log('[REDUCED-MOTION termine] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
