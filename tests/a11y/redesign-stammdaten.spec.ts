import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Redesign a11y audit — /stammdaten „Green Bento" surface.
 *
 * Rewritten 2026-07-17. The earlier V1.3 re-skin audit anchored on the
 * hero+tabs+sektionen surface (`stammdaten-hero`, `tab-wallet`,
 * `sektion-sperren_einstellungen`, `sektion-mobilitaet`, RichtungSwitch radios,
 * and the four data-collecting modals). The green-bento StammdatenView dropped
 * all of those, so the tests that exercised them — plus the plain full-page
 * axe / structure passes now owned by `stammdaten-page.spec.ts` +
 * `stammdaten-v3-redesign.spec.ts` — were removed.
 *
 * What survives here is the intention NOT covered by those two specs, re-pointed
 * at the live v2 anchors: the RTL axe pass, the status-chip-by-text guarantee,
 * the activity-log landmark, and the Datenhoheit footer.
 */

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

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
  await page
    .locator('[data-testid="v2-verify-chips"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page
    .locator('[data-testid="v2-protokoll-card"]')
    .waitFor({ state: 'visible', timeout: 15000 });
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

test('axe LIGHT stammdaten ar RTL', async ({ page }) => {
  await setupPersona(page, 'anna-petrov', 'ar');
  await warm(page);
  const dom = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log('[RTL stammdaten] ' + JSON.stringify(dom));
  expect(dom.dir).toBe('rtl');
  expect(dom.lang).toBe('ar');
  const { results, blockers } = await runAxe(page);
  console.log('[AXE-LIGHT stammdaten ar] ' + JSON.stringify(summarize(results)));
  expect(blockers, 'serious-or-critical').toHaveLength(0);
});

test('status-chip row conveys state by text, not colour alone', async ({ page }) => {
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  const chips = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="v2-verify-chips"]');
    if (!row) return { found: false as const, texts: [] as string[] };
    const texts = Array.from(row.children)
      .map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 0);
    return { found: true as const, texts };
  });
  console.log('[STATUS-CHIPS] ' + JSON.stringify(chips));
  expect(chips.found).toBe(true);
  expect(chips.texts.length).toBeGreaterThanOrEqual(2);
  for (const t of chips.texts) {
    expect(t.length).toBeGreaterThan(3);
  }
});

test('Änderungsprotokoll rail is a labelled landmark region', async ({ page }) => {
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  const info = await page.evaluate(() => {
    const rail = document.querySelector('[data-testid="v2-protokoll-card"]');
    return {
      found: Boolean(rail),
      // A <section> or <aside> with an accessible name is a navigable landmark;
      // a bare <div> would not be.
      isLandmark: rail?.tagName === 'ASIDE' || rail?.tagName === 'SECTION',
      hasLabel:
        Boolean(rail?.getAttribute('aria-label')) ||
        Boolean(rail?.getAttribute('aria-labelledby')),
    };
  });
  console.log('[RAIL stammdaten] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  expect(info.isLandmark).toBe(true);
  expect(info.hasLabel).toBe(true);
});

test('Hoheit-footer banner is present', async ({ page }) => {
  await setupPersona(page, 'anna-petrov');
  await warm(page);
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="v2-datenhoheit-banner"]');
    return {
      found: Boolean(el),
      text: (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
    };
  });
  console.log('[HOHEIT-FOOTER] ' + JSON.stringify(info));
  expect(info.found).toBe(true);
  expect(/Hoheit über Ihre Daten|in control of your data/i.test(info.text)).toBe(true);
});
