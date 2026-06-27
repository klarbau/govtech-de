/**
 * UPDATE-ARC — CLEAN CAPTURE (no post-processing baked in).
 *
 * A raw, MCP-ready recording of the "what's new" / security & real-integration
 * walkthrough (companion to tests/demo/update-arc-demo.spec.ts). It performs the
 * EXACT same navigation + clicks as the polished update-arc recorder, but with
 * the whole in-take edit STRIPPED OUT:
 *
 *   - NO intro / outro title cards
 *   - NO lower-third captions / any overlay text
 *   - NO cinematic zoom push-ins (no transform: scale on <body>)
 *   - NO dark IDE code cards / ken-burns drift
 *   - NO white cross-fades
 *
 * What remains is only what you need to SEE the interaction cleanly:
 *   - an injected cursor + click ripple (so every click is visible)
 *   - hidden scrollbars
 *   - a plain solid cover (#F8FAFC, no text) that masks each route change so the
 *     cut lands on a fully-loaded screen instead of a "Wird geladen…" skeleton
 *
 * Each key element is still scrolled to centre and held on a beat, so the footage
 * lingers long enough for downstream MCP processing to add zoom / captions / music.
 *
 *   npm run demo:record:update:clean   (see playwright.update-clean.config.ts)
 *
 * Deterministic + key-independent: the assistant SSE is mocked, Anna's
 * authenticated state is seeded, `?reliable=1` disables the 5% mock-error
 * injection. NOT a test gate — the expect(...) calls are sync points.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { writeFileSync } from 'node:fs';

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

/* ─────────────────────────  cursor + pacing  ───────────────────── */

let cursor = { x: 960, y: 140 };
const clickTimes: number[] = [];
let takeStart = 0;

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** A "let the viewer (and post-processing) settle on this" pause. */
function beat(page: Page, ms = 2000): Promise<void> {
  return page.waitForTimeout(ms);
}

/** Glide the (injected) cursor from its current spot to (x,y) with easing. */
async function glide(
  page: Page,
  x: number,
  y: number,
  { ms = 520, steps = 32 } = {},
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

/** Smooth-scroll a target to centre, then glide the cursor onto it. */
async function focusOn(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator
    .evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    .catch(() => {});
  await beat(page, 600);
  const box = await locator.boundingBox();
  if (box) await glide(page, box.x + box.width / 2, box.y + box.height / 2);
}

/** Glide onto a control and click it (the injected mousedown ripple fires). */
async function clickAt(page: Page, locator: Locator): Promise<void> {
  await focusOn(page, locator);
  await beat(page, 200);
  clickTimes.push(Date.now() - takeStart);
  await locator.click();
  await beat(page, 200);
}

/* ─────────────────────  injected chrome (cursor + cover only)  ───────────── */

/** Inject the minimal demo chrome on EVERY navigation (each new document). */
async function installDemoChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Plain solid cover — masks the incoming document from frame 0 so a route
    // change never flashes a skeleton. NO text, NO animation: it is removed
    // instantly once the page content is asserted-visible (see revealPage).
    // Attached via MutationObserver because at init time documentElement can
    // still be null.
    const addVeil = () => {
      if (!document.documentElement || document.getElementById('__clean_boot')) {
        return Boolean(document.getElementById('__clean_boot'));
      }
      const boot = document.createElement('style');
      boot.id = '__clean_boot';
      boot.textContent = `
        html.__clean_veil::before {
          content: ''; position: fixed; inset: 0; background: #F8FAFC;
          z-index: 2147483644; pointer-events: none;
        }
      `;
      document.documentElement.appendChild(boot);
      document.documentElement.classList.add('__clean_veil');
      return true;
    };
    try {
      if (!addVeil()) {
        const mo = new MutationObserver(() => {
          if (addVeil()) mo.disconnect();
        });
        mo.observe(document, { childList: true });
      }
    } catch {
      /* never let the cover break the cursor install */
    }

    const install = () => {
      if (document.getElementById('__clean_cursor')) return;
      const style = document.createElement('style');
      style.textContent = `
        #__clean_cursor {
          position: fixed; top: 0; left: 0; width: 24px; height: 24px;
          z-index: 2147483647; pointer-events: none;
          transform: translate(-60px, -60px);
          transition: transform 70ms linear; will-change: transform;
        }
        #__clean_cursor svg { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); }
        .__clean_ripple {
          position: fixed; z-index: 2147483646; pointer-events: none;
          width: 16px; height: 16px; margin-left: -8px; margin-top: -8px;
          border-radius: 9999px; border: 2px solid rgba(37,99,235,.95);
          background: rgba(37,99,235,.20);
          animation: __clean_ripple 520ms ease-out forwards;
        }
        @keyframes __clean_ripple {
          0%   { transform: scale(.45); opacity: .95; }
          100% { transform: scale(3.4);  opacity: 0;   }
        }
        ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
        * { scrollbar-width: none !important; }
      `;
      document.head.appendChild(style);

      const cur = document.createElement('div');
      cur.id = '__clean_cursor';
      cur.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M5 2.5l14.5 7.2-6.4 1.5L9.7 18.8 5 2.5z" fill="#0b1220" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
      // Lives on documentElement (NOT <body>): React re-renders <body> during
      // hydration and would wipe a foreign node there.
      document.documentElement.appendChild(cur);

      const place = (x: number, y: number) => {
        cur.style.transform = `translate(${x}px, ${y}px)`;
      };
      window.addEventListener('mousemove', (e) => place(e.clientX, e.clientY), true);
      window.addEventListener(
        'mousedown',
        (e) => {
          const r = document.createElement('div');
          r.className = '__clean_ripple';
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

/** Drop the solid cover instantly — the page underneath is already loaded. */
async function revealPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.remove('__clean_veil');
  });
}

/* ─────────────────────────  app state + SSE mock  ───────────────────── */

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__clean_demo_seeded`;
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
          'termine',
          'orchestration:sagas',
          'orchestration:outbox',
          'orchestration:audit-log',
          'orchestration:dlq',
          'orchestration:breakers',
        ]) {
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
  await page.route('**/api/assistant', async (route) => {
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
          id: 'toolu_clean_demo_preview_umzug',
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

test('CLEAN - Update-Arc raw capture (Anna)', async ({ page }) => {
  test.setTimeout(320_000);
  cursor = { x: 960, y: 140 };
  takeStart = Date.now();
  clickTimes.length = 0;
  await installDemoChrome(page);
  await setupAuthenticatedAnna(page);
  await mockAssistantRoute(page);

  /* ── Szene 0 — Dashboard (Ausgangspunkt) ────────────────────────────────── */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  // The dashboard h1 is the client-rendered greeting ("Guten Tag, Anna Petrov").
  // Wait for the name to populate so the reveal lands on a loaded screen.
  await expect(
    page.getByRole('heading', { name: /Petrov/i }),
  ).toBeVisible({ timeout: 30_000 });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 1800);

  /* ── Szene 1 — Assistent: ein Satz stößt die Kaskade an ─────────────────── */
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
    timeout: 30_000,
  });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 800);

  const composer = page.getByPlaceholder(/.+/).first();
  await clickAt(page, composer);
  await composer.pressSequentially('leite meinen Umzug ein', { delay: 50 });
  await beat(page, 450);
  await composer.press('Enter');

  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 30_000 });
  await focusOn(page, confirmCard);
  await beat(page, 2000);
  await clickAt(page, confirmCard.getByRole('button', { name: 'Umzug starten' }));

  /* ── Szene 2 — Resiliente Saga-Engine: die Kaskade läuft inline ─────────── */
  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 30_000 });
  await focusOn(page, inlineCascade);
  await beat(page, 2800);

  /* ── Szene 3 — Hash-verkettetes Protokoll (Laufzettel öffnen) ───────────── */
  const toggle = page.getByTestId('orchestration-inline-toggle');
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  await clickAt(page, toggle);
  const auditRow = page.getByTestId('orchestration-audit-row').first();
  await expect(auditRow).toBeVisible({ timeout: 30_000 });
  await focusOn(page, auditRow);
  await beat(page, 2600);

  /* ── Szene 4 — verifyChain(): die Kette wird geprüft ────────────────────── */
  const verifyCta = page.getByTestId('orchestration-verify-cta');
  await expect(verifyCta).toBeVisible({ timeout: 20_000 });
  await clickAt(page, verifyCta);
  const verifyResult = page.getByTestId('orchestration-verify-result');
  await expect(verifyResult).toHaveAttribute('data-verify-result', 'ok', {
    timeout: 20_000,
  });
  await focusOn(page, verifyResult);
  await beat(page, 2200);

  /* ── Szene 5 — Termin-Autopilot: gefunden + vorgemerkt, nie gebucht ─────── */
  const terminRow = inlineCascade.getByTestId('termin-vorschlag-row');
  if (await terminRow.count()) {
    await focusOn(page, terminRow);
    await beat(page, 2400);
  }

  /* ── Szene 6 — eID-Gate + FIT-Connect-Quittung (JWE) ────────────────────── */
  const eidButtons = inlineCascade.getByTestId('inline-eid-confirm');
  await expect(eidButtons.first()).toBeVisible({ timeout: 30_000 });
  await focusOn(page, eidButtons.first());
  await beat(page, 800);
  // Confirm both Block-D rows; the button unmounts each time (count 2 → 1 → 0).
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(1, { timeout: 20_000 });
  await beat(page, 900);
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(0, { timeout: 20_000 });

  const jweExcerpt = page.getByTestId('fit-connect-jwe-excerpt').first();
  await expect(jweExcerpt).toBeVisible({ timeout: 30_000 });
  await focusOn(page, jweExcerpt);
  await beat(page, 3200);

  // NOTE — the update-arc's EUDI-reference-credential (Stammdaten) and Verifiable
  // Once-Only (Dokumente) beats are intentionally NOT recorded here: on this
  // branch (feat/termine-vorgemerkt, post green-bento redesign) those exact
  // panels (`eudi-reference-pid-card` via WalletSubTab, `meldebestaetigung-
  // credential-panel`) are orphaned — rendered by nothing — so they can't be
  // shown faithfully. The clean take therefore ends on the real FIT-Connect JWE
  // submission, the strongest "real systems under the prototype" proof.

  // Final settle so the cut doesn't end on a hard frame.
  await beat(page, 1600);

  writeFileSync(
    'demo-recording/clean-clicks.json',
    JSON.stringify(
      { clicks_ms: clickTimes, take_ms: Date.now() - takeStart },
      null,
      2,
    ),
  );
});
