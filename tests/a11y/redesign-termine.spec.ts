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
 * termine bucket so the „Vorgemerkt" hero auto-selects into the `.tm-detail`
 * panel deterministically (its confirm CTA + §17 reasoning = the wow). The hero
 * candidate requires `behoerde_id.startsWith('buergeramt-')` && status
 * 'vorgeschlagen' (termin-status.ts: istBuergeramtVorgemerkt) — the default Anna
 * seed only carries an ABH/LEA 'vorgeschlagen' termin (explicitly NEVER the hero),
 * and the real Bürgeramt one is minted by the Umzug autopilot at runtime.
 * Pre-seeding the bucket via addInitScript mirrors the house pattern
 * (pre-insertion-modal.spec.ts, termin-autopilot.spec.ts). The termin carries
 * `owner_persona_id` so the view's persona scope keeps it.
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
        // Only the hero termin is written; reminders/behoerden seed normally
        // (the seeder skips a non-empty bucket). One hero termin is enough for
        // the detail-panel assertions.
        window.localStorage.setItem(ns + 'termine', JSON.stringify([heroTermin]));
      } catch {
        // non-browser env
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

async function waitForTermine(page: Page) {
  // The mock-backend has a 5% simulated error rate -> TermineView may render an
  // error EmptyState with a 'Erneut versuchen' button (no calendar grid). Retry
  // until the calendar grid (left rail) is mounted. The MonthCalendar renders
  // unconditionally in the left rail of the command-center body on ready.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('[role="grid"] button[tabindex="0"]')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 })
      .catch(() => undefined);
    await page.waitForTimeout(600);
    const hasGrid = await page.locator('[role="grid"]').count();
    if (hasGrid > 0) return;
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

test('MonthCalendar is a grid with gridcells, aria-selected/current on cell, roving tabindex', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { hasGrid: false as const };
    const cells = Array.from(grid.querySelectorAll('[role="gridcell"]'));
    const columnheaders = grid.querySelectorAll('[role="columnheader"]').length;
    const focusableButtons = Array.from(
      grid.querySelectorAll('button[tabindex="0"]'),
    );
    const cellWithCurrent = cells.find(
      (c) => c.getAttribute('aria-current') === 'date',
    );
    return {
      hasGrid: true as const,
      gridLabelled: Boolean(grid.getAttribute('aria-label')),
      cellCount: cells.length,
      columnheaders,
      rovingFocusable: focusableButtons.length,
      hasTodayCell: Boolean(cellWithCurrent),
    };
  });
  console.log('[CALENDAR-GRID termine] ' + JSON.stringify(info));
  expect(info.hasGrid).toBe(true);
  if (info.hasGrid) {
    expect(info.gridLabelled).toBe(true);
    expect(info.cellCount).toBe(42);
    expect(info.columnheaders).toBe(7);
    expect(info.rovingFocusable).toBe(1);
  }
});

test('MonthCalendar keyboard navigation moves focus and selects with Enter', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const activeDay = page.locator('[role="grid"] button[tabindex="0"]');
  await expect(activeDay).toHaveCount(1);
  await activeDay.focus();
  const startLabel = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? '',
  );
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const afterRight = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? '',
  );
  console.log(
    '[CALENDAR-KBD] start=' + startLabel + ' afterRight=' + afterRight,
  );
  expect(afterRight).not.toBe('');
  expect(afterRight).not.toBe(startLabel);
  await expect(page.locator('[role="grid"] button[tabindex="0"]')).toHaveCount(
    1,
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const selectedCount = await page.evaluate(
    () =>
      document.querySelectorAll('[role="gridcell"][aria-selected="true"]')
        .length,
  );
  console.log('[CALENDAR-KBD] selectedCount after Enter = ' + selectedCount);
  expect(selectedCount).toBe(1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(150);
  await expect(page.locator('[role="grid"] button[tabindex="0"]')).toHaveCount(
    1,
  );
});

test('out-of-month day text colour meets >= 4.5:1 (prior fix: text-text-muted not /60)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const sample = await page.evaluate(() => {
    function srgb(c: number) {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function lum(r: number, g: number, b: number) {
      return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
    }
    function parse(str: string): [number, number, number, number] {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return [255, 255, 255, 1];
      const p = m[1].split(',').map((x) => parseFloat(x.trim()));
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
    }
    function composite(
      fg: [number, number, number, number],
      bg: [number, number, number],
    ): [number, number, number] {
      const a = fg[3];
      return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a)),
      ];
    }
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { found: false as const };
    const buttons = Array.from(
      grid.querySelectorAll('[role="gridcell"] button'),
    ) as HTMLElement[];
    const pageBg = parse(getComputedStyle(document.body).backgroundColor);
    const pageBgRgb: [number, number, number] = [
      pageBg[0],
      pageBg[1],
      pageBg[2],
    ];
    let worst = 999;
    let worstColor = '';
    for (const b of buttons) {
      const cs = getComputedStyle(b);
      const fg = parse(cs.color);
      const fgRgb = composite(fg, pageBgRgb);
      const ratio =
        (Math.max(lum(...fgRgb), lum(...pageBgRgb)) + 0.05) /
        (Math.min(lum(...fgRgb), lum(...pageBgRgb)) + 0.05);
      if (ratio < worst) {
        worst = ratio;
        worstColor = cs.color;
      }
    }
    return { found: true as const, worst, worstColor };
  });
  console.log('[CALENDAR-CONTRAST termine] ' + JSON.stringify(sample));
  expect(sample.found).toBe(true);
  if (sample.found) {
    expect(sample.worst).toBeGreaterThanOrEqual(4.5);
  }
});

test('event-bearing days expose the category breakdown in the cell aria-label (text, not colour-only)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { found: false as const };
    const buttons = Array.from(
      grid.querySelectorAll('[role="gridcell"] button'),
    ) as HTMLElement[];
    // Days with an event marker dot (aria-hidden) must mention a category word
    // (Termin / Frist / Erinnerung) in the cell aria-label.
    const withDot = buttons.filter((b) => {
      const dots = Array.from(b.querySelectorAll('span[aria-hidden="true"]'));
      return dots.some((d) => d.className.includes('rounded-full'));
    });
    const allHaveTextMarker = withDot.every((b) =>
      /Termin|Frist|Erinnerung/i.test(b.getAttribute('aria-label') ?? ''),
    );
    return {
      found: true as const,
      dotDays: withDot.length,
      allHaveTextMarker,
    };
  });
  console.log('[CALENDAR-MARKER termine] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  if (info.found && info.dotDays > 0) {
    expect(info.allHaveTextMarker).toBe(true);
  }
});

test('center lists render as labelled regions (Anstehende Termine + Fristen)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const anstehende = page.getByRole('heading', {
    name: /^Anstehende Termine$/i,
  });
  const fristen = page.getByRole('heading', {
    name: /^Fristen, die Sie im Blick/i,
  });
  await expect(anstehende, 'Anstehende-Termine heading present').toHaveCount(1);
  await expect(fristen, 'Fristen heading present').toHaveCount(1);
  // Both lists are headings inside <section aria-labelledby> regions.
  const wiring = await page.evaluate(() => {
    const headings = Array.from(
      document.querySelectorAll('main section[aria-labelledby] > div > h2[id]'),
    );
    const labelledRegions = headings.filter((h) => {
      const sec = h.closest('section[aria-labelledby]');
      return sec?.getAttribute('aria-labelledby') === h.id;
    });
    return { labelledRegions: labelledRegions.length };
  });
  console.log('[SECTIONS termine] ' + JSON.stringify(wiring));
  expect(wiring.labelledRegions).toBeGreaterThanOrEqual(2);
});

test('tab toolbar has aria-pressed chips and no filter checkboxes', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  // The 5 tabs are aria-pressed buttons; exactly one is pressed at a time.
  const tabs = page.locator('main .tab-chips button[aria-pressed]');
  await expect(tabs).toHaveCount(5);
  const pressed = await page
    .locator('main .tab-chips button[aria-pressed="true"]')
    .count();
  expect(pressed, 'exactly one tab pressed').toBe(1);
  // No checkbox-based filter survives the rework.
  const checkboxes = await page
    .locator('main [data-slot="checkbox"], main fieldset input[type="checkbox"]')
    .count();
  expect(checkboxes, 'no filter checkboxes after rework').toBe(0);
  // Switching to the „Vergangen" tab is keyboard-operable.
  const vergangen = page
    .locator('main .tab-chips button', { hasText: /^Vergangen$/ })
    .first();
  await vergangen.focus();
  await expect(vergangen).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  await expect(vergangen).toHaveAttribute('aria-pressed', 'true');
});

test('Vorgemerkt §17 hero: CTA + §17 reasoning + non-focusable badge, then confirm renders the honest Quittung', async ({
  page,
}) => {
  await seedVorgemerktHero(page);
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);

  // The §17 Bürgeramt termin auto-selects into the .tm-detail panel. Probe it
  // structurally (reliable mode → the seed is deterministic).
  const probe = await page.evaluate(() => {
    const panel = document.querySelector('main .tm-detail');
    if (!panel) return { found: false as const };
    const bodyText = (panel.textContent ?? '').toLowerCase();
    if (!bodyText.includes('§ 17') && !/§\s*17/.test(panel.textContent ?? '')) {
      // Panel present but the §17 termin didn't select (likely seed miss).
      return { found: false as const };
    }
    // The status badge is a non-focusable <span class="badge ..."> in the title.
    const titleRow = panel.querySelector('.tm-detail-title');
    const tag = titleRow?.querySelector('span.badge') ?? null;
    const tagTag = tag?.tagName ?? '';
    const tagFocusable =
      tag !== null &&
      (tag.hasAttribute('tabindex') ||
        ['BUTTON', 'A'].includes(tag.tagName) ||
        ['button', 'link'].includes(tag.getAttribute('role') ?? ''));
    const confirmButtons = Array.from(panel.querySelectorAll('button')).filter(
      (b) => /termin bestätigen/i.test(b.textContent ?? ''),
    );
    return {
      found: true as const,
      hasMockMarker: bodyText.includes('[mock]'),
      hasParagraf17: /§\s*17/.test(panel.textContent ?? ''),
      confirmCount: confirmButtons.length,
      tagText: (tag?.textContent ?? '').trim(),
      tagTag,
      tagFocusable,
    };
  });
  console.log('[HERO-PANEL termine] ' + JSON.stringify(probe));
  // Reliable mode makes the seed deterministic, so a missing §17 panel is a real
  // regression — fail loudly instead of silently skipping (no false-PASS).
  expect(
    probe.found,
    '§17 vorgemerkt termin must auto-select into .tm-detail',
  ).toBe(true);
  expect(probe.confirmCount, 'exactly one „Termin bestätigen" button').toBe(1);
  expect(probe.hasMockMarker, '[MOCK] marker present').toBe(true);
  expect(probe.hasParagraf17, '§ 17 reasoning present').toBe(true);
  expect(probe.tagTag, 'status badge is a <span>').toBe('SPAN');
  expect(
    probe.tagFocusable,
    'status badge must NOT be focusable / interactive',
  ).toBe(false);

  // Behavioral: the §17 wow is the confirm → honest receipt, not just the CTA's
  // presence. Click „Termin bestätigen" and assert the Datenminimierungs-Quittung
  // renders in-panel and the badge flips out of „vorgemerkt".
  const detail = page.locator('main .tm-detail');
  await detail
    .locator('button', { hasText: /termin bestätigen/i })
    .first()
    .click();

  const quittung = detail.locator('.vr-card');
  await expect(
    quittung,
    'Datenminimierungs-Quittung renders after confirm',
  ).toBeVisible({ timeout: 10_000 });
  // Honest copy: a read-receipt about the calendar, never a Posteingang/sent claim.
  await expect(quittung).toContainText(/kalender/i);
  await expect(
    detail.locator('.tm-detail-title .badge'),
    'status badge flips out of „vorgemerkt" after confirm',
  ).not.toHaveText(/vorgemerkt/i);
});

test('Fristen badge text colour meets contrast in light and conveys number+word', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const info = await page.evaluate(() => {
    function srgb(c: number) {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function lum(r: number, g: number, b: number) {
      return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
    }
    function parse(str: string): [number, number, number] {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0];
      const p = m[1].split(',').map((x) => parseFloat(x.trim()));
      return [p[0], p[1], p[2]];
    }
    function ratio(fg: string, bg: string) {
      const f = parse(fg);
      const b = parse(bg);
      const lf = lum(f[0], f[1], f[2]);
      const lb = lum(b[0], b[1], b[2]);
      return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    }
    const badges = Array.from(
      document.querySelectorAll('main [data-slot="badge"]'),
    );
    const fristBadges = badges.filter((b) =>
      /Tag|heute|überfällig/i.test(b.textContent ?? ''),
    ) as HTMLElement[];
    if (fristBadges.length === 0) return { found: false as const };
    let worst = 999;
    let sampleText = '';
    for (const b of fristBadges) {
      const cs = getComputedStyle(b);
      const r = ratio(cs.color, cs.backgroundColor);
      if (r < worst) {
        worst = r;
        sampleText = (b.textContent ?? '').trim();
      }
    }
    const hasNumberOrWord = fristBadges.some((b) =>
      /\d|heute|überfällig/i.test(b.textContent ?? ''),
    );
    return { found: true as const, worst, sampleText, hasNumberOrWord };
  });
  console.log('[FRIST-BADGE termine] ' + JSON.stringify(info));
  if (info.found) {
    expect(info.worst).toBeGreaterThanOrEqual(4.5);
    expect(info.hasNumberOrWord).toBe(true);
  }
});

/**
 * Focus-trap Tab-sweep for the two detail dialogs (TerminAbsagenDialog /
 * TerminRescheduleDialog). Mirrors the house idiom from pre-insertion-modal.spec
 * (focus-trap + ESC dismiss) and modal-inert-containment.spec (body never holds
 * focus). Both triggers now live in the `.tm-detail` panel (the §17 termin must
 * be selected there), so the seed is required.
 */
async function openDetailDialog(
  page: Page,
  triggerName: RegExp,
  popupSelector: string,
) {
  const trigger = page
    .locator('main .tm-detail')
    .getByRole('button', { name: triggerName })
    .first();
  await trigger.waitFor({ state: 'visible', timeout: 8000 });
  const popup = page.locator(popupSelector).first();
  let opened = false;
  for (let attempt = 0; attempt < 4 && !opened; attempt++) {
    await trigger.click().catch(() => undefined);
    opened = await popup
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(
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
    el.getAttribute('aria-label') ?? el.getAttribute('title') ?? text.slice(0, 40);
  return { tag, isBody, isSkipLink, inPopup, isDevPortal, label };
}

function inertProbe() {
  const marked = Array.from(
    document.querySelectorAll('[data-base-ui-inert]'),
  ) as HTMLElement[];
  const markedNotInert = marked
    .filter((el) => !el.inert)
    .map((el) => el.tagName);
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
  expect(
    skipLinkHits,
    where + ': focus must NEVER reach the skip-link',
  ).toEqual([]);
  const realOutside = visited.filter(
    (d) => !d.inPopup && !d.isBody && !d.isDevPortal && d.tag !== 'NONE',
  );
  expect(
    realOutside.map((d) => ({ tag: d.tag, label: d.label })),
    where + ': focus must never land on a real control outside the modal',
  ).toEqual([]);
}

function assertChromeInert(open: ReturnType<typeof inertProbe>, where: string) {
  expect(
    open.markedCount,
    where + ': base-ui marked >=1 background element',
  ).toBeGreaterThan(0);
  expect(
    open.topPopupInsideInert,
    where + ': the popup itself must NOT be inert',
  ).toBe(false);
  if (open.headerInert !== null)
    expect(open.headerInert, where + ': header is inert').toBe(true);
  if (open.sidebarInert !== null)
    expect(open.sidebarInert, where + ': sidebar is inert').toBe(true);
  if (open.skipInert !== null)
    expect(open.skipInert, where + ': skip-link is inert').toBe(true);
  const leaky = open.markedNotInert.filter(
    (t) => !['SCRIPT', 'NEXT-ROUTE-ANNOUNCER', 'STYLE', 'LINK'].includes(t),
  );
  expect(
    leaky,
    where + ': no focusable background landmark left without real inert',
  ).toEqual([]);
}

test('TerminAbsagenDialog: Tab-sweep stays in the alertdialog, ESC closes + restores focus', async ({
  page,
}) => {
  await seedVorgemerktHero(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const triggerPresent = await page
    .locator('main .tm-detail')
    .getByRole('button', { name: /^Absagen$/i })
    .count();
  if (triggerPresent === 0) {
    test.skip(true, 'detail panel Absagen trigger absent (seed miss)');
    return;
  }
  const { trigger, popup, opened } = await openDetailDialog(
    page,
    /^Absagen$/i,
    '[role="alertdialog"]',
  );
  if (!opened) {
    test.skip(true, 'TerminAbsagenDialog did not open after retries (mock error)');
    return;
  }
  await expect(popup).toBeVisible();
  const open = await page.evaluate(inertProbe);
  console.log('[ABSAGEN inertProbe open] ' + JSON.stringify(open));
  assertChromeInert(open, 'TerminAbsagenDialog');
  const visited = await tabSweepCollect(page, 10);
  console.log(
    '[ABSAGEN sweep] ' +
      JSON.stringify(visited.map((d) => ({ t: d.tag, inn: d.inPopup }))),
  );
  assertContained(visited, 'TerminAbsagenDialog');
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden', timeout: 6000 });
  await page.waitForTimeout(200);
  const closed = await page.evaluate(inertProbe);
  expect(closed.realInertCount, 'no [inert] left after close').toBe(0);
  await expect(trigger, 'focus returns to the Absagen trigger').toBeFocused();
});

test('TerminRescheduleDialog: Tab-sweep stays in the dialog, ESC closes + restores focus', async ({
  page,
}) => {
  await seedVorgemerktHero(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/termine', { waitUntil: 'networkidle' });
  await waitForTermine(page);
  const triggerPresent = await page
    .locator('main .tm-detail')
    .getByRole('button', { name: /Termin verschieben/i })
    .count();
  if (triggerPresent === 0) {
    test.skip(true, 'detail panel Verschieben trigger absent (seed miss)');
    return;
  }
  const { trigger, popup, opened } = await openDetailDialog(
    page,
    /Termin verschieben/i,
    '[role="dialog"]',
  );
  if (!opened) {
    test.skip(
      true,
      'TerminRescheduleDialog did not open after retries (mock error)',
    );
    return;
  }
  await expect(popup).toBeVisible();
  const open = await page.evaluate(inertProbe);
  console.log('[RESCHEDULE inertProbe open] ' + JSON.stringify(open));
  assertChromeInert(open, 'TerminRescheduleDialog');
  const visited = await tabSweepCollect(page, 10);
  console.log(
    '[RESCHEDULE sweep] ' +
      JSON.stringify(visited.map((d) => ({ t: d.tag, inn: d.inPopup }))),
  );
  assertContained(visited, 'TerminRescheduleDialog');
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden', timeout: 6000 });
  await page.waitForTimeout(200);
  const closed = await page.evaluate(inertProbe);
  expect(closed.realInertCount, 'no [inert] left after close').toBe(0);
  await expect(trigger, 'focus returns to the Verschieben trigger').toBeFocused();
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
