import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Focused a11y guard for the KI-Erklärer card ("Einfach erklärt") on the
 * "Verstehen" page of the Posteingang Brief-Spread (PostDetail in
 * src/components/posteingang/PosteingangInbox.tsx).
 *
 * The card now (a) lazily loads the letter summary via api.extrahiereAktion with
 * a role="status"/aria-busy skeleton that replaces ONLY the .ai-blocks area,
 * (b) renders ADAPTIVE 2–3 Q&A blocks (Worum always; Betrag iff amount; typed
 * Frist iff deadline; else a "Muss ich etwas tun?" block), and (c) shows an
 * inline retry on transient summary-load errors.
 *
 * Contract under audit:
 *  - WCAG 4.1.3 Status Messages: loading announced (role=status + sr-only) then
 *    cleared — no PERMANENTLY aria-busy region; no double live-region announce.
 *  - WCAG 1.3.1 / 4.1.2: adaptive block count matches the letter's facts.
 *  - WCAG 2.1.1 / 2.4.3: nothing focus-traps; the card's controls stay
 *    keyboard-reachable and labelled.
 *  - WCAG 2.1 AA (axe): 0 serious/critical, light + dark, html[data-lg] default.
 */

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CARD = '.ai-card';

async function setLocaleCookie(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

/**
 * Warm the inbox, reach the letter via CLIENT-SIDE nav (focus its link + Enter —
 * not a cold deep-link, which races hydration), best-effort observe the transient
 * loading region, click the "Verstehen" pager, then wait for the summary to
 * settle (.ai-blocks present, no aria-busy left).
 */
async function reachErklaerer(page: Page, letterId: string) {
  // reliable=1 → deterministic latency + no 5% error injection (keeps the
  // "no error UI" assertions and the degrade path deterministic).
  await page.goto('/posteingang?reliable=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // Wait for the specific inbox link to hydrate before interacting — a cold
  // deep-link/`.first()`-before-hydration race is the known flake here.
  const link = page.locator(`a[href="/posteingang/${letterId}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 20_000 });
  await link.scrollIntoViewIfNeeded();
  await link.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(new RegExp(letterId), { timeout: 15_000 });

  // Best-effort evidence: the loading region should appear at least briefly.
  // (Mock latency is internal; a fast machine may settle before we poll — that
  // is acceptable, so this is logged, not asserted.)
  let sawLoading = false;
  try {
    await page
      .locator(`${CARD} [role="status"][aria-busy="true"]`)
      .waitFor({ state: 'attached', timeout: 1500 });
    sawLoading = true;
  } catch {
    /* already settled — fine */
  }
  // eslint-disable-next-line no-console
  console.log(`[ERKLAERER ${letterId}] transient loading region observed: ${sawLoading}`);

  const verstehenPill = page.getByRole('button', { name: /^Verstehen$/ });
  await verstehenPill.waitFor({ state: 'visible', timeout: 15_000 });
  await verstehenPill.click();

  const card = page.locator(CARD);
  await card.waitFor({ state: 'visible', timeout: 15_000 });
  // Settle: the adaptive blocks are rendered (loading ternary resolved).
  await page.locator(`${CARD} .ai-blocks`).waitFor({ state: 'visible', timeout: 15_000 });
  // Give any trailing state flip (SUMMARY_NOT_FOUND degrade) a beat.
  await page.waitForTimeout(500);
  return card;
}

async function scanCard(page: Page, label: string) {
  const light = await new AxeBuilder({ page }).include(CARD).withTags(AXE_TAGS).analyze();
  // eslint-disable-next-line no-console
  console.log(
    `[A11Y ${label}-light] ` +
      JSON.stringify(light.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }))),
  );
  expect(light.violations, `${label} LIGHT: 0 WCAG 2.1 AA violations`).toHaveLength(0);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  const dark = await new AxeBuilder({ page }).include(CARD).withTags(AXE_TAGS).analyze();
  // eslint-disable-next-line no-console
  console.log(
    `[A11Y ${label}-dark] ` +
      JSON.stringify(dark.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }))),
  );
  expect(dark.violations, `${label} DARK: 0 WCAG 2.1 AA violations`).toHaveLength(0);

  // Reset to light for the next case.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
}

/** Settled-state invariants shared by all cases (WCAG 4.1.3 + double-announce). */
async function assertSettledStatusContract(page: Page, card: ReturnType<Page['locator']>) {
  // No PERMANENTLY aria-busy region left inside the card.
  await expect(
    card.locator('[aria-busy="true"]'),
    'no permanently aria-busy region after settle',
  ).toHaveCount(0);
  // The settled .ai-blocks region carries NO live-region role — so it cannot
  // double-announce against the (now-removed) loading status region.
  await expect(card.locator('.ai-blocks')).toHaveCount(1);
  await expect(
    card.locator('.ai-blocks[role="status"], .ai-blocks[aria-live]'),
    '.ai-blocks is not itself a live region',
  ).toHaveCount(0);
  // For DE-source letters there is no fallback/error status region either, so
  // the only live region during the lifecycle was the transient loader.
  await expect(
    card.locator('[role="status"]'),
    'no residual status region in the settled card',
  ).toHaveCount(0);
}

test.describe('KI-Erklärer adaptive slots — a11y (WCAG 2.1 AA + 4.1.3)', () => {
  test('Betrag + Einspruchsfrist letter → 3 blocks incl. Einspruch question', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    const card = await reachErklaerer(page, 'letter-fa-steuerbescheid-2025');

    await assertSettledStatusContract(page, card);

    const blocks = card.locator('.ai-blocks .ai-block');
    await expect(blocks, 'Worum + Betrag + Frist = 3 adaptive blocks').toHaveCount(3);
    await expect(card.getByText('Worum geht es?')).toBeVisible();
    await expect(card.getByText('Wie hoch ist der Betrag?')).toBeVisible();
    await expect(
      card.getByText('Bis wann kann ich Einspruch einlegen?'),
      'typed Frist question uses the einspruch label',
    ).toBeVisible();
    // No error UI on a seeded letter.
    await expect(card.getByRole('button', { name: /Erneut versuchen/ })).toHaveCount(0);

    await scanCard(page, 'steuerbescheid');
  });

  test('Bestätigungs-letter → 2 blocks (Worum + Muss ich etwas tun?)', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    const card = await reachErklaerer(page, 'letter-aok-mitgliedsbescheinigung');

    await assertSettledStatusContract(page, card);

    const blocks = card.locator('.ai-blocks .ai-block');
    await expect(blocks, 'Worum + Handeln(bestaetigung) = 2 adaptive blocks').toHaveCount(2);
    await expect(card.getByText('Worum geht es?')).toBeVisible();
    await expect(card.getByText('Muss ich etwas tun?')).toBeVisible();
    // No amount / deadline blocks on a plain Bescheinigung.
    await expect(card.getByText('Wie hoch ist der Betrag?')).toHaveCount(0);
    await expect(card.getByRole('button', { name: /Erneut versuchen/ })).toHaveCount(0);

    await scanCard(page, 'aok-bescheinigung');
  });

  test('Unseeded letter (SUMMARY_NOT_FOUND) → silent degrade, 2 blocks, no error UI', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    const card = await reachErklaerer(page, 'letter-umzug2026-buergeramt-bestaetigung');

    // The degrade path must NOT leave a stuck busy region and must NOT show
    // an error/retry — it falls back to the derived answers.
    await assertSettledStatusContract(page, card);

    const blocks = card.locator('.ai-blocks .ai-block');
    await expect(blocks, 'Worum + Handeln(information) = 2 adaptive blocks').toHaveCount(2);
    await expect(card.getByText('Worum geht es?')).toBeVisible();
    await expect(card.getByText('Muss ich etwas tun?')).toBeVisible();
    await expect(
      card.getByText('Zusammenfassung temporär nicht verfügbar', { exact: false }),
      'SUMMARY_NOT_FOUND degrades silently — no error message',
    ).toHaveCount(0);
    await expect(card.getByRole('button', { name: /Erneut versuchen/ })).toHaveCount(0);

    await scanCard(page, 'umzug2026-degrade');
  });

  test('keyboard: card controls reachable, no focus trap', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    await reachErklaerer(page, 'letter-fa-steuerbescheid-2025');

    // Start from the "Verstehen" pager pill and Tab forward, collecting focus.
    const verstehenPill = page.getByRole('button', { name: /^Verstehen$/ });
    await verstehenPill.focus();

    let reachedFeedback = false;
    let leftCardAfterFeedback = false;
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        const cardEl = document.querySelector('.ai-card');
        return {
          isNull: !a || a === document.body,
          inCard: !!(a && cardEl && cardEl.contains(a)),
          isFeedback: !!(a && a.classList.contains('ai-feedback')),
          label: a?.getAttribute('aria-label') ?? a?.textContent?.trim().slice(0, 40) ?? '',
        };
      });
      // Focus is never lost to null/body (WCAG 2.4.3 — no black hole).
      expect(info.isNull, `Tab #${i + 1} lost focus to <body>`).toBe(false);
      if (info.isFeedback) {
        reachedFeedback = true;
        // The feedback control exposes an accessible name (aria-label).
        expect(info.label.length, 'feedback button has an accessible name').toBeGreaterThan(0);
      }
      if (reachedFeedback && !info.inCard) {
        leftCardAfterFeedback = true;
        break;
      }
    }
    expect(reachedFeedback, 'Tab reaches the erklärer feedback button').toBe(true);
    expect(leftCardAfterFeedback, 'focus leaves the card after its last control (no trap)').toBe(true);
  });
});
