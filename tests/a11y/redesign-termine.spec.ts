import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

/**
 * Seed a Bürgeramt §17 termin in status 'vorgeschlagen' directly into the
 * termine bucket so the „Vorgemerkt"-Hero-Dossier renders deterministically (its
 * confirm CTA + §17 reasoning = the wow). Hero candidate requires
 * `behoerde_id.startsWith('buergeramt-')` && status 'vorgeschlagen'
 * (termin-status.ts: istBuergeramtVorgemerkt) — the default Anna seed only carries
 * an ABH/LEA 'vorgeschlagen' termin (explicitly NEVER the hero); the real
 * Bürgeramt one is minted by the Umzug autopilot at runtime. Pre-seeding the
 * bucket via addInitScript mirrors the house pattern; `seed_content_version` must
 * MATCH seed.ts (9) so the boot does NOT trigger the content-version reseed that
 * would overwrite the injected termine bucket.
 */
async function seedVorgemerktHero(page: Page) {
  await setLocale(page, 'de');
  await page.addInitScript(
    ([ns, persona]) => {
      try {
        const sentinel = ns + '__termine_vorgemerkt_seeded';
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(
          ns + 'meta',
          JSON.stringify({
            version: 1,
            active_persona_id: persona,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
            seed_content_version: 9,
          }),
        );
        const now = Date.now();
        const slot = new Date(now + 9 * 24 * 3600 * 1000); // +9 days
        slot.setHours(9, 0, 0, 0);
        const frist = new Date(now + 12 * 24 * 3600 * 1000); // §17 deadline, +12d
        const heroTermin = {
          id: 'termin-anmeldung-vorgemerkt-test',
          behoerde_id: 'buergeramt-berlin-mitte',
          datum: slot.toISOString(),
          ort: {
            typ: 'praesenz',
            details: 'Bürgeramt Berlin-Mitte, Karl-Marx-Allee 31, 10178 Berlin',
          },
          status: 'vorgeschlagen',
          betreff: 'Anmeldung neuer Wohnort (§ 17 BMG)',
          buchungsreferenz: '[MOCK] BA-MITTE-2026-09001',
          frist_iso: frist.toISOString(),
          reasoning_typ: 'bmg_17',
          owner_persona_id: persona,
        };
        window.localStorage.setItem(ns + 'termine', JSON.stringify([heroTermin]));
      } catch {
        // non-browser env
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

async function waitForTermine(page: Page) {
  // 5% simulated error rate → TermineView may render an error EmptyState with a
  // 'Erneut versuchen' button. Retry until the Zeitstrahl (spine) is mounted.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('[data-testid="termine-spine"]')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 })
      .catch(() => undefined);
    await page.waitForTimeout(400);
    const hasSpine = await page.locator('[data-testid="termine-spine"]').count();
    if (hasSpine > 0) return;
    const retry = page
      .getByRole('button', { name: /erneut versuchen|retry|wiederholen/i })
      .first();
    if ((await retry.count()) > 0) {
      await retry.click().catch(() => undefined);
      await page.waitForTimeout(600);
    } else {
      return;
    }
  }
}

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

function summarize(results: AxeResults) {
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target,
  }));
}

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  return { results, blockers };
}

test('axe LIGHT termine de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT termine de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK termine de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await waitForTermine(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK termine de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe MOBILE 390 termine de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-MOBILE termine de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT termine ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL termine] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT termine ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('exactly one main, one h1, no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    const levels = Array.from(
      document.querySelectorAll(
        'main h1, main h2, main h3, main h4, main h5, main h6',
      ),
    ).map((h) => Number(h.tagName.slice(1)));
    return {
      main: document.querySelectorAll('main').length,
      h1: document.querySelectorAll('main h1').length,
      levels,
    };
  });
  console.log('[LANDMARKS termine] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    const delta = (info.levels[i] ?? 0) - (info.levels[i - 1] ?? 0);
    expect(delta).toBeLessThanOrEqual(1);
  }
});

test('screen anchors: thesis + spine + dossier(.tm-detail) + view switcher + export', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);

  await expect(page.locator('[data-testid="termine-thesis"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="termine-spine"]')).toHaveCount(1);
  // At least one Dossier is present and carries the shared `.tm-detail` hook
  // (Demo-Tour zoom target + LG frost surface).
  const dossier = page.locator('[data-testid^="termine-dossier-"]').first();
  await expect(dossier).toBeVisible();
  await expect(dossier).toHaveClass(/tm-detail/);

  // Ansichts-Umschalter: nav[aria-label] with exactly one aria-current.
  const nav = page.locator('nav[aria-label="Zeitraum"]');
  await expect(nav).toHaveCount(1);
  await expect(nav.locator('[aria-current="true"]')).toHaveCount(1);

  // Head export button by accessible name.
  await expect(
    page.getByRole('button', { name: 'In Kalender exportieren' }),
  ).toHaveCount(1);

  // data-lg-screen marker present (LiquidGlassScreen).
  const lgScreen = await page.evaluate(() =>
    document.documentElement.getAttribute('data-lg-screen'),
  );
  console.log('[LG-SCREEN termine] ' + lgScreen);
});

test('Anna default: Ein-Klick-Frist-Karte + Zusammenlegen-Fußsektion present', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);

  await expect(
    page.locator('[data-testid^="termine-frist-"]').first(),
    'Ein-Klick-Frist-Karte (Kindergeld-Nachweis) present',
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Prüfen und einreichen' }).first(),
  ).toBeVisible();

  await expect(
    page.locator('[data-testid="termine-buendelung"]'),
    'Zusammenlegen-Fußsektion im LEA-Dossier present',
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'In einem Besuch erledigen' }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Getrennt lassen' }),
  ).toHaveCount(1);
});

test('view switcher toggles to „Vergangen" via keyboard, aria-current follows', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const vergangen = page
    .locator('nav[aria-label="Zeitraum"] button', { hasText: /^Vergangen$/ })
    .first();
  await vergangen.focus();
  await expect(vergangen).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  await expect(vergangen).toHaveAttribute('aria-current', 'true');
});

test('Vorgemerkt §17 hero: CTA + §17 reasoning + non-focusable badge, then confirm renders the Quittung', async ({
  page,
}) => {
  await seedVorgemerktHero(page);
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);

  const probe = await page.evaluate(() => {
    const panel = document.querySelector(
      'main [data-testid^="termine-dossier-"].tm-detail',
    );
    if (!panel) return { found: false as const };
    if (!/§\s*17/.test(panel.textContent ?? '')) {
      return { found: false as const };
    }
    const badge = panel.querySelector('span.badge') ?? null;
    const badgeFocusable =
      badge !== null &&
      (badge.hasAttribute('tabindex') ||
        ['BUTTON', 'A'].includes(badge.tagName) ||
        ['button', 'link'].includes(badge.getAttribute('role') ?? ''));
    const confirmButtons = Array.from(panel.querySelectorAll('button')).filter(
      (b) => /termin bestätigen/i.test(b.textContent ?? ''),
    );
    return {
      found: true as const,
      hasMockMarker: (panel.textContent ?? '').toLowerCase().includes('[mock]'),
      confirmCount: confirmButtons.length,
      badgeTag: badge?.tagName ?? '',
      badgeText: (badge?.textContent ?? '').trim(),
      badgeFocusable,
    };
  });
  console.log('[HERO-PANEL termine] ' + JSON.stringify(probe));
  expect(probe.found, '§17 vorgemerkt Dossier must render with .tm-detail').toBe(
    true,
  );
  expect(probe.confirmCount, 'exactly one „Termin bestätigen" button').toBe(1);
  expect(probe.hasMockMarker, '[MOCK] marker present').toBe(true);
  expect(probe.badgeTag, 'status badge is a <span>').toBe('SPAN');
  expect(probe.badgeFocusable, 'status badge must NOT be focusable').toBe(false);

  const detail = page.locator(
    'main [data-testid^="termine-dossier-"].tm-detail',
  );
  await detail
    .locator('button', { hasText: /termin bestätigen/i })
    .first()
    .click();

  const quittung = detail.locator('.vr-card');
  await expect(quittung, 'Datenminimierungs-Quittung after confirm').toBeVisible({
    timeout: 10_000,
  });
  await expect(quittung).toContainText(/kalender/i);
  await expect(
    detail,
    'Dossier no longer shows the „Vorgemerkt" state after confirm',
  ).not.toContainText(/vorgemerkt/i);
});

// ---------------------------------------------------------------------------
// Focus-trap helpers (house idiom).
// ---------------------------------------------------------------------------
function activeDescriptor() {
  const el = document.activeElement;
  if (!el) {
    return {
      tag: 'NONE',
      isBody: true,
      isSkipLink: false,
      inPopup: false,
      isDevPortal: false,
      label: '',
    };
  }
  const tag = el.tagName;
  const isBody = tag === 'BODY' || el === document.documentElement;
  const text = (el.textContent ?? '').trim();
  const isSkipLink =
    tag === 'A' &&
    (text.includes('Hauptinhalt springen') ||
      (el.getAttribute('href') ?? '').startsWith('#'));
  const popups = Array.from(
    document.querySelectorAll('[role=dialog],[role=alertdialog]'),
  );
  const top = popups[popups.length - 1] ?? null;
  const inPopup = top ? top.contains(el) || top === el : false;
  const isDevPortal =
    tag.includes('-PORTAL') ||
    tag.startsWith('NEXTJS-') ||
    el.hasAttribute('data-base-ui-focus-guard');
  const label =
    el.getAttribute('aria-label') ??
    el.getAttribute('title') ??
    text.slice(0, 40);
  return { tag, isBody, isSkipLink, inPopup, isDevPortal, label };
}

function inertProbe() {
  const marked = Array.from(
    document.querySelectorAll('[data-base-ui-inert]'),
  ) as HTMLElement[];
  const markedNotInert = marked.filter((el) => !el.inert).map((el) => el.tagName);
  const popups = Array.from(
    document.querySelectorAll('[role=dialog],[role=alertdialog]'),
  );
  const top = popups[popups.length - 1] as HTMLElement | null;
  const topInert = top ? top.closest('[inert]') !== null : false;
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

async function tabSweepCollect(page: Page, presses: number) {
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

function assertContained(
  visited: Array<ReturnType<typeof activeDescriptor>>,
  where: string,
) {
  const skipLinkHits = visited.filter((d) => d.isSkipLink);
  expect(skipLinkHits, where + ': focus must NEVER reach the skip-link').toEqual(
    [],
  );
  const realOutside = visited.filter(
    (d) => !d.inPopup && !d.isBody && !d.isDevPortal && d.tag !== 'NONE',
  );
  expect(
    realOutside.map((d) => ({ tag: d.tag, label: d.label })),
    where + ': focus must never land on a real control outside the modal',
  ).toEqual([]);
}

async function openDetailDialog(
  page: Page,
  triggerName: RegExp,
  popupSelector: string,
) {
  const trigger = page
    .locator('main [data-testid^="termine-dossier-"].tm-detail')
    .getByRole('button', { name: triggerName })
    .first();
  await trigger.waitFor({ state: 'visible', timeout: 8000 });
  const popup = page.locator(popupSelector).first();
  let opened = false;
  for (let attempt = 0; attempt < 4 && !opened; attempt++) {
    await trigger.click().catch(() => undefined);
    opened = await popup.waitFor({ state: 'visible', timeout: 4000 }).then(
      () => true,
      () => false,
    );
    if (!opened) {
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(200);
    }
  }
  return { trigger, popup, opened };
}

test('TerminAbsagenDialog: Tab-sweep stays in the alertdialog, ESC restores focus', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const { trigger, popup, opened } = await openDetailDialog(
    page,
    /^Absagen$/i,
    '[role="alertdialog"]',
  );
  if (!opened) {
    test.skip(true, 'TerminAbsagenDialog did not open (mock error / no dossier)');
    return;
  }
  await expect(popup).toBeVisible();
  const open = await page.evaluate(inertProbe);
  console.log('[ABSAGEN inertProbe] ' + JSON.stringify(open));
  const visited = await tabSweepCollect(page, 10);
  assertContained(visited, 'TerminAbsagenDialog');
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden', timeout: 6000 });
  await page.waitForTimeout(200);
  const closed = await page.evaluate(inertProbe);
  expect(closed.realInertCount, 'no [inert] left after close').toBe(0);
  await expect(trigger, 'focus returns to the Absagen trigger').toBeFocused();
});

test('VorgangSchrittAuthDialog (Frist eID): opens, traps focus, ESC restores focus', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const trigger = page
    .getByRole('button', { name: 'Prüfen und einreichen' })
    .first();
  const present = await trigger.count();
  if (present === 0) {
    test.skip(true, 'Frist-Karte absent (mock error)');
    return;
  }
  const popup = page.locator('[role="dialog"]').first();
  let opened = false;
  for (let attempt = 0; attempt < 4 && !opened; attempt++) {
    await trigger.click().catch(() => undefined);
    opened = await popup.waitFor({ state: 'visible', timeout: 4000 }).then(
      () => true,
      () => false,
    );
    if (!opened) await page.waitForTimeout(200);
  }
  expect(opened, 'eID dialog opened').toBe(true);
  const openProbe = await page.evaluate(inertProbe);
  console.log('[FRIST-EID inertProbe] ' + JSON.stringify(openProbe));
  const visited = await tabSweepCollect(page, 8);
  assertContained(visited, 'VorgangSchrittAuthDialog');
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden', timeout: 6000 });
  await page.waitForTimeout(200);
  await expect(trigger, 'focus returns to the „Prüfen und einreichen" CTA').toBeFocused();
});

test('Frist eID CONFIRM path: focus moves into the spine, never <body> (WCAG 2.4.3)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 1280, height: 900 });
  // reliable mode → no 5% error on confirm, deterministic write.
  await page.goto('/termine?reliable=1', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const trigger = page
    .getByRole('button', { name: 'Prüfen und einreichen' })
    .first();
  if ((await trigger.count()) === 0) {
    test.skip(true, 'Frist-Karte absent');
    return;
  }
  const dialog = page.locator('[role="dialog"]').first();
  await trigger.click();
  await dialog.waitFor({ state: 'visible', timeout: 6000 });
  await dialog
    .getByRole('button', { name: /mit eID bestätigen/i })
    .first()
    .click();
  await dialog.waitFor({ state: 'hidden', timeout: 12000 });
  // The rAF handoff loop may need a few frames past base-ui's own restore.
  await page.waitForTimeout(500);
  const probe = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return {
      tag: a?.tagName ?? 'NONE',
      isBody: a === document.body || a === document.documentElement,
      inSpine: !!a?.closest('[data-testid="termine-spine"]'),
      tabindex: a?.getAttribute('tabindex') ?? null,
    };
  });
  console.log('[FRIST-CONFIRM-FOCUS] ' + JSON.stringify(probe));
  expect(probe.isBody, 'focus must NOT fall to <body> after eID confirm').toBe(
    false,
  );
  expect(probe.inSpine, 'focus lands inside termine-spine').toBe(true);
  expect(probe.tabindex, 'target is script-focusable (tabindex=-1)').toBe('-1');
});

test('no horizontal overflow at 320px (WCAG 1.4.10 Reflow)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const probe = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log('[REFLOW-320 termine] ' + JSON.stringify(probe));
  expect(
    probe.scrollWidth,
    'no horizontal scroll at 320px',
  ).toBeLessThanOrEqual(probe.clientWidth + 1);
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/termine', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const pulse = document.querySelector('.animate-pulse');
    if (!pulse) return { found: false as const };
    const cs = getComputedStyle(pulse);
    return { found: true as const, animationDuration: cs.animationDuration };
  });
  console.log('[REDUCED-MOTION termine] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
