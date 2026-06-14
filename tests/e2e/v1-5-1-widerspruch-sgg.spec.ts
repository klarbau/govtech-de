/**
 * V1.5.1 Schmidt → letter-schmidt-krankenkasse-beitrag (TK Hamburg, Beitrag).
 *
 * Spec § 2.3 + § 12.2:
 *   - Picker-Order beginnt mit `widerspruch_skelett`.
 *   - PreInsertionModal SGG öffnet auf Insert.
 *   - Body + SGG-Disclaimer-Zusatz sichtbar.
 */
import { test, expect, type Page } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';

async function setupPersonaContext(page: Page, personaId: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
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
          }),
        );
        window.localStorage.removeItem(`${ns}letters`);
        window.localStorage.removeItem(`${ns}vorgaenge`);
        window.localStorage.removeItem(`${ns}profile`);
        window.localStorage.removeItem(`${ns}letter-replies`);
        window.localStorage.removeItem(`${ns}letter-activity-log`);
      } catch {
        // ignore
      }
    },
    [NS, personaId],
  );
}

async function warmInbox(page: Page) {
  await page.goto('/posteingang', { waitUntil: 'networkidle' });
  await page
    .locator('a[href^="/posteingang/letter-"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

test.describe('V1.5.1 Widerspruch SGG (Schmidt, TK)', () => {
  test('letter-schmidt-krankenkasse-beitrag → SGG modal renders', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersonaContext(page, 'markus-schmidt');
    await warmInbox(page);

    await page.goto('/posteingang/letter-schmidt-krankenkasse-beitrag', {
      waitUntil: 'networkidle',
    });

    const replyButton = page
      .getByRole('button', {
        name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
      })
      .first();
    await replyButton.waitFor({ state: 'visible', timeout: 10_000 });
    await replyButton.click();

    // At ≥ 1100 px reply opens INLINE (Spec §6.2) — no modal Sheet.
    const panel = page.locator('[data-testid="reply-inline-panel"]');
    await panel.waitFor({ state: 'visible', timeout: 10_000 });

    // FristCitedFormat-Header rendert SGG-Wortlaut.
    const header = page.locator('[data-testid="frist-cited-format-header"]');
    await expect(header).toBeVisible();
    await expect(header).toContainText(/§\s*84/);

    // Picker-Default-Highlight ist Widerspruch-Skelett (Picker-Order [0]).
    // Click on Widerspruch radio.
    const widerspruchRadio = page
      .getByRole('radio')
      .filter({ hasText: /Widerspruch/i })
      .first();
    await widerspruchRadio.click();

    // PreInsertionModal SGG öffnet — wir verifizieren über aria-labelledby.
    const modal = page.locator('[aria-modal="true"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10_000 });
    // Title-Lookup über NormZitat-Pattern oder über die Generic-Header-Zeile.
    const titleId = await modal.getAttribute('aria-labelledby');
    expect(titleId).toContain('sgg');
  });
});
