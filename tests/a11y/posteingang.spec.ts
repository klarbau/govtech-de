import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test.describe('Posteingang a11y — axe-core (WCAG 2.1 AA)', () => {
  test('axe scan: inbox /posteingang', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
    }));
    // eslint-disable-next-line no-console
    console.log('[A11Y posteingang-inbox-summary] ' + JSON.stringify(summary));

    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blockers, 'serious/critical violations').toHaveLength(0);
  });

  test('axe scan: letter reader /posteingang/[id]', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Focus the link and press Enter — keyboard activation works because focus follows the <a>.
    const firstLink = page.locator('a[href^="/posteingang/"]').first();
    await firstLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/posteingang\/[^/?]+$/, { timeout: 10_000 });
    await page.waitForTimeout(3000);

    const h1Count = await page.locator('h1').count();
    expect(h1Count, 'reader page rendered an h1').toBeGreaterThan(0);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      target: v.nodes[0]?.target,
    }));
    // eslint-disable-next-line no-console
    console.log('[A11Y posteingang-reader-summary] ' + JSON.stringify(summary));

    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    if (blockers.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[BLOCKERS reader] ' + JSON.stringify(blockers.map((b) => ({
        id: b.id,
        impact: b.impact,
        nodes: b.nodes.map((n) => ({ html: n.html.slice(0, 240), target: n.target })),
      })), null, 2));
    }
    expect(blockers, 'serious/critical violations').toHaveLength(0);
  });
});

test.describe('Posteingang RTL', () => {
  test('AR locale flips html dir to rtl on /posteingang', async ({ page }) => {
    await setLocaleCookie(page, 'ar');
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    const dir = await page.locator('html').getAttribute('dir');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('ar');
    expect(dir).toBe('rtl');
  });
});

test.describe('Posteingang ReplySheet focus-trap', () => {
  test.skip(
    !process.env.NEXT_PUBLIC_RELIABLE,
    'requires NEXT_PUBLIC_RELIABLE=1 (warm-up + reliable seed)',
  );

  test('Tab 0..30 keeps activeElement inside [data-slot=sheet-content]', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'de');
    // Warm the client store first. A cold deep-link to a letter detail can render
    // the empty-seeded inbox before localStorage seeds, so the reply CTA never
    // mounts (a test-only hydration race — a real user navigates from a warmed
    // inbox). Mirror the reliable warm-up the other Posteingang specs use, then
    // wait for the CTA explicitly instead of a fixed timeout + bare click.
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page
      .locator('a[href^="/posteingang/letter-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.goto(
      '/posteingang/letter-anna-standesamt-eheschliessung-termin',
      { waitUntil: 'networkidle' },
    );

    // Open the ReplySheet via the StickyFristAction reply-button.
    const replyButton = page.getByRole('button', {
      name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
    });
    await replyButton.first().waitFor({ state: 'visible', timeout: 20_000 });
    await replyButton.first().click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.waitFor({ state: 'visible', timeout: 10_000 });

    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const insideSheet = await page.evaluate(() => {
        const sheetEl = document.querySelector(
          '[data-slot="sheet-content"]',
        );
        const active = document.activeElement as HTMLElement | null;
        if (!sheetEl || !active) return false;
        return sheetEl.contains(active) || sheetEl === active;
      });
      expect(
        insideSheet,
        `Tab #${i + 1} escaped the ReplySheet focus-trap`,
      ).toBe(true);
    }
  });
});
