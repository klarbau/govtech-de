/**
 * Modal focus-containment verification for the useInertOutsideModal hook
 * (branch feat/wow-1-inline-cascade).
 *
 * BACKGROUND. base-ui 1.5.0 contains the background of an open modal by setting
 * aria-hidden="true" (NOT the real inert attribute) on every element outside the
 * popup. That leaves the skip-link / header / sidebar TAB-REACHABLE while a modal
 * is open (WCAG 2.4.3 Focus Order + 4.1.2 Name/Role/Value; BITV 2.0). base-ui's
 * FocusGuard sentinels eventually wrap focus, so it is recoverable rather than a
 * hard trap, but it is a real focus-containment defect. The hook promotes base-ui's
 * [data-base-ui-inert] background marker to the real inert property and removes it
 * on close.
 *
 * CRITICAL: a SCOPED [role=dialog] axe scan FALSELY passes this defect -- the leak
 * is in the BACKGROUND's tab-reachability, not inside the popup. So this suite does
 * a real Tab-sweep + asserts the real inert attribute lands on the background
 * (skip-link / header / sidebar) and is cleaned up on close.
 *
 * Two representative modals (per audit brief), both reachable on /dokumente:
 *   A. Shared-primitive consumer -- the document preview Dialog (ui/dialog.tsx ->
 *      base-ui Dialog), opened from a document rows "<name> ansehen" button.
 *   B. Bespoke consent AlertDialog -- the EUDI export dialog (dokumente/
 *      EudiExportDialog), a base-ui AlertDialog gating a clearly-mocked export.
 */
import { test, expect, type Page } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

/** Snapshot of document.activeElement, classified for containment assertions. */
function activeDescriptor() {
  const el = document.activeElement;
  if (!el) {
    return { tag: 'NONE', isBody: true, isSkipLink: false, inPopup: false, isDevPortal: false, label: '' };
  }
  const tag = el.tagName;
  const isBody = tag === 'BODY' || el === document.documentElement;
  const text = (el.textContent ?? '').trim();
  const isSkipLink =
    tag === 'A' &&
    (text.includes('Hauptinhalt springen') || (el.getAttribute('href') ?? '').startsWith('#'));
  // The TOP-most open popup is the one focus must stay inside.
  const popups = Array.from(document.querySelectorAll('[role=dialog],[role=alertdialog]'));
  const top = popups[popups.length - 1] ?? null;
  const inPopup = top ? top.contains(el) || top === el : false;
  // Next.js dev-only tooling renders into <nextjs-portal>; absent in next build.
  const isDevPortal = tag.includes('-PORTAL') || tag.startsWith('NEXTJS-');
  const label = el.getAttribute('aria-label') ?? el.getAttribute('title') ?? text.slice(0, 40);
  return { tag, isBody, isSkipLink, inPopup, isDevPortal, label };
}

/**
 * DOM probe of the background-containment state. We assert on the elements that
 * MATTER for keyboard focus: a marked background element that is focusable (or
 * contains focusable descendants) must carry real inert. <script>/announcer nodes
 * are marked by base-ui too but are inert-irrelevant, so we report counts and
 * separately assert the chrome landmarks (skip-link / header / sidebar) are inert.
 */
function inertProbe() {
  const marked = Array.from(document.querySelectorAll('[data-base-ui-inert]')) as HTMLElement[];
  const markedNotInert = marked
    .filter((el) => !el.inert)
    .map((el) => el.tagName);
  const popups = Array.from(document.querySelectorAll('[role=dialog],[role=alertdialog]'));
  const top = popups[popups.length - 1] as HTMLElement | null;
  const topInert = top ? top.closest('[inert]') !== null : false;
  // Chrome landmarks that previously stayed Tab-reachable.
  const header = document.querySelector('header,[role=banner]');
  const sidebar = document.querySelector('aside,[role=complementary]');
  const skip = document.querySelector('a[href="#main-content"]');
  const isInert = (n: Element | null) =>
    n ? (n as HTMLElement).inert || n.closest('[inert]') !== null : null;
  return {
    markedCount: marked.length,
    markedNotInert,
    realInertCount: document.querySelectorAll('[inert]').length,
    topPopupInsideInert: topInert,
    headerInert: isInert(header),
    sidebarInert: isInert(sidebar),
    skipInert: isInert(skip),
  };
}

async function tabSweepStaysInPopup(page: Page, presses: number) {
  const visited: Array<ReturnType<typeof activeDescriptor>> = [];
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab');
    visited.push(await page.evaluate(activeDescriptor));
  }
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Shift+Tab');
    visited.push(await page.evaluate(activeDescriptor));
  }
  return visited;
}

function assertContained(visited: Array<ReturnType<typeof activeDescriptor>>, where: string) {
  const skipLinkHits = visited.filter((d) => d.isSkipLink);
  expect(skipLinkHits, where + ': focus must NEVER reach the skip-link').toEqual([]);
  // <body> = transient FocusGuard wrap tick; dev-portal = dev-only. A real
  // interactive element outside the popup would be a containment leak.
  const realOutside = visited.filter(
    (d) => !d.inPopup && !d.isBody && !d.isDevPortal && d.tag !== 'NONE',
  );
  expect(realOutside, where + ': focus must never land on a real control outside the modal').toEqual([]);
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

async function waitForDocRows(page: Page) {
  await waitForDokumente(page);
  // Wait for actual data rows (the table header exists even when empty).
  for (let attempt = 0; attempt < 6; attempt++) {
    if ((await page.locator('main tbody tr').count()) > 0) return;
    await page.waitForTimeout(600);
    const retry = page.getByRole('button', { name: /erneut versuchen|retry|wiederholen/i }).first();
    if ((await retry.count()) > 0) await retry.click().catch(() => undefined);
  }
}

test.describe('useInertOutsideModal -- real focus containment', () => {
  test('A. Shared-primitive Dialog (document preview): chrome goes inert, Tab contained, cleanup', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setLocale(page, 'de');
    await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
    await waitForDocRows(page);
    expect(await page.locator('main tbody tr').count(), 'document rows present').toBeGreaterThan(0);

    // The "<name> ansehen" button opens the shared ui/dialog.tsx preview Dialog.
    const viewBtn = page
      .locator('main tbody tr')
      .first()
      .getByRole('button', { name: /ansehen/i })
      .first();
    await viewBtn.waitFor({ state: 'visible', timeout: 8000 });
    await viewBtn.focus();
    await viewBtn.click();
    const dialog = page.locator('[role=dialog]').first();
    await dialog.waitFor({ state: 'visible', timeout: 8000 });

    // (2) Background carries REAL inert; the chrome landmarks specifically.
    const open = await page.evaluate(inertProbe);
    console.log('[PREVIEW inertProbe open] ' + JSON.stringify(open));
    expect(open.markedCount, 'base-ui marked >=1 background element').toBeGreaterThan(0);
    expect(open.topPopupInsideInert, 'the Dialog popup itself must NOT be inert').toBe(false);
    if (open.headerInert !== null) expect(open.headerInert, 'header is inert').toBe(true);
    if (open.sidebarInert !== null) expect(open.sidebarInert, 'sidebar is inert').toBe(true);
    if (open.skipInert !== null) expect(open.skipInert, 'skip-link is inert').toBe(true);
    const leaky = open.markedNotInert.filter(
      (t) => !['SCRIPT', 'NEXT-ROUTE-ANNOUNCER', 'STYLE', 'LINK'].includes(t),
    );
    expect(leaky, 'no focusable background landmark left without real inert').toEqual([]);

    // (3) Tab-sweep stays inside the Dialog.
    const visited = await tabSweepStaysInPopup(page, 18);
    console.log('[PREVIEW sweep] ' + JSON.stringify(visited.map((d) => ({ t: d.tag, inn: d.inPopup, sl: d.isSkipLink }))));
    assertContained(visited, 'DocumentPreviewDialog');

    // (4) Close -> background inert removed; the trigger is focusable again.
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 6000 });
    await page.waitForTimeout(200);
    const closed = await page.evaluate(inertProbe);
    console.log('[PREVIEW inertProbe closed] ' + JSON.stringify(closed));
    expect(closed.realInertCount, 'no [inert] left on the page after close').toBe(0);
    await viewBtn.focus();
    const restored = await viewBtn.evaluate((el) => el === document.activeElement);
    expect(restored, 'the view trigger (background control) is focusable again').toBe(true);
  });

  test('B. Bespoke consent AlertDialog (EUDI export): chrome goes inert, Tab contained, cleanup', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setLocale(page, 'de');
    await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
    await waitForDocRows(page);
    expect(await page.locator('main tbody tr').count(), 'document rows present').toBeGreaterThan(0);

    const walletBtn = page
      .locator('main tbody tr')
      .getByRole('button', { name: 'In EUDI Wallet exportieren (Vorschau)' })
      .first();
    await walletBtn.waitFor({ state: 'visible', timeout: 8000 });
    const dialog = page.locator('[role=alertdialog]').first();
    // mock-backend has ~5% simulated error rate; reopen until the dialog mounts.
    let openedOk = false;
    for (let attempt = 0; attempt < 6 && !openedOk; attempt++) {
      await walletBtn.focus();
      await walletBtn.click();
      openedOk = await dialog
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true, () => false);
      if (!openedOk) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
    expect(openedOk, 'EUDI AlertDialog opened').toBe(true);

    // (2) Background + chrome carry REAL inert; popup does not.
    const open = await page.evaluate(inertProbe);
    console.log('[EUDI inertProbe open] ' + JSON.stringify(open));
    expect(open.markedCount, 'base-ui marked >=1 background element').toBeGreaterThan(0);
    expect(open.topPopupInsideInert, 'the AlertDialog popup itself must NOT be inert').toBe(false);
    if (open.headerInert !== null) expect(open.headerInert, 'header is inert').toBe(true);
    if (open.sidebarInert !== null) expect(open.sidebarInert, 'sidebar is inert').toBe(true);
    if (open.skipInert !== null) expect(open.skipInert, 'skip-link is inert').toBe(true);
    const leaky = open.markedNotInert.filter(
      (t) => !['SCRIPT', 'NEXT-ROUTE-ANNOUNCER', 'STYLE', 'LINK'].includes(t),
    );
    expect(leaky, 'no focusable background landmark left without real inert').toEqual([]);

    // (3) Tab-sweep stays inside the AlertDialog.
    const visited = await tabSweepStaysInPopup(page, 16);
    console.log('[EUDI sweep] ' + JSON.stringify(visited.map((d) => ({ t: d.tag, inn: d.inPopup, sl: d.isSkipLink, l: d.label }))));
    assertContained(visited, 'EudiExportDialog');

    // (4) Close -> background inert removed; the wallet trigger interactive again.
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 6000 });
    await page.waitForTimeout(200);
    const closed = await page.evaluate(inertProbe);
    console.log('[EUDI inertProbe closed] ' + JSON.stringify(closed));
    expect(closed.realInertCount, 'no [inert] left on the page after close').toBe(0);
    await walletBtn.focus();
    const restored = await walletBtn.evaluate((el) => el === document.activeElement);
    expect(restored, 'the wallet trigger (background control) is focusable again').toBe(true);
  });
});
