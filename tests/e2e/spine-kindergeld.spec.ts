/**
 * SPINE e2e — antragsloses Kindergeld cascade (in-thread), the "demo-shipped"
 * gate for the Kindergeld vertical. Sibling of `spine.spec.ts` (Umzug); same
 * SSE-mock seam, different tool + persona + cascade.
 *
 * Proves the headline-wow path runs green DETERMINISTICALLY, key-independent:
 *   3. Assistent (persona markus-schmidt — a 2nd child + a known IBAN): a user
 *      message → the assistant emits a `starte_lebenslage{slug:'kindergeld'}`
 *      tool_use. The real assistant LLM needs an API key AND emits tools
 *      non-deterministically, so the SSE route is MOCKED (see
 *      `mockAssistantRoute`) with the exact wire shape `lib/ai/stream.ts` +
 *      `route.ts` produce. `starte_lebenslage` is confirm-gated, so the turn
 *      PARKS and the <LebenslageConfirmCard> surfaces (masked-IBAN line +
 *      [ZUKUNFT 2027] chip + honest "Regierungsentwurf/gestuft 2027" framing).
 *   4. Click "Kindergeld einrichten" → `onConfirmLebenslage` →
 *      `api.starteLebenslage('kindergeld', {}, [])` returns a vorgangId; the
 *      `starte_lebenslage` ToolCallCard flips to done.
 *   5. Because `call.vorgangTyp === 'kindergeld' && status === 'done' &&
 *      vorgangId`, the card docks an <InlineCascade variant="live"> that streams
 *      the datachain in-thread. The Umzug-only chrome (RecoveryBanner /
 *      Laufzettel / "Kaskade ansehen" run-page link) stays gated OFF for
 *      kindergeld — asserted absent.
 *   6. aria-live announces "Kindergeld eingerichtet."; the single Block-D eID
 *      gate (Auszahlungskonto bestätigen) is confirmed → the cascade completes →
 *      a Kindergeldbescheid ([MOCK] FK-BB/…) from the Familienkasse lands in
 *      the Posteingang.
 *
 * Determinism: `?reliable=1` + seeded `meta.reliable_mode=true` disable the 5%
 * `wait()` error injection (latency.ts) for the lebenslage-cascade engine too,
 * so no Block-A/D step randomly fails.
 *
 * Honesty guardrail: the copy under test is "Regierungsentwurf / gestuft 2027",
 * never "beschlossen" — asserted explicitly (§3.3/§8 realism verdict).
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
/** Familie Schmidt (Stufe 1): 2nd child Mia + a known IBAN (…4711) so the
 *  masked-IBAN confirmation line and the eID-gate preview both render. */
const ACTIVE_PERSONA = 'markus-schmidt';

/**
 * Seed authenticated state for Markus directly — same mechanism the app uses on
 * boot (`seedIfEmpty()` reads `meta.active_persona_id` and seeds the persona's
 * buckets). We set `meta` (with `reliable_mode`) and clear persona-scoped
 * buckets so the run starts from a clean, freshly-seeded inbox — then a sentinel
 * guards against re-wiping the autopilot's freshly-persisted Kindergeldbescheid
 * on the later /posteingang navigation.
 */
async function setupAuthenticatedMarkus(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__spine_kg_seeded`;
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        for (const key of ['profile', 'letters', 'vorgaenge', 'documents']) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        // non-browser env — ignore
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

/** One SSE frame in the wire shape `encodeSseFrame` emits. */
function sseFrame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Navigate to a route and wait for an anchor element. The Next.js dev server
 * compiles routes on first hit, which can momentarily 500 the document and
 * race `networkidle`; a single reload clears the cold-compile.
 */
async function gotoAndWait(
  page: Page,
  path: string,
  anchor: () => Promise<void>,
): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  try {
    await anchor();
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await anchor();
  }
}

/**
 * Mock `/api/assistant`. The client runs the confirm-gated write path:
 *   turn 1 (user text) → we emit a `starte_lebenslage{slug:'kindergeld'}`
 *                        tool_use + stop_reason 'tool_use'. Because it
 *                        `requiresConfirmation`, the client HOLDS the proposal,
 *                        surfaces <LebenslageConfirmCard>, and PARKS the turn —
 *                        no second request is made until the citizen confirms
 *                        (the confirm dispatches `api.starteLebenslage` directly,
 *                        not via the SSE route).
 * The `hasToolResult` branch is defensive (a follow-up user turn after a park
 * would carry the parked tool_result): emit a plain closing turn.
 */
async function mockAssistantRoute(page: Page): Promise<void> {
  await page.route('**/api/assistant', async (route: Route) => {
    const postData = route.request().postData() ?? '';
    const hasToolResult = postData.includes('"tool_result"');

    const frames: string[] = [];
    if (hasToolResult) {
      frames.push(
        sseFrame({
          type: 'text_delta',
          text: 'Alles erledigt — der Kindergeldbescheid landet in Ihrem Posteingang.',
        }),
      );
      frames.push(sseFrame({ type: 'message_stop', stop_reason: 'end_turn' }));
    } else {
      frames.push(
        sseFrame({
          type: 'text_delta',
          text: 'Gerne — ich bereite das antragslose Kindergeld für Ihr Kind vor.',
        }),
      );
      frames.push(
        sseFrame({
          type: 'tool_use',
          id: 'toolu_spine_starte_lebenslage',
          name: 'starte_lebenslage',
          input: { slug: 'kindergeld', consents: [] },
        }),
      );
      frames.push(sseFrame({ type: 'message_stop', stop_reason: 'tool_use' }));
    }
    frames.push('data: [DONE]\n\n');

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
      },
      body: frames.join(''),
    });
  });
}

test.describe('SPINE — Kindergeld antragslos → confirm → in-thread cascade → Posteingang', () => {
  test('Markus: „Kindergeld einrichten" → docked InlineCascade → eID → Bescheid im Posteingang', async ({
    page,
  }) => {
    // Journey spans the confirm-gate, the full Block-A→D latency choreography
    // and a dev cold-compile — a generous budget keeps it green headless.
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedMarkus(page);
    await mockAssistantRoute(page);

    /* ── Assistent boots for Markus (persona bootstrapped) ──────────────── */
    await gotoAndWait(page, '/assistent?reliable=1', async () => {
      // Greeting bubble proves the persona bootstrapped (api.getProfile etc.).
      await expect(page.getByText(/Hallo Markus/).first()).toBeVisible({
        timeout: 20_000,
      });
    });

    const composer = page.getByRole('textbox', { name: 'Nachricht an den Assistenten' });
    await composer.click();
    await composer.fill('Richte bitte das Kindergeld für mein Kind ein.');
    await composer.press('Enter');

    /* ── Step 3: <LebenslageConfirmCard> surfaces (turn parks) ──────────── */
    const confirmCard = page.getByRole('group', { name: 'Kindergeld einrichten' });
    await expect(confirmCard).toBeVisible({ timeout: 20_000 });

    // [ZUKUNFT 2027] chip.
    await expect(confirmCard.getByTestId('lebenslage-zukunft-chip')).toHaveText(
      '[ZUKUNFT 2027]',
    );

    // Honesty guardrail: framed as Regierungsentwurf / gestuft 2027, NEVER
    // "beschlossen".
    await expect(confirmCard).toContainText(/Regierungsentwurf/);
    await expect(confirmCard).toContainText(/gestuft ab 2027|gestuft 2027/i);
    await expect(confirmCard).not.toContainText(/beschlossen/i);

    // Masked-IBAN confirmation line (…4711 from Markus' Stammdaten) + the
    // beteiligte Familienkasse render.
    await expect(confirmCard).toContainText(/4711/);
    await expect(confirmCard).toContainText(/Familienkasse/i);

    // Confirm-gate proof: the primary CTA is present and NOT yet dispatched —
    // no InlineCascade is docked until the click.
    const startButton = confirmCard.getByRole('button', {
      name: 'Kindergeld einrichten',
    });
    await expect(startButton).toBeEnabled();
    await expect(page.getByTestId('inline-cascade')).toHaveCount(0);

    /* ── Step 4: confirm → api.starteLebenslage fires, cascade begins ───── */
    await startButton.click();

    /* ── Step 5: the InlineCascade docks IN-THREAD for kindergeld ───────── */
    const inlineCascade = page.getByTestId('inline-cascade');
    await expect(inlineCascade).toBeVisible({ timeout: 20_000 });
    // A cascade Behörde from the kindergeld datachain renders.
    await expect(
      inlineCascade
        .getByText(/Standesamt|Familienkasse|Bundeszentralamt|Einwohnermeldeamt/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    // Umzug-only chrome stays gated OFF for kindergeld (Spec § 5.6): no
    // run-page link, no Laufzettel/RecoveryBanner machinery.
    await expect(
      page.getByRole('link', { name: 'Kaskade ansehen' }),
    ).toHaveCount(0);

    /* ── Step 6a: aria-live success announcement ────────────────────────── */
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
    ).toContainText('Kindergeld eingerichtet.', { timeout: 20_000 });

    /* ── Step 6b: the single Block-D eID gate confirms the Auszahlungskonto ─
     * Kindergeld gates the Festsetzung + Bescheid behind ONE eID confirmation
     * (familienkasse-iban-bestaetigung, § 18 PAuswG). Confirming it lets the
     * cascade run to completion and mint the Bescheid. */
    const eidButton = inlineCascade.getByTestId('inline-eid-confirm');
    await expect(eidButton).toHaveCount(1, { timeout: 30_000 });
    const stepId = await eidButton.first().getAttribute('data-step-id');
    await eidButton.first().click();
    // The button unmounts once its row leaves the gate state.
    await expect(eidButton).toHaveCount(0, { timeout: 20_000 });
    await expect(
      inlineCascade.locator(
        `[data-testid="inline-cascade-row-status"][data-step-id="${stepId}"][data-status="confirmed"]`,
      ),
    ).toHaveCount(1, { timeout: 20_000 });

    // Completion signal: the value-receipt mounts only after the cascade
    // reaches status `abgeschlossen` — i.e. AFTER the Festsetzung + Bescheid
    // steps ran. This guarantees the Bescheid letter is persisted before we
    // navigate to the Posteingang.
    await expect(
      inlineCascade.getByTestId('inline-cascade-receipt'),
    ).toBeVisible({ timeout: 30_000 });

    /* ── Step 6c: the Kindergeldbescheid lands in the Posteingang ────────── */
    const letterLinks = page.locator('a[href^="/posteingang/letter-"]');
    await gotoAndWait(page, '/posteingang?reliable=1', async () => {
      await expect(letterLinks.first()).toBeVisible({ timeout: 20_000 });
    });

    // The autopilot Familienkasse Bescheid uses a betreff prefixed
    // "Kindergeldbescheid — Kindergeldnummer [MOCK] FK-BB/2027-KG-04711" —
    // distinct from the seed "Ihr Kindergeld — …" letters, so its presence
    // proves the synthetic Bescheid reached the inbox.
    await expect(
      page
        .getByText(/Kindergeldbescheid\s+—\s+Kindergeldnummer.*FK-BB/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
