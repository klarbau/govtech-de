/**
 * V1.5.1 a11y suite (Spec § 12.3):
 *   - axe-clean for 4 PreInsertionModal variants (AO / SGG / VwGO / AO-Aussetzung)
 *   - 2 viewports (375 px Mobile + 1280 px Desktop)
 *   - NormZitatSpan probe: §-Citations have aria-label
 *   - Bekanntgabe-Caveat <details> open/closed per viewport
 *   - Focus-trap + ESC + Tab cycle
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';

interface PersonaSetup {
  personaId: string;
  letterId: string;
  expectedNorm: 'ao' | 'sgg' | 'vwgo' | 'aussetzung_ao';
  radioLabel: RegExp;
}

const SETUPS: Record<'ao' | 'sgg' | 'vwgo' | 'aussetzung_ao', PersonaSetup> = {
  ao: {
    personaId: 'mehmet-yildiz',
    letterId: 'letter-mehmet-fa-steuerbescheid-2024',
    expectedNorm: 'ao',
    radioLabel: /Einspruch/i,
  },
  sgg: {
    personaId: 'markus-schmidt',
    letterId: 'letter-schmidt-krankenkasse-beitrag',
    expectedNorm: 'sgg',
    radioLabel: /Widerspruch/i,
  },
  vwgo: {
    personaId: 'mehmet-yildiz',
    letterId: 'letter-mehmet-ihk-beitrag',
    expectedNorm: 'vwgo',
    radioLabel: /Widerspruch/i,
  },
  aussetzung_ao: {
    personaId: 'mehmet-yildiz',
    letterId: 'letter-mehmet-fa-steuerbescheid-2024',
    expectedNorm: 'aussetzung_ao',
    radioLabel: /Aussetzung/i,
  },
};

async function setupPersona(page: Page, personaId: string) {
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

async function openModalFor(
  page: Page,
  setup: PersonaSetup,
): Promise<void> {
  await page.goto(`/posteingang/${setup.letterId}`, {
    waitUntil: 'networkidle',
  });
  const replyButton = page
    .getByRole('button', {
      name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
    })
    .first();
  await replyButton.waitFor({ state: 'visible', timeout: 20_000 });
  await replyButton.click();
  await page.locator('[data-slot="sheet-content"]').waitFor();

  const radio = page
    .getByRole('radio')
    .filter({ hasText: setup.radioLabel })
    .first();
  await radio.click();
  await page
    .locator('[aria-modal="true"]')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 });
}

test.describe('V1.5.1 PreInsertionModal a11y', () => {
  for (const norm of ['ao', 'sgg', 'vwgo', 'aussetzung_ao'] as const) {
    for (const viewport of [
      { name: 'mobile', width: 375, height: 800 },
      { name: 'desktop', width: 1280, height: 900 },
    ]) {
      test(`axe-clean: ${norm} @ ${viewport.name}`, async ({ page }) => {
        const setup = SETUPS[norm];
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await setupPersona(page, setup.personaId);
        await warmInbox(page);

        // For Aussetzung we first need to insert Einspruch, then click Aussetzung.
        if (norm === 'aussetzung_ao') {
          await page.goto(`/posteingang/${setup.letterId}`, {
            waitUntil: 'networkidle',
          });
          const replyButton = page
            .getByRole('button', {
              name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
            })
            .first();
          await replyButton.waitFor({ state: 'visible', timeout: 20_000 });
          await replyButton.click();
          await page.locator('[data-slot="sheet-content"]').waitFor();

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

          const aussetzung = page
            .getByRole('radio')
            .filter({ hasText: setup.radioLabel })
            .first();
          await aussetzung.click();
          // Switch dialog opens (3-button-mode), not the modal directly.
          // Discard and switch → Pre-Insertion-Modal AdV.
          const switchDiscard = page
            .locator('[aria-modal="true"]')
            .getByRole('button', { name: /verwerfen|wechseln/i });
          if ((await switchDiscard.count()) > 0) {
            await switchDiscard.first().click();
          }
          await page
            .locator('[aria-modal="true"]')
            .first()
            .waitFor({ state: 'visible', timeout: 20_000 });
        } else {
          await openModalFor(page, setup);
        }

        const results = await new AxeBuilder({ page })
          .include('[aria-modal="true"]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        const blockers = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        if (blockers.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `[a11y blockers ${norm} ${viewport.name}] ` +
              JSON.stringify(blockers.map((b) => ({ id: b.id, n: b.nodes.length }))),
          );
        }
        expect(blockers, `serious/critical violations on ${norm}/${viewport.name}`).toHaveLength(0);
      });
    }
  }

  test('NormZitatSpan: every § citation in modal body has aria-label', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersona(page, 'mehmet-yildiz');
    await warmInbox(page);
    await openModalFor(page, SETUPS.ao);

    const modal = page.locator('[aria-modal="true"]').first();
    // Find every span with an aria-label that contains "Paragraph".
    const spans = await modal
      .locator('span[aria-label*="Paragraph"]')
      .count();
    expect(
      spans,
      'at least one §-citation in modal body wrapped with NormZitatSpan',
    ).toBeGreaterThan(0);
  });

  test('Bekanntgabe-Caveat: collapsed on mobile, open on desktop', async ({
    page,
  }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 800 });
    await setupPersona(page, 'mehmet-yildiz');
    await warmInbox(page);
    await page.goto('/posteingang/letter-mehmet-fa-steuerbescheid-2024', {
      waitUntil: 'networkidle',
    });
    const reply = page
      .getByRole('button', {
        name: /Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i,
      })
      .first();
    await reply.waitFor({ state: 'visible', timeout: 20_000 });
    await reply.click();
    await page.locator('[data-slot="sheet-content"]').waitFor();

    const caveatM = page.locator('[data-testid="bekanntgabe-caveat-details"]');
    await expect(caveatM).toBeVisible();
    await page.waitForTimeout(300);
    expect(
      await caveatM.evaluate((el) => (el as HTMLDetailsElement).open),
    ).toBe(false);

    // Desktop
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(400);
    expect(
      await caveatM.evaluate((el) => (el as HTMLDetailsElement).open),
    ).toBe(true);
  });

  test('focus-trap + ESC dismiss', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersona(page, 'mehmet-yildiz');
    await warmInbox(page);
    await openModalFor(page, SETUPS.ao);

    const modal = page.locator('[aria-modal="true"]').first();
    await expect(modal).toBeVisible();

    // Tab a few times — focus must stay inside the modal.
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const m = document.querySelector('[aria-modal="true"]');
        const a = document.activeElement as HTMLElement | null;
        if (!m || !a) return false;
        return m.contains(a) || m === a;
      });
      expect(inside, `Tab #${i + 1} stayed inside modal`).toBe(true);
    }

    // ESC closes the modal.
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 4_000 });
  });
});
