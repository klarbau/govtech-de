/**
 * DEMO RECORDER — the headline-wow walkthrough, captured as a polished video.
 *
 *   npm run demo:record   (see playwright.demo.config.ts)
 *   npm run demo:render   (webm → mp4, optional speed-up; needs ffmpeg)
 *
 * Drives the REAL app along the demo-spine (docs/demo-spine.md) and does the
 * whole edit IN-TAKE, so the raw .webm is already the finished cut:
 *
 *   - intro + outro title cards (brand cobalt #2563EB, Inter, gov.uk register,
 *     honest „alle Daten erfunden" disclaimer on both cards)
 *   - lower-third scene captions (German, Sie-Form, one message per scene —
 *     wording follows docs/loom-script.md)
 *   - white cross-fades on every route change instead of hard cuts (a boot
 *     veil covers the incoming document so no loading skeleton ever shows)
 *   - an animated cursor with eased glides + click ripples, smooth scrolling,
 *     hidden scrollbars, deliberate-but-brisk pacing
 *
 * NOT a test gate — the `expect(...).toBeVisible()` calls are only sync points
 * so the recorder waits for each beat to render before pausing on it.
 *
 * Deterministic + key-independent: the assistant SSE is mocked (same shape as
 * tests/e2e/spine.spec.ts), Anna's authenticated state is seeded into
 * localStorage, and `?reliable=1` disables the 5% mock-error injection — so the
 * cascade plays out identically, take after take.
 *
 * Helpers (auth seed + SSE mock) are kept in sync with tests/e2e/spine.spec.ts.
 */
import { test, expect, type Page, type Route, type Locator } from '@playwright/test';
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

/* ─────────────────────────  cinematic cursor + pacing  ───────────────────── */

/** Where the fake cursor currently is (viewport coords). Eased glides start here. */
let cursor = { x: 960, y: 140 };

/**
 * Click timestamps (ms, relative to take start) — written to
 * demo-recording/clicks.json so `npm run demo:render` can lay a click sound
 * under each ripple. The take starts ms after the page fixture begins the
 * video capture, so the offsets line up with the .webm timeline.
 */
const clickTimes: number[] = [];
let takeStart = 0;

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

/**
 * README still-frame capture — only when DEMO_SHOT=1 (e.g.
 * `$env:DEMO_SHOT='1'; npm run demo:record`). Hides the injected cursor and
 * the lower-third caption for the frame, writes demo-recording/still-<name>.png,
 * restores both. Pass { chrome: true } to KEEP the caption in the frame (used
 * to eyeball the title/caption design, not for README). A no-op in video takes.
 */
async function still(
  page: Page,
  name: string,
  { chrome = false } = {},
): Promise<void> {
  if (!process.env.DEMO_SHOT) return;
  await page.evaluate((keepChrome) => {
    const c = document.getElementById('__demo_cursor');
    if (c) c.style.display = 'none';
    const cap = document.getElementById('__demo_caption');
    if (cap && !keepChrome) cap.style.visibility = 'hidden';
  }, chrome);
  await page.screenshot({ path: `demo-recording/still-${name}.png` });
  await page.evaluate(() => {
    const c = document.getElementById('__demo_cursor');
    if (c) c.style.display = '';
    const cap = document.getElementById('__demo_caption');
    if (cap) cap.style.visibility = '';
  });
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

/* ─────────────────────  in-take edit: overlay, captions  ─────────────────── */

/**
 * Inject the demo chrome on EVERY navigation (each new document):
 *  - a boot VEIL (plain ::before layer) that covers the incoming document from
 *    its very first painted frame, so route changes never flash a skeleton
 *  - the full-screen OVERLAY used for the intro/outro cards and cross-fades
 *  - the lower-third CAPTION card
 *  - a visible cursor + click ripples + hidden scrollbar
 */
async function installDemoChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Veil as close to frame 0 as possible. At init-script time the document
    // is EMPTY — even documentElement is null — so attach via MutationObserver
    // the moment <html> is parsed. try/catch so a veil hiccup can never kill
    // the rest of the chrome install (this exact crash blanked takes 1+2).
    const addVeil = () => {
      if (!document.documentElement || document.getElementById('__demo_boot')) {
        return Boolean(document.getElementById('__demo_boot'));
      }
      const boot = document.createElement('style');
      boot.id = '__demo_boot';
      boot.textContent = `
        html.__demo_veil::before {
          content: ''; position: fixed; inset: 0; background: #F8FAFC;
          z-index: 2147483644; pointer-events: none;
        }
      `;
      document.documentElement.appendChild(boot);
      document.documentElement.classList.add('__demo_veil');
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
      /* never let the veil break the cursor/overlay install */
    }

    const install = () => {
      if (document.getElementById('__demo_cursor')) return;
      const style = document.createElement('style');
      style.textContent = `
        #__demo_cursor {
          position: fixed; top: 0; left: 0; width: 24px; height: 24px;
          z-index: 2147483647; pointer-events: none;
          transform: translate(-60px, -60px);
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
        #__demo_overlay {
          position: fixed; inset: 0; z-index: 2147483645; pointer-events: none;
          display: flex; align-items: center; justify-content: center;
          background: #F8FAFC; opacity: 0; font-family: inherit;
          transition: opacity 700ms cubic-bezier(.4, 0, .2, 1);
        }
        #__demo_overlay.__show { opacity: 1; }
        .__demo_card { max-width: 880px; padding: 0 64px; }
        .__demo_brand {
          display: flex; align-items: center; gap: 10px;
          margin: 0 0 30px; font-size: 17px; font-weight: 600; color: #0F172A;
        }
        .__demo_brand_mark {
          width: 13px; height: 13px; border-radius: 3px; background: #2563EB;
        }
        .__demo_kicker {
          margin: 0 0 18px; font-size: 13px; font-weight: 600;
          letter-spacing: .14em; text-transform: uppercase; color: #2563EB;
        }
        .__demo_title {
          margin: 0 0 22px; font-size: 56px; line-height: 1.12;
          font-weight: 700; letter-spacing: -0.02em; color: #0F172A;
        }
        .__demo_sub {
          margin: 0 0 30px; font-size: 21px; line-height: 1.5;
          color: #475569; max-width: 740px;
        }
        .__demo_note {
          margin: 0; padding-top: 18px; border-top: 1px solid #E2E8F0;
          font-size: 14px; color: #64748B;
        }
        #__demo_caption {
          position: fixed; left: 28px; bottom: 28px; z-index: 2147483643;
          max-width: 620px; pointer-events: none; font-family: inherit;
          background: #FFFFFF; border-left: 3px solid #2563EB; border-radius: 8px;
          box-shadow: 0 6px 24px rgba(15,23,42,.14), 0 1px 3px rgba(15,23,42,.10);
          padding: 12px 18px 13px;
          opacity: 0; transform: translateY(14px);
          transition: opacity 420ms cubic-bezier(.4, 0, .2, 1),
                      transform 420ms cubic-bezier(.4, 0, .2, 1);
        }
        #__demo_caption.__show { opacity: 1; transform: translateY(0); }
        .__demo_caption_kicker {
          margin: 0 0 2px; font-size: 11.5px; font-weight: 700;
          letter-spacing: .12em; text-transform: uppercase; color: #2563EB;
        }
        .__demo_caption_text {
          margin: 0; font-size: 16.5px; line-height: 1.4;
          font-weight: 500; color: #0F172A;
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

      // Overlay + caption live on documentElement — React re-renders <body>
      // during hydration and wipes foreign nodes there (the cursor survives on
      // documentElement across every take). `font-family: inherit` still picks
      // up Inter: the `font-sans` + Inter variable classes sit on <html>.
      const overlay = document.createElement('div');
      overlay.id = '__demo_overlay';
      document.documentElement.appendChild(overlay);
      const caption = document.createElement('div');
      caption.id = '__demo_caption';
      document.documentElement.appendChild(caption);

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

type CardSpec = {
  brand?: boolean;
  kicker?: string;
  title: string;
  sub?: string;
  note?: string;
};

/** Build a title-card DOM inside the overlay (textContent only — no HTML injection). */
function buildCard(spec: CardSpec): string {
  // Serialized into page.evaluate — keep it data, render there.
  return JSON.stringify(spec);
}

async function setOverlayCard(page: Page, spec: CardSpec): Promise<void> {
  await page.evaluate((json) => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    const s = JSON.parse(json) as {
      brand?: boolean; kicker?: string; title: string; sub?: string; note?: string;
    };
    o.innerHTML = '';
    const card = document.createElement('div');
    card.className = '__demo_card';
    if (s.brand) {
      const b = document.createElement('p');
      b.className = '__demo_brand';
      const mark = document.createElement('span');
      mark.className = '__demo_brand_mark';
      b.appendChild(mark);
      b.appendChild(document.createTextNode('GovTech DE'));
      card.appendChild(b);
    }
    if (s.kicker) {
      const k = document.createElement('p');
      k.className = '__demo_kicker';
      k.textContent = s.kicker;
      card.appendChild(k);
    }
    const t = document.createElement('p');
    t.className = '__demo_title';
    t.textContent = s.title;
    card.appendChild(t);
    if (s.sub) {
      const su = document.createElement('p');
      su.className = '__demo_sub';
      su.textContent = s.sub;
      card.appendChild(su);
    }
    if (s.note) {
      const n = document.createElement('p');
      n.className = '__demo_note';
      n.textContent = s.note;
      card.appendChild(n);
    }
    o.appendChild(card);
  }, buildCard(spec));
}

/**
 * Snap the overlay to fully opaque WITHOUT animating (it appears behind the
 * boot veil, so the switch is invisible), drop the veil, then either keep the
 * card on screen (hold) or fade the overlay out to reveal the page.
 */
async function revealPage(page: Page, { hold = false } = {}): Promise<void> {
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    o.style.transition = 'none';
    o.classList.add('__show');
    void o.offsetWidth; // force the opaque frame before the veil drops
    document.documentElement.classList.remove('__demo_veil');
    o.style.transition = '';
  });
  if (!hold) await fadeOverlayOut(page);
}

async function fadeOverlayOut(page: Page): Promise<void> {
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (o) o.classList.remove('__show');
  });
  await beat(page, 780);
}

/** Fade the (empty) overlay in — the outgoing half of a route cross-fade. */
async function fadeOverlayIn(page: Page): Promise<void> {
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    o.innerHTML = '';
    o.classList.add('__show');
  });
  await beat(page, 780);
}

/** Show (or swap) the lower-third caption. */
async function caption(page: Page, kicker: string, text: string): Promise<void> {
  const isShown = await page.evaluate(() => {
    const c = document.getElementById('__demo_caption');
    return Boolean(c && c.classList.contains('__show'));
  });
  if (isShown) {
    await hideCaption(page);
    await beat(page, 260);
  }
  await page.evaluate(
    ([k, t]) => {
      const c = document.getElementById('__demo_caption');
      if (!c) return;
      c.innerHTML = '';
      const kk = document.createElement('p');
      kk.className = '__demo_caption_kicker';
      kk.textContent = k;
      const tt = document.createElement('p');
      tt.className = '__demo_caption_text';
      tt.textContent = t;
      c.appendChild(kk);
      c.appendChild(tt);
      c.classList.add('__show');
    },
    [kicker, text],
  );
  await beat(page, 460);
}

async function hideCaption(page: Page): Promise<void> {
  await page.evaluate(() => {
    const c = document.getElementById('__demo_caption');
    if (c) c.classList.remove('__show');
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
  test.setTimeout(240_000);
  cursor = { x: 960, y: 140 };
  takeStart = Date.now();
  clickTimes.length = 0;
  await installDemoChrome(page);
  await setupAuthenticatedAnna(page);
  await mockAssistantRoute(page);

  /* ── Szene 0 — Intro-Karte (das Dashboard lädt unsichtbar dahinter) ──────── */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Petrov/i })).toBeVisible({
    timeout: 30_000,
  });
  await setOverlayCard(page, {
    brand: true,
    title: 'Verwaltung neu gedacht.',
    sub: 'Ein:e Bürger:in sagt einmal „ich ziehe um" — und das System informiert jede zuständige Behörde.',
    note: 'Speculative-Design-Prototyp · 2027 · DeutschlandID + EUDI Wallet · Alle Daten sind erfunden.',
  });
  await revealPage(page, { hold: true });
  await beat(page, 3000);
  await still(page, 'intro', { chrome: true });
  await fadeOverlayOut(page);

  /* ── Szene 1 — Dashboard: „Was heute Ihre Aufmerksamkeit braucht" + der Umzug-Anstoß ─ */
  await page.mouse.move(cursor.x, cursor.y); // reveal the cursor
  await beat(page, 700);
  const heuteZuTun = page.getByRole('heading', {
    name: 'Was heute Ihre Aufmerksamkeit braucht',
  });
  await expect(heuteZuTun).toBeVisible();
  await caption(page, 'Dashboard', 'Nicht alles auf einmal — sondern was heute zählt.');
  await focusOn(page, heuteZuTun);
  await beat(page, 2400);
  await still(page, 'scene-dashboard', { chrome: true });
  await hideCaption(page);
  await fadeOverlayIn(page);

  /* ── Szene 2 — Assistent: ein Satz genügt ───────────────────────────────── */
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
    timeout: 30_000,
  });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 700);
  await caption(page, 'Assistent', 'Ein Satz genügt — kein Formular, kein Behördendeutsch.');

  const composer = page.getByPlaceholder(/.+/).first();
  await clickAt(page, composer);
  await composer.pressSequentially('leite meinen Umzug ein', { delay: 55 });
  await beat(page, 550);
  await composer.press('Enter');

  /* ── Szene 3 — Bestätigungskarte: Bürger:in behält die Kontrolle ────────── */
  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'Kontrolle',
    'Vor dem Start: wer informiert wird — auf welcher Rechtsgrundlage.',
  );
  await focusOn(page, confirmCard);
  await beat(page, 3400);

  /* ── Szene 4 — „Umzug starten": erst nach ausdrücklicher Bestätigung ────── */
  await clickAt(page, confirmCard.getByRole('button', { name: 'Umzug starten' }));

  /* ── Szene 5 — die Kaskade läuft INLINE im Verlauf (Block A automatisch) ── */
  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'Autopilot',
    'Die Verwaltung koordiniert sich selbst — nicht die Bürgerin.',
  );
  await focusOn(page, inlineCascade);
  await beat(page, 4200); // zusehen, wie die statutarischen Stellen "empfangen"

  /* ── Szene 6 — die zwei sensiblen Stellen: „Mit eID bestätigen" ─────────── */
  const eidButtons = inlineCascade.getByTestId('inline-eid-confirm');
  await expect(eidButtons).toHaveCount(2, { timeout: 30_000 });
  await caption(
    page,
    'eID-Bestätigung',
    'Sensible Stellen übermitteln Sie aktiv — mit Ihrem Ausweis.',
  );
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(1, { timeout: 20_000 });
  await beat(page, 1900);
  await still(page, 'cascade-eid'); // README frame: Block A bestätigt, 1× eID offen
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(0, { timeout: 20_000 });
  await beat(page, 1700);

  /* ── Szene 7 — der Wert-Beleg: Once-Only-Zähler + Quelle Ihre Stammdaten ── */
  const receipt = inlineCascade.getByTestId('inline-cascade-receipt');
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(
    inlineCascade.getByText(/Felder, die Sie nicht ausfüllen mussten/i),
  ).toBeVisible({ timeout: 30_000 });
  await caption(page, 'Once-Only', 'Der Beleg: Felder, die Sie nicht ausfüllen mussten.');
  await focusOn(page, receipt);
  await beat(page, 4000); // den Payoff wirken lassen
  await still(page, 'cascade-receipt'); // README frame: Wert-Beleg + Once-Only
  await hideCaption(page);
  await fadeOverlayIn(page);

  /* ── Szene 8 — Posteingang: die Bestätigungsschreiben sind eingetroffen ─── */
  await page.goto('/posteingang?reliable=1', { waitUntil: 'domcontentloaded' });
  const firstLetter = page.locator('a[href^="/posteingang/letter-"]').first();
  await expect(firstLetter).toBeVisible({ timeout: 30_000 });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 700);
  await caption(
    page,
    'Posteingang',
    'Jede Bestätigung in Klartext — dort, wo Sie sie erwarten.',
  );
  await focusOn(page, firstLetter);
  await beat(page, 3000);
  await hideCaption(page);
  await beat(page, 300);

  /* ── Szene 9 — Outro-Karte: Kernbotschaft + ehrlicher Disclaimer ─────────── */
  await setOverlayCard(page, {
    brand: true,
    title: 'Ein Satz statt vieler Behördengänge.',
    sub: 'govtech-de.vercel.app  ·  github.com/klarbau/govtech-de',
    note: 'Speculative-Design-Prototyp — alle Daten erfunden, keine echte Behörde angebunden.',
  });
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (o) o.classList.add('__show');
  });
  await beat(page, 3600);
  await still(page, 'outro', { chrome: true });

  writeFileSync(
    'demo-recording/clicks.json',
    JSON.stringify({ clicks_ms: clickTimes, take_ms: Date.now() - takeStart }, null, 2),
  );
});
