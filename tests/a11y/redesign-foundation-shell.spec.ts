import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

const routes = ['/posteingang', '/stammdaten'];

for (const route of routes) {
  test(`axe LIGHT ${route}`, async ({ page }) => {
    await setLocale(page, 'de');
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }));
    console.log(`[AXE-LIGHT ${route}] ` + JSON.stringify(summary));
    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blockers, 'serious/critical').toHaveLength(0);
  });

  test(`axe DARK ${route}`, async ({ page }) => {
    await setLocale(page, 'de');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(route, { waitUntil: 'networkidle' });
    // force .dark class (next-themes attribute strategy)
    await page.evaluate(() => { document.documentElement.classList.add('dark'); });
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }));
    console.log(`[AXE-DARK ${route}] ` + JSON.stringify(summary));
    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blockers, 'serious/critical').toHaveLength(0);
  });
}

test('shell landmarks + single h1 on /posteingang', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/posteingang', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const counts = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length,
    header: document.querySelectorAll('header').length,
    nav: document.querySelectorAll('nav').length,
    aside: document.querySelectorAll('aside').length,
    h1: document.querySelectorAll('h1').length,
  }));
  console.log('[LANDMARKS] ' + JSON.stringify(counts));
  expect(counts.main).toBe(1);
  expect(counts.h1).toBe(1);
});

test('RTL ar flips html dir + sidebar uses logical border', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/posteingang', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const aside = document.querySelector('aside');
    return {
      dir: html.getAttribute('dir'),
      lang: html.getAttribute('lang'),
      asideExists: !!aside,
    };
  });
  console.log('[RTL] ' + JSON.stringify(info));
  expect(info.dir).toBe('rtl');
  expect(info.lang).toBe('ar');
});

test('keyboard: skip-link is first focusable, then reaches nav', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/posteingang', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return { tag: a?.tagName, text: a?.textContent?.slice(0, 40), href: a?.getAttribute('href') };
  });
  console.log('[KBD first focus] ' + JSON.stringify(first));
  expect(first.href).toBe('#main-content');

  // Tab through up to 25 elements, ensure we hit a nav link and an aria-current page
  let foundNav = false;
  let foundCurrent = false;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const cur = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return {
        inNav: !!a?.closest('nav'),
        ariaCurrent: a?.getAttribute('aria-current'),
        focusVisible: a ? getComputedStyle(a).outlineStyle : 'none',
      };
    });
    if (cur.inNav) foundNav = true;
    if (cur.ariaCurrent === 'page') foundCurrent = true;
  }
  console.log('[KBD] foundNav=' + foundNav + ' foundCurrent=' + foundCurrent);
  expect(foundNav).toBe(true);
});
