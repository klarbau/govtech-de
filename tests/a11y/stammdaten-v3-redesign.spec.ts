/**
 * Stammdaten V3 redesign a11y + visual gate.
 *
 * Covers the new "Verifizierter Identitätsraum + Once-Only-Maschine" surface:
 *   page <h1> → IdentitaetsHero (EidCredentialCard) → OnceOnlyRegisterPanel
 *   → 3-column v2 card grid → DatenhoheitFooter.
 *
 * Asserts axe-clean (LIGHT + DARK + mobile), exactly one main/h1, non-skipped
 * headings, an honest non-zero Once-Only register count, and captures
 * full-page screenshots used to eyeball the redesign.
 *
 * DEFERRED (test.fixme, 2026-06-20): the green "Waldgrün" brandbook redesign won
 * the /stammdaten surface (green-bento StammdatenView) in the design-merge to main.
 * The V3 IdentitaetsHero + OnceOnlyRegisterPanel components are preserved in git
 * history but are no longer rendered by the live view, so these specs target
 * orphaned markup (#sd-hero-title never mounts). Un-fixme if V3 is re-wired.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'node:path';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const SHOT_DIR = path.resolve(process.cwd(), '.tmp-shots');

async function setupPersona(page: Page, personaId: string, locale = 'de') {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
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
          'profile',
          'stammdaten:kontakt',
          'stammdaten:uebermittlungs-log',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        // ignore
      }
    },
    [NS, personaId],
  );
}

async function warm(page: Page) {
  await page.goto('/stammdaten', { waitUntil: 'networkidle' });
  await page.locator('#sd-hero-title').waitFor({ state: 'visible', timeout: 30_000 });
  await page
    .locator('#sd-onceonly-title')
    .waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(500);
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

test.fixme('axe LIGHT desktop + screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  await page.screenshot({
    path: path.join(SHOT_DIR, 'stammdaten-v3-light-desktop.png'),
    fullPage: true,
  });
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT desktop] ' + JSON.stringify(summarize(results)));
  expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
});

test.fixme('axe DARK desktop + screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await setupPersona(page, 'anna-petrov');
  await page.emulateMedia({ colorScheme: 'dark' });
  await warm(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(SHOT_DIR, 'stammdaten-v3-dark-desktop.png'),
    fullPage: true,
  });
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-DARK desktop] ' + JSON.stringify(summarize(results)));
  expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
});

test.fixme('axe LIGHT mobile + screenshot (responsive)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  await page.screenshot({
    path: path.join(SHOT_DIR, 'stammdaten-v3-light-mobile.png'),
    fullPage: true,
  });
  // The page content (everything inside <main>) must not overflow at narrow
  // width. The global Topbar chrome (gt-header-actions / gt-user-pill) has a
  // pre-existing ~17px overflow at 390px that is unrelated to this screen and
  // present app-wide, so we scope the assertion to <main>.
  const { mainOverflow, mainOffenders, shellOffenders } = await page.evaluate(
    () => {
      const vw = document.documentElement.clientWidth;
      const main = document.querySelector('main');
      const probe = (root: ParentNode) =>
        Array.from(root.querySelectorAll('*'))
          .filter((el) => el.getBoundingClientRect().right > vw + 1)
          .slice(0, 8)
          .map((el) => ({
            tag: el.tagName,
            cls: String((el as HTMLElement).className).slice(0, 50),
            right: Math.round(el.getBoundingClientRect().right),
          }));
      return {
        mainOverflow: main ? main.scrollWidth - main.clientWidth : 0,
        mainOffenders: main ? probe(main) : [],
        shellOffenders: probe(document.body).filter(
          (o) => !o.cls.includes('gt-content'),
        ),
      };
    },
  );
  console.log(
    '[OVERFLOW mobile] main=' +
      mainOverflow +
      ' mainOffenders=' +
      JSON.stringify(mainOffenders) +
      ' shell(pre-existing)=' +
      JSON.stringify(shellOffenders),
  );
  expect(mainOverflow, 'main content must not overflow at 390px').toBeLessThanOrEqual(1);
  expect(mainOffenders, 'no main descendant exceeds the viewport').toHaveLength(0);
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT mobile] ' + JSON.stringify(summarize(results)));
  expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
});

test.fixme('structure: one main + one h1, non-skipped headings', async ({ page }) => {
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  const info = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length,
    h1: document.querySelectorAll('h1').length,
    mainH1: document.querySelectorAll('main h1').length,
    levels: Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4'))
      .filter((h) => !h.classList.contains('sr-only'))
      .map((h) => Number(h.tagName.slice(1))),
  }));
  console.log('[STRUCTURE] ' + JSON.stringify(info));
  expect(info.main).toBe(1);
  expect(info.h1).toBe(1);
  expect(info.mainH1).toBe(1);
  expect(info.levels[0]).toBe(1);
  for (let i = 1; i < info.levels.length; i++) {
    expect(info.levels[i] - info.levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test.fixme('Once-Only panel: honest non-zero register count + node chips + verify chips', async ({
  page,
}) => {
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  const data = await page.evaluate(() => {
    const panel = document.querySelector(
      'section[aria-labelledby="sd-onceonly-title"]',
    );
    const summary = panel?.querySelector('p')?.textContent ?? '';
    const chips = panel?.querySelectorAll('ul[role="list"] > li').length ?? 0;
    const verify = document.querySelector('[data-testid="v2-verify-chips"]');
    const verifyChips = verify ? verify.children.length : 0;
    const countMatch = summary.match(/\b(\d+)\b/);
    return {
      summary,
      chips,
      verifyChips,
      count: countMatch ? Number(countMatch[1]) : 0,
    };
  });
  console.log('[ONCE-ONLY] ' + JSON.stringify(data));
  expect(data.count).toBeGreaterThan(0);
  expect(data.chips).toBeGreaterThanOrEqual(5);
  expect(data.verifyChips).toBeGreaterThanOrEqual(2);
});
