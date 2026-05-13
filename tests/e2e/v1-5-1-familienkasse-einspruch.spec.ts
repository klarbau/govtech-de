/**
 * V1.5.1 Synthetic Familienkasse-Aufhebungs-/Ablehnungsbescheid (Spec § 2.2,
 * § 11.4, § 12.2). Es gibt im V1.5.0/V1.5.1-Seed kein Familienkasse-Letter mit
 * `frist.typ === 'einspruch'` (echter Aufhebungs-Bescheid). Wir injizieren
 * daher eine synthetische Test-Fixture-Letter via `addInitScript()`, damit der
 * AO + Familienkasse-Code-Pfad (= Familienkasse-AO-Erklärer mandatorisch
 * sichtbar) bedeckt wird.
 */
import { test, expect, type Page } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';

const SYNTHETIC_LETTER_ID = 'letter-test-familienkasse-aufhebung';

interface SyntheticContext {
  ns: string;
  personaId: string;
  letterId: string;
}

async function setupSyntheticLetter(page: Page) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  const ctx: SyntheticContext = {
    ns: NS,
    personaId: 'markus-schmidt',
    letterId: SYNTHETIC_LETTER_ID,
  };
  await page.addInitScript((args: SyntheticContext) => {
    try {
      // 1) Force active persona to Schmidt.
      window.localStorage.setItem(
        `${args.ns}meta`,
        JSON.stringify({
          version: 1,
          active_persona_id: args.personaId,
          seeded_at: new Date().toISOString(),
        }),
      );
      // 2) Reset persona-specific buckets so seed re-fills.
      window.localStorage.removeItem(`${args.ns}vorgaenge`);
      window.localStorage.removeItem(`${args.ns}profile`);
      window.localStorage.removeItem(`${args.ns}letter-replies`);
      window.localStorage.removeItem(`${args.ns}letter-activity-log`);

      // 3) Inject a synthetic Letter into the letters bucket. We append
      //    AFTER the seed runs; for that we use a deferred-style trick:
      //    seedIfEmpty re-fills `letters` when we delete the bucket. We
      //    write a single-element array directly with our synthetic letter
      //    pre-filtered for Schmidt — this skips the seed's filter step but
      //    is OK because the seed runs `readOrInit` (does not overwrite
      //    existing valid bucket).
      const syntheticLetter = {
        id: args.letterId,
        absender_behoerde_id: 'familienkasse-hamburg',
        empfaenger_persona_id: args.personaId,
        aktenzeichen: '[MOCK] FK-HH-2026/AUFH-99117',
        betreff:
          'Aufhebung der Kindergeldfestsetzung — Aktenzeichen [MOCK] FK-HH-2026/AUFH-99117',
        body_de:
          '[MOCK – Verwaltungsdemo, keine echten Daten]\n\nFamilienkasse Hamburg\nFlughafenstraße 1, 22335 Hamburg\n\nSehr geehrte Familie Schmidt,\n\nin oben genannter Angelegenheit hebe ich die Festsetzung des Kindergeldes für Ihre Tochter Lina Schmidt zum 30.04.2026 auf, weil die Voraussetzungen nach § 31 EStG nicht mehr vorliegen.\n\nFestgesetzter Rückforderungsbetrag: 1.218,00 €\n\nRechtsbehelfsbelehrung: Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden. Der Einspruch ist bei der oben bezeichneten Familienkasse schriftlich einzureichen.\n\nMit freundlichen Grüßen\nFamilienkasse Hamburg\n[MOCK]\nAz. [MOCK] FK-HH-2026/AUFH-99117',
        archetype: 'familienkasse-nachweis',
        auth_channel: 'briefpost',
        fristen: [
          {
            typ: 'einspruch',
            datum: '2026-06-09',
            original_zitat:
              'Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden.',
            citation_match: false,
            rechtsgrundlage: '§ 355 AO',
          },
        ],
        was_kann_ich_tun_options: ['familienkasse.einspruch'],
        status: 'ungelesen',
        empfangen_am: '2026-05-09T07:30:00.000Z',
        bescheid_dated_at: '2026-05-05',
      };

      // Schreibe direkt — wenn der Bucket schon Schmidt-Letters enthält, nehmen
      // wir die. Sonst schreiben wir nur unsere synthetic.
      const lettersKey = `${args.ns}letters`;
      const existingRaw = window.localStorage.getItem(lettersKey);
      let existing: unknown[] = [];
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) existing = parsed;
        } catch {
          existing = [];
        }
      }
      // Filter: keep only Schmidt-Letters, then prepend our synthetic.
      const filtered = (existing as Array<{ empfaenger_persona_id?: string }>)
        .filter((l) => l.empfaenger_persona_id === args.personaId);
      window.localStorage.setItem(
        lettersKey,
        JSON.stringify([syntheticLetter, ...filtered]),
      );
    } catch {
      // ignore
    }
  }, ctx);
}

test.describe('V1.5.1 Familienkasse-AO-Erklärer (synthetic letter)', () => {
  test('Familienkasse-Aufhebungsbescheid renders Familienkasse-AO-Zusatz', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupSyntheticLetter(page);

    // Warm inbox so seed runs.
    await page.goto('/posteingang', { waitUntil: 'networkidle' });
    await page
      .locator('a[href^="/posteingang/letter-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });

    await page.goto(`/posteingang/${SYNTHETIC_LETTER_ID}`, {
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

    // Picker-Default-Highlight ist Einspruch-Skelett (familienkasse-nachweis +
    // einspruch → AO-Familie). Click radio.
    const einspruch = page
      .getByRole('radio')
      .filter({ hasText: /Einspruch/i })
      .first();
    await einspruch.click();

    const modal = page.locator('[aria-modal="true"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10_000 });
    const titleId = await modal.getAttribute('aria-labelledby');
    expect(titleId).toContain('ao');

    // Hard-Line § 11.4: Familienkasse-Zusatz ist mandatorisch.
    const zusatz = modal.locator('[data-testid="familienkasse-ao-zusatz"]');
    await expect(zusatz).toBeVisible();
  });
});
