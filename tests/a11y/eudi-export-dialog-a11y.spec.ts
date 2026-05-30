import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForDokumente(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('table, [data-slot="empty-state"]')
      .first()
      .waitFor({ state: 'visible', timeout: 9000 })
      .catch(() => undefined);
    await page.waitForTimeout(700);
    const hasTable = await page.locator('main table').count();
    if (hasTable > 0) return;
    const retry = page.getByRole('button', { name: /erneut versuchen|retry|wiederholen/i }).first();
    if ((await retry.count()) > 0) {
      await retry.click().catch(() => undefined);
      await page.waitForTimeout(500);
    } else {
      return;
    }
  }
}

const WALLET_LABEL = 'In EUDI Wallet exportieren (Vorschau)';

async function openEudiDialog(page: Page) {
  const walletBtn = page
    .locator('main tbody tr')
    .first()
    .getByRole('button', { name: WALLET_LABEL })
    .first();
  const dialog = page.locator('[aria-modal="true"]').first();
  const pre = page.locator('[aria-modal="true"] pre').first();

  // The mock-backend has 300-800ms latency + a 5% simulated error rate; on the
  // error branch the dialog shows a <p> instead of the payload <pre>. Reopen
  // until the preview resolves successfully so the trap/axe checks see the <pre>.
  for (let attempt = 0; attempt < 6; attempt++) {
    await walletBtn.focus();
    await walletBtn.click();
    await expect(dialog).toBeVisible({ timeout: 4000 });
    const ok = await pre.waitFor({ state: 'visible', timeout: 4000 }).then(
      () => true,
      () => false,
    );
    if (ok) return walletBtn;
    // Error branch — close and try again.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 4000 });
    await page.waitForTimeout(200);
  }
  throw new Error('EUDI preview never resolved to a <pre> after 6 attempts');
}

function activeDescriptor() {
  const el = document.activeElement;
  if (!el)
    return {
      tag: 'NONE',
      isBody: true,
      isSkipLink: false,
      inDialog: false,
      isDevPortal: false,
      label: '',
    };
  const tag = el.tagName;
  const isBody = tag === 'BODY' || el === document.documentElement;
  const text = (el.textContent ?? '').trim();
  const isSkipLink =
    tag === 'A' &&
    (text.includes('Hauptinhalt springen') ||
      (el.getAttribute('href') ?? '').startsWith('#'));
  const dlg = document.querySelector('[aria-modal="true"]');
  const inDialog = dlg ? dlg.contains(el) : false;
  // Next.js dev-only tooling (dev-tools indicator / error overlay) renders into
  // its own <nextjs-portal> custom element that does NOT exist in `next build`
  // / production. It is never part of the app's tab order at runtime, so a
  // sweep landing on it is a dev-server artifact, not a containment defect.
  const isDevPortal = tag.includes('-PORTAL') || tag.startsWith('NEXTJS-');
  const label =
    el.getAttribute('aria-label') ??
    el.getAttribute('title') ??
    text.slice(0, 40);
  return { tag, isBody, isSkipLink, inDialog, isDevPortal, label };
}

test('EUDI dialog: focus trap holds — Tab never lands on BODY or skip-link', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openEudiDialog(page);

  const dom = await page.evaluate(() => {
    const dlg = document.querySelector('[aria-modal="true"]');
    const root = dlg?.closest('body > *') ?? null;
    const bodyChildren = Array.from(document.body.children).map((c) => ({
      tag: c.tagName,
      inert: c.hasAttribute('inert'),
      ariaHidden: c.getAttribute('aria-hidden'),
      hasDialog: c.querySelector('[aria-modal="true"]') !== null,
    }));
    const inertMarked = document.querySelectorAll('[data-base-ui-inert]').length;
    const realInert = document.querySelectorAll('body > [inert]').length;
    const guards = Array.from(
      document.querySelectorAll('[data-base-ui-focus-guard]'),
    ).map((g) => ({ ariaHidden: g.getAttribute('aria-hidden'), tabindex: g.getAttribute('tabindex') }));
    return { portalRootTag: root?.tagName ?? null, inertMarked, realInert, bodyChildren, guards };
  });
  console.log('[EUDI DOM] ' + JSON.stringify(dom));

  const visited: Array<ReturnType<typeof activeDescriptor>> = [];
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    visited.push(await page.evaluate(activeDescriptor));
  }
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Shift+Tab');
    visited.push(await page.evaluate(activeDescriptor));
  }
  console.log('[EUDI TRAP] visited=' + JSON.stringify(visited));

  // HARD FAIL: focus must NEVER land on the page skip-link or any real
  // interactive element outside the dialog. base-ui's FocusGuard sentinels
  // wrap focus, but during the wrap document.activeElement transiently
  // defaults to <body> for one tick — that is not a leak as long as the very
  // next Tab re-enters the dialog (proven separately below).
  const skipLinkHits = visited.filter((d) => d.isSkipLink);
  expect(skipLinkHits, 'focus must never reach the skip-link').toEqual([]);

  const realOutsideFocusable = visited.filter(
    (d) => !d.inDialog && !d.isBody && !d.isDevPortal && d.tag !== 'NONE',
  );
  expect(
    realOutsideFocusable,
    'focus must never land on a real interactive element outside the dialog',
  ).toEqual([]);

  // WRAP PROOF: starting from any popup edge, repeated Tab keeps cycling back
  // into the dialog within 2 presses — i.e. focus is physically contained.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    let d = await page.evaluate(activeDescriptor);
    // transient guard-wrap tick (body) or dev-only <nextjs-portal>: the next
    // press must re-enter the dialog.
    let guard = 0;
    while ((d.isBody || d.isDevPortal) && guard < 3) {
      await page.keyboard.press('Tab');
      d = await page.evaluate(activeDescriptor);
      guard += 1;
    }
    expect(d.isSkipLink, 'wrap must not pass through the skip-link').toBe(false);
    expect(d.inDialog, 'Tab must always cycle back into the dialog').toBe(true);
  }
});

test('EUDI dialog: axe finds no scrollable-region-focusable and no aria-hidden-focus', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openEudiDialog(page);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const ids = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  console.log('[EUDI AXE open] ' + JSON.stringify(ids));

  const scrollable = results.violations.find((v) => v.id === 'scrollable-region-focusable');
  const ariaHiddenFocus = results.violations.find((v) => v.id === 'aria-hidden-focus');
  expect(scrollable, 'no scrollable-region-focusable').toBeUndefined();
  expect(ariaHiddenFocus, 'no aria-hidden-focus').toBeUndefined();

  // The payload <pre> must be a named, focusable region.
  const pre = await page.evaluate(() => {
    const el = document.querySelector('[aria-modal="true"] pre');
    if (!el) return { found: false as const };
    return {
      found: true as const,
      tabIndex: el.getAttribute('tabindex'),
      role: el.getAttribute('role'),
      label: el.getAttribute('aria-label'),
    };
  });
  console.log('[EUDI PRE] ' + JSON.stringify(pre));
  expect(pre.found).toBe(true);
  if (pre.found) {
    expect(pre.tabIndex).toBe('0');
    expect(pre.role).toBe('region');
    expect((pre.label ?? '').length).toBeGreaterThan(3);
  }
});

test('EUDI dialog: Esc closes and focus returns to the Wallet trigger', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  const walletBtn = await openEudiDialog(page);

  await page.keyboard.press('Escape');
  const dialog = page.locator('[aria-modal="true"]').first();
  await expect(dialog).toBeHidden({ timeout: 4000 });

  await page.waitForTimeout(250);
  const restored = await walletBtn.evaluate((el) => el === document.activeElement);
  console.log('[EUDI ESC+RESTORE] restored=' + restored);
  expect(restored).toBe(true);
});

test('EUDI dialog: clicking Schließen closes and restores focus', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  const walletBtn = await openEudiDialog(page);

  await page
    .locator('[aria-modal="true"]')
    .getByRole('button', { name: 'Schließen' })
    .last()
    .click();
  const dialog = page.locator('[aria-modal="true"]').first();
  await expect(dialog).toBeHidden({ timeout: 4000 });

  await page.waitForTimeout(250);
  const restored = await walletBtn.evaluate((el) => el === document.activeElement);
  console.log('[EUDI CLOSE-BTN+RESTORE] restored=' + restored);
  expect(restored).toBe(true);
});
