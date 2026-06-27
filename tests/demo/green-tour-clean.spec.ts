/**
 * GREEN-TOUR — CLEAN CAPTURE (no post-processing baked in).
 *
 * A raw, MCP-ready walkthrough of EVERYTHING new in the Waldgrün redesign + the
 * functional Lebenslagen engine. Sibling of tests/demo/green-tour-demo.spec.ts,
 * but with the whole in-take edit STRIPPED OUT:
 *
 *   - NO intro / outro title cards
 *   - NO lower-third captions / any overlay text
 *   - NO cinematic zoom push-ins (no transform: scale on <body>)
 *   - NO white cross-fades
 *
 * What remains is only what you need to SEE the new interface cleanly:
 *   - an injected cursor + click ripple (so every click is visible)
 *   - hidden scrollbars
 *   - a plain solid cover (#F8FAFC, no text) that masks each full-page route
 *     change so the cut lands on a loaded screen instead of a skeleton
 *
 * Unlike the passive zoom-tour, this take CLICKS THROUGH the functional flow
 * end-to-end (hub → detail → vorausgefüllter Antrag → eID → Einreichungs-Kaskade
 * → abgeschlossen + Aktenzeichen), then tours the other new green screens. Each
 * screen is scrolled through so the whole design shows; everything stays still
 * enough for downstream MCP processing to add zoom / captions / music.
 *
 *   npm run demo:record:green:clean   (see playwright.green-clean.config.ts)
 *
 * Deterministic + key-independent: Anna's authenticated state is seeded, every
 * route is visited with `?reliable=1` (5% mock-error injection off). No assistant
 * SSE is used, so NO ANTHROPIC_API_KEY is needed. NOT a test gate — the
 * expect(...) calls are sync points.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';

/** The life-situation we click all the way through (a real, non-antragslos flow). */
const FLOW_SLUG = 'aufenthalt-verlaengerung';

/* ─────────────────────────  cursor + pacing  ───────────────────── */

let cursor = { x: 960, y: 140 };
const clickTimes: number[] = [];
let takeStart = 0;

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

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
  const box = await locator.boundingBox().catch(() => null);
  if (box) await glide(page, box.x + box.width / 2, box.y + box.height / 2);
}

/** focusOn only if the element exists — for optional per-screen sections. */
async function panIf(page: Page, locator: Locator, hold = 1400): Promise<void> {
  if (await locator.count().catch(() => 0)) {
    await focusOn(page, locator.first());
    await beat(page, hold);
  }
}

/** Glide onto a control and click it (the injected mousedown ripple fires). */
async function clickAt(page: Page, locator: Locator): Promise<void> {
  await focusOn(page, locator);
  await beat(page, 220);
  clickTimes.push(Date.now() - takeStart);
  await locator.click();
  await beat(page, 260);
}

/* ─────────────────────  injected chrome (cursor + cover only)  ───────────── */

async function installDemoChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Plain solid cover — masks the incoming document from frame 0 so a full-page
    // route change never flashes a skeleton. NO text, NO animation: removed
    // instantly once content is asserted-visible (see revealPage).
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
          border-radius: 9999px; border: 2px solid rgba(21,128,61,.95);
          background: rgba(21,128,61,.20);
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
  await page.mouse.move(cursor.x, cursor.y);
}

/* ─────────────────────────  app state  ───────────────────── */

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__green_clean_seeded`;
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

/* ─────────────  functional-flow helpers (proven in the a11y gate)  ─────────── */

/** Fill any required-but-empty inputs the Once-Only prefill didn't cover. */
async function fillRequiredEmpty(page: Page): Promise<void> {
  const inputs = page.locator('form input');
  const n = await inputs.count();
  for (let i = 0; i < n; i += 1) {
    const el = inputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const type = (await el.getAttribute('type')) ?? 'text';
    if (type === 'checkbox') {
      const req = await el.evaluate(
        (e: HTMLInputElement) => e.required || e.getAttribute('aria-required') === 'true',
      );
      if (req && !(await el.isChecked())) await el.check().catch(() => undefined);
      continue;
    }
    const val = await el.inputValue().catch(() => '');
    const req = await el.evaluate(
      (e: HTMLInputElement) => e.required || e.getAttribute('aria-required') === 'true',
    );
    if (req && !val) {
      if (type === 'date') await el.fill('2027-01-01').catch(() => undefined);
      else await el.fill('Testangabe').catch(() => undefined);
    }
  }
}

/** Confirm the eID dialog (glide onto its primary button so the click is visible). */
async function confirmDialog(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await beat(page, 700);
  const confirm = dialog.getByRole('button', { name: /bestätigen/i }).first();
  await clickAt(page, confirm);
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
}

const DONE_RE = /Erledigt — Ihre Nachweise|Bearbeitung abgeschlossen/;

/** Drive the inline Einreichungs-Kaskade to completion (tap each eID gate). */
async function drainCascade(page: Page): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    const done = await page
      .getByText(DONE_RE)
      .first()
      .isVisible()
      .catch(() => false);
    if (done) return;
    const inline = page.getByRole('button', { name: 'Mit eID bestätigen' }).first();
    const hasInline = await inline.isVisible().catch(() => false);
    if (hasInline) {
      await clickAt(page, inline);
      await confirmDialog(page);
    }
    await beat(page, 2600);
  }
}

/* ─────────────────────────────  the walkthrough  ───────────────────────────── */

test('CLEAN - Green-Tour raw capture (Anna)', async ({ page }) => {
  test.setTimeout(360_000);
  cursor = { x: 960, y: 140 };
  takeStart = Date.now();
  clickTimes.length = 0;
  await installDemoChrome(page);
  await setupAuthenticatedAnna(page);

  /* ── Szene 0 — Landing: die „Waldgrün"-Identität ────────────────────────── */
  await page.goto('/?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
    timeout: 30_000,
  });
  await revealPage(page);
  await beat(page, 1400);
  await panIf(page, page.locator('#hero-title'), 1300);
  await panIf(page, page.locator('.flow-card'), 1600);

  /* ── Szene 1 — Stammdaten: green-bento, Once-Only-Quelle ─────────────────── */
  await page.goto('/stammdaten?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Stammdaten', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .getByTestId('v2-completeness-ring')
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await beat(page, 1200);
  await panIf(page, page.getByTestId('v2-completeness-ring'), 1300);
  await panIf(page, page.locator('.sd-bento'), 1800);

  /* ── Szene 2 — Lebenslagen-Hub → in eine Lebenslage klicken ─────────────── */
  await page.goto('/lebenslagen?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Leistungen finden.', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .locator('.llh-beliebte-card')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await beat(page, 1000);
  await panIf(page, page.locator('.llh-chips'), 1200);
  await panIf(page, page.locator('.llh-beliebte-grid'), 1600);
  // Click a real „Beliebte" card → its detail (by href, locale-independent).
  const beliebteCard = page
    .locator(`a.llh-beliebte-card[href="/lebenslagen/${FLOW_SLUG}"]`)
    .first();
  await clickAt(page, beliebteCard);

  /* ── Szene 3 — Lebenslagen-Detail (Dossier) → „Beantragen" ──────────────── */
  // Reached via client nav (no veil) — the detail is already on screen.
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
  await beat(page, 1200);
  await panIf(page, page.locator('.ll-stepper'), 1700);
  await panIf(page, page.locator('.ll-stellen'), 1400);
  await panIf(page, page.locator('.ll-oo-grid'), 1500);
  await clickAt(page, page.locator('.ll-next-primary').first());

  /* ── Szene 4 — Vorausgefüllter Antrag (Once-Only) → „Mit eID absenden" ──── */
  const submit = page.getByRole('button', { name: /Mit eID bestätigen & absenden/i });
  await submit.waitFor({ timeout: 30_000 });
  await beat(page, 1000);
  await panIf(page, page.locator('.ll-prefill-chip'), 1500);
  await fillRequiredEmpty(page);
  await clickAt(page, submit);
  await confirmDialog(page);

  /* ── Szene 5 — Einreichungs-Kaskade läuft → abgeschlossen + Aktenzeichen ── */
  await page.waitForURL(/\/cascade/, { timeout: 20_000 });
  await beat(page, 1400);
  await drainCascade(page);
  await expect(page.getByText(DONE_RE).first()).toBeVisible({ timeout: 30_000 });
  await beat(page, 800);
  await focusOn(page, page.getByText(DONE_RE).first());
  await beat(page, 1600);
  await panIf(page, page.getByText('Aktenzeichen').first(), 2000);

  /* ── Szene 6 — Termine: green command-center + Termin-Autopilot ─────────── */
  await page.goto('/termine?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Termine', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .locator('.tm-kpis .tm-kpi')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await beat(page, 1000);
  await panIf(page, page.locator('.tm-kpis'), 1300);
  await panIf(page, page.locator('.tm-detail'), 1800);

  /* ── Szene 7 — Vorgänge: green command-center, „Nächster Schritt" ───────── */
  await page.goto('/vorgaenge?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Vorgänge', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .locator('.vg-stats .stat-tile')
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {});
  await revealPage(page);
  await beat(page, 1000);
  await panIf(page, page.locator('.vg-stats'), 1300);
  await panIf(page, page.locator('.vg-big'), 1800);
  await panIf(page, page.locator('.vg-cards'), 1600);

  // Final settle so the cut doesn't end on a hard frame.
  await beat(page, 1600);

  writeFileSync(
    'demo-recording/green-clean-clicks.json',
    JSON.stringify(
      { clicks_ms: clickTimes, take_ms: Date.now() - takeStart },
      null,
      2,
    ),
  );
});
