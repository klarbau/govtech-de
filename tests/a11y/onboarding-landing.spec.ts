import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([{ name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' }]);
}
function summarize(results: AxeResults) {
  return results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }));
}
async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  return { results, blockers };
}

test('landing sanity h1', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/', { waitUntil: 'networkidle' });
  const h1 = await page.locator('h1').first().innerText();
  console.log('[LANDING h1] ' + JSON.stringify(h1));
  // Brandbook landing headline (matches mockup #8/#6: "Verwaltung, die vorausdenkt.").
  expect(h1).toContain('vorausdenkt');
  expect(await page.locator('h1').count()).toBe(1);
});
test('axe LIGHT landing de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/', { waitUntil: 'networkidle' });
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT landing de] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('axe DARK landing de', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK landing de] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('axe LIGHT landing en', async ({ page }) => {
  await setLocale(page, 'en');
  await page.goto('/', { waitUntil: 'networkidle' });
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT landing en] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('axe landing ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/', { waitUntil: 'networkidle' });
  const dom = await page.evaluate(() => ({ dir: document.documentElement.getAttribute('dir'), lang: document.documentElement.getAttribute('lang') }));
  console.log('[RTL landing] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE landing ar] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('landing heading hierarchy + figcaption', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const levels = Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')).map((h) => Number(h.tagName.slice(1)));
    const fig = document.querySelector('figure[role="group"]');
    const cap = fig?.querySelector('figcaption');
    return { h1: document.querySelectorAll('h1').length, levels, hasFigure: Boolean(fig), figcaptionLen: (cap?.textContent ?? '').length };
  });
  console.log('[LANDING HEADINGS] ' + JSON.stringify(info));
  expect(info.h1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) expect(info.levels[i] - info.levels[i - 1]).toBeLessThanOrEqual(1);
  expect(info.hasFigure).toBe(true);
  expect(info.figcaptionLen).toBeGreaterThan(20);
});
test('landing CTAs + feature links', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/', { waitUntil: 'networkidle' });
  const primary = page.getByRole('link', { name: /Demo erleben/ });
  await expect(primary).toBeVisible();
  await expect(primary).toHaveAttribute('href', '/onboarding');
  await primary.focus();
  const outline = await page.evaluate(() => { const el = document.activeElement as HTMLElement; const cs = getComputedStyle(el); return { ow: cs.outlineWidth, os: cs.outlineStyle }; });
  console.log('[LANDING primary focus] ' + JSON.stringify(outline));
  const n = await page.locator('section#leistungen a').count();
  console.log('[LANDING feature link count] ' + n);
  // Brandbook landing Lebenslagen row = 5 tiles (Umzug/Geburt/Aufenthaltstitel/
  // Steuer/Posteingang), matching mockups #8/#6.
  expect(n).toBe(5);
});
test('landing nav touch targets', async ({ page }) => {
  await setLocale(page, 'de');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const sizes = await page.evaluate(() => {
    const out: { label: string; w: number; h: number }[] = [];
    document.querySelectorAll('header button, header a[href="/onboarding"]').forEach((el) => { const r = el.getBoundingClientRect(); out.push({ label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }); });
    return out;
  });
  console.log('[LANDING nav target sizes] ' + JSON.stringify(sizes));
  for (const s of sizes) if (s.h > 0) expect(s.h).toBeGreaterThanOrEqual(40);
});

test('onboarding sanity h1', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  const h1 = await page.locator('h1').first().innerText();
  console.log('[ONBOARDING A h1] ' + JSON.stringify(h1));
  expect(h1).toContain('Willkommen');
});
test('axe onboarding A de light', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  expect(await page.locator('h1').count()).toBe(1);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE onboarding A de] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('axe onboarding A dark', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const { results, blockers } = await runAxe(page);
  console.log('[AXE onboarding A dark] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('onboarding full keyboard flow + axe each step', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  const did = page.getByRole('button', { name: /DeutschlandID/ });
  await did.focus();
  await page.keyboard.press('Enter');
  const status = page.getByRole('status');
  await expect(status).toBeVisible({ timeout: 3000 });
  const stext = await status.innerText();
  console.log('[FLOW handshake] ' + JSON.stringify(stext));
  expect(stext).toContain('Verbindung');
  const personaH1 = page.getByRole('heading', { level: 1, name: /Identit/ });
  await expect(personaH1).toBeVisible({ timeout: 6000 });
  expect(await page.locator('h1').count()).toBe(1);
  const personaAxe = await runAxe(page);
  console.log('[AXE onboarding C persona] ' + JSON.stringify(summarize(personaAxe.results)));
  expect(personaAxe.blockers).toHaveLength(0);
  await page.getByRole('button', { name: /Anna Petrov/ }).focus();
  await page.keyboard.press('Enter');
  const transH1 = page.getByRole('heading', { level: 1, name: /Diese Daten/ });
  await expect(transH1).toBeVisible({ timeout: 4000 });
  expect(await page.locator('h1').count()).toBe(1);
  const transAxe = await runAxe(page);
  console.log('[AXE onboarding D transparency] ' + JSON.stringify(summarize(transAxe.results)));
  expect(transAxe.blockers).toHaveLength(0);
  await expect(page.getByRole('button', { name: /Anmeldung best/ })).toBeVisible();
});
test('axe onboarding D dark', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByRole('button', { name: /Demo-Modus/ }).click();
  await page.getByRole('button', { name: /Anna Petrov/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Diese Daten/ })).toBeVisible({ timeout: 4000 });
  const { results, blockers } = await runAxe(page);
  console.log('[AXE onboarding D dark] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});

test('onboarding reduced-motion handshake no spin', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /DeutschlandID/ }).click();
  const sampled = await page.evaluate(() => { const svgs = Array.from(document.querySelectorAll('svg')); return { spinning: svgs.filter((n) => n.classList.contains('animate-spin')).length }; });
  console.log('[ONBOARDING reduced-motion spinner] ' + JSON.stringify(sampled));
  await expect(page.getByRole('heading', { level: 1, name: /Identit/ })).toBeVisible({ timeout: 2000 });
  expect(sampled.spinning).toBe(0);
});
test('onboarding demo-mode skips handshake', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Demo-Modus/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Identit/ })).toBeVisible({ timeout: 2000 });
  console.log('[ONBOARDING demo skip OK]');
});
test('onboarding transparency toggle >=44', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Demo-Modus/ }).click();
  await page.getByRole('button', { name: /Familie Schmidt/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Diese Daten/ })).toBeVisible({ timeout: 4000 });
  const sizes = await page.evaluate(() => Array.from(document.querySelectorAll('label')).filter((l) => l.querySelector('[data-slot="switch"]')).map((l) => Math.round(l.getBoundingClientRect().height)));
  console.log('[ONBOARDING toggle heights] ' + JSON.stringify(sizes));
  for (const h of sizes) expect(h).toBeGreaterThanOrEqual(44);
});
test('onboarding skip-link first focusable', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => { const el = document.activeElement as HTMLElement; return { tag: el?.tagName, href: el?.getAttribute('href') }; });
  console.log('[ONBOARDING first tab] ' + JSON.stringify(first));
  expect(first.href).toBe('#main-content');
});
test('axe onboarding A ar RTL', async ({ page }) => {
  await setLocale(page, 'ar');
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  const dom = await page.evaluate(() => ({ dir: document.documentElement.getAttribute('dir'), lang: document.documentElement.getAttribute('lang') }));
  console.log('[RTL onboarding] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE onboarding A ar] ' + JSON.stringify(summarize(results)));
  expect(blockers).toHaveLength(0);
});
test('contrast spot-check landing', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/', { waitUntil: 'networkidle' });
  const samples = await page.evaluate(() => {
    function parse(c: string) { return (c.match(/[0-9.]+/g) || []).map(Number); }
    function lum(rgb: number[]) { const a = rgb.slice(0,3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
    function ratio(fg: string, bg: string) { const L1 = lum(parse(fg)); const L2 = lum(parse(bg)); const hi = Math.max(L1,L2); const lo = Math.min(L1,L2); return Number(((hi+0.05)/(lo+0.05)).toFixed(2)); }
    function bgOf(el: HTMLElement) { let e: HTMLElement | null = el; while (e) { const b = getComputedStyle(e).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b; e = e.parentElement; } return 'rgb(255, 255, 255)'; }
    const out: Record<string, unknown> = {};
    const barWrap = document.querySelector('.bg-success-soft') as HTMLElement | null;
    if (barWrap) { const span = barWrap.querySelector('span') as HTMLElement; const cs = getComputedStyle(span); out.successBar = { fg: cs.color, bg: getComputedStyle(barWrap).backgroundColor, ratio: ratio(cs.color, getComputedStyle(barWrap).backgroundColor) }; }
    const primary = document.querySelector('a[href="/onboarding"]') as HTMLElement | null;
    if (primary) { const cs = getComputedStyle(primary); out.primaryBtn = { fg: cs.color, bg: cs.backgroundColor, ratio: ratio(cs.color, cs.backgroundColor) }; }
    const muted = document.querySelector('.text-text-muted') as HTMLElement | null;
    if (muted) { const cs = getComputedStyle(muted); const bg = bgOf(muted); out.mutedText = { fg: cs.color, bg, ratio: ratio(cs.color, bg) }; }
    const pill = document.querySelector('.bg-accent-soft') as HTMLElement | null;
    if (pill) { const cs = getComputedStyle(pill); out.accentPill = { fg: cs.color, bg: getComputedStyle(pill).backgroundColor, ratio: ratio(cs.color, getComputedStyle(pill).backgroundColor) }; }
    return out;
  });
  console.log('[CONTRAST SAMPLES] ' + JSON.stringify(samples));
});
