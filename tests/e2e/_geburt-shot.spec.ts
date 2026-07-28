import { test, type Page } from '@playwright/test';

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

async function shoot(page: Page, path: string) {
  await page.goto('/lebenslagen/geburt', { waitUntil: 'networkidle' });
  await page.locator('.ll-breadcrumb').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}

test('geburt mobile light', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await shoot(page, '.tmp-shots/geburt-mobile-light.png');
});

test('geburt mobile dark', async ({ page }) => {
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => document.documentElement.classList.add('dark'));
  await shoot(page, '.tmp-shots/geburt-mobile-dark.png');
});

test('geburt desktop light', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shoot(page, '.tmp-shots/geburt-desktop-light.png');
});
