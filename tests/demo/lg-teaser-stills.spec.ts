/**
 * LG + MOBILE-COMFORT TEASER STILLS — clean reference screenshots for the
 * "what's new" motion teaser (tests/demo/lg-mobile-comfort-teaser.spec.ts).
 *
 * NOT a recorder, NOT a test gate. Captures pristine stills of the Liquid-Glass
 * rollout (desktop, 1920×1080) and the Mobile-Comfort-Welle (390×844 @2x —
 * Bottom-Tab-Bar, Preambel-Kollaps, pinned composer) against the ALREADY
 * RUNNING dev server on :3000. Read-only navigation + screenshots only — no
 * build, no server restart (see CLAUDE.md live-tunnel rules).
 *
 *   npx playwright test --config=playwright.lg-stills.config.ts
 *
 * Output: demo-recording/refs/3N-d-*.png (desktop) + 4N-m-*.png (mobile).
 * Deterministic + key-independent: Anna's authenticated state is seeded via
 * initScript, ?reliable=1 disables the 5% mock-error injection, no assistant
 * call is made (we only show the composer, never send).
 */
import { test, expect, type Page } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';
const REFS = 'demo-recording/refs';

const beat = (page: Page, ms = 900) => page.waitForTimeout(ms);

async function shot(page: Page, name: string): Promise<void> {
  await beat(page, 600);
  await page.screenshot({ path: `${REFS}/${name}.png`, animations: 'disabled' });
}

/** Hide scrollbars + freeze the caret so stills are crisp. Re-applied per nav. */
async function installCleanStyle(page: Page): Promise<void> {
  await page
    .addStyleTag({
      content: `
      ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
      * { scrollbar-width: none !important; caret-color: transparent !important; }
    `,
    })
    .catch(() => {});
}

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__lg_stills_seeded`;
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        for (const key of [
          'profile', 'letters', 'vorgaenge', 'documents', 'termine',
          'orchestration:sagas', 'orchestration:outbox', 'orchestration:audit-log',
          'orchestration:dlq', 'orchestration:breakers',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        /* non-browser env — ignore */
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

/** Navigate, wait for the app shell to settle, apply clean style. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${path}?reliable=1`, { waitUntil: 'domcontentloaded' });
  await page
    .locator('main')
    .first()
    .waitFor({ state: 'visible', timeout: 45_000 })
    .catch(() => {});
  await installCleanStyle(page);
  // dev server: give HMR/data hydration a moment so skeletons resolve
  await beat(page, 1600);
}

/* ───────────────────────── desktop · light ───────────────────────── */

test.describe('desktop light', () => {
  test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  test('LG desktop stills (Anna)', async ({ page }) => {
    test.setTimeout(240_000);
    await setupAuthenticatedAnna(page);

    await open(page, '/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
    await beat(page, 800);
    await shot(page, '30-d-dashboard');

    await open(page, '/posteingang');
    await shot(page, '31-d-posteingang');

    await open(page, '/termine');
    await shot(page, '32-d-termine');

    await open(page, '/dokumente');
    await shot(page, '33-d-dokumente');

    await open(page, '/vorgaenge');
    await shot(page, '34-d-vorgaenge');
  });
});

/* ───────────────────────── desktop · dark ────────────────────────── */

test.describe('desktop dark', () => {
  test.use({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });

  test('LG desktop dark still (Anna)', async ({ page }) => {
    test.setTimeout(120_000);
    await setupAuthenticatedAnna(page);

    await open(page, '/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
    await beat(page, 800);
    await shot(page, '35-d-dashboard-dark');

    await open(page, '/posteingang');
    await shot(page, '36-d-posteingang-dark');
  });
});

/* ───────────────────────── mobile · light ────────────────────────── */

test.describe('mobile light', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  test('Mobile-Comfort stills (Anna)', async ({ page }) => {
    test.setTimeout(240_000);
    await setupAuthenticatedAnna(page);

    // Bottom-Tab-Bar hero: dashboard with the 5 thumb-zone tabs
    await open(page, '/dashboard');
    await expect(page.locator('.mobile-tabbar')).toBeVisible({ timeout: 30_000 });
    await beat(page, 800);
    await shot(page, '40-m-dashboard');

    // Posteingang: tab bar + unread badge
    await open(page, '/posteingang');
    await expect(page.locator('.mobile-tabbar')).toBeVisible({ timeout: 30_000 });
    await shot(page, '41-m-posteingang');

    // Termine: Preambel-Kollaps — content card high on the screen
    await open(page, '/termine');
    await shot(page, '42-m-termine');

    // Vorgänge: second Preambel-Kollaps surface
    await open(page, '/vorgaenge');
    await shot(page, '43-m-vorgaenge');

    // Assistent: pinned composer above the tab bar
    await open(page, '/assistent');
    await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({ timeout: 30_000 });
    await beat(page, 600);
    await shot(page, '44-m-assistent');
  });
});

/* ───────────────────────── mobile · dark ─────────────────────────── */

test.describe('mobile dark', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  });

  test('Mobile dark still (Anna)', async ({ page }) => {
    test.setTimeout(120_000);
    await setupAuthenticatedAnna(page);

    await open(page, '/dashboard');
    await expect(page.locator('.mobile-tabbar')).toBeVisible({ timeout: 30_000 });
    await beat(page, 800);
    await shot(page, '45-m-dashboard-dark');
  });
});
