/**
 * UPDATE-ARC STILLS 3 — fixups for two scenes stills2 couldn't get cleanly:
 *  - 22 Posteingang reply drawer + KI-Umformulieren (Mehmet's Steuerbescheid,
 *    the letter that reliably exposes the "Antwort verfassen" CTA).
 *  - 21 Bedienhilfen EFFECT — apply MAX font + contrast + readable font, verify
 *    the root zoom actually applied, then shoot a text-rich page so the
 *    low-vision benefit is unmistakable.
 *
 *   npx playwright test --config=playwright.stills3.config.ts   (prod server on :3000)
 */
import { test, expect, type Page, type Locator } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const REFS = 'demo-recording/refs';

const beat = (page: Page, ms = 800) => page.waitForTimeout(ms);
async function shot(page: Page, name: string): Promise<void> {
  await beat(page, 500);
  await page.screenshot({ path: `${REFS}/${name}.png`, animations: 'disabled' });
}
async function shotEl(page: Page, locator: Locator, name: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await beat(page, 400);
  await locator.screenshot({ path: `${REFS}/${name}@el.png`, animations: 'disabled' }).catch(() => {});
}
async function installCleanStyle(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `::-webkit-scrollbar{width:0!important;height:0!important}* {scrollbar-width:none!important;caret-color:transparent!important}`,
  }).catch(() => {});
}
async function seed(page: Page, personaId: string): Promise<void> {
  await page.context().addCookies([{ name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' }]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__stills3_seeded`;
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(`${ns}meta`, JSON.stringify({ version: 1, active_persona_id: id, seeded_at: new Date().toISOString(), reliable_mode: true }));
        for (const key of ['profile','letters','vorgaenge','documents','termine','letter-replies','letter-activity-log']) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch { /* non-browser */ }
    },
    [NS, personaId],
  );
}

test('22 — reply drawer + KI (Mehmet)', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, 'mehmet-yildiz');
  await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
  await page.locator('a[href^="/posteingang/letter-"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.goto('/posteingang/letter-mehmet-fa-steuerbescheid-2024?reliable=1', { waitUntil: 'domcontentloaded' });
  await installCleanStyle(page);
  const replyBtn = page
    .getByRole('button', { name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i })
    .first();
  await replyBtn.waitFor({ state: 'visible', timeout: 20_000 });
  await replyBtn.click();
  const panel = page.locator('[data-testid="reply-inline-panel"], [data-slot="sheet-content"]').first();
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  await beat(page, 1400);
  await shot(page, '22-posteingang-reply');
  await shotEl(page, panel, '22-posteingang-reply');
  // Also scroll the KI-Umformulieren chips into view for a focused crop.
  const kiChip = page.getByRole('button', { name: /umformulieren|Kürzer|Formeller|Einfacher/i }).first();
  if (await kiChip.count()) {
    await kiChip.scrollIntoViewIfNeeded().catch(() => {});
    await beat(page, 500);
    await shot(page, '22b-posteingang-reply-ki');
  }
});

test('21 — Bedienhilfen effect (max font + contrast + readable)', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, 'anna-petrov');
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 30_000 });
  await page.locator('button[aria-controls="a11y-panel"]').first().click();
  await expect(page.locator('#a11y-panel')).toBeVisible({ timeout: 15_000 });

  const inc = page.getByRole('button', { name: 'Schrift vergrößern' });
  for (let i = 0; i < 8; i += 1) {
    if (!(await inc.isEnabled().catch(() => false))) break;
    await inc.click();
    await beat(page, 200);
  }
  for (const name of ['Kontrast erhöhen', 'Gut lesbare Schrift']) {
    const sw = page.getByRole('switch', { name });
    if (await sw.count()) { await sw.click().catch(() => {}); await beat(page, 250); }
  }
  await page.keyboard.press('Escape');
  await beat(page, 700);

  const state = await page.evaluate(() => ({
    zoom: getComputedStyle(document.documentElement).zoom,
    varZoom: getComputedStyle(document.documentElement).getPropertyValue('--a11y-zoom'),
    cls: document.documentElement.className,
  }));
  console.log('A11Y EFFECT STATE:', JSON.stringify(state));

  // Show the effect on a text-rich page (prefs persist via localStorage).
  await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
  await page.locator('a[href^="/posteingang/letter-"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await installCleanStyle(page);
  await beat(page, 1200);
  const state2 = await page.evaluate(() => getComputedStyle(document.documentElement).zoom);
  console.log('A11Y EFFECT ZOOM ON /posteingang:', state2);
  await shot(page, '21-a11y-effect');
});
