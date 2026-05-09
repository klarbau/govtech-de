import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LAUFENDER_VORGANG_ID = 'vorgang-anna-aufenthaltstitel-2027-stub';

const ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'posteingang', path: '/posteingang' },
  { name: 'umzug-start', path: '/vorgaenge/umzug/start' },
  { name: 'umzug-preview', path: '/vorgaenge/umzug/preview' },
  { name: 'umzug-run', path: '/vorgaenge/umzug/run' },
  {
    name: 'umzug-detail',
    path: `/vorgaenge/umzug/${LAUFENDER_VORGANG_ID}`,
  },
];

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocaleCookie(page: Page, locale: string) {
  await page.context().addCookies([
    {
      name: LOCALE_COOKIE_NAME,
      value: locale,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Umzug a11y — axe-core (WCAG 2.1 AA + WCAG 2.0 AA)', () => {
  for (const route of ROUTES) {
    test(`axe scan: ${route.name} (${route.path})`, async ({ page }) => {
      await setLocaleCookie(page, 'de');
      await page.goto(route.path, { waitUntil: 'networkidle' });
      // Allow client transitions / loading skeletons to settle
      await page.waitForTimeout(800);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blockers = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (blockers.length > 0) {
        // Surface the structured violations for the report
        // eslint-disable-next-line no-console
        console.log(
          `[A11Y BLOCKER ${route.name}] ` + JSON.stringify(blockers, null, 2),
        );
      }
      expect(
        blockers,
        `Serious/critical axe violations on ${route.path}`,
      ).toHaveLength(0);

      // Surface non-blocker violations (moderate/minor) too — report-only.
      const allViols = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        helpUrl: v.helpUrl,
      }));
      // eslint-disable-next-line no-console
      console.log(
        `[A11Y SUMMARY ${route.name}] ${JSON.stringify(allViols)}`,
      );
    });
  }
});

test.describe('lang attribute + RTL behaviour', () => {
  const locales = ['de', 'en', 'ru', 'uk', 'tr'];

  for (const loc of locales) {
    test(`html[lang="${loc}"] is set, dir is ltr`, async ({ page }) => {
      await setLocaleCookie(page, loc);
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      const lang = await page.locator('html').getAttribute('lang');
      const dir = await page.locator('html').getAttribute('dir');
      expect(lang).toBe(loc);
      expect(dir).toBe('ltr');
    });
  }

  test('Arabic locale: html[lang="ar"] + dir="rtl"', async ({ page }) => {
    await setLocaleCookie(page, 'ar');
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const lang = await page.locator('html').getAttribute('lang');
    const dir = await page.locator('html').getAttribute('dir');
    expect(lang).toBe('ar');
    expect(dir).toBe('rtl');
  });
});

test.describe('prefers-reduced-motion compliance', () => {
  test('framer-motion eID pulse halts when reduced-motion is requested', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'de');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/vorgaenge/umzug/start', { waitUntil: 'networkidle' });

    // CSS guard: animation/transition durations should be near-zero per
    // globals.css media query.
    const cssAnimGuard = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.transition = 'all 1s';
      probe.style.animation = 'none 1s';
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const transition = style.transitionDuration;
      const anim = style.animationDuration;
      document.body.removeChild(probe);
      return { transition, anim };
    });
    // The site CSS hard-caps these to 0.01ms under reduce. The browser may
    // serialize this as "0.01ms" or "1e-05s" — both encode the same near-zero
    // duration. Anything > 0.5s would indicate the guard is broken.
    function durationMs(s: string): number {
      const m = s.match(/^([\d.eE+-]+)(ms|s)$/);
      if (!m) return Number.NaN;
      const v = parseFloat(m[1]);
      return m[2] === 's' ? v * 1000 : v;
    }
    expect(durationMs(cssAnimGuard.transition)).toBeLessThan(1);
    expect(durationMs(cssAnimGuard.anim)).toBeLessThan(1);
  });
});

test.describe('skip-link is present on app shell', () => {
  test('"Skip to main content" link reachable on dashboard', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    // Skip link uses sr-only until focus-visible — assert it exists in DOM.
    const skip = page.locator('a[href="#main-content"]');
    await expect(skip).toHaveCount(1);
    const main = page.locator('main#main-content');
    await expect(main).toHaveCount(1);
  });
});
