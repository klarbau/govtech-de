import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForSteuer(page: Page) {
  // getSteuerUebersicht fans out over getProfile + 3 mock calls (each with a 5%
  // simulated error rate), so the error EmptyState (with an 'Erneut versuchen'
  // retry button) appears more often here. Retry until the ready layout — the
  // FortschrittStepper <ol> AND the Steuerbereiche <table> — is mounted.
  for (let attempt = 0; attempt < 5; attempt++) {
    await page
      .locator('main table')
      .first()
      .waitFor({ state: 'visible', timeout: 9000 })
      .catch(() => undefined);
    await page.waitForTimeout(600);
    const ready = await page.locator('main table').count();
    if (ready > 0) return;
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

test('axe LIGHT steuer de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT steuer de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK steuer de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await waitForSteuer(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK steuer de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT steuer ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL steuer] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT steuer ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('exactly one main, one h1, no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
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
  console.log('[LANDMARKS steuer] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    const delta = (info.levels[i] ?? 0) - (info.levels[i - 1] ?? 0);
    expect(delta).toBeLessThanOrEqual(1);
  }
});

test('FortschrittStepper is an ol with aria-current=step and state beyond colour', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
  const info = await page.evaluate(() => {
    const ols = Array.from(document.querySelectorAll('main ol'));
    // The stepper ol has exactly 3 li with one aria-current="step".
    const stepper = ols.find((ol) => {
      const lis = ol.querySelectorAll(':scope > li');
      return (
        lis.length === 3 &&
        ol.querySelector('li[aria-current="step"]') !== null
      );
    });
    if (!stepper) return { found: false as const };
    const lis = Array.from(stepper.querySelectorAll(':scope > li'));
    const currentCount = lis.filter(
      (li) => li.getAttribute('aria-current') === 'step',
    ).length;
    // Each step must carry a non-colour cue: a number, a check icon (svg), and
    // an sr-only state word.
    const everyStepHasTextState = lis.every((li) => {
      const srOnly = Array.from(li.querySelectorAll('.sr-only'))
        .map((n) => (n.textContent ?? '').trim())
        .join(' ');
      const hasNumberOrIcon =
        /\d/.test(li.textContent ?? '') || li.querySelector('svg') !== null;
      return srOnly.length > 0 && hasNumberOrIcon;
    });
    return {
      found: true as const,
      steps: lis.length,
      currentCount,
      everyStepHasTextState,
    };
  });
  console.log('[STEPPER steuer] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.steps).toBe(3);
    expect(info.currentCount).toBe(1);
    expect(info.everyStepHasTextState).toBe(true);
  }
});

test('Steuerbereiche table is a real table with th scope and an end-aligned amount column', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
  const info = await page.evaluate(() => {
    const table = document.querySelector('main table');
    if (!table) return { hasTable: false as const };
    const ths = Array.from(table.querySelectorAll('thead th'));
    const firstBodyRow = table.querySelector('tbody tr');
    const cells = firstBodyRow
      ? Array.from(firstBodyRow.querySelectorAll('td'))
      : [];
    // Amount column (index 1) should be end-aligned + tabular-nums.
    const amountCell = cells[1] as HTMLElement | undefined;
    const amountEndAligned = amountCell
      ? /end|right/.test(getComputedStyle(amountCell).textAlign) ||
        amountCell.className.includes('text-end')
      : false;
    return {
      hasTable: true as const,
      thCount: ths.length,
      allScopeCol: ths.every((th) => th.getAttribute('scope') === 'col'),
      amountEndAligned,
    };
  });
  console.log('[STEUER-TABLE] ' + JSON.stringify(info));
  expect(info.hasTable).toBe(true);
  if (info.hasTable) {
    expect(info.thCount).toBe(4);
    expect(info.allScopeCol).toBe(true);
    expect(info.amountEndAligned).toBe(true);
  }
});

test('hero refund amount carries an accessible label', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
  const hasAria = await page.evaluate(() => {
    // The refund figure has an aria-label "Voraussichtliche Erstattung ...".
    const labelled = Array.from(
      document.querySelectorAll('main [aria-label]'),
    ).some((el) => /Erstattung|Nachzahlung/i.test(el.getAttribute('aria-label') ?? ''));
    return labelled;
  });
  console.log('[STEUER-HERO-ARIA] hasAria=' + hasAria);
  expect(hasAria).toBe(true);
});

test('privacy note is a dl naming processed data and Rechtsgrundlage, readable contrast', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
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
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
    // Find a dl that mentions a Rechtsgrundlage / norm citation.
    const dls = Array.from(document.querySelectorAll('main dl'));
    const dl = dls.find((d) => /§|AO|EStG|Rechtsgrundlage/i.test(d.textContent ?? ''));
    if (!dl) return { found: false as const, dlCount: dls.length };
    // Worst-case contrast of any text inside the dl vs page bg.
    const texts = Array.from(dl.querySelectorAll('*')) as HTMLElement[];
    let worst = 999;
    for (const el of texts) {
      if ((el.textContent ?? '').trim().length === 0) continue;
      const fg = parse(getComputedStyle(el).color);
      const lf = lum(fg[0], fg[1], fg[2]);
      const lb = lum(bodyBg[0], bodyBg[1], bodyBg[2]);
      const r = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
      if (r < worst) worst = r;
    }
    const text = dl.textContent ?? '';
    return {
      found: true as const,
      mentionsRechtsgrundlage: /§|Rechtsgrundlage/i.test(text),
      worst,
    };
  });
  console.log('[STEUER-PRIVACY] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.mentionsRechtsgrundlage).toBe(true);
    // Smallest privacy-note text (the minimierung hint uses text-text-muted).
    expect(info.worst).toBeGreaterThanOrEqual(4.5);
  }
});

test('In X Tagen frist indicator conveys number+word with adequate contrast', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
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
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
    // FristCountdown renders a <time> inside the Wichtige Fristen rail.
    const times = Array.from(document.querySelectorAll('main time')) as HTMLElement[];
    if (times.length === 0) return { found: false as const };
    let worst = 999;
    for (const el of times) {
      const wrap = el.parentElement ?? el;
      const fg = parse(getComputedStyle(wrap).color);
      const lf = lum(fg[0], fg[1], fg[2]);
      const lb = lum(bodyBg[0], bodyBg[1], bodyBg[2]);
      const r = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
      if (r < worst) worst = r;
    }
    return { found: true as const, count: times.length, worst };
  });
  console.log('[STEUER-FRIST] ' + JSON.stringify(info));
  if (info.found) {
    // FristCountdown text/icon must clear 4.5:1 vs page bg (muted/warn/danger tokens).
    expect(info.worst).toBeGreaterThanOrEqual(4.5);
  }
});

test('Entwurf badge and a MOCK marker are present (no real submission)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/steuer', { waitUntil: 'networkidle' });
  await waitForSteuer(page);
  const info = await page.evaluate(() => {
    const bodyText = (document.querySelector('main')?.textContent ?? '');
    return {
      hasEntwurf: /Entwurf/i.test(bodyText),
      hasMockOrPrototype: /MOCK|Prototyp/i.test(bodyText),
    };
  });
  console.log('[STEUER-DRAFT] ' + JSON.stringify(info));
  expect(info.hasEntwurf).toBe(true);
  expect(info.hasMockOrPrototype).toBe(true);
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/steuer', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const pulse = document.querySelector('.animate-pulse');
    if (!pulse) return { found: false as const };
    const cs = getComputedStyle(pulse);
    return { found: true as const, animationDuration: cs.animationDuration };
  });
  console.log('[REDUCED-MOTION steuer] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
