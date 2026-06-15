/**
 * Termin-Autopilot a11y guard (Spec docs/specs/termin-autopilot.md sec 4.1, 4.6, 11).
 *
 * The in-cascade Anmeldung-Termin consequence row (TerminVorschlagRow, rendered
 * inside InlineCascade under the Block-A Buergeramt row) is the new surface.
 * Reaching it reuses the SSE-mock journey from spine.spec.ts / the FIT-Connect
 * audit: assistant -> confirm-gate -> starte_umzug -> inline cascade plays -> the
 * ripple mints the termin-anmeldung Termin (status vorgeschlagen) which arrives
 * via the termin_created event and renders the row collapsed-by-default.
 *
 * GATES (sec 11 a11y notes): disclosure is a button with aria-expanded +
 * aria-controls and a non-live region; confirm is a real button; after confirm
 * focus lands on the focusable status span, never on body (WCAG 2.4.3); axe 0
 * serious/critical on the row, light + dark.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

const PROPOSED_ADRESSE = {
  strasse: 'Torstrasse',
  hausnummer: '120',
  plz: '10119',
  ort: 'Berlin',
  land: 'DE' as const,
};
const PROPOSED_STICHTAG = '2026-07-01';

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = ns + '__termin_autopilot_seeded';
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(
          ns + 'meta',
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        for (const key of ['profile', 'letters', 'vorgaenge', 'documents', 'termine']) {
          window.localStorage.removeItem(ns + key);
        }
      } catch {
        // non-browser env
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

function sseFrame(event: unknown): string {
  return 'data: ' + JSON.stringify(event) + '\n\n';
}

async function mockAssistantRoute(page: Page): Promise<void> {
  await page.route('**/api/assistant', async (route: Route) => {
    const postData = route.request().postData() ?? '';
    const hasToolResult = postData.includes('"tool_result"');

    const frames: string[] = [];
    if (hasToolResult) {
      frames.push(
        sseFrame({ type: 'text_delta', text: 'Die Behoerden sind zusammengestellt.' }),
      );
      frames.push(sseFrame({ type: 'message_stop', stop_reason: 'end_turn' }));
    } else {
      frames.push(
        sseFrame({ type: 'text_delta', text: 'Gerne, ich bereite Ihren Umzug vor.' }),
      );
      frames.push(
        sseFrame({
          type: 'tool_use',
          id: 'toolu_termin_autopilot_preview_umzug',
          name: 'preview_umzug',
          input: { neue_adresse: PROPOSED_ADRESSE, stichtag_iso: PROPOSED_STICHTAG },
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

/** Reads the persisted `termine` bucket from localStorage (deterministic probe). */
async function readTermine(page: Page): Promise<Array<{ id: string; status: string }>> {
  return page.evaluate((ns) => {
    try {
      const raw = window.localStorage.getItem(ns + 'termine');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{ id: string; status: string }>;
      return parsed.map((t) => ({ id: t.id, status: t.status }));
    } catch {
      return [];
    }
  }, NS);
}

async function reachTerminRow(page: Page) {
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({ timeout: 20_000 });

  const composer = page.getByPlaceholder(/.+/).first();
  await composer.click();
  await composer.fill('leite meinen Umzug ein');
  await composer.press('Enter');

  const confirmCard = page.getByRole('group', { name: /Umzug best/ });
  await expect(confirmCard).toBeVisible({ timeout: 20_000 });
  await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();

  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 20_000 });

  // FIX (spec sec 2 / 4.1 / 5): the Anmeldung-Termin is now minted at the
  // Block-A Buergeramt step-success (mintBuergeramtAnmeldungArtefakte), NOT at
  // onSagaTerminal. It therefore appears INLINE with the Block-A Anmeldung row,
  // BEFORE the two sensitive Block-D eID taps. We do NOT touch the eID buttons
  // here -- the row must already be present once the cascade has played.
  const row = inlineCascade.getByTestId('termin-vorschlag-row');
  await expect(row).toBeVisible({ timeout: 30_000 });

  // Guard the narrative: the two Block-D eID confirmations are still pending
  // (Familienkasse + ABH) -- the Termin appeared without them.
  await expect(inlineCascade.getByTestId('inline-eid-confirm')).toHaveCount(2);

  return { inlineCascade, row };
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

test.describe('Termin-Autopilot in-cascade consequence row (WCAG 2.1 AA)', () => {
  test('PROBE: Anmeldung-Termin is minted at Block-A Buergeramt step-success, BEFORE the Block-D eID taps', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({ timeout: 20_000 });

    // BEFORE the cascade: the freshly-seeded termine bucket has no Anmeldung-Termin.
    const before = await readTermine(page);
    expect(before.filter((t) => t.id.startsWith('termin-anmeldung-'))).toHaveLength(0);

    const composer = page.getByPlaceholder(/.+/).first();
    await composer.click();
    await composer.fill('leite meinen Umzug ein');
    await composer.press('Enter');

    const confirmCard = page.getByRole('group', { name: /Umzug best/ });
    await expect(confirmCard).toBeVisible({ timeout: 20_000 });
    await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();

    const inlineCascade = page.getByTestId('inline-cascade');
    await expect(inlineCascade).toBeVisible({ timeout: 20_000 });

    // The row appears after the Block-A cascade plays -- WITHOUT touching the
    // two Block-D eID confirmations (Familienkasse + ABH), which are still gated.
    const row = inlineCascade.getByTestId('termin-vorschlag-row');
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(inlineCascade.getByTestId('inline-eid-confirm')).toHaveCount(2);

    // AFTER the Buergeramt step / BEFORE any eID tap: exactly one Anmeldung-Termin,
    // status 'vorgeschlagen'. This is the regression guard for the WHEN-bug:
    // count is 0 before the Buergeramt step, 1 after it -- not only after saga terminal.
    await expect
      .poll(
        async () => {
          const t = await readTermine(page);
          return t.filter(
            (x) => x.id.startsWith('termin-anmeldung-') && x.status === 'vorgeschlagen',
          ).length;
        },
        { timeout: 20_000 },
      )
      .toBe(1);

    // No ABH Termin was minted (regression-correction sec 12 stays intact): the
    // ONLY Anmeldung-Termin is the Buergeramt one.
    const after = await readTermine(page);
    const anmeldung = after.filter((t) => t.id.startsWith('termin-anmeldung-'));
    expect(anmeldung).toHaveLength(1);
    expect(after.some((t) => t.id.toLowerCase().includes('abh'))).toBe(false);
  });

  test('disclosure: button with aria-expanded + aria-controls; region not live', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    const { row } = await reachTerminRow(page);

    const toggle = row.getByTestId('termin-vorschlag-disclosure');
    await expect(toggle).toHaveJSProperty('tagName', 'BUTTON');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const controls = await toggle.getAttribute('aria-controls');
    expect(controls).toBeTruthy();

    const detail = row.getByTestId('termin-vorschlag-detail');
    await expect(detail).toHaveAttribute('aria-live', 'off');
    await expect(detail).toHaveAttribute('hidden', /.*/);
    await expect(detail).toHaveAttribute('id', controls ?? 'NO-ID');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(detail).toBeVisible();
    await expect(detail).toHaveAttribute('aria-live', 'off');
  });

  test('FristCountdown micro-line is static (no aggressive live region)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    const { row } = await reachTerminRow(page);
    const frist = row.getByTestId('termin-vorschlag-frist');
    await expect(frist).toBeVisible();
    const live = await frist.getAttribute('aria-live');
    expect(live === null || live === 'polite').toBeTruthy();
  });

  test('confirm is a real button; focus lands on status span after confirm (WCAG 2.4.3)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    const { row } = await reachTerminRow(page);

    const confirm = row.getByTestId('termin-vorschlag-confirm');
    await expect(confirm).toHaveJSProperty('tagName', 'BUTTON');
    await expect(confirm).toHaveAttribute('type', 'button');

    await confirm.click();

    const status = row.getByTestId('termin-vorschlag-status');
    await expect(status).toBeVisible({ timeout: 20_000 });
    await expect(confirm).toHaveCount(0);

    const focusInfo = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return {
        testid: el?.getAttribute('data-testid') ?? null,
        isBody: el === document.body,
      };
    });
    expect(focusInfo.isBody).toBe(false);
    expect(focusInfo.testid).toBe('termin-vorschlag-status');
  });

  test('axe LIGHT: the Termin row has 0 serious/critical', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupAuthenticatedAnna(page);
    await mockAssistantRoute(page);

    const { row } = await reachTerminRow(page);
    await row.getByTestId('termin-vorschlag-disclosure').click();
    await expect(row.getByTestId('termin-vorschlag-detail')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="termin-vorschlag-row"]')
      .withTags(axeTags)
      .analyze();
    console.log('[AXE termin-row LIGHT de] ' + JSON.stringify(summarize(results)));
    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blockers).toHaveLength(0);
  });

  test('axe DARK: the Termin row has 0 serious/critical', async ({ page }) => {
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

    const { row } = await reachTerminRow(page);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await row.getByTestId('termin-vorschlag-disclosure').click();
    await expect(row.getByTestId('termin-vorschlag-detail')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="termin-vorschlag-row"]')
      .withTags(axeTags)
      .analyze();
    console.log('[AXE termin-row DARK de] ' + JSON.stringify(summarize(results)));
    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blockers).toHaveLength(0);
  });
});
