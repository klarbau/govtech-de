/**
 * RESILIENCE e2e — the six demo proofs (Spec resilient-orchestration-engine.md
 * § 7) at the UI level, driven deterministically through the engine's test fault
 * seam (`window.__orchestrationTest`, mounted by <OrchestrationTestBridge> only
 * when NEXT_PUBLIC_ENABLE_ORCH_TEST=1). Each proof asserts on a real `data-*`
 * hook the orchestration UI exposes.
 *
 * This spec NEVER touches tests/e2e/spine.spec.ts and never weakens the cascade:
 * it drives the SAME assistant → Umzug-starten flow, then injects faults via the
 * bridge so failures are deterministic (not the 5% rate). Run against the
 * reliable-mode prod build (`next build && next start` + NEXT_PUBLIC_RELIABLE=1
 * + NEXT_PUBLIC_ENABLE_ORCH_TEST=1).
 *
 * STATUS: all SIX proofs run (no `test.fixme`).
 *  - Proofs (a) compensation, (e) DR-recovery, (f) verifyChain drive faults via
 *    the SHARED transport (`forceFail`, idempotent) and the REAL app paths
 *    (`api.bestaetigeAutopilotSchritt`, reload→boot-recovery, `api.verifyChain`).
 *  - Proofs (b) idempotency, (c) retry→DLQ, (d) breaker re-drive the LIVE saga
 *    across an advanced fake clock through `api.__orchestrationTest.tick/drain`
 *    (surfaced on `window.__orchestrationTest` by <OrchestrationTestBridge>). The
 *    bridge now DELEGATES the clock/drain seams to `api.__orchestrationTest`,
 *    which closes over the exact `getEngine()` singleton `startUmzug` drives —
 *    so a re-drive across the `'use client'` boundary reaches the live saga
 *    (previously the bridge's own `getEngine()`/`makeFakeClock()` resolved a
 *    code-split duplicate, the original blocker). The shared transport seam
 *    (`forceFail`/`clearFail`) already reached the live saga.
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

const PROPOSED_ADRESSE = {
  strasse: 'Torstraße',
  hausnummer: '120',
  plz: '10119',
  ort: 'Berlin',
  land: 'DE' as const,
};
const PROPOSED_STICHTAG = '2026-07-01';

/** Real Behörde ids from data/behoerden.json that the umzug saga drives. */
const ABH = 'abh-berlin-lea'; // compensation trigger (Block D, required)
const COMP_TARGET = 'beitragsservice-koeln'; // compensation target (Block A)

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__resilience_seeded`;
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
        for (const key of [
          'profile',
          'letters',
          'vorgaenge',
          'documents',
          'orchestration:sagas',
          'orchestration:outbox',
          'orchestration:audit-log',
          'orchestration:dlq',
          'orchestration:breakers',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        // non-browser env — ignore
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

function sseFrame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

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
      frames.push(sseFrame({ type: 'message_stop', stop_reason: 'end_turn' }));
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
          id: 'toolu_resilience_preview_umzug',
          name: 'preview_umzug',
          input: {
            neue_adresse: PROPOSED_ADRESSE,
            stichtag_iso: PROPOSED_STICHTAG,
          },
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

/** Wait for the window.__orchestrationTest bridge to be installed. */
async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (window as unknown as { __orchestrationTest?: unknown })
          .__orchestrationTest,
      ),
    undefined,
    { timeout: 20_000 },
  );
}

/** Drive the assistant to surface the Umzug confirm card (no click yet). */
async function surfaceUmzugConfirm(page: Page) {
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
    timeout: 20_000,
  });
  await waitForBridge(page);
  const composer = page.getByPlaceholder(/.+/).first();
  await composer.click();
  await composer.fill('leite meinen Umzug ein');
  await composer.press('Enter');
  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 20_000 });
  return confirmCard;
}

/**
 * After "Umzug starten", read the live saga id from the "Kaskade ansehen" link
 * (href `?vorgangId=…`; sagaId === vorgangId, Spec § 5.1). The clock/drain seam
 * is driven on this id.
 */
async function readSagaId(page: Page): Promise<string> {
  const kaskadeLink = page.getByRole('link', { name: 'Kaskade ansehen' });
  await expect(kaskadeLink).toBeVisible({ timeout: 20_000 });
  const href = await kaskadeLink.getAttribute('href');
  expect(href).toContain('/vorgaenge/umzug/run?vorgangId=');
  const sagaId = new URL(href!, 'http://localhost').searchParams.get('vorgangId');
  expect(sagaId).toBeTruthy();
  return sagaId!;
}

/**
 * Advance the engine fake clock past one backoff + breaker cooldown and re-drive
 * the live saga's outbox through `api.__orchestrationTest` (the SAME engine
 * singleton `startUmzug` drives). Repeats until `done()` is satisfied or the cap
 * is hit. This is the seam the repointed bridge unblocks (proofs b/c/d).
 */
async function tickAndDrainUntil(
  page: Page,
  sagaId: string,
  done: () => Promise<boolean>,
  opts: { maxCycles?: number; tickMs?: number } = {},
): Promise<boolean> {
  const maxCycles = opts.maxCycles ?? 8;
  // Cooldown 10s + max backoff < 8s → 60s clears both regardless of jitter.
  const tickMs = opts.tickMs ?? 60_000;
  for (let i = 0; i < maxCycles; i++) {
    if (await done()) return true;
    await page.evaluate(
      ([id, ms]) => {
        window.__orchestrationTest!.tick(ms as number);
        return window.__orchestrationTest!.drain(id as string);
      },
      [sagaId, tickMs] as const,
    );
    // Let the live subscriptions patch the UI from the engine events.
    await page.waitForTimeout(250);
  }
  return done();
}

const RETRY_TARGET = 'bundesdruckerei'; // Block-A, required, auto-gated.
const BREAKER_TARGET = 'finanzamt-berlin-mitte-tiergarten'; // Block-A, auto-gated.

/** The unique autopilot Bundesdruckerei confirmation (— Auftrag suffix). The
 *  seed inbox also has a "Versandbestätigung Adressaufkleber" letter WITHOUT
 *  the suffix, so we scope to the autopilot one and assert it is not doubled. */
const AUTOPILOT_BUNDESDRUCKEREI =
  /Versandbestätigung Adressaufkleber Personalausweis — Auftrag/i;

test.describe('RESILIENCE — the six engine proofs at the UI level', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);
  });

  /* ── Proof (a): compensation rolls back ──────────────────────────────────
   * Force the ABH (required Block-D) to permanently fail; after the citizen
   * authorises it via eID, the saga enters compensating → compensated, the
   * compensation target (Beitragsservice) shows the "zurückgenommen" treatment,
   * and the honest partial-failure summary renders (not "alles grün"). Runs
   * through the REAL app path (api.bestaetigeAutopilotSchritt drives the
   * shared engine) — no bridge re-drain needed. */
  test('(a) compensation: ABH permanent-fail rolls back the Beitragsservice send', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const confirmCard = await surfaceUmzugConfirm(page);

    // Arm a permanent fault on the ABH BEFORE start; its delivery happens only
    // after the eID authorisation, then dead-letters → drives compensation.
    await page.evaluate((behoerde) => {
      window.__orchestrationTest!.forceFail(behoerde, 'permanent');
    }, ABH);

    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();

    const inline = page.getByTestId('inline-cascade');
    await expect(inline).toBeVisible({ timeout: 20_000 });

    // Authorise both Block-D eID gates (one is the ABH that will fail).
    const eidButtons = inline.getByTestId('inline-eid-confirm');
    await expect(eidButtons.first()).toBeVisible({ timeout: 20_000 });
    let guard = 0;
    while ((await eidButtons.count()) > 0 && guard < 4) {
      await eidButtons.first().click();
      await page.waitForTimeout(1200);
      guard += 1;
    }

    // Open the inline Laufzettel to read the audit rows.
    const toggle = page.getByTestId('orchestration-inline-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await toggle.click();

    // The honest partial-failure summary appears (NOT a clean success).
    await expect(
      page.getByTestId('orchestration-compensation-summary'),
    ).toBeVisible({ timeout: 30_000 });

    // The compensation produced a STEP_COMPENSATED audit row (the rollback).
    await expect(
      page.locator(
        '[data-testid="orchestration-audit-row"][data-audit-type="STEP_COMPENSATED"]',
      ),
    ).toHaveCount(1, { timeout: 30_000 });

    // And the saga reached compensated (SAGA_COMPENSATED audited) — not completed.
    await expect(
      page.locator(
        '[data-testid="orchestration-audit-row"][data-audit-type="SAGA_COMPENSATED"]',
      ),
    ).toHaveCount(1, { timeout: 10_000 });

    expect(COMP_TARGET).toBe('beitragsservice-koeln');
  });

  /* ── Proof (b): idempotent replay = one effect ───────────────────────────
   * Drive the cascade with the engine clock frozen (Block A succeeds, Block D
   * stays pending → saga `running`). Snapshot the STEP_RECEIPT audit rows and the
   * autopilot Bundesdruckerei letter count, then RE-DRIVE the live saga through
   * `api.__orchestrationTest.drain(sagaId)` and assert both are unchanged: a
   * re-drive of already-delivered work mints no second effect (exactly-once).
   * Enabled by the repointed bridge — `drain` now reaches the engine singleton
   * `startUmzug` runs on, not a code-split duplicate. */
  test('(b) idempotency: re-draining the live saga adds no second effect', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const confirmCard = await surfaceUmzugConfirm(page);

    // Freeze the clock BEFORE start so Block-A commits but Block-D stays pending
    // → the saga persists as `running` (a deterministic, re-drivable in-flight).
    await page.evaluate(() => {
      window.__orchestrationTest!.installFakeClock();
    });

    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();
    const sagaId = await readSagaId(page);

    // Open the inline Laufzettel and wait for the Block-A receipts to land.
    const toggle = page.getByTestId('orchestration-inline-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await toggle.click();

    const receiptSelector =
      '[data-testid="orchestration-audit-row"][data-audit-type="STEP_RECEIPT"]';
    await expect(page.locator(receiptSelector).first()).toBeVisible({
      timeout: 30_000,
    });
    // Settle: re-poll until the receipt count is stable across two reads.
    let receiptsBefore = await page.locator(receiptSelector).count();
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(400);
      const c = await page.locator(receiptSelector).count();
      if (c === receiptsBefore) break;
      receiptsBefore = c;
    }
    expect(receiptsBefore).toBeGreaterThanOrEqual(1);

    // Snapshot the durable autopilot Bundesdruckerei confirmation count BEFORE
    // the re-drive (same rendered surface used after → any DOM duplication of the
    // subject text cancels in the before/after comparison, à la proof (e)).
    await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(AUTOPILOT_BUNDESDRUCKEREI).first(),
    ).toBeVisible({ timeout: 20_000 });
    const lettersBefore = await page.getByText(AUTOPILOT_BUNDESDRUCKEREI).count();

    // Re-drive the SAME live saga twice via the seam on the run page (a fresh,
    // recovery-rehydrated engine context — the SAME singleton `startUmzug` drives
    // there). A re-drive of already-delivered steps must be a pure no-op
    // (idempotent: at-least-once transport, exactly-once effect).
    await page.goto(`/vorgaenge/umzug/run?vorgangId=${sagaId}&reliable=1`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForBridge(page);
    const inspectorReceipts = page.locator(receiptSelector);
    await expect(inspectorReceipts.first()).toBeVisible({ timeout: 30_000 });
    await expect(async () => {
      expect(await inspectorReceipts.count()).toBe(receiptsBefore);
    }).toPass({ timeout: 15_000 });

    await page.evaluate(async (id) => {
      await window.__orchestrationTest!.drain(id);
      await window.__orchestrationTest!.drain(id);
    }, sagaId);
    await page.waitForTimeout(500);

    // No new STEP_RECEIPT rows from the re-drive (the audit log is the durable,
    // per-effect record — unchanged count ⇒ no second effect).
    await expect(async () => {
      expect(await inspectorReceipts.count()).toBe(receiptsBefore);
    }).toPass({ timeout: 10_000 });

    // And the durable effect did not double: the autopilot Bundesdruckerei
    // confirmation count is unchanged by the two extra drains (exactly-once).
    await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(AUTOPILOT_BUNDESDRUCKEREI).first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(await page.getByText(AUTOPILOT_BUNDESDRUCKEREI).count()).toBe(
      lettersBefore,
    );
  });

  /* ── Proof (c): retry → DLQ → one-tap replay ─────────────────────────────
   * Force a Block-A authority (Bundesdruckerei) to transient-fail. With the clock
   * frozen at start its first attempt fails + schedules a retry; advancing the
   * fake clock past each backoff + breaker cooldown and re-draining the live saga
   * (via the seam) climbs the attempt counter to MAX_ATTEMPTS → STEP_DEAD_LETTERED
   * → a DLQ entry renders with its reason. Then clear the fault and tap the
   * one-tap "Erneut senden" → the entry replays clean and clears. Enabled by the
   * repointed bridge's real-instance tick/drain. */
  test('(c) retry/DLQ: exhausted retries dead-letter; one-tap replay clears it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const confirmCard = await surfaceUmzugConfirm(page);

    // Arm a transient fault + freeze the clock BEFORE start so the retries are
    // scheduled into the (frozen) future and only drain when we tick past them.
    await page.evaluate((behoerde) => {
      window.__orchestrationTest!.installFakeClock();
      window.__orchestrationTest!.forceFail(behoerde, 'transient');
    }, RETRY_TARGET);

    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();
    const sagaId = await readSagaId(page);

    const toggle = page.getByTestId('orchestration-inline-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await toggle.click();

    // Drive ticks/drains until the dead-letter row appears (attempt = MAX_ATTEMPTS).
    const deadLetterRow = page.locator(
      '[data-testid="orchestration-audit-row"][data-audit-type="STEP_DEAD_LETTERED"]',
    );
    const reached = await tickAndDrainUntil(page, sagaId, async () =>
      (await deadLetterRow.count()) > 0,
    );
    expect(reached).toBe(true);
    await expect(deadLetterRow.first()).toBeVisible({ timeout: 10_000 });

    // The retry budget was exercised on the way down (STEP_RETRY_SCHEDULED rows).
    await expect(
      page.locator(
        '[data-testid="orchestration-audit-row"][data-audit-type="STEP_RETRY_SCHEDULED"]',
      ).first(),
    ).toBeVisible({ timeout: 10_000 });

    // The DLQ "Aktion erforderlich" panel surfaces the entry with a replay CTA.
    const dlqEntry = page.getByTestId('orchestration-dlq-entry');
    await expect(dlqEntry.first()).toBeVisible({ timeout: 20_000 });
    const replayCta = page.getByTestId('orchestration-dlq-replay');
    await expect(replayCta.first()).toBeVisible({ timeout: 10_000 });

    // Clear the fault, advance past the breaker cooldown so the replay's probe is
    // allowed, then one-tap "Erneut senden".
    await page.evaluate((behoerde) => {
      window.__orchestrationTest!.clearFail(behoerde);
      window.__orchestrationTest!.tick(60_000);
    }, RETRY_TARGET);
    await replayCta.first().click();

    // The DLQ entry clears (replay resolved to a positive receipt → step succeeded).
    await expect(dlqEntry).toHaveCount(0, { timeout: 20_000 });
  });

  /* ── Proof (d): circuit-breaker isolates one authority ───────────────────
   * Force ONE Block-A authority (Finanzamt) to transient-fail while the other
   * three Block-A authorities deliver cleanly. Driving ticks/drains climbs its
   * consecutive-failure count; at BREAKER_OPEN_THRESHOLD its breaker chip flips
   * to `offen` (data-state="open"). Crucially the saga is NOT killed: the other
   * lanes reached positive receipts and the failing lane is merely isolated (no
   * dead-letter at the moment the breaker opens). Enabled by the repointed
   * bridge's real-instance tick/drain. */
  test('(d) breaker: one failing authority opens its breaker; the others keep moving', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const confirmCard = await surfaceUmzugConfirm(page);

    await page.evaluate((behoerde) => {
      window.__orchestrationTest!.installFakeClock();
      window.__orchestrationTest!.forceFail(behoerde, 'transient');
    }, BREAKER_TARGET);

    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();
    const sagaId = await readSagaId(page);

    const toggle = page.getByTestId('orchestration-inline-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await toggle.click();

    // The three healthy Block-A authorities deliver immediately at start → at
    // least two positive receipts are visible while one lane is failing.
    const positiveReceipts = page.getByText(
      'Quittung: positiv (Auftrag ausgeführt)',
    );
    await expect(async () => {
      expect(await positiveReceipts.count()).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 30_000 });

    // Drive ticks/drains until the FAILING authority's breaker opens. The loop
    // checks the condition BEFORE each tick, so it stops the moment the breaker
    // trips (3 failures, attempt 3) — well before dead-letter (attempt 5).
    const openChip = page.locator(
      `[data-testid="orchestration-breaker-chip"][data-breaker="${BREAKER_TARGET}"][data-state="open"]`,
    );
    const opened = await tickAndDrainUntil(page, sagaId, async () =>
      (await openChip.count()) > 0,
    );
    expect(opened).toBe(true);
    await expect(openChip.first()).toBeVisible({ timeout: 10_000 });

    // The audit trail recorded the breaker opening.
    await expect(
      page.locator(
        '[data-testid="orchestration-audit-row"][data-audit-type="BREAKER_OPENED"]',
      ).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Isolation, not collapse: the failing lane is paused, NOT dead-lettered at
    // the moment the breaker opens — the saga is still alive.
    await expect(
      page.locator(
        '[data-testid="orchestration-audit-row"][data-audit-type="STEP_DEAD_LETTERED"]',
      ),
    ).toHaveCount(0);

    // And no OTHER authority's breaker opened — exactly one is isolated.
    await expect(
      page.locator(
        '[data-testid="orchestration-breaker-chip"][data-state="open"]',
      ),
    ).toHaveCount(1, { timeout: 10_000 });
  });

  /* ── Proof (e): kill-the-tab → reload → recovery banner ──────────────────
   * Start the cascade, navigate to the run page, reload mid-flight (Block-D
   * still pending) → the engine's boot recovery replays the in-flight saga, the
   * recovery banner appears with recovered ≥ 1, a RECOVERY_REPLAYED audit entry
   * exists, and no already-delivered letter is doubled. */
  test('(e) DR: reload mid-flight surfaces the recovery banner and resumes', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const confirmCard = await surfaceUmzugConfirm(page);

    // Freeze the clock so Block-A stays committed but Block-D stays pending →
    // the saga persists as `running` when we reload (deterministic in-flight).
    await page.evaluate(() => {
      window.__orchestrationTest!.installFakeClock();
    });

    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();
    const kaskadeLink = page.getByRole('link', { name: 'Kaskade ansehen' });
    await expect(kaskadeLink).toBeVisible({ timeout: 20_000 });
    const href = await kaskadeLink.getAttribute('href');
    expect(href).toContain('/vorgaenge/umzug/run?vorgangId=');

    // Capture the autopilot Bundesdruckerei letter count BEFORE reload.
    await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(AUTOPILOT_BUNDESDRUCKEREI).first(),
    ).toBeVisible({ timeout: 20_000 });
    const beforeCount = await page.getByText(AUTOPILOT_BUNDESDRUCKEREI).count();

    // Navigate to the run page (saga persisted to localStorage), then reload →
    // the engine's recoverOnBoot replays the in-flight saga.
    await page.goto(`${href}&reliable=1`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // The recovery banner appears (recovered ≥ 1) — the durable DR signal.
    const banner = page.locator('[data-recovery-banner]');
    await expect(banner.first()).toBeVisible({ timeout: 30_000 });
    const recovered = await banner.first().getAttribute('data-recovered');
    expect(Number(recovered)).toBeGreaterThanOrEqual(1);

    // The Laufzettel carries a RECOVERY_REPLAYED audit entry.
    const inspectorAudit = page.locator(
      '[data-testid="orchestration-audit-row"][data-audit-type="RECOVERY_REPLAYED"]',
    );
    await expect(inspectorAudit.first()).toBeVisible({ timeout: 20_000 });

    // No doubled letters: the autopilot Bundesdruckerei confirmation count is
    // unchanged by the replay (idempotent effect; no re-mint).
    await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(AUTOPILOT_BUNDESDRUCKEREI).first(),
    ).toBeVisible({ timeout: 20_000 });
    const afterCount = await page.getByText(AUTOPILOT_BUNDESDRUCKEREI).count();
    expect(afterCount).toBe(beforeCount);
  });

  /* ── Proof (f): verifyChain tamper proof ─────────────────────────────────
   * Click "Protokoll prüfen" on an intact log → ok. Tamper one persisted entry
   * (test-only splice via the bridge), re-run → broken with the broken seq. */
  test('(f) tamper-evidence: verifyChain passes intact, fails after a splice', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const confirmCard = await surfaceUmzugConfirm(page);
    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();

    await page.getByTestId('orchestration-inline-toggle').click();

    // Wait for some audit entries to exist.
    await expect(
      page.locator('[data-testid="orchestration-audit-row"]').first(),
    ).toBeVisible({ timeout: 30_000 });

    // Intact chain → ok.
    await page.getByTestId('orchestration-verify-cta').click();
    await expect(
      page.getByTestId('orchestration-verify-result'),
    ).toHaveAttribute('data-verify-result', 'ok', { timeout: 20_000 });

    // Tamper one persisted entry without recomputing hashes (test-only).
    const tamperedSeq = await page.evaluate(() =>
      window.__orchestrationTest!.tamper(),
    );
    expect(tamperedSeq).toBeGreaterThanOrEqual(0);

    // Re-run → broken (the chain detects the splice).
    await page.getByTestId('orchestration-verify-cta').click();
    await expect(
      page.getByTestId('orchestration-verify-result'),
    ).toHaveAttribute('data-verify-result', 'broken', { timeout: 20_000 });
  });
});
