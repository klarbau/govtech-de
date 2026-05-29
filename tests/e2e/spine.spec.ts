/**
 * SPINE e2e — the "demo-shipped" gate (docs/demo-spine.md, steps 2–6).
 *
 * Proves the headline-wow path runs green deterministically, key-independent:
 *   2. Dashboard renders (greeting + "Heute zu tun" + nav tiles).
 *   3. Assistent: user says "leite meinen Umzug ein" → UmzugConfirmCard surfaces
 *      with the proposed Behörden. The real assistant LLM needs an API key, so
 *      the SSE route is MOCKED (see `mockAssistantRoute`) — the mock emits a
 *      `preview_umzug` tool_use frame in the exact wire shape `lib/ai/stream.ts`
 *      + `route.ts` produce, then a closing turn.
 *   4. Click "Umzug starten" → `api.startUmzug` fires (confirm-gate releases) and
 *      the Umzug autopilot run begins (`runAutopilotInBackground` in api.ts).
 *   5. Navigate to the cascade ("Kaskade ansehen") → the redesigned cascade cards
 *      (`.cascade-cards .cas-card`) move to "Abgeschlossen" (confirmed) for the
 *      four beteiligte Block-A Behörden.
 *   6. Navigate to /posteingang → the synthetic Bestätigungsschreiben from the
 *      autopilot now appear in the inbox (letter count grows; the autopilot
 *      Bundesdruckerei "— Auftrag …" confirmation is visible).
 *
 * APPROACH: full SSE-mock (NOT split). The assistant's client dispatcher
 * (`dispatchStarteUmzug` → `api.startUmzug`) runs the cascade in-process and
 * persists letters to localStorage, so one journey covers steps 2–6. The SSE
 * wire format is small and well-typed, so `page.route` mocking is robust here.
 *
 * Determinism: `?reliable=1` + `meta.reliable_mode=true` disable the 5% mock
 * error injection (latency.ts / umzug.ts), so Block A never randomly fails.
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

/** A valid `preview_umzug` tool_use input (mirrors tool-schemas.ts zod shape). */
const PROPOSED_ADRESSE = {
  strasse: 'Torstraße',
  hausnummer: '120',
  plz: '10119',
  ort: 'Berlin',
  land: 'DE' as const,
};
const PROPOSED_STICHTAG = '2026-07-01';

/**
 * Seed authenticated state for Anna directly — same mechanism the app uses on
 * boot (`seedIfEmpty()` reads `meta.active_persona_id` and seeds the persona's
 * buckets). We only set `meta` and clear persona-scoped buckets so the run
 * starts from a clean, freshly-seeded inbox.
 */
async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        // addInitScript runs on EVERY navigation. We must only reset the
        // persona-scoped buckets on the very first boot — otherwise a later
        // page.goto() would wipe the autopilot's freshly-persisted letters
        // before the Posteingang reads them. A sentinel flag guards that.
        const sentinel = `${ns}__spine_seeded`;
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
        // Re-seed persona-scoped buckets from fixtures on next boot.
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
 * race `networkidle`; a single reload clears the cold-compile. Production
 * `next start` is unavailable in this env (NODE_ENV is pinned to development),
 * so we harden the dev path instead.
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
 * Mock `/api/assistant`. The client runs two turns:
 *   turn 1 (user text)  → we emit a `preview_umzug` tool_use + stop_reason
 *                         'tool_use'; the client dispatches it (read-only) and
 *                         surfaces <UmzugConfirmCard>.
 *   turn 2 (tool_result) → we emit a closing prose turn (stop_reason 'end_turn').
 * We branch on whether the posted messages contain a tool_result block.
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
          text: 'Ich habe die zuständigen Behörden zusammengestellt. Prüfen Sie die Angaben und bestätigen Sie den Umzug.',
        }),
      );
      frames.push(
        sseFrame({ type: 'message_stop', stop_reason: 'end_turn' }),
      );
    } else {
      frames.push(
        sseFrame({
          type: 'text_delta',
          text: 'Gerne — einen Moment, ich bereite Ihren Umzug vor.',
        }),
      );
      frames.push(
        sseFrame({
          type: 'tool_use',
          id: 'toolu_spine_preview_umzug',
          name: 'preview_umzug',
          input: {
            neue_adresse: PROPOSED_ADRESSE,
            stichtag_iso: PROPOSED_STICHTAG,
          },
        }),
      );
      frames.push(
        sseFrame({ type: 'message_stop', stop_reason: 'tool_use' }),
      );
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

test.describe('SPINE — assistant → autopilot → posteingang (demo-shipped gate)', () => {
  test('Anna: dashboard → Umzug einleiten → cascade → Bestätigungen im Posteingang', async ({
    page,
  }) => {
    // The journey spans six surfaces incl. the ~5s Block-A latency choreography
    // plus dev cold-compile reloads — generous budget keeps it green headless.
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    /* ── Step 2: Dashboard renders ──────────────────────────────────────── */
    await gotoAndWait(page, '/dashboard?reliable=1', async () => {
      // Greeting ("Guten Tag, Frau Petrov").
      await expect(
        page.getByRole('heading', { name: /Petrov/i }),
      ).toBeVisible({ timeout: 20_000 });
    });

    // "Heute zu tun" section.
    await expect(
      page.getByRole('heading', { name: 'Heute zu tun' }),
    ).toBeVisible();
    // Nav tiles (Posteingang + Vorgänge among the six).
    await expect(
      page.getByRole('heading', { name: 'Posteingang', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Vorgänge', exact: true }),
    ).toBeVisible();

    /* ── Step 3: Assistent — confirm card surfaces ──────────────────────── */
    await gotoAndWait(page, '/assistent?reliable=1', async () => {
      // Greeting bubble proves the persona bootstrapped (api.getProfile etc.).
      await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
        timeout: 20_000,
      });
    });

    const composer = page.getByPlaceholder(/.+/).first();
    await composer.click();
    await composer.fill('leite meinen Umzug ein');
    await composer.press('Enter');

    // <UmzugConfirmCard> appears (role="group", title "Umzug bestätigen").
    const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
    await expect(confirmCard).toBeVisible({ timeout: 20_000 });

    // The proposed address + Behörden are rendered. Block A (automatic) always
    // includes the Bürgeramt; Anna's Block D (mit eID) includes ABH/Familienkasse.
    await expect(confirmCard).toContainText(/Torstraße\s*120/);
    await expect(confirmCard).toContainText(/Bürgeramt|Bezirksamt/i);

    // Confirm-gate proof: "Umzug starten" is present and NOT yet dispatched —
    // no autopilot ToolCallCard is shown until the click.
    const startButton = confirmCard.getByRole('button', {
      name: 'Umzug starten',
    });
    await expect(startButton).toBeEnabled();
    await expect(
      page.getByText('Umzug gestartet — die Behörden werden jetzt informiert.'),
    ).toHaveCount(0);

    /* ── Step 4: confirm → api.startUmzug fires, autopilot begins ───────── */
    await startButton.click();

    // The starte_umzug ToolCallCard resolves to done and surfaces the cascade
    // link — proof that api.startUmzug returned a vorgangId.
    const kaskadeLink = page.getByRole('link', { name: 'Kaskade ansehen' });
    await expect(kaskadeLink).toBeVisible({ timeout: 20_000 });
    const kaskadeHref = await kaskadeLink.getAttribute('href');
    expect(kaskadeHref).toContain('/vorgaenge/umzug/run?vorgangId=vorgang-');

    /* ── Step 5: cascade renders + progresses (Block A → confirmed) ─────── */
    await kaskadeLink.click();
    await page.waitForURL('**/vorgaenge/umzug/run**');

    // The redesigned run page renders a flat cascade: `.cascade` → `.cascade-cards`
    // → one `.cas-card` per step (A→D→B sorted, block-C filtered, sliced to 5).
    // The page hydrates `getVorgang(vorgangId)` from localStorage, which already
    // holds the cascade steps persisted by the in-process autopilot. A reload
    // clears a dev cold-compile of this route without losing persisted state.
    const cascadeCards = page.locator('.cascade-cards .cas-card');
    try {
      await expect(cascadeCards.first().locator('.t')).toBeVisible({
        timeout: 20_000,
      });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(cascadeCards.first().locator('.t')).toBeVisible({
        timeout: 20_000,
      });
    }

    // The four Block-A Behörden cascade cards progress to "Abgeschlossen" — the
    // redesign's `statusLabel('confirmed')` label, the equivalent of the old
    // "bestätigt". Reliable mode guarantees no random failure, so all four
    // resolve. Scope strictly to `.cascade-cards .cas-card .badge`: "Abgeschlossen"
    // ALSO appears in the hero badge and the Live-Aktivitäten feed rows, so a
    // page-wide matcher would over-count. The 5th card (first Block-D step) may
    // remain in_progress/pending, so we assert exactly 4 confirmed.
    await expect(
      page.locator('.cascade-cards .cas-card .badge', {
        hasText: 'Abgeschlossen',
      }),
    ).toHaveCount(4, { timeout: 30_000 });

    // The Finanzamt + Beitragsservice cards render (scoped to the cascade so the
    // Übersicht auth-list / Live-feed copies don't satisfy the assertion).
    await expect(cascadeCards.getByText(/Finanzamt/i).first()).toBeVisible();
    await expect(cascadeCards.getByText(/Beitragsservice/i).first()).toBeVisible();

    /* ── Step 6: confirmations land in the Posteingang ──────────────────── */
    const letterLinks = page.locator('a[href^="/posteingang/letter-"]');
    await gotoAndWait(page, '/posteingang?reliable=1', async () => {
      await expect(letterLinks.first()).toBeVisible({ timeout: 20_000 });
    });

    // The autopilot Bundesdruckerei confirmation uses a betreff suffixed with
    // "— Auftrag <Aktenzeichen>" — unique to the cascade (the seed letter has
    // no suffix). Its presence proves the synthetic Bestätigungsschreiben
    // reached the inbox.
    await expect(
      page.getByText(/Versandbestätigung Adressaufkleber.*— Auftrag/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // And the cascade Finanzamt-Zuständigkeit confirmation (autopilot-only
    // betreff "Mitteilung über die örtliche Zuständigkeit").
    await expect(
      page.getByText(/Mitteilung über die örtliche Zuständigkeit/i).first(),
    ).toBeVisible();
  });
});
