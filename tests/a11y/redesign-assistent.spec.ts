import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// a11y audit -- /assistent (HERO, redesign-assistent.md section 11).
// CAVEAT: without ANTHROPIC_API_KEY the SSE route returns an unavailable
// state, so the live preview->confirm->starte_umzug round-trip is NOT
// exercised here. These tests cover the STATIC structure: seeded greeting,
// composer, quick-action chips, Kontext rail, landmarks, reduced-motion.
// UmzugConfirmCard does not render keyless (see report caveat).

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

function summarize(results: AxeResults) {
  return results.violations.map((v) => ({
    id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target,
  }));
}

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  return { results, blockers };
}

async function waitForChat(page: Page) {
  await page.locator('ol[aria-label] li').first()
    .waitFor({ state: 'visible', timeout: 9000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
}

test('axe LIGHT /assistent de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT assistent de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe DARK /assistent de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.documentElement.classList.add('dark'); });
  await waitForChat(page);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK assistent de] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('axe LIGHT /assistent ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL assistent] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT assistent ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('landmarks: single main, single h1, no skipped heading levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const info = await page.evaluate(() => {
    const levels = Array.from(
      document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'),
    ).map((h) => Number(h.tagName.slice(1)));
    return {
      main: document.querySelectorAll('main').length,
      aside: document.querySelectorAll('main aside').length,
      h1: document.querySelectorAll('main h1').length,
      levels,
    };
  });
  console.log('[LANDMARKS assistent] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.aside).toBeGreaterThanOrEqual(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    expect(info.levels[i] - info.levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test('chat log: labelled polite live region (not assertive) inside an ol', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const info = await page.evaluate(() => {
    const ol = document.querySelector('main ol[aria-label]');
    const liveRegions = Array.from(document.querySelectorAll('[aria-live]')).map((el) => ({
      live: el.getAttribute('aria-live'), role: el.getAttribute('role'),
    }));
    return {
      olExists: Boolean(ol),
      olLabel: ol?.getAttribute('aria-label') ?? null,
      olItems: ol ? ol.querySelectorAll(':scope > li').length : 0,
      liveRegions,
    };
  });
  console.log('[LIVE-REGION] ' + JSON.stringify(info));
  expect(info.olExists).toBe(true);
  expect((info.olLabel ?? '').length).toBeGreaterThan(0);
  expect(info.olItems).toBeGreaterThanOrEqual(1);
  const polite = info.liveRegions.filter((r) => r.live === 'polite');
  const assertive = info.liveRegions.filter((r) => r.live === 'assertive');
  expect(polite.length).toBeGreaterThanOrEqual(1);
  expect(assertive.length).toBe(0);
});

test('assistant turn distinguishable to AT beyond colour/alignment', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const hasAssistantLabel = await page.evaluate(() => {
    const ol = document.querySelector('main ol[aria-label]');
    if (!ol) return false;
    const srOnly = Array.from(ol.querySelectorAll('.sr-only')).map((e) => e.textContent ?? '');
    return srOnly.some((t) => /Assistent/i.test(t));
  });
  console.log('[ROLE-LABEL] hasAssistantLabel=' + hasAssistantLabel);
  expect(hasAssistantLabel).toBe(true);
});

test('composer: textarea labelled, send + attach names, attach disabled, send >= 40px', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const textarea = page.locator('main textarea');
  await expect(textarea).toBeVisible();
  const name = await textarea.evaluate((el) => {
    const id = el.getAttribute('id');
    const label = id ? document.querySelector('label[for="' + id + '"]') : null;
    return (label?.textContent ?? el.getAttribute('aria-label') ?? '').trim();
  });
  console.log('[COMPOSER] textarea name=' + JSON.stringify(name));
  expect(name.length).toBeGreaterThan(0);
  const send = page.getByRole('button', { name: /Senden|Send/i });
  await expect(send.first()).toBeVisible();
  const box = await send.first().boundingBox();
  console.log('[COMPOSER] send box=' + JSON.stringify(box));
  expect(box && box.height).toBeGreaterThanOrEqual(40);
  expect(box && box.width).toBeGreaterThanOrEqual(40);
  const attach = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('main button')) as HTMLButtonElement[];
    const x = btns.find((b) => (b.getAttribute('aria-label') ?? '').length > 0 && !!b.querySelector('svg') && b.disabled);
    return x ? { label: x.getAttribute('aria-label'), disabled: x.disabled } : null;
  });
  console.log('[COMPOSER] attach=' + JSON.stringify(attach));
  expect(attach).not.toBeNull();
  expect(attach?.disabled).toBe(true);
});

test('composer: Shift+Enter newline, Tab escapes (no keyboard trap)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const textarea = page.locator('main textarea');
  await textarea.click();
  await textarea.type('Zeile eins');
  await textarea.press('Shift+Enter');
  await textarea.type('Zeile zwei');
  const value = await textarea.inputValue();
  console.log('[COMPOSER] shift+enter value=' + JSON.stringify(value));
  expect(value.includes(String.fromCharCode(10))).toBe(true);
  await textarea.press('Tab');
  const escaped = await page.evaluate(() => document.activeElement?.tagName !== 'TEXTAREA');
  console.log('[COMPOSER] tab escapes textarea=' + escaped);
  expect(escaped).toBe(true);
});

test('quick-action chips are real buttons with names and >= 40px', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const info = await page.evaluate(() => {
    const grp = document.querySelector('main [role="group"]');
    const btns = grp ? Array.from(grp.querySelectorAll('button')) : [];
    return btns.map((b) => ({
      tag: b.tagName, name: (b.textContent ?? '').trim(), h: b.getBoundingClientRect().height,
    }));
  });
  console.log('[CHIPS] ' + JSON.stringify(info));
  expect(info.length).toBeGreaterThanOrEqual(3);
  for (const c of info) {
    expect(c.tag).toBe('BUTTON');
    expect(c.name.length).toBeGreaterThan(2);
    expect(c.h).toBeGreaterThanOrEqual(40);
  }
  const firstChip = page.locator('main [role="group"] button').first();
  await firstChip.focus();
  const outline = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? getComputedStyle(el).outlineStyle : 'none';
  });
  console.log('[CHIPS] focused outlineStyle=' + outline);
});

test('Kontext rail: labelled aside, >= 4 real links with names, decorative svgs hidden', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const info = await page.evaluate(() => {
    const aside = document.querySelector('main aside');
    const links = aside ? Array.from(aside.querySelectorAll('a')) : [];
    return {
      asideLabel: aside?.getAttribute('aria-label') ?? null,
      links: links.map((x) => ({
        href: x.getAttribute('href'),
        name: (x.textContent ?? '').replace(/\s+/g, ' ').trim(),
        decorativeSvg: Array.from(x.querySelectorAll('svg')).every((s) => s.getAttribute('aria-hidden') === 'true'),
      })),
    };
  });
  console.log('[RAIL] ' + JSON.stringify(info));
  expect((info.asideLabel ?? '').length).toBeGreaterThan(0);
  expect(info.links.length).toBeGreaterThanOrEqual(4);
  for (const l of info.links) {
    expect(l.href).toBeTruthy();
    expect(l.name.length).toBeGreaterThan(0);
    expect(l.decorativeSvg).toBe(true);
  }
});

test('reduced-motion: any spinner carries near-zero animation duration', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/assistent', { waitUntil: 'networkidle' });
  await waitForChat(page);
  const sampled = await page.evaluate(() => {
    const spinner = document.querySelector('.animate-spin');
    if (!spinner) return { found: false as const };
    const cs = getComputedStyle(spinner);
    return { found: true as const, animationDuration: cs.animationDuration };
  });
  console.log('[REDUCED-MOTION assistent] ' + JSON.stringify(sampled));
  if (sampled.found) {
    expect(['0s', '0.00001s', '0.01ms', '1e-05s', '0.0000100s']).toContain(sampled.animationDuration);
  }
});
