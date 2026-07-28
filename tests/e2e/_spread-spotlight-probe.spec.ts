import { test, expect, type Page } from '@playwright/test';

const NS = 'govtech-de:v1:';
const PERSONA = 'anna-petrov';

async function boot(page: Page) {
  await page.context().addCookies([
    { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, persona]) => {
      try {
        window.localStorage.setItem(
          ns + 'meta',
          JSON.stringify({
            version: 1,
            active_persona_id: persona,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
      } catch {
        /* non-browser */
      }
    },
    [NS, PERSONA],
  );
}

test('spread spotlight: pager click at clamp + wheel advance', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/posteingang', { waitUntil: 'networkidle' });

  const pages = page.locator('.lg-reader-pages');
  await pages.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(600);

  // 1) Brief → Verstehen: echter Scroll, Polosa fährt an den Anschlag.
  await page.locator('.post-doc-tab', { hasText: 'Verstehen' }).click();
  await page.waitForTimeout(1600);
  const rest = await page.evaluate(() => {
    const el = document.querySelector('.lg-reader-pages') as HTMLElement;
    return el.scrollWidth - el.clientWidth - el.scrollLeft;
  });
  expect(rest).toBeLessThan(12);

  // 2) Verstehen → Handeln am Anschlag: Spotlight-Choreo statt totem Klick.
  await page.locator('.post-doc-tab', { hasText: 'Handeln' }).click();
  await expect(
    page.locator('.lg-reader-page[data-page="handeln"][data-spotlight]'),
  ).toBeAttached({ timeout: 1500 });
  await expect(
    page.locator('.post-doc-tab[aria-current="true"]', { hasText: 'Handeln' }),
  ).toBeVisible();

  // 3) Wheel-Swipe am Anschlag schaltet die aktive Seite weiter + Spotlight.
  await page.waitForTimeout(900);
  await page.locator('.post-doc-tab', { hasText: 'Verstehen' }).click();
  await expect(
    page.locator('.lg-reader-page[data-page="verstehen"][data-spotlight]'),
  ).toBeAttached({ timeout: 1500 });
  await page.waitForTimeout(1200); // Spotlight + Advance-Cooldown verstreichen lassen
  await pages.hover();
  await page.mouse.wheel(160, 0);
  await expect(
    page.locator('.lg-reader-page[data-page="handeln"][data-spotlight]'),
  ).toBeAttached({ timeout: 1500 });
  await expect(
    page.locator('.post-doc-tab[aria-current="true"]', { hasText: 'Handeln' }),
  ).toBeVisible();
});
