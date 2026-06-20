/**
 * UPDATE-ARC DEMO RECORDER — the "what's new" showcase, captured as a polished
 * video. Companion to tests/demo/spine-demo.spec.ts (the product walkthrough);
 * this one tells the *security & real-integration* story (docs/UPDATE-LOG.md):
 * the demo stopped being a pretty mock and became a vision artefact backed by
 * real systems work — a resilient saga engine with a hash-chained audit log,
 * standards-faithful FIT-Connect (JWE) proven live against the FITKO TEST
 * sandbox, a real EUDI reference credential verified offline, the Termin-
 * Autopilot, and Verifiable Once-Only — without ever faking a production link.
 *
 *   npm run demo:record:update   (see playwright.update-demo.config.ts)
 *   npm run demo:render          (newest .webm → scored mp4; needs ffmpeg)
 *
 * Like the spine recorder it does the WHOLE edit in-take, so the raw .webm is
 * already the finished cut. On top of the spine recorder's chrome (intro/outro
 * cards, lower-third captions, white cross-fades, animated cursor + click
 * ripples, hidden scrollbars) this adds:
 *
 *   - a CINEMATIC ZOOM ENGINE: an eased `transform: scale()` push-in toward a
 *     focal element, with per-beat control of duration + easing so some beats
 *     zoom IN fast / OUT slow and others the reverse (per the brief). Captions
 *     and the cursor live on <html> (outside <body>), so they stay screen-fixed
 *     and readable while the page scales beneath them.
 *   - DARK IDE CODE CARDS: real, verbatim excerpts of the new cryptographic
 *     functions (SD-JWT VC verifier `src/lib/eudi/verify.ts`; FIT-Connect JWE
 *     `src/lib/fit-connect/jwe.ts`) on a dark window-chrome card with a slow
 *     ken-burns drift — a deliberate contrast beat against the light app.
 *
 * NOT a test gate — the `expect(...)` calls are sync points so the recorder
 * waits for each beat to render before pausing on it. Deterministic +
 * key-independent: the assistant SSE is mocked (same shape as spine.spec.ts),
 * Anna's authenticated state is seeded, `?reliable=1` disables the 5% mock-error
 * injection. The orchestration audit-log / verifyChain / Termin / FIT-Connect
 * UI shown here is all REAL product UI — no test bridge / env flag is needed
 * (the bridge only injects deterministic faults, which this clean run doesn't).
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

/** The seed Meldebestätigung whose credential panel re-verifies offline. */
const ONCE_ONLY_DOC_TITLE =
  'Meldebestätigung Berlin-Mitte — Friedrichstraße 100';

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

/* ─────────────────────  in-take edit: overlay, captions, code  ───────────── */

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
        #__demo_overlay.__dark { background: #060A14; }
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
        /* ── dark IDE code card ────────────────────────────────────────── */
        .__demo_codewrap {
          width: min(1140px, 84vw); display: flex; flex-direction: column;
          align-items: stretch; gap: 18px;
        }
        .__demo_code_kicker {
          margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .16em;
          text-transform: uppercase; color: #60A5FA; text-align: left;
        }
        .__demo_codecard {
          border-radius: 14px; overflow: hidden; background: #0B1220;
          border: 1px solid #1E293B;
          box-shadow: 0 40px 90px rgba(2,6,23,.6), 0 2px 10px rgba(2,6,23,.5);
          transform: scale(1); transform-origin: 50% 45%;
          transition: transform 7000ms linear;
        }
        .__demo_codecard.__kb { transform: scale(1.05); }
        .__demo_codebar {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 18px; background: #0E1729; border-bottom: 1px solid #1E293B;
        }
        .__demo_dot { width: 11px; height: 11px; border-radius: 9999px; }
        .__demo_codefile {
          margin-left: 12px; font-family: ui-monospace, "JetBrains Mono", Menlo, monospace;
          font-size: 13px; color: #94A3B8;
        }
        .__demo_codetab {
          margin-left: auto; font-size: 11px; color: #64748B;
          letter-spacing: .12em; text-transform: uppercase;
        }
        .__demo_codebody {
          margin: 0; padding: 24px 30px; counter-reset: ln; text-align: left;
          font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
          font-size: 16.5px; line-height: 1.78; color: #E2E8F0;
          white-space: pre-wrap; tab-size: 2;
        }
        .__demo_codeline { display: block; }
        .__demo_codeline::before {
          content: counter(ln); counter-increment: ln; display: inline-block;
          width: 2.2em; margin-right: 1.5em; text-align: right; color: #334155;
          -webkit-user-select: none; user-select: none;
        }
        .__demo_code_caption {
          margin: 0; font-size: 17px; line-height: 1.5; color: #94A3B8;
          text-align: left; max-width: 980px;
        }
        .c-kw  { color: #7DA9FF; }
        .c-str { color: #6EE7B7; }
        .c-com { color: #64748B; font-style: italic; }
        .c-fn  { color: #C4B5FD; }
        /* ── lower-third caption ───────────────────────────────────────── */
        #__demo_caption {
          position: fixed; left: 28px; bottom: 28px; z-index: 2147483643;
          max-width: 660px; pointer-events: none; font-family: inherit;
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

type CodeSpec = {
  file: string;
  tab: string;
  kicker: string;
  caption: string;
  lines: string[];
};

/** Render a dark IDE code card inside the overlay (escaped + lightly highlighted). */
async function setOverlayCode(page: Page, spec: CodeSpec): Promise<void> {
  await page.evaluate((json) => {
    const o = document.getElementById('__demo_overlay');
    if (!o) return;
    o.classList.add('__dark');
    const s = JSON.parse(json) as {
      file: string; tab: string; kicker: string; caption: string; lines: string[];
    };

    const esc = (x: string) =>
      x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const KW = /\b(const|let|var|await|async|function|return|export|import|from|new|if|else|for|of|typeof)\b/g;
    const STR = /('[^']*'|"[^"]*"|`[^`]*`)/g;
    const hl = (line: string): string => {
      const ci = line.indexOf('//');
      const codePart = ci >= 0 ? line.slice(0, ci) : line;
      const commentPart = ci >= 0 ? line.slice(ci) : '';
      let h = esc(codePart)
        .replace(STR, '<span class="c-str">$1</span>')
        .replace(KW, '<span class="c-kw">$1</span>');
      if (commentPart) h += '<span class="c-com">' + esc(commentPart) + '</span>';
      return h === '' ? '&nbsp;' : h;
    };

    o.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = '__demo_codewrap';

    const kick = document.createElement('p');
    kick.className = '__demo_code_kicker';
    kick.textContent = s.kicker;
    wrap.appendChild(kick);

    const card = document.createElement('div');
    card.className = '__demo_codecard';
    const bar = document.createElement('div');
    bar.className = '__demo_codebar';
    for (const colour of ['#FF5F57', '#FEBC2E', '#28C840']) {
      const dot = document.createElement('span');
      dot.className = '__demo_dot';
      dot.style.background = colour;
      bar.appendChild(dot);
    }
    const fileEl = document.createElement('span');
    fileEl.className = '__demo_codefile';
    fileEl.textContent = s.file;
    bar.appendChild(fileEl);
    const tabEl = document.createElement('span');
    tabEl.className = '__demo_codetab';
    tabEl.textContent = s.tab;
    bar.appendChild(tabEl);
    card.appendChild(bar);

    const body = document.createElement('pre');
    body.className = '__demo_codebody';
    body.innerHTML = s.lines
      .map((l) => `<span class="__demo_codeline">${hl(l)}</span>`)
      .join('\n');
    card.appendChild(body);
    wrap.appendChild(card);

    const cap = document.createElement('p');
    cap.className = '__demo_code_caption';
    cap.textContent = s.caption;
    wrap.appendChild(cap);

    o.appendChild(wrap);
  }, JSON.stringify(spec));
}

/** Kick the slow ken-burns drift on the currently-shown code card. */
async function driftCode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const c = document.querySelector('.__demo_codecard');
    if (c) {
      void (c as HTMLElement).offsetWidth;
      c.classList.add('__kb');
    }
  });
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

/* ─────────────────────────  app state + SSE mock  ───────────────────── */

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__update_demo_seeded`;
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
          id: 'toolu_update_demo_preview_umzug',
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

/* ─── verbatim crypto excerpts (real source — see file headers) ─────────────── */

const VERIFY_CODE: CodeSpec = {
  file: 'src/lib/eudi/verify.ts',
  tab: 'EUDI · SD-JWT VC',
  kicker: 'Echte Kryptographie · offline',
  caption:
    'Offline-Verifikation eines EU-Referenz-Credentials: ES256-Signatur, Zertifikatskette und SHA-256-Recombination — kein Netz, kein Geheimnis.',
  lines: [
    '// EUDI Tier-1 — offline SD-JWT VC verifier (ZERO network calls)',
    'export async function verifyPidSdJwtVc(token, opts = {}) {',
    "  const [issuerJwt, ...disclosures] = token.split('~').filter(Boolean);",
    '',
    '  // 1. ES256 issuer signature against the x5c leaf certificate',
    "  const leafKey = await importX509(x5cToPem(header.x5c[0]), 'ES256');",
    "  await jwtVerify(issuerJwt, leafKey, { algorithms: ['ES256'] });",
    '',
    '  // 2. Chain the leaf to the vendored demo CA (node:crypto)',
    '  chainValid = leaf.checkIssued(ca) && leaf.verify(ca.publicKey);',
    '',
    '  // 3. Recombine: SHA-256 each disclosure, match the signed _sd digests',
    "  const digest = createHash('sha256').update(raw).digest('base64url');",
    '  //    an unbound disclosure ⇒ verified:false   — tamper-evident',
    '  return { verified, chainValid, claims, alg, expired };',
    '}',
  ],
};

const JWE_CODE: CodeSpec = {
  file: 'src/lib/fit-connect/jwe.ts',
  tab: 'FIT-Connect · JWE Compact',
  kicker: 'Standardtreue OZG-Einreichung',
  caption:
    'Jeder Datensatz wird einzeln JWE-verschlüsselt (RSA-OAEP-256 / A256GCM, kein zip) — byte-genau nach Submission-API v2, live gegen die FITKO-Test-Umgebung erprobt.',
  lines: [
    '// FIT-Connect — JWE Compact Serialization, no zip (Submission API v2)',
    'export async function encryptCompact(payload) {',
    '  const key = await getRecipientPublicKey();           // RSA-4096',
    '  const plaintext = new TextEncoder().encode(JSON.stringify(payload));',
    '',
    '  const compact = await new CompactEncrypt(plaintext)',
    "    .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })",
    '    .encrypt(key);',
    '',
    '  return { compact, excerpt: renderWireExcerpt(compact) };',
    '}',
  ],
};

/* ─────────────────────────────  the walkthrough  ───────────────────────────── */

test('DEMO - Update-Arc: Echte Systeme unter dem Prototyp (Anna)', async ({
  page,
}) => {
  test.setTimeout(320_000);
  cursor = { x: 960, y: 140 };
  takeStart = Date.now();
  clickTimes.length = 0;
  await installDemoChrome(page);
  await setupAuthenticatedAnna(page);
  await mockAssistantRoute(page);

  /* ── Szene 0 — Intro-Karte (Dashboard lädt unsichtbar dahinter) ─────────── */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  // Anchor on the server-rendered h1 (instant), NOT the async greeting — the
  // greeting (`Guten Tag, Frau Petrov`) resolves only after the client data fetch.
  await expect(
    page.getByRole('heading', { name: 'Dashboard', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await setOverlayCard(page, {
    brand: true,
    kicker: 'Was ist neu',
    title: 'Echte Systeme unter dem Prototyp.',
    sub: 'Aus einer schönen Demo wird ein Vision-Artefakt mit echter Systemtechnik — ohne je eine Produktiv-Integration vorzutäuschen.',
    note: 'Speculative-Design-Prototyp · 2027 · Alle Daten erfunden, keine echte Behörde angebunden.',
  });
  await revealPage(page, { hold: true });
  // Let the dashboard's client data populate BEHIND the held intro card so the
  // reveal lands on a loaded screen, not a "Wird geladen …" skeleton. Non-fatal.
  await page
    .getByRole('heading', { name: /Petrov/i })
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await beat(page, 2600);
  await fadeOverlayOut(page);
  await beat(page, 1500); // brief establishing shot of the loaded dashboard

  /* ── Szene 1 — Assistent: ein Satz stößt die Kaskade an ─────────────────── */
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({
    timeout: 30_000,
  });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(page, 'Assistent', 'Ein Satz genügt — den Rest koordiniert das System.');

  const composer = page.getByPlaceholder(/.+/).first();
  await clickAt(page, composer);
  await composer.pressSequentially('leite meinen Umzug ein', { delay: 50 });
  await beat(page, 450);
  await composer.press('Enter');

  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'Kontrolle',
    'Vor dem Start: wer informiert wird — auf welcher Rechtsgrundlage.',
  );
  await focusOn(page, confirmCard);
  await beat(page, 2200);
  await clickAt(page, confirmCard.getByRole('button', { name: 'Umzug starten' }));

  /* ── Szene 2 — Resiliente Saga-Engine: die Kaskade läuft inline ─────────── */
  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'Resiliente Orchestrierung',
    'Unter der Kaskade arbeitet jetzt eine echte Saga-Maschine — atomar, idempotent, wiederherstellbar.',
  );
  await focusOn(page, inlineCascade);
  await beat(page, 3200);

  /* ── Szene 3 — Hash-verkettetes Protokoll (Laufzettel öffnen) ───────────── */
  const toggle = page.getByTestId('orchestration-inline-toggle');
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  await clickAt(page, toggle);
  const auditRow = page.getByTestId('orchestration-audit-row').first();
  await expect(auditRow).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'Hash-verkettetes Protokoll',
    'Jeder Schritt wird SHA-256-verkettet protokolliert — eine Manipulation würde die Kette brechen.',
  );
  // SLOW push-in to let the viewer read the chained audit rows …
  await zoomTo(page, auditRow, { scale: 1.55, ms: 1500, ease: EASE_GLIDE });
  await beat(page, 1400);
  // … then a brisk pull-out.
  await zoomOut(page, { ms: 520, ease: EASE_PUNCH });

  /* ── Szene 4 — verifyChain(): die Kette wird geprüft ────────────────────── */
  const verifyCta = page.getByTestId('orchestration-verify-cta');
  await expect(verifyCta).toBeVisible({ timeout: 20_000 });
  await caption(
    page,
    'Nachweisbar',
    '„Protokoll prüfen" rechnet die gesamte Kette nach — verifyChain() bestätigt sie.',
  );
  await clickAt(page, verifyCta);
  const verifyResult = page.getByTestId('orchestration-verify-result');
  await expect(verifyResult).toHaveAttribute('data-verify-result', 'ok', {
    timeout: 20_000,
  });
  // FAST punch-in on the green verdict, SLOW reveal-out.
  await zoomTo(page, verifyResult, { scale: 1.7, ms: 460, ease: EASE_PUNCH, settle: 900 });
  await beat(page, 900);
  await zoomOut(page, { ms: 1100, ease: EASE_GLIDE });

  /* ── Szene 5 — Termin-Autopilot: gefunden + vorgemerkt, nie gebucht ─────── */
  const terminRow = inlineCascade.getByTestId('termin-vorschlag-row');
  if (await terminRow.count()) {
    await caption(
      page,
      'Termin-Autopilot',
      'Frist-gerecht gefunden und vorgemerkt — Sie bestätigen. Nie automatisch gebucht.',
    );
    await zoomTo(page, terminRow, { scale: 1.5, ms: 900, ease: EASE_GLIDE });
    await beat(page, 1500);
    await zoomOut(page, { ms: 700, ease: EASE_GLIDE });
  }

  /* ── Szene 6 — eID-Gate + FIT-Connect-Quittung (JWE) ────────────────────── */
  const eidButtons = inlineCascade.getByTestId('inline-eid-confirm');
  await expect(eidButtons.first()).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'eID-Bestätigung',
    'Sensible Stellen übermitteln Sie aktiv — mit Ihrem Ausweis.',
  );
  // Confirm both Block-D rows; the button unmounts each time (count 2 → 1 → 0).
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(1, { timeout: 20_000 });
  await beat(page, 900);
  await clickAt(page, eidButtons.first());
  await expect(eidButtons).toHaveCount(0, { timeout: 20_000 });

  const jweExcerpt = page.getByTestId('fit-connect-jwe-excerpt').first();
  await expect(jweExcerpt).toBeVisible({ timeout: 30_000 });
  await caption(
    page,
    'FIT-Connect',
    'Standardtreue OZG-Einreichung, JWE-verschlüsselt — live gegen die FITKO-Test-Umgebung erprobt.',
  );
  // SLOW cinematic push-in onto the real JWE bytes, MEDIUM out.
  await zoomTo(page, jweExcerpt, { scale: 1.65, ms: 1400, ease: EASE_GLIDE });
  await beat(page, 1500);
  await zoomOut(page, { ms: 760, ease: EASE_PUNCH });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 7 — Code-Karte: der echte Verifier (dunkle IDE-Karte) ────────── */
  await setOverlayCode(page, VERIFY_CODE);
  await page.evaluate(() => {
    const o = document.getElementById('__demo_overlay');
    if (o) o.classList.add('__show');
  });
  await beat(page, 300);
  await driftCode(page);
  await beat(page, 5200);
  // Swap to the FIT-Connect JWE excerpt (cross-fade through the dark overlay).
  await setOverlayCode(page, JWE_CODE);
  await beat(page, 300);
  await driftCode(page);
  await beat(page, 4800);

  /* ── Szene 8 — EUDI-Referenz-Credential (Stammdaten) ────────────────────── */
  await page.goto('/stammdaten?reliable=1', { waitUntil: 'domcontentloaded' });
  const eudiCard = page.getByTestId('eudi-reference-pid-card');
  await expect(eudiCard).toBeVisible({ timeout: 30_000 });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(
    page,
    'EUDI Wallet',
    'Ein echtes EU-Referenz-Credential — kryptographisch verifiziert. Ehrlich markiert: nicht vom deutschen Staat.',
  );
  await focusOn(page, eudiCard);
  await beat(page, 1600);
  const eudiStatus = page.getByTestId('eudi-reference-pid-status');
  // FAST punch-in on the „verifiziert" verdict, SLOW glide out.
  await zoomTo(page, eudiStatus, { scale: 1.6, ms: 440, ease: EASE_PUNCH, settle: 800 });
  await beat(page, 900);
  await zoomTo(page, eudiCard.getByTestId('eudi-reference-pid-claims'), {
    scale: 1.35,
    ms: 1100,
    ease: EASE_GLIDE,
  });
  await beat(page, 1400);
  await zoomOut(page, { ms: 820, ease: EASE_GLIDE });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 9 — Verifiable Once-Only (Dokumente) ─────────────────────────── */
  await page.goto('/dokumente?reliable=1', { waitUntil: 'domcontentloaded' });
  const viewBtn = page
    .getByRole('button', { name: new RegExp(ONCE_ONLY_DOC_TITLE + ' ansehen') })
    .first();
  await expect(viewBtn).toBeVisible({ timeout: 30_000 });
  await revealPage(page);
  await page.mouse.move(cursor.x, cursor.y);
  await beat(page, 600);
  await caption(
    page,
    'Once-Only, sichtbar gemacht',
    'Dieselbe Kryptographie läuft rückwärts: die Meldebestätigung wird ausgestellt — und offline neu verifiziert.',
  );
  // Cinematic first open …
  await clickAt(page, viewBtn);
  const panel = page.getByTestId('meldebestaetigung-credential-panel');
  const onceStatus = page.getByTestId('meldebestaetigung-status');
  // … the panel re-verifies the credential via a server action that can be cold
  // on the first open. If the verdict isn't ready, Escape + re-open until it is —
  // the same workaround the once-only a11y gate (once-only-credential.spec.ts) uses.
  let onceReady = await onceStatus
    .waitFor({ state: 'visible', timeout: 9000 })
    .then(() => true, () => false);
  for (let attempt = 0; attempt < 4 && !onceReady; attempt += 1) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await viewBtn.click();
    onceReady = await onceStatus
      .waitFor({ state: 'visible', timeout: 9000 })
      .then(() => true, () => false);
  }
  await beat(page, 800);
  // SLOW push-in onto the offline re-verification verdict, FAST out. Falls back to
  // the open dialog if the verdict never rendered, so the take still completes.
  const onceTarget = onceReady
    ? panel
    : page.locator('[role="dialog"], [data-slot="dialog-content"]').first();
  await zoomTo(page, onceTarget, { scale: 1.4, ms: 1300, ease: EASE_GLIDE });
  await beat(page, 1700);
  await zoomOut(page, { ms: 520, ease: EASE_PUNCH });
  await hideCaption(page);
  await fadeOverlayIn(page);
  await resetZoomInstant(page);

  /* ── Szene 10 — Outro-Karte: Kernbotschaft + ehrlicher Disclaimer ───────── */
  await setOverlayCard(page, {
    brand: true,
    kicker: 'Echte Systeme. Ehrlich markiert.',
    title: 'Vision oben. Standards unten.',
    sub: 'govtech-de.vercel.app  ·  github.com/klarbau/govtech-de',
    note: 'Resiliente Saga-Engine · FIT-Connect (live erprobt) · EUDI · Verifiable Once-Only — alle Daten erfunden, keine echte Behörde angebunden.',
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
