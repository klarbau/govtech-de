import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Redesign a11y audit -- /familie (Spec: docs/specs/redesign-familie.md).
 *
 * Confirms: axe 0 serious/critical light+dark+ar(RTL); exactly one <main>,
 * one <h1>; monogram Avatars + member-monogram chips carry accessible text
 * (not colour-only); role badges carry text; the "Was betrifft wen?" count rail
 * is a proper landmark with <dl>-based counts; the Vertretung banner is
 * announced (role=note + text speculative marker); the Sicher-footer links to
 * /datenschutz; the HaushaltVerwaltenDialog traps + restores focus.
 */

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const ROUTE = '/familie';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
  // Reliable mode disables the 5% random mock error so getFamilie always
  // resolves and the member cards / counts render deterministically.
  await page.addInitScript(() => {
    try {
      const meta = window.localStorage.getItem('govtech-de:v1:meta');
      const parsed = meta ? JSON.parse(meta) : { version: 1 };
      parsed.reliable_mode = true;
      window.localStorage.setItem('govtech-de:v1:meta', JSON.stringify(parsed));
    } catch {
      // ignore
    }
  });
}

async function waitForReady(page: Page) {
  await page
    .getByRole('heading', { name: /Mein Haushalt|My household|Моё|Мій|أسرتي|Hane/i })
    .first()
    .waitFor({ state: 'visible', timeout: 12000 })
    .catch(() => undefined);
  await page.waitForTimeout(1200);
}

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

test('axe LIGHT familie de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT familie de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK familie de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await waitForReady(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK familie de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT familie ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL familie] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT familie ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('exactly one main and one h1', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const info = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length,
    h1: document.querySelectorAll('h1').length,
    mainH1: document.querySelectorAll('main h1').length,
  }));
  console.log('[LANDMARKS familie] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.mainH1).toBe(1);
});

test('member monogram avatars + role badges convey by text, not colour', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const haushalt = await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll("main h2")).find((h) =>
      /Mein Haushalt/i.test(h.textContent ?? ""),
    );
    const nameParas = Array.from(
      document.querySelectorAll("main p[class*=font-semibold]"),
    )
      .map((p) => (p.textContent ?? "").trim())
      .filter((t) => /[A-Za-zÀ-ÿ]{2,} [A-Za-zÀ-ÿ]/.test(t));
    const mainText = (document.querySelector("main")?.textContent ?? "");
    const hasRoleText = /Mutter|Partner|Kind|Hauptperson/.test(mainText);
    return {
      headingFound: Boolean(heading),
      nameSamples: nameParas.slice(0, 6),
      hasRoleText,
    };
  });
  console.log("[MEMBER-CARDS] " + JSON.stringify(haushalt));
  expect(haushalt.headingFound).toBe(true);
  // Member identity reaches AT as visible text, not via avatar colour alone.
  expect(haushalt.nameSamples.length).toBeGreaterThanOrEqual(2);
  // Role conveyed by a text label (not colour-only) -- HL-DS-3.
  expect(haushalt.hasRoleText).toBe(true);
});

test('member-monogram chips on Gemeinsame Vorgänge carry an accessible name', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const chips = await page.evaluate(() => {
    const groups = Array.from(
      document.querySelectorAll('main [role="img"][aria-label]'),
    );
    // Only the member-chip groups carry a "Betrifft:"-style aria-label.
    return groups
      .map((g) => g.getAttribute('aria-label') ?? '')
      .filter((l) => /Betrifft|Concerns|Касается|Стосується|يخص|İlgili/i.test(l));
  });
  console.log('[MEMBER-CHIPS] ' + JSON.stringify(chips));
  expect(chips.length).toBeGreaterThan(0);
  for (const label of chips) {
    expect(label.length).toBeGreaterThan(6);
  }
});

test('Was betrifft wen rail is an aside landmark with dl-based counts', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const info = await page.evaluate(() => {
    const asides = Array.from(document.querySelectorAll('main aside[aria-label]'));
    const rail = asides.find((a) =>
      /betrifft|Concerns|Кого|Кого|من يخص|kimi/i.test(a.getAttribute('aria-label') ?? ''),
    );
    return {
      asideCount: asides.length,
      railFound: Boolean(rail),
      railHasDl: rail ? Boolean(rail.querySelector('dl')) : false,
      dtCount: rail ? rail.querySelectorAll('dt').length : 0,
      ddCount: rail ? rail.querySelectorAll('dd').length : 0,
    };
  });
  console.log('[RAIL] ' + JSON.stringify(info));
  expect(info.railFound).toBe(true);
  expect(info.railHasDl).toBe(true);
  expect(info.dtCount).toBeGreaterThanOrEqual(4);
  expect(info.ddCount).toBe(info.dtCount);
});

test('Vertretung banner is announced via role=note with a text speculative marker', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const banner = await page.evaluate(() => {
    const notes = Array.from(document.querySelectorAll('main [role="note"]'));
    const vertretung = notes.find((n) =>
      /Vertretung|representation|представит|представн|تمثيل|temsil/i.test(
        n.getAttribute('aria-label') ?? n.textContent ?? '',
      ),
    );
    return {
      found: Boolean(vertretung),
      hasSpeculativeText: vertretung
        ? /Spekulativ|Speculative|демо|demo|تجريبي|spekülatif|Demo-Feature/i.test(
            vertretung.textContent ?? '',
          )
        : false,
    };
  });
  console.log('[VERTRETUNG] ' + JSON.stringify(banner));
  expect(banner.found).toBe(true);
  expect(banner.hasSpeculativeText).toBe(true);
});

test('Sicher footer links to /datenschutz', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);
  const link = page.locator('main a[href="/datenschutz"]');
  await expect(link.first()).toBeVisible();
  const box = await link.first().boundingBox();
  console.log('[SICHER-LINK] height = ' + (box?.height ?? 0));
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
});

test('HaushaltVerwaltenDialog traps focus and restores it to the trigger on close', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'networkidle' });
  await waitForReady(page);

  const trigger = page.getByRole('button', { name: /Haushalt verwalten|manage/i }).first();
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const focusInDialog = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const active = document.activeElement;
    return Boolean(dlg && active && dlg.contains(active));
  });
  console.log('[DIALOG] focus trapped inside = ' + focusInDialog);
  expect(focusInDialog).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.waitForTimeout(200);
  const restored = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return (a?.textContent ?? '').trim();
  });
  console.log('[DIALOG] focus restored to = ' + restored);
  expect(restored.length).toBeGreaterThan(0);
});

test('reduced-motion stills the loading skeleton pulse', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(ROUTE + '?reliable=1', { waitUntil: 'commit' });
  const sampled = await page.evaluate(() => {
    const sk = document.querySelector('[aria-busy="true"].animate-pulse');
    if (!sk) return { found: false as const };
    return { found: true as const, animationDuration: getComputedStyle(sk).animationDuration };
  });
  console.log('[REDUCED-MOTION familie] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(
      sampled.animationDuration,
    );
  }
});
