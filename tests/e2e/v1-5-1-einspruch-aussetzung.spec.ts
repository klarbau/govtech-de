/**
 * Hero-Loom-Cut-Flow (Spec V1.5.1 § 2.1 + § 12.2):
 *   Mehmet Yıldız → letter-mehmet-fa-steuerbescheid-2024 (FA Köln-Mitte) →
 *   ReplySheet öffnet → Frist-Cited-Format-Header rendert AO-Wortlaut →
 *   § 122a-Caveat behind <details> auf Mobile → Picker-Order korrekt →
 *   Einspruch-Skelett insert öffnet PreInsertionModal AO → Body enthält
 *   Datum 04.05.2026 (bescheid_dated_at), nicht empfangen_am.
 *   Klick Aussetzung → 3-Button-Switch-Dialog → Beide-versenden →
 *   2 sequentielle Pre-Versand-Modale → ReplyConfirmationView rendert.
 */
import { test, expect, type Page } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'mehmet-yildiz';

async function setupPersonaContext(page: Page, personaId: string) {
  await page.context().addCookies([
    {
      name: LOCALE_COOKIE_NAME,
      value: 'de',
      domain: 'localhost',
      path: '/',
    },
  ]);
  // Pre-set active persona meta in localStorage BEFORE first navigation. The
  // mock-backend's `seedIfEmpty()` uses this on first read.
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
        // Clear letters bucket so the seed re-fills it with the persona-filtered set.
        window.localStorage.removeItem(`${ns}letters`);
        window.localStorage.removeItem(`${ns}vorgaenge`);
        window.localStorage.removeItem(`${ns}profile`);
        window.localStorage.removeItem(`${ns}letter-replies`);
        window.localStorage.removeItem(`${ns}letter-activity-log`);
      } catch {
        // ignore — non-browser env
      }
    },
    [NS, personaId],
  );
}

async function warmInbox(page: Page) {
  await page.goto('/posteingang', { waitUntil: 'networkidle' });
  // Wait for at least one letter card before claiming the inbox is rendered.
  // V1.5-ship-lessons: networkidle alone returns instantly when seed is empty.
  await page
    .locator('a[href^="/posteingang/letter-"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

test.describe('V1.5.1 Hero — Einspruch + Aussetzung (Mehmet)', () => {
  test('opens letter, shows AO Frist-Cited-Format-Header + § 122a caveat collapsed on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await setupPersonaContext(page, ACTIVE_PERSONA);
    await warmInbox(page);

    await page.goto('/posteingang/letter-mehmet-fa-steuerbescheid-2024', {
      waitUntil: 'networkidle',
    });

    const replyButton = page
      .getByRole('button', {
        name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
      })
      .first();
    await replyButton.waitFor({ state: 'visible', timeout: 10_000 });
    await replyButton.click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.waitFor({ state: 'visible', timeout: 10_000 });

    // Frist-Cited-Format-Header ist sichtbar
    const header = page.locator('[data-testid="frist-cited-format-header"]');
    await expect(header).toBeVisible();
    await expect(header).toContainText(/§\s*355/);
    await expect(header).toContainText(/04\.06\.2026|12\.06\.2026/);

    // § 122a-Caveat <details> ist auf Mobile-Viewport collapsed (kein open-Attr).
    const caveat = page.locator('[data-testid="bekanntgabe-caveat-details"]');
    await expect(caveat).toBeVisible();
    const isOpen = await caveat.evaluate((el) =>
      (el as HTMLDetailsElement).open,
    );
    expect(isOpen, 'caveat collapsed on <md (375px)').toBe(false);
  });

  test('on desktop the § 122a caveat is open by default', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersonaContext(page, ACTIVE_PERSONA);
    await warmInbox(page);

    await page.goto('/posteingang/letter-mehmet-fa-steuerbescheid-2024', {
      waitUntil: 'networkidle',
    });
    const replyButton = page
      .getByRole('button', {
        name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
      })
      .first();
    await replyButton.waitFor({ state: 'visible', timeout: 10_000 });
    await replyButton.click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.waitFor({ state: 'visible' });

    const caveat = page.locator('[data-testid="bekanntgabe-caveat-details"]');
    await expect(caveat).toBeVisible();
    // Allow a tick for the matchMedia effect to apply.
    await page.waitForTimeout(300);
    const isOpen = await caveat.evaluate(
      (el) => (el as HTMLDetailsElement).open,
    );
    expect(isOpen, 'caveat open on >=md').toBe(true);
  });

  test('inserting Einspruch-Skelett resolves {datum_bescheid} from bescheid_dated_at', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersonaContext(page, ACTIVE_PERSONA);
    await warmInbox(page);

    await page.goto('/posteingang/letter-mehmet-fa-steuerbescheid-2024', {
      waitUntil: 'networkidle',
    });
    const replyButton = page
      .getByRole('button', {
        name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
      })
      .first();
    await replyButton.click();
    await page.locator('[data-slot="sheet-content"]').waitFor();

    // Click the Einspruch-Skelett radio. The label text comes from i18n; we
    // match by name in the radiogroup.
    const einspruchRadio = page
      .getByRole('radio')
      .filter({ hasText: /Einspruch/i })
      .first();
    await einspruchRadio.waitFor();
    await einspruchRadio.click();

    // PreInsertionModal opens.
    const modalTitle = page.locator(
      '#pre-insertion-modal-title-ao, [aria-modal="true"] :text("Einspruch")',
    );
    await page
      .locator('[aria-modal="true"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    expect(await modalTitle.count()).toBeGreaterThan(0);

    // Confirm "Skelett einfügen".
    const confirmBtn = page
      .locator('[aria-modal="true"]')
      .getByRole('button')
      .first();
    await confirmBtn.click();

    // Body contains 04.05.2026 (bescheid_dated_at), not 08.05.2026 (empfangen_am).
    const body = page.locator('#reply-body');
    await expect(body).toBeVisible();
    // Wait for body fill (resolveReplyBody is 100–200 ms latency).
    await page.waitForTimeout(800);
    const bodyValue = await body.inputValue();
    expect(bodyValue).toContain('04.05.2026');
    expect(bodyValue).not.toContain('08.05.2026');
  });

  test('switching from Einspruch to Aussetzung shows 3-button switch dialog', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersonaContext(page, ACTIVE_PERSONA);
    await warmInbox(page);

    await page.goto('/posteingang/letter-mehmet-fa-steuerbescheid-2024', {
      waitUntil: 'networkidle',
    });
    const replyButton = page
      .getByRole('button', {
        name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
      })
      .first();
    await replyButton.click();
    await page.locator('[data-slot="sheet-content"]').waitFor();

    // 1. Einspruch radio click → PreInsertionModal → confirm.
    const einspruch = page
      .getByRole('radio')
      .filter({ hasText: /Einspruch/i })
      .first();
    await einspruch.click();
    await page.locator('[aria-modal="true"]').first().waitFor();
    await page
      .locator('[aria-modal="true"]')
      .getByRole('button')
      .first()
      .click();
    await page.waitForTimeout(800);

    // 2. Now click Aussetzung radio.
    const aussetzung = page
      .getByRole('radio')
      .filter({ hasText: /Aussetzung/i })
      .first();
    await aussetzung.click();

    // 3-Button-Switch-Dialog rendert mit dual-send Button.
    const dualSend = page.locator('[data-testid="template-switch-dual-send"]');
    await expect(dualSend).toBeVisible({ timeout: 5_000 });
  });
});
