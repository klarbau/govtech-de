import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const ROUTE = '/datenschutz';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
  // Reliable mode: disable the 5% random mock-backend error so the
  // data-dependent functional assertions never race a rejected load().
  await page.addInitScript(() => {
    try {
      const meta = window.localStorage.getItem('govtech-de:v1:meta');
      const parsed = meta ? JSON.parse(meta) : { version: 1 };
      parsed.reliable_mode = true;
      window.localStorage.setItem('govtech-de:v1:meta', JSON.stringify(parsed));
    } catch {
      // ignore
    }
  });
}

async function waitForReady(page: Page) {
  // The consent rail (4 switches) is the last thing to hydrate; wait for it
  // hard so the functional assertions never race the client mount.
  await page
    .getByRole('switch')
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(600);
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
async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  return { results, blockers };
}

test('axe LIGHT datenschutz de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT datenschutz de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK datenschutz de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await waitForReady(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK datenschutz de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT datenschutz ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL datenschutz] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT datenschutz ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('exactly one main and one h1', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const info = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length,
    h1: document.querySelectorAll('h1').length,
    mainH1: document.querySelectorAll('main h1').length,
  }));
  console.log('[LANDMARKS datenschutz] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.mainH1).toBe(1);
});

test('no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const levels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4'))
      .filter((h) => !h.classList.contains('sr-only'))
      .map((h) => Number(h.tagName.slice(1))),
  );
  console.log('[HEADINGS datenschutz] ' + JSON.stringify(levels));
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test('consent switches expose role=switch + aria-checked + accessible name', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const switches = page.getByRole('switch');
  const count = await switches.count();
  console.log('[SWITCH] count = ' + count);
  expect(count).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    const sw = switches.nth(i);
    const name = await sw.getAttribute('aria-label');
    const checked = await sw.getAttribute('aria-checked');
    console.log('[SWITCH ' + i + '] name=' + name + ' aria-checked=' + checked);
    expect((name ?? '').length).toBeGreaterThan(3);
    expect(['true', 'false']).toContain(checked);
  }
});

test('toggling a consent switch flips aria-checked, announces, and emits a timeline entry', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);

  const liveRegion = page.locator('[aria-live="polite"].sr-only').first();
  const timeline = page
    .getByRole('heading', { name: /Letzte Aktivit/i })
    .locator('xpath=following::ul[1]');
  const topBefore = ((await timeline.locator(':scope > li').first().textContent()) ?? '').trim();
  console.log('[TIMELINE] top before = ' + topBefore.slice(0, 60));

  const first = page.getByRole('switch').first();
  const wasChecked = (await first.getAttribute('aria-checked')) === 'true';
  await first.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(1600);

  const nowChecked = (await first.getAttribute('aria-checked')) === 'true';
  console.log('[SWITCH toggle] was=' + wasChecked + ' now=' + nowChecked);
  const announce = ((await liveRegion.textContent()) ?? '').trim();
  console.log('[LIVE announce] ' + announce);

  const topAfter = ((await timeline.locator(':scope > li').first().textContent()) ?? '').trim();
  console.log('[TIMELINE] top after = ' + topAfter.slice(0, 60));

  // Reliable mode is on, so the toggle must succeed: aria-checked flips, the
  // polite live region announces the new state, and the freshly emitted
  // 'Einwilligung geändert' app-activity entry surfaces at the TOP of the
  // timeline (the list is slice-capped at 5, so assert the head changed, not a
  // raw count increment).
  expect(nowChecked).not.toBe(wasChecked);
  expect(announce.length).toBeGreaterThan(0);
  expect(/Einwilligung geändert/i.test(topAfter)).toBe(true);
});

test('dismissible 2027-Vision banner moves focus to a heading', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);

  const banner = page.locator('[role="note"]:has(button)').first();
  if ((await banner.count()) === 0) {
    test.skip(true, 'vision banner already dismissed');
    return;
  }
  const dismiss = banner.getByRole('button').first();
  await dismiss.scrollIntoViewIfNeeded();
  await dismiss.click();
  await page.waitForTimeout(300);
  const focused = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return { tag: a?.tagName, text: a?.textContent?.slice(0, 40) };
  });
  console.log('[BANNER dismiss focus] ' + JSON.stringify(focused));
  expect(focused.tag).toBe('H2');
  expect((focused.text ?? '').length).toBeGreaterThan(0);
});

test('Datenquellen table is a real table with th[scope]; timeline is a ul', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const info = await page.evaluate(() => {
    const table = document.querySelector('main table');
    const ths = table ? Array.from(table.querySelectorAll('th')) : [];
    const timelineHeading = Array.from(document.querySelectorAll('main h2')).find(
      (h) => /Letzte Aktivit/i.test(h.textContent ?? ''),
    );
    let timelineIsUl = false;
    if (timelineHeading) {
      const card = timelineHeading.closest('div, section, article') ?? document;
      timelineIsUl = Boolean(card.querySelector('ul > li'));
    }
    return {
      hasTable: Boolean(table),
      thCount: ths.length,
      thAllScoped: ths.every((t) => t.hasAttribute('scope')),
      timelineIsUl,
    };
  });
  console.log('[TABLE+TIMELINE] ' + JSON.stringify(info));
  expect(info.hasTable).toBe(true);
  expect(info.thCount).toBeGreaterThanOrEqual(3);
  expect(info.thAllScoped).toBe(true);
  expect(info.timelineIsUl).toBe(true);
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const sk = document.querySelector('[aria-busy="true"].animate-pulse');
    if (!sk) return { found: false as const };
    return { found: true as const, animationDuration: getComputedStyle(sk).animationDuration };
  });
  console.log('[REDUCED-MOTION datenschutz] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
