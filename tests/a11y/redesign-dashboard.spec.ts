import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForDashboard(page: Page) {
  await page
    .locator('section[aria-labelledby="dashboard-heute-zu-tun"]')
    .first()
    .waitFor({ state: 'visible', timeout: 9000 })
    .catch(() => undefined);
  await page.waitForTimeout(1200);
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

test('axe LIGHT dashboard de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await waitForDashboard(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT dashboard de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK dashboard de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await waitForDashboard(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK dashboard de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT dashboard en', async ({ page }) => {
  await setLocale(page, 'en');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await waitForDashboard(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT dashboard en] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT dashboard ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await waitForDashboard(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL dashboard] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT dashboard ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('landmarks single h1 no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await waitForDashboard(page);
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
  console.log('[LANDMARKS dashboard] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    expect(info.levels[i] - info.levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test('top-action list is ol of links with accessible names', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await waitForDashboard(page);
  const info = await page.evaluate(() => {
    const section = document.querySelector(
      'section[aria-labelledby="dashboard-heute-zu-tun"]',
    );
    const ol = section ? section.querySelector('ol') : null;
    const items = ol ? Array.from(ol.querySelectorAll(':scope > li')) : [];
    const links = items.map((li) => {
      const a = li.querySelector('a');
      return {
        hasLink: Boolean(a),
        name: (a?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        href: a?.getAttribute('href'),
      };
    });
    return { hasOl: Boolean(ol), firstChildTag: ol?.children[0]?.tagName, links };
  });
  console.log('[TOP-ACTIONS] ' + JSON.stringify(info));
  expect(info.hasOl).toBe(true);
  expect(info.firstChildTag).toBe('LI');
  expect(info.links.length).toBeGreaterThan(0);
  for (const l of info.links) {
    expect(l.hasLink).toBe(true);
    expect(l.name.length).toBeGreaterThan(3);
    expect(l.href).toBeTruthy();
  }
});

test('four stat tiles are links with accessible names in visual order', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await waitForDashboard(page);
  const tiles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('main a.stat-tile')).map((link) => ({
      name:
        link.getAttribute('aria-label') ||
        (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
      href: link.getAttribute('href'),
    }));
  });
  console.log('[STAT-TILES] ' + JSON.stringify(tiles));
  expect(tiles.length).toBe(4);
  const expectedHrefs = ['/posteingang', '/posteingang', '/termine', '/vorgaenge'];
  expect(tiles.map((t) => t.href)).toEqual(expectedHrefs);
  for (const t of tiles) {
    expect((t.name ?? '').length).toBeGreaterThan(0);
  }

  const hasDatenschutzLink = await page.evaluate(() => {
    const card = document.querySelector('section[aria-labelledby="kontrolle-title"]');
    return Boolean(card?.querySelector('a[href="/datenschutz"]'));
  });
  expect(hasDatenschutzLink).toBe(true);
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const sk = document.querySelector('[role="status"][aria-busy="true"]');
    if (!sk) return { found: false as const };
    const pulse = sk.querySelector('.animate-pulse');
    if (!pulse) return { found: true as const, hasPulseNode: false };
    const cs = getComputedStyle(pulse);
    return {
      found: true as const,
      hasPulseNode: true,
      animationDuration: cs.animationDuration,
    };
  });
  console.log('[REDUCED-MOTION skeleton] ' + JSON.stringify(sampled));
  if (sampled.found && sampled.hasPulseNode) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
