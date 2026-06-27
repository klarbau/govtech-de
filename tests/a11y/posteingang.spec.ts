import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

async function setLocaleCookie(page: Page, locale: string) {
  await page.context().addCookies([
    {
      name: LOCALE_COOKIE_NAME,
      value: locale,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Posteingang a11y — axe-core (WCAG 2.1 AA)', () => {
  test('axe scan: inbox /posteingang', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
    }));
    // eslint-disable-next-line no-console
    console.log('[A11Y posteingang-inbox-summary] ' + JSON.stringify(summary));

    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blockers, 'serious/critical violations').toHaveLength(0);
  });

  test('axe scan: letter reader /posteingang/[id]', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Focus the link and press Enter — keyboard activation works because focus follows the <a>.
    const firstLink = page.locator('a[href^="/posteingang/"]').first();
    await firstLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/posteingang\/[^/?]+$/, { timeout: 10_000 });
    await page.waitForTimeout(3000);

    const h1Count = await page.locator('h1').count();
    expect(h1Count, 'reader page rendered an h1').toBeGreaterThan(0);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      target: v.nodes[0]?.target,
    }));
    // eslint-disable-next-line no-console
    console.log('[A11Y posteingang-reader-summary] ' + JSON.stringify(summary));

    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    if (blockers.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[BLOCKERS reader] ' + JSON.stringify(blockers.map((b) => ({
        id: b.id,
        impact: b.impact,
        nodes: b.nodes.map((n) => ({ html: n.html.slice(0, 240), target: n.target })),
      })), null, 2));
    }
    expect(blockers, 'serious/critical violations').toHaveLength(0);
  });
});

test.describe('Posteingang RTL', () => {
  test('AR locale flips html dir to rtl on /posteingang', async ({ page }) => {
    await setLocaleCookie(page, 'ar');
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    const dir = await page.locator('html').getAttribute('dir');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('ar');
    expect(dir).toBe('rtl');
  });
});

// ── "Der Brief, der handelt" — ErkannteAufgabePanel (docs/specs/brief-der-handelt.md) ──
// HERO brief `letter-abh-erinnerung-verlaengerung` (anna-petrov, LEA Berlin) has
// `citation_match: false`, so the panel renders the ADVISORY branch: a DISABLED
// calendar button whose accessible explanation is wired via aria-describedby → an
// sr-only hint, PLUS an enabled "Im Original prüfen" button. Guards WCAG 2.1 AA
// (axe light+dark) + the disabled-control accessible-explanation contract
// (WCAG 1.3.1 / 4.1.2) + keyboard operability (WCAG 2.1.1).
test.describe('Posteingang Erkannte Aufgabe panel', () => {
  const HERO_ID = 'letter-abh-erinnerung-verlaengerung';
  const PANEL = '[data-testid="erkannte-aufgabe-panel"]';
  const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

  async function reachHeroPanel(page: Page) {
    // Warm the client store, then reach the HERO brief via CLIENT-SIDE nav (focus
    // its specific inbox link + Enter) — deterministic, NOT a `.first()` letter,
    // and avoids the cold deep-link hydration race (a warmed inbox mirrors real use).
    await page.goto('/posteingang?reliable=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const heroLink = page.locator(`a[href="/posteingang/${HERO_ID}"]`).first();
    await heroLink.scrollIntoViewIfNeeded();
    await heroLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(new RegExp(HERO_ID), { timeout: 15_000 });
    const panel = page.locator(PANEL);
    await panel.waitFor({ state: 'visible', timeout: 15_000 });
    return panel;
  }

  test('Erkannte Aufgabe panel — hero brief (citation mismatch)', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'de');
    const panel = await reachHeroPanel(page);
    await expect(panel, 'Erkannte-Aufgabe panel visible on hero brief').toBeVisible();

    // Panel heading demotes to <h3> under PostDetail's <h2> (page <h1> = PageHeader).
    await expect(
      panel.locator('h3').first(),
      'panel heading is an <h3> (clean heading order)',
    ).toBeVisible();

    // Advisory branch: exactly one DISABLED calendar button, accessible explanation
    // wired via aria-describedby → a non-empty hint (WCAG 1.3.1 / 4.1.2).
    const disabledBtn = panel.locator('button[disabled][aria-describedby]');
    await expect(
      disabledBtn,
      'advisory branch renders a disabled calendar button with aria-describedby',
    ).toHaveCount(1);
    const describedById = await disabledBtn.getAttribute('aria-describedby');
    expect(describedById, 'disabled calendar button exposes aria-describedby').toBeTruthy();
    const hintText = await page.evaluate(
      (id) => document.getElementById(id ?? '')?.textContent?.trim() ?? '',
      describedById,
    );
    console.log('[ERKANNTE-AUFGABE hint] ' + JSON.stringify(hintText));
    expect(
      hintText.length,
      'aria-describedby target (calendar_disabled_a11y) has non-empty text',
    ).toBeGreaterThan(0);
    expect(
      hintText,
      'hint explains the disabled state (Kalender / Original)',
    ).toMatch(/Kalender-Eintrag nicht möglich/i);

    // The recovery path: "Im Original prüfen" is present AND enabled (WCAG 2.1.1).
    const original = panel.getByRole('button', { name: /Im Original prüfen/i });
    await expect(original, '"Im Original prüfen" button present').toHaveCount(1);
    await expect(original, '"Im Original prüfen" is enabled').toBeEnabled();

    // axe-clean (WCAG 2.1 AA), LIGHT — scoped to the panel under audit so the gate
    // stays about this component (the inbox/reader documents are scanned elsewhere).
    const light = await new AxeBuilder({ page })
      .include(PANEL)
      .withTags(AXE_TAGS)
      .analyze();
    console.log(
      '[A11Y erkannte-aufgabe-light] ' +
        JSON.stringify(
          light.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        ),
    );
    expect(light.violations, 'LIGHT: 0 WCAG 2.1 AA violations in panel').toHaveLength(0);

    // axe-clean, DARK — toggle the same way the redesign specs do.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(400);
    const dark = await new AxeBuilder({ page })
      .include(PANEL)
      .withTags(AXE_TAGS)
      .analyze();
    console.log(
      '[A11Y erkannte-aufgabe-dark] ' +
        JSON.stringify(
          dark.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        ),
    );
    expect(dark.violations, 'DARK: 0 WCAG 2.1 AA violations in panel').toHaveLength(0);
  });
});

// Guards the project's most expensive a11y bug (WCAG 2.4.3 ReplySheet Tab-escape).
// Previously env-gated via test.skip(!NEXT_PUBLIC_RELIABLE) — which checks the RUNNER
// env, not the build, so the guard silently never ran. Re-enabled with a robust
// client-side warm-up + the current reply-CTA label.
test.describe('Posteingang ReplySheet focus-trap', () => {
  test('Tab 0..30 keeps activeElement inside [data-slot=sheet-content]', async ({
    page,
  }) => {
    // Reply opens INLINE (no focus trap) at ≥ 1100 px (Spec §6.2); the modal
    // Sheet — and thus its focus-trap — is the < 1100 px path. Pin a narrow
    // viewport so this trap test exercises the path it was written for.
    await page.setViewportSize({ width: 1024, height: 768 });
    await setLocaleCookie(page, 'de');
    // Warm the client store, then reach the letter via CLIENT-SIDE nav (focus the
    // inbox link + Enter) — NOT a cold `goto` deep-link, which can render the
    // empty-seeded detail before localStorage hydrates so the reply CTA never mounts
    // (a test-only race; a real user always arrives from a warmed inbox).
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const letterLink = page.locator(
      'a[href="/posteingang/letter-anna-standesamt-eheschliessung-termin"]',
    );
    await letterLink.first().scrollIntoViewIfNeeded();
    await letterLink.first().focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/letter-anna-standesamt-eheschliessung-termin/, {
      timeout: 15_000,
    });
    await page.waitForTimeout(1500);

    // Open the ReplySheet via the StickyFristAction reply-button. The current label
    // is „Antwort vorbereiten"; older draft/again/sent labels kept as fallbacks.
    const replyButton = page.getByRole('button', {
      name: /Antwort vorbereiten|Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
    });
    await replyButton.first().waitFor({ state: 'visible', timeout: 20_000 });
    await replyButton.first().click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.waitFor({ state: 'visible', timeout: 10_000 });

    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const insideSheet = await page.evaluate(() => {
        const sheetEl = document.querySelector(
          '[data-slot="sheet-content"]',
        );
        const active = document.activeElement as HTMLElement | null;
        if (!sheetEl || !active) return false;
        return sheetEl.contains(active) || sheetEl === active;
      });
      expect(
        insideSheet,
        `Tab #${i + 1} escaped the ReplySheet focus-trap`,
      ).toBe(true);
    }
  });
});
