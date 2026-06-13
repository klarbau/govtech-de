/**
 * FIT-Connect cascade a11y guard — the feature's committed accessibility
 * evidence (branch `feat/fit-connect-cascade-realism`).
 *
 * Drives the headline flow end-to-end and axe-scans the receipt panel:
 *   assistant "leite meinen Umzug ein" → confirm-gate → starte_umzug →
 *   inline cascade → tap "Mit eID bestätigen" on each Block-D row →
 *   <FitConnectReceiptPanel> renders inline below the confirmed row.
 *
 * PERSONA-DRIVEN COUNT: the demo persona Anna (`anna-petrov`) has
 * `kfz_halter: false`, so the i-Kfz Block-D row is hidden by `visibleIf`.
 * Exactly TWO Block-D rows survive — Familienkasse (`kindergeld_bezug`) and
 * Ausländerbehörde (`aufenthaltstitel`) — so exactly TWO FIT-Connect chips and
 * TWO receipt panels appear. (An earlier draft asserted 3; that was wrong.)
 *
 * GATE: 0 serious/critical axe violations on the receipt panels, light + dark.
 * This is the regression guard for the WCAG 1.3.1 `definition-list`/`dlitem`
 * blocker that originally fired on the panel's malformed `<dl>`.
 *
 * Runs the same SSE-mock as `tests/e2e/spine.spec.ts` so the journey is
 * key-independent and deterministic (`?reliable=1` disables the 5% mock error).
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

/** Anna's two visible Block-D FIT-Connect rows (i-Kfz hidden — kfz_halter: false). */
const EXPECTED_FIT_CONNECT_PANELS = 2;

const PROPOSED_ADRESSE = {
  strasse: 'Torstraße',
  hausnummer: '120',
  plz: '10119',
  ort: 'Berlin',
  land: 'DE' as const,
};
const PROPOSED_STICHTAG = '2026-07-01';

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Seed authenticated state for Anna — mirrors spine.spec.ts. */
async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__fc_audit_seeded`;
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

function sseFrame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Mock `/api/assistant` — emit a `preview_umzug` tool_use, then a closing turn. */
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
          id: 'toolu_fc_audit_preview_umzug',
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

/**
 * Drive the assistant from a fresh page to the point where both Block-D rows
 * are eID-confirmed and both FIT-Connect receipt panels have rendered inline.
 * Returns the inline-cascade locator for further scoped assertions.
 */
async function confirmCascadeToFitConnect(page: Page) {
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
    timeout: 20_000,
  });

  const composer = page.getByPlaceholder(/.+/).first();
  await composer.click();
  await composer.fill('leite meinen Umzug ein');
  await composer.press('Enter');

  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 20_000 });
  await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();

  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 20_000 });

  // Anna's two Block-D rows each carry a FIT-Connect chip and an eID gate.
  const fitConnectChips = inlineCascade.locator(
    '[data-testid="inline-cascade-transport-chip"][data-transport="fit_connect"]',
  );
  await expect(fitConnectChips).toHaveCount(EXPECTED_FIT_CONNECT_PANELS, {
    timeout: 20_000,
  });

  // Confirm each Block-D row via "Mit eID bestätigen". The button unmounts once
  // the row leaves the gate state, so the count shrinks 2 → 1 → 0.
  const eidButtons = inlineCascade.getByTestId('inline-eid-confirm');
  await expect(eidButtons).toHaveCount(EXPECTED_FIT_CONNECT_PANELS, {
    timeout: 20_000,
  });
  await eidButtons.first().click();
  await expect(eidButtons).toHaveCount(1, { timeout: 20_000 });
  await eidButtons.first().click();
  await expect(eidButtons).toHaveCount(0, { timeout: 20_000 });

  // Both FIT-Connect receipt panels render inline — keyed by behoerdeId, A→D→B.
  const panels = page.getByTestId('fit-connect-receipt-panel');
  await expect(panels).toHaveCount(EXPECTED_FIT_CONNECT_PANELS, {
    timeout: 30_000,
  });

  return inlineCascade;
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

/** axe-scan all rendered FIT-Connect panels; assert 0 serious/critical. */
async function expectPanelsAxeClean(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .include('[data-testid="fit-connect-receipt-panel"]')
    .withTags(axeTags)
    .analyze();

  // eslint-disable-next-line no-console
  console.log(`[AXE ${label}] ` + JSON.stringify(summarize(results)));

  // Regression guard for the original blocker: these MUST be absent.
  const dlViolations = results.violations.filter(
    (v) => v.id === 'definition-list' || v.id === 'dlitem',
  );
  expect(
    dlViolations,
    `definition-list/dlitem must be gone: ${JSON.stringify(
      dlViolations.map((v) => v.id),
    )}`,
  ).toHaveLength(0);

  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    blockers,
    `${label} serious/critical: ${JSON.stringify(
      blockers.map((v) => ({ id: v.id, target: v.nodes[0]?.target })),
    )}`,
  ).toHaveLength(0);
}

test.describe('FIT-Connect receipt panel a11y — axe (WCAG 2.1 AA)', () => {
  test('LIGHT: two panels for Anna, 0 serious/critical', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    await confirmCascadeToFitConnect(page);
    await expectPanelsAxeClean(page, 'fit-connect-panel LIGHT de');
  });

  test('DARK: two panels for Anna, 0 serious/critical', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    await page.addInitScript(() => {
      try {
        document.documentElement.classList.add('dark');
      } catch {
        // ignore
      }
    });

    const inlineCascade = await confirmCascadeToFitConnect(page);
    await expect(inlineCascade).toBeVisible();
    // Ensure the dark class is applied even after client hydration.
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expectPanelsAxeClean(page, 'fit-connect-panel DARK de');
  });

  test('panel structure: single announce + JWE region + mock-destination', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    await confirmCascadeToFitConnect(page);
    const panel = page.getByTestId('fit-connect-receipt-panel').first();

    // NIT 4: exactly ONE polite-announce mechanism — the section owns
    // aria-live="polite"; no redundant inner sr-only live-region span.
    await expect(panel).toHaveAttribute('aria-live', 'polite');
    const liveRegionLabel = panel.getByText('FIT-Connect-Übermittlung erstellt');
    await expect(liveRegionLabel).toHaveCount(0);

    // The honest [MOCK destination] badge travels with every panel.
    await expect(
      panel.getByTestId('fit-connect-mock-destination'),
    ).toBeVisible();

    // The scrollable JWE excerpt is a labelled, focusable region.
    const jwe = panel.getByTestId('fit-connect-jwe-excerpt');
    await expect(jwe).toHaveAttribute('role', 'region');
    await expect(jwe).toHaveAttribute('tabindex', '0');
    await expect(jwe).toHaveAttribute('aria-label', /JWE/i);
  });
});
