/**
 * DEMO RECORDER — the headline-wow walkthrough, captured as a polished video.
 *
 *   npm run demo:record   (see playwright.demo.config.ts)
 *
 * Drives the REAL app along the demo-spine (docs/demo-spine.md) with cinematic
 * polish: an injected animated cursor with eased glides + click ripples, smooth
 * scrolling that centres each beat, a hidden scrollbar, and deliberate pauses so
 * the result is watchable and can be dubbed with the German narration from
 * docs/loom-script.md.
 *
 * NOT a test gate — the `expect(...).toBeVisible()` calls are only sync points so
 * the recorder waits for each beat to render before pausing on it.
 *
 * Deterministic + key-independent: the assistant SSE is mocked (same shape as
 * tests/e2e/spine.spec.ts), Anna's authenticated state is seeded into
 * localStorage, and `?reliable=1` disables the 5% mock-error injection — so the
 * cascade plays out identically, take after take.
 *
 * Helpers (auth seed + SSE mock) are kept in sync with tests/e2e/spine.spec.ts.
 */
import { test, expect, type Page, type Route, type Locator } from '@playwright/test';

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

/* ─────────────────────────  cinematic cursor + pacing  ───────────────────── */

/** Where the fake cursor currently is (viewport coords). Eased glides start here. */
let cursor = { x: 960, y: 140 };

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** A "let the viewer read this" pause. */
function beat(page: Page, ms = 2000): Promise<void> {
  return page.waitForTimeout(ms);
}

/** Glide the (injected) cursor from its current spot to (x,y) with easing. */
async function glide(
  page: Page,
  x: number,
  y: number,
  { ms = 680, steps = 38 } = {},
): Promise<void> {
  const sx = cursor.x;
  const sy = cursor.y;
  for (let i = 1; i <= steps; i += 1) {
    const t = easeInOut(i / steps);
    await page.mouse.move(sx + (x - sx) * t, sy + (y - sy) * t);
    await page.waitForTimeout(ms / steps);
  }
  cursor = { x, y };
}

/**
 * README still-frame capture — only when DEMO_SHOT=1 (e.g.
 * `$env:DEMO_SHOT='1'; npm run demo:record`). Hides the injected cursor for
 * the frame, writes demo-recording/still-<name>.png, restores the cursor.
 * A no-op in normal video takes.
 */
async function still(page: Page, name: string): Promise<void> {
  if (!process.env.DEMO_SHOT) return;
  await page.evaluate(() => {
    const c = document.getElementById('__demo_cursor');
    if (c) c.style.display = 'none';
  });
  await page.screenshot({ path: `demo-recording/still-${name}.png` });
  await page.evaluate(() => {
    const c = document.getElementById('__demo_cursor');
    if (c) c.style.display = '';
  });
}

/** Smooth-scroll a target to centre, then glide the cursor onto it. */
async function focusOn(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator
    .evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    .catch(() => {});
  await beat(page, 650);
  const box = await locator.boundingBox();
  if (box) await glide(page, box.x + box.width / 2, box.y + box.height / 2);
}

/** Glide onto a control and click it (the injected mousedown ripple fires). */
async function clickAt(page: Page, locator: Locator): Promise<void> {
  await focusOn(page, locator);
  await beat(page, 240);
  await locator.click();
  await beat(page, 220);
}

/**
 * Inject a visible cursor + click ripples + hidden scrollbar. Runs on EVERY
 * navigation (each new document), so the cursor survives route changes.
 */
async function installDemoChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const install = () => {
      if (document.getElementById('__demo_cursor')) return;
      const style = document.createElement('style');
      style.textContent = `
        #__demo_cursor {
          position: fixed; top: 0; left: 0; width: 24px; height: 24px;
          z-index: 2147483647; pointer-events: none;
          transition: transform 70ms linear; will-change: transform;
        }
        #__demo_cursor svg { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); }
        .__demo_ripple {
          position: fixed; z-index: 2147483646; pointer-events: none;
          width: 16px; height: 16px; margin-left: -8px; margin-top: -8px;
          border-radius: 9999px; border: 2px solid rgba(37,99,235,.95);
          background: rgba(37,99,235,.20);
          animation: __demo_ripple 520ms ease-out forwards;
        }
        @keyframes __demo_ripple {
          0%   { transform: scale(.45); opacity: .95; }
          100% { transform: scale(3.4);  opacity: 0;   }
        }
        ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
        * { scrollbar-width: none !important; }
      `;
      document.head.appendChild(style);
      const cur = document.createElement('div');
      cur.id = '__demo_cursor';
      cur.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M5 2.5l14.5 7.2-6.4 1.5L9.7 18.8 5 2.5z" fill="#0b1220" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(cur);
      const place = (x: number, y: number) => {
        cur.style.transform = `translate(${x}px, ${y}px)`;
      };
      window.addEventListener(
        'mousemove',
        (e) => place(e.clientX, e.clientY),
        true,
      );
      window.addEventListener(
        'mousedown',
        (e) => {
          const r = document.createElement('div');
          r.className = '__demo_ripple';
          r.style.left = `${e.clientX}px`;
          r.style.top = `${e.clientY}px`;
          document.documentElement.appendChild(r);
          setTimeout(() => r.remove(), 560);
        },
        true,
      );
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install);
    } else {
      install();
    }
  });
}

/* ─────────────────────────  app state + SSE mock  ───────────────────── */

/** Seed authenticated Anna directly (same mechanism the app uses on boot). */
async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__demo_seeded`;
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
        /* non-browser env — ignore */
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

function sseFrame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Mock /api/assistant: turn 1 → preview_umzug tool_use; turn 2 → closing prose. */
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
          id: 'toolu_demo_preview_umzug',
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

/* ─────────────────────────────  the walkthrough  ───────────────────────────── */

test('DEMO - Umzug-Autopilot walkthrough (Anna)', async ({ page }) => {
  test.setTimeout(180_000);
  cursor = { x: 960, y: 140 };
  await installDemoChrome(page);
  await setupAuthenticatedAnna(page);
  await mockAssistantRoute(page);

  /* ── Szene 1 — Dashboard: "Heute zu tun" + der Umzug-Anstoß ─────────────── */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Petrov/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.mouse.move(cursor.x, cursor.y); // reveal the cursor
  await beat(page, 1400);
  const heuteZuTun = page.getByRole('heading', { name: 'Heute zu tun' });
  await expect(heuteZuTun).toBeVisible();
  await focusOn(page, heuteZuTun);
  await beat(page, 3200);

  /* ── Szene 2 — Assistent: ein Satz genügt ───────────────────────────────── */
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 1600);

  const composer = page.getByPlaceholder(/.+/).first();
  await clickAt(page, composer);
  await composer.pressSequentially('leite meinen Umzug ein', { delay: 80 });
  await beat(page, 900);
  await composer.press('Enter');

  /* ── Szene 3 — Bestätigungskarte: Bürger:in behält die Kontrolle ────────── */
  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 30_000 });
  await focusOn(page, confirmCard);
  await beat(page, 4200);

  /* ── Szene 4 — "Umzug starten": erst nach ausdrücklicher Bestätigung ────── */
  await clickAt(page, confirmCard.getByRole('button', { name: 'Umzug starten' }));

  /* ── Szene 5 — die Kaskade läuft INLINE im Verlauf (Block A automatisch) ── */
  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 30_000 });
  await focusOn(page, inlineCascade);
  await beat(page, 5200); // zusehen, wie die statutarischen Stellen "empfangen"

  /* ── Szene 6 — die zwei sensiblen Stellen: "Mit eID bestätigen" ─────────── */
  const eidButtons = inlineCascade.getByTestId('inline-eid-confirm');
  await expect(eidButtons).toHaveCount(2, { timeout: 30_000 });
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(1, { timeout: 20_000 });
  await beat(page, 2400);
  await still(page, 'cascade-eid'); // README frame: Block A bestätigt, 1× eID offen
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(0, { timeout: 20_000 });
  await beat(page, 2200);

  /* ── Szene 7 — der Wert-Beleg: Once-Only-Zähler + Quelle Ihre Stammdaten ── */
  const receipt = inlineCascade.getByTestId('inline-cascade-receipt');
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(
    inlineCascade.getByText(/Felder, die Sie nicht ausfüllen mussten/i),
  ).toBeVisible({ timeout: 30_000 });
  await focusOn(page, receipt);
  await beat(page, 5200); // den Payoff wirken lassen
  await still(page, 'cascade-receipt'); // README frame: Wert-Beleg + Once-Only

  /* ── Szene 8 — Posteingang: die Bestätigungsschreiben sind eingetroffen ─── */
  await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
  const firstLetter = page.locator('a[href^="/posteingang/letter-"]').first();
  await expect(firstLetter).toBeVisible({ timeout: 30_000 });
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 1400);
  await focusOn(page, firstLetter);
  await beat(page, 4200);
});
