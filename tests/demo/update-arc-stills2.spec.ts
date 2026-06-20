/**
 * UPDATE-ARC STILLS 2 — the genuinely-new, CITIZEN-FACING surfaces.
 *
 * Refocus after review: the teaser must show what REALLY updated for the
 * citizen, not the (pre-existing) Umzug cascade and not code/keys. These stills
 * cover: Bedienhilfen/Barrierefreiheit (incl. the visible effect — larger font
 * + higher contrast), the /dokumente eye-click → verified credential, the
 * Posteingang reply drawer + KI-Umformulieren, Termine Fristen-Gruppierung, and
 * the redesigned Dashboard Autopilot-Katalog.
 *
 *   $env:NEXT_PUBLIC_RELIABLE='1'; npm run build; npm run start     # shell A (if not up)
 *   npx playwright test --config=playwright.stills2.config.ts        # shell B
 *
 * Output: demo-recording/refs/2x-*.png (full viewport, 1920×1080).
 */
import { test, expect, type Page, type Locator } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';
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
async function center(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' })).catch(() => {});
  await beat(page, 450);
}
async function installCleanStyle(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `::-webkit-scrollbar{width:0!important;height:0!important}* {scrollbar-width:none!important;caret-color:transparent!important}`,
  }).catch(() => {});
}

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__stills2_seeded`;
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(`${ns}meta`, JSON.stringify({ version: 1, active_persona_id: id, seeded_at: new Date().toISOString(), reliable_mode: true }));
        for (const key of ['profile','letters','vorgaenge','documents','termine','letter-replies','letter-activity-log']) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch { /* non-browser env */ }
    },
    [NS, ACTIVE_PERSONA],
  );
}

test('UPDATE-ARC stills 2 — citizen-facing new surfaces (Anna)', async ({ page }) => {
  test.setTimeout(240_000);
  await setupAuthenticatedAnna(page);

  /* 22 — Posteingang reply drawer + KI-Umformulieren */
  await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
  const firstLetter = page.locator('a[href^="/posteingang/letter-"]').first();
  await firstLetter.waitFor({ state: 'visible', timeout: 30_000 });
  const hrefs = await page
    .locator('a[href^="/posteingang/letter-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')).filter(Boolean) as string[]);
  let replyShot = false;
  for (const href of hrefs.slice(0, 6)) {
    await page.goto(`${href}?reliable=1`, { waitUntil: 'domcontentloaded' });
    await installCleanStyle(page);
    const replyBtn = page
      .getByRole('button', { name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i })
      .first();
    if (!(await replyBtn.isVisible().catch(() => false))) continue;
    await replyBtn.click();
    const panel = page.locator('[data-testid="reply-inline-panel"], [data-slot="sheet-content"]').first();
    if (!(await panel.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false))) continue;
    await beat(page, 1200);
    await shot(page, '22-posteingang-reply');
    await shotEl(page, panel, '22-posteingang-reply');
    replyShot = true;
    break;
  }
  if (!replyShot) console.warn('reply drawer not captured — no letter exposed a reply button');

  /* 23 — Termine: Fristen-Gruppierung */
  await page.goto('/termine?reliable=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Termine/i }).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await installCleanStyle(page);
  await beat(page, 1200);
  await shot(page, '23-termine');

  /* 24 — Dashboard: redesigned Autopilot-Katalog band */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('heading', { name: /Petrov/i }).waitFor({ timeout: 12_000 }).catch(() => {});
  await installCleanStyle(page);
  await beat(page, 1000);
  const katalog = page.getByRole('heading', { name: /Autopilot/i }).first();
  if (await katalog.count()) {
    await center(page, katalog);
    await shot(page, '24-dashboard-katalog');
  } else {
    await shot(page, '24-dashboard-katalog');
  }

  /* 25 — Dokumente list (eye icons + verified badges) */
  await page.goto('/dokumente?reliable=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /ansehen/i }).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await installCleanStyle(page);
  await beat(page, 1000);
  await shot(page, '25-dokumente-list');

  /* 20 — Bedienhilfen panel (clean/default) */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 30_000 });
  await installCleanStyle(page);
  const a11yTrigger = page.locator('button[aria-controls="a11y-panel"]').first();
  await a11yTrigger.click();
  const a11yPanel = page.locator('#a11y-panel');
  await expect(a11yPanel).toBeVisible({ timeout: 15_000 });
  await beat(page, 900);
  await shot(page, '20-a11y-panel');
  await shotEl(page, a11yPanel, '20-a11y-panel');

  /* 21 — Bedienhilfen EFFECT: larger font + higher contrast (the WHY) */
  const inc = page.getByRole('button', { name: 'Schrift vergrößern' });
  for (let i = 0; i < 3 && (await inc.isEnabled().catch(() => false)); i += 1) {
    await inc.click();
    await beat(page, 250);
  }
  const contrast = page.getByRole('switch', { name: 'Kontrast erhöhen' });
  if (await contrast.count()) { await contrast.click(); await beat(page, 350); }
  await page.keyboard.press('Escape');
  await beat(page, 900);
  await shot(page, '21-a11y-effect');
});
