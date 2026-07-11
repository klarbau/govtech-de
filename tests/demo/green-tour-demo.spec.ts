/**
 * GREEN-TOUR DEMO RECORDER — the "what's new in the Waldgrün redesign" showcase,
 * captured as a polished ~2-minute video. Sibling of update-arc-demo.spec.ts; this
 * one tells the *green redesign + functional Lebenslagen* story: the demo stopped
 * being a flat literal-port and became a coherent, operable system — a brand-owned
 * "Waldgrün" identity, a config-driven Lebenslagen engine (detail → vorausgefüllter
 * Antrag → eID → Einreichungs-Kaskade) for all seven life-situations, eID-gated
 * transparency, and the Termin-Autopilot (§ 17 BMG) — all on the mock-backend.
 *
 *   npm run demo:record:green   (see playwright.green-demo.config.ts)
 *   npm run demo:render         (newest .webm → scored mp4; needs ffmpeg)
 *
 * Like the update-arc recorder it does the WHOLE edit in-take, so the raw .webm is
 * already the finished cut: boot veil + white cross-fades, intro/outro cards,
 * lower-third captions, animated cursor + click ripples, hidden scrollbars, and a
 * cinematic zoom engine (eased transform: scale() push-in toward a focal element,
 * with per-beat duration + easing). Chrome re-themed cobalt → Waldgrün.
 *
 * NOT a test gate — the `expect(...)` calls are sync points so the recorder waits
 * for each beat to render before pausing on it. Deterministic + key-independent:
 * Anna's authenticated state is seeded, every route is visited with `?reliable=1`
 * so the 5% mock-error injection is disabled. No assistant SSE is used here, so no
 * ANTHROPIC_API_KEY is needed.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

/* ─────────────────────────  cinematic cursor + pacing  ───────────────────── */

let cursor = { x: 960, y: 140 };
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

/* ─────────────────────────────  ZOOM engine  ─────────────────────────────── */
/*
 * A cinematic push-in: animate `transform: scale()` on <body> with the
 * transform-origin pinned to a focal element's centre, so that point stays put
 * on screen while everything scales around it. Per-beat duration + easing make
 * "fast in / slow out" or "slow in / fast out" a one-line choice. Captions, the
 * cursor and the cross-fade overlay sit on <html> (outside <body>), so they are
 * unaffected and stay legible while the page zooms.
 */

const EASE_PUNCH = 'cubic-bezier(.16,.84,.30,1)'; // snappy settle (fast-feel in)
const EASE_GLIDE = 'cubic-bezier(.40,.00,.20,1)'; // smooth, unhurried

/** Centre `locator`, then zoom <body> toward it. Holds for `ms` (the animation). */
async function zoomTo(
  page: Page,
  locator: Locator,
  { scale = 1.5, ms = 1000, ease = EASE_GLIDE, settle = 700 } = {},
): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator
    .evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    .catch(() => {});
  await beat(page, 520);
  const box = await locator.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.evaluate(
    ([s, dur, easing, ox, oy]) => {
      const b = document.body;
      b.style.transformOrigin = `${(ox as number) + window.scrollX}px ${
        (oy as number) + window.scrollY
      }px`;
      b.style.willChange = 'transform';
      b.style.transition = `transform ${dur}ms ${easing}`;
      void b.offsetWidth; // commit the origin before the scale animates
      b.style.transform = `scale(${s})`;
    },
    [scale, ms, ease, cx, cy] as const,
  );
  await beat(page, ms + settle);
}

/** Animate <body> back to scale(1). */
async function zoomOut(
  page: Page,
  { ms = 800, ease = EASE_GLIDE } = {},
): Promise<void> {
  await page.evaluate(
    ([dur, easing]) => {
      const b = document.body;
      b.style.transition = `transform ${dur}ms ${easing}`;
      b.style.transform = 'scale(1)';
    },
    [ms, ease] as const,
  );
  await beat(page, ms);
}

/** Snap <body> back to identity with no animation (used under the veil/overlay). */
async function resetZoomInstant(page: Page): Promise<void> {
  await page.evaluate(() => {
    const b = document.body;
    b.style.transition = 'none';
    b.style.transform = 'none';
    b.style.transformOrigin = '';
  });
}

/* ─────────────────────  in-take edit: overlay, captions  ───────────── */

/** Inject the demo chrome on EVERY navigation (each new document). */
async function installDemoChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Boot veil — covers the incoming document from frame 0 so route changes
    // never flash a skeleton. Attached via MutationObserver because at init time
    // documentElement can still be null (see WORKFLOW notes).
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
      /* never let the veil break the rest of the chrome install */
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
          border-radius: 9999px; border: 2px solid rgba(21,128,61,.95);
          background: rgba(21,128,61,.20);
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
        #__demo_overlay.__dark { background: #060A14; }
        .__demo_card { max-width: 880px; padding: 0 64px; }
        .__demo_brand {
          display: flex; align-items: center; gap: 10px;
          margin: 0 0 30px; font-size: 17px; font-weight: 600; color: #0F172A;
        }
        .__demo_brand_mark {
          width: 13px; height: 13px; border-radius: 3px; background: #0F3D2E;
        }
        .__demo_kicker {
          margin: 0 0 18px; font-size: 13px; font-weight: 600;
          letter-spacing: .14em; text-transform: uppercase; color: #15803D;
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
        /* ── lower-third caption ───────────────────────────────────────── */
        #__demo_caption {
          position: fixed; left: 28px; bottom: 28px; z-index: 2147483643;
          max-width: 660px; pointer-events: none; font-family: inherit;
          background: #FFFFFF; border-left: 3px solid #15803D; border-radius: 8px;
          box-shadow: 0 6px 24px rgba(15,23,42,.14), 0 1px 3px rgba(15,23,42,.10);
          padding: 12px 18px 13px;
          opacity: 0; transform: translateY(14px);
          transition: opacity 420ms cubic-bezier(.4, 0, .2, 1),
                      transform 420ms cubic-bezier(.4, 0, .2, 1);
        }
        #__demo_caption.__show { opacity: 1; transform: translateY(0); }
        .__demo_caption_kicker {
          margin: 0 0 2px; font-size: 11.5px; font-weight: 700;
          letter-spacing: .12em; text-transform: uppercase; color: #15803D;
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
      // during hydration and wipes foreign nodes there. Living on <html> also
      // keeps them OUTSIDE the <body> zoom transform → screen-fixed + legible.
      const overlay = document.createElement('div');
      overlay.id = '__demo_overlay';
      document.documentElement.appendChild(overlay);
      const caption = document.createElement('div');
      caption.id = '__demo_caption';
      document.documentElement.appendChild(caption);

      const place = (x: number, y: number) => {
        cur.style.transform = `translate(${x}px, ${y}px)`;
      };
      window.addEventListener('mousemove', (e) => place(e.clientX, e.clientY), true);
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

async function setOverlayCard(page: Page, spec: CardSpec): Promise<void> {
  await page.evaluate((json) => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    o.classList.remove('__dark');
    const s = JSON.parse(json) as CardSpec;
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
  }, JSON.stringify(spec));
}

async function revealPage(page: Page, { hold = false } = {}): Promise<void> {
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    o.style.transition = 'none';
    o.classList.add('__show');
    void o.offsetWidth;
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
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (o) o.classList.remove('__dark');
  });
}

/** Fade the (empty) overlay in — the outgoing half of a route cross-fade. */
async function fadeOverlayIn(page: Page): Promise<void> {
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    o.innerHTML = '';
    o.classList.remove('__dark');
    o.classList.add('__show');
  });
  await beat(page, 780);
}

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

/* ─────────────────────────  app state  ───────────────────── */

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__green_demo_seeded`;
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

/* ─────────────────────────────  the walkthrough  ───────────────────────────── */

test('DEMO - Green-Tour: Das neue grüne Design, funktional (Anna)', async ({
  page,
}) => {
  test.setTimeout(350_000);
  cursor = { x: 960, y: 140 };
  takeStart = Date.now();
  clickTimes.length = 0;
  await installDemoChrome(page);
  await setupAuthenticatedAnna(page);

  /* ── Szene 0 — Intro-Karte (Landing lädt unsichtbar dahinter) ───────────── */
  await page.goto('/?reliable=1', { waitUntil: 'domcontentloaded' });
  // Anchor on the server-rendered hero h1 (instant, static landing).
  await expect(
    page.getByRole('heading', { level: 1 }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await setOverlayCard(page, {
    brand: true,
    kicker: 'Was ist neu',
    title: 'Vom Bildschirm zum System.',
    sub: 'Das neue grüne Design ist mehr als Farbe: die Lebenslagen funktionieren jetzt durchgängig — von der Auswahl bis zur Einreichung.',
    note: 'Speculative-Design-Prototyp · 2027 · Alle Daten erfunden, keine echte Behörde angebunden.',
  });
  await revealPage(page, { hold: true });
  await beat(page, 2800);
  await fadeOverlayOut(page);
  await beat(page, 1200); // establishing shot of the loaded landing

  /* ── Szene 1 — Landing: die „Waldgrün"-Identität ────────────────────────── */
  await caption(
    page,
    'Neues Design',
    '„Waldgrün" — eine eigenständige, staatlich-seriöse Identität.',
  );
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  const heroTitle = page.locator('#hero-title');
  await zoomTo(page, heroTitle, { scale: 1.32, ms: 1200, ease: EASE_GLIDE });
  await beat(page, 1300);
  // Pan onto the signature process-flow card, then pull back.
  await zoomTo(page, page.locator('.flow-card'), {
    scale: 1.28,
    ms: 1100,
    ease: EASE_PUNCH,
  });
  await beat(page, 1500);
  await zoomOut(page, { ms: 820, ease: EASE_GLIDE });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 2 — Stammdaten: Once-Only, geprüfte Quelle ───────────────────── */
  await page.goto('/stammdaten?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Stammdaten', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  // Let the completeness ring + bento cards populate behind the cross-fade.
  await page
    .getByTestId('v2-completeness-ring')
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(
    page,
    'Once-Only',
    'Einmal erfasst, überall nutzbar — Ihre Daten als geprüfte Quelle.',
  );
  // FAST punch-in on the completeness ring, SLOW glide out.
  await zoomTo(page, page.getByTestId('v2-completeness-ring'), {
    scale: 1.55,
    ms: 460,
    ease: EASE_PUNCH,
    settle: 800,
  });
  await beat(page, 1100);
  // Glide across the green bento card grid.
  await zoomTo(page, page.locator('.sd-bento'), {
    scale: 1.18,
    ms: 1200,
    ease: EASE_GLIDE,
  });
  await beat(page, 1400);
  await zoomOut(page, { ms: 760, ease: EASE_GLIDE });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 3 — Lebenslagen-Hub: nach Lebenssituation gedacht ────────────── */
  await page.goto('/lebenslagen?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Leistungen finden.', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  // Wait for the "Beliebte" cards to populate (live catalog counts).
  await page
    .locator('.llh-beliebte-card')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(
    page,
    'Lebenslagen',
    'Nicht nach Behörde, sondern nach Lebenssituation gedacht.',
  );
  // Pan across the category chips, then onto the "Beliebte" card grid.
  await zoomTo(page, page.locator('.llh-chips'), {
    scale: 1.4,
    ms: 900,
    ease: EASE_PUNCH,
  });
  await beat(page, 1100);
  await zoomTo(page, page.locator('.llh-beliebte-grid'), {
    scale: 1.22,
    ms: 1100,
    ease: EASE_GLIDE,
  });
  await beat(page, 1500);
  await zoomOut(page, { ms: 760, ease: EASE_GLIDE });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 4 — Lebenslagen-Detail + Kaskade (CENTERPIECE) ───────────────── */
  await page.goto('/lebenslagen/pflegegrad?reliable=1', {
    waitUntil: 'domcontentloaded',
  });
  // Anchor on the dossier h1, then wait for the cascade stepper to render.
  await expect(
    page.getByRole('heading', { name: /Pflegegrad/i, level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  const stepper = page.locator('.ll-stepper');
  await stepper.waitFor({ timeout: 12_000 }).catch(() => {});
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(
    page,
    'Eine Engine, sieben Wege',
    'Detail → vorausgefüllter Antrag → eID → Einreichungs-Kaskade — für alle sieben Lebenslagen.',
  );
  // SLOW push-in onto the cascade stepper — the heart of the centerpiece.
  await zoomTo(page, stepper, { scale: 1.46, ms: 1600, ease: EASE_GLIDE });
  await beat(page, 1700);
  await zoomOut(page, { ms: 560, ease: EASE_PUNCH });
  // Beteiligte Stellen — the multi-authority routing.
  await caption(
    page,
    'Beteiligte Stellen',
    'Jede Lebenslage kennt die zuständigen Stellen und ihre Rechtsgrundlage.',
  );
  await zoomTo(page, page.locator('.ll-stellen'), {
    scale: 1.32,
    ms: 1000,
    ease: EASE_PUNCH,
  });
  await beat(page, 1400);
  await zoomOut(page, { ms: 700, ease: EASE_GLIDE });
  // Once-Only auto-prepared fields — the "vorausgefüllt" promise made concrete.
  const ooGrid = page.locator('.ll-oo-grid');
  if (await ooGrid.count()) {
    await caption(
      page,
      'Vorausgefüllt',
      'Aus Ihren bekannten Daten — Sie prüfen, statt zu tippen.',
    );
    await zoomTo(page, ooGrid, { scale: 1.38, ms: 1200, ease: EASE_GLIDE });
    await beat(page, 1500);
    await zoomOut(page, { ms: 620, ease: EASE_PUNCH });
  }
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 5 — Termine: Termin-Autopilot (§ 17 BMG) ─────────────────────── */
  await page.goto('/termine?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Termine', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  // Wait for the KPI tiles + Termindetails panel to populate.
  await page
    .locator('[data-testid="termine-kennzahl-strip"] > *')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 800); // let auto-select land on the Termindetails panel
  await caption(
    page,
    'Termin-Autopilot',
    'Frist-gerecht gefunden und vorgemerkt — Sie bestätigen. Nie automatisch gebucht.',
  );
  // Pan across the 4-KPI row, then push into the Termindetails panel.
  await zoomTo(page, page.locator('[data-testid="termine-kennzahl-strip"]'), {
    scale: 1.24,
    ms: 1000,
    ease: EASE_PUNCH,
  });
  await beat(page, 1200);
  await zoomTo(page, page.locator('.tm-detail'), {
    scale: 1.3,
    ms: 1200,
    ease: EASE_GLIDE,
  });
  await beat(page, 1600);
  await zoomOut(page, { ms: 720, ease: EASE_GLIDE });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 6 — Vorgänge: klare „Nächster Schritt"-Führung ───────────────── */
  await page.goto('/vorgaenge?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Vorgänge', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .locator('[data-testid="vorgaenge-kennzahl-strip"] > *')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(
    page,
    'Überblick',
    'Jeder Vorgang mit klarer „Nächster Schritt"-Führung.',
  );
  // KPI stat row → the green Umzug timeline (the featured big card).
  await zoomTo(page, page.locator('[data-testid="vorgaenge-kennzahl-strip"]'), {
    scale: 1.22,
    ms: 900,
    ease: EASE_PUNCH,
  });
  await beat(page, 1100);
  const bigCard = page.locator('.vg-big');
  if (await bigCard.count()) {
    await zoomTo(page, bigCard, { scale: 1.2, ms: 1300, ease: EASE_GLIDE });
    await beat(page, 1500);
  } else {
    await zoomTo(page, page.locator('[data-testid="vorgaenge-list"]').first(), {
      scale: 1.24,
      ms: 1200,
      ease: EASE_GLIDE,
    });
    await beat(page, 1500);
  }
  await zoomOut(page, { ms: 700, ease: EASE_PUNCH });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 7 — Outro-Karte: Kernbotschaft + ehrlicher Disclaimer ────────── */
  await setOverlayCard(page, {
    brand: true,
    kicker: 'Grünes Redesign · funktional',
    title: 'Eine Idee, die man bedienen kann.',
    sub: 'govtech-de.vercel.app · github.com/klarbau/govtech-de',
    note: 'Lebenslagen-Engine · eID-Transparenz · Termin-Autopilot (§ 17 BMG) — alle Daten erfunden, keine echte Behörde angebunden.',
  });
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (o) o.classList.add('__show');
  });
  await beat(page, 4200);

  writeFileSync(
    'demo-recording/clicks.json',
    JSON.stringify(
      { clicks_ms: clickTimes, take_ms: Date.now() - takeStart },
      null,
      2,
    ),
  );
});
