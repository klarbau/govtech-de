import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Committed a11y coverage for the Lebenslagen dossier — now the canonical Akte
// `/vorgaenge/[id]` (`VorgangDetail`), reached after an Antrag is submitted.
// Covers the running eID gate (the `.pgv-dock` Begleit-Leiste, mode eID) and
// the completed non-Umzug dossier (`.pgv-dock.is-done` + the all-done
// `.pgv-steps`). light + dark + mobile.

const NS = 'govtech-de:v1:';
const PERSONA = 'anna-petrov';
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function boot(page: Page) {
  await page.context().addCookies([
    { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, persona]) => {
      window.localStorage.setItem(
        ns + 'meta',
        JSON.stringify({
          version: 1,
          active_persona_id: persona,
          seeded_at: new Date().toISOString(),
          reliable_mode: true,
        }),
      );
    },
    [NS, PERSONA],
  );
}

async function confirmDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await dialog.getByRole('button', { name: /bestätigen/i }).first().click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
}

async function runAxe(page: Page, label: string, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(axeTags);
  if (include) builder.include(include);
  const results = await builder.analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target,
  }));
  console.log(`[AXE ${label}] blockers=${blockers.length} all=${JSON.stringify(summary)}`);
  expect(blockers, `serious/critical: ${label}`).toHaveLength(0);
}

/* ── Running dossier: the eID gate in the companion dock (`.pgv-dock`) ────── */

// Antragslos-Start (kindergeld: a single Stufe-1 eID gate, then a clean
// completion — no consent-skip steps) → lands on the Akte; the cascade pauses
// at the eID gate, surfaced as the CTA of the sticky companion dock.
async function startKindergeldOnAkte(page: Page) {
  await page.goto('/lebenslagen/kindergeld', { waitUntil: 'networkidle' });
  const cta = page.getByRole('button', {
    name: 'Automatische Bearbeitung starten',
  });
  await cta.waitFor({ state: 'visible', timeout: 20000 });
  await cta.click();
  await page.waitForURL(/\/vorgaenge\//, { timeout: 20000 });
}

async function driveToEidGate(page: Page) {
  await startKindergeldOnAkte(page);
  await page
    .getByRole('button', { name: /^mit eid bestätigen$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 40000 });
  await page.waitForTimeout(600);
}

test('dossier eID gate (.pgv-dock) — axe light', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToEidGate(page);
  await expect(page.locator('.pgv-dock')).toBeVisible();
  await runAxe(page, 'eid-gate LIGHT', '.pgv-dock');
});

test('dossier eID gate (.pgv-dock) — axe dark', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToEidGate(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await expect(page.locator('.pgv-dock')).toBeVisible();
  await runAxe(page, 'eid-gate DARK', '.pgv-dock');
});

/* ── Completed dossier: `.pgv-dock.is-done` + the all-done timeline ───────── */

async function driveToDone(page: Page) {
  await startKindergeldOnAkte(page);
  // Authorise every eID gate via the NextStepBanner CTA → the cascade runs to
  // completion (`.pgv-dock.is-done`).
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.pgv-dock.is-done').count()) break;
    const gate = page
      .getByRole('button', { name: /^mit eid bestätigen$/i })
      .first();
    if (await gate.isVisible().catch(() => false)) {
      await gate.click().catch(() => undefined);
      await confirmDialog(page);
    }
    await page.waitForTimeout(2500);
  }
  // ≤767 ist die Leiste bewusst ausgeblendet (dort führt die MobileActionBar) —
  // deshalb hier auf das Vorhandensein warten; die Desktop-Tests unten prüfen
  // zusätzlich die Sichtbarkeit.
  await page.locator('.pgv-dock.is-done').waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1200);
}

test('completed dossier (.pgv-dock.is-done) — axe light', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToDone(page);
  await expect(page.locator('.pgv-dock.is-done')).toBeVisible();
  await runAxe(page, 'dossier LIGHT');
});

test('completed dossier (.pgv-dock.is-done) — axe dark', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await driveToDone(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await runAxe(page, 'dossier DARK');
});

test('completed dossier — axe mobile 420 + no main overflow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.setViewportSize({ width: 420, height: 900 });
  await driveToDone(page);
  const { mainOverflow, pageOverflow, pannedX } = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    // Inhalt INNERHALB eines waagerechten Scrollers (Telefon-Regale, `.m-shelf`)
    // ragt bauartbedingt über den Viewport — er scrollt intern und erzeugt
    // keinen Seiten-Scroll. Genau das prüft `pageOverflow` zusätzlich.
    // `overflow-x: hidden` ist bewusst NICHT ausgenommen: dort wird Text still
    // abgeschnitten — genau der Fall, den diese Sonde fangen soll.
    const inScroller = (el: Element) => {
      let a = el.parentElement;
      while (a && a !== document.documentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
        a = a.parentElement;
      }
      return false;
    };
    let max = 0;
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      if (inScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) max = Math.max(max, Math.round(r.right - vw));
    }
    // Gegenprobe zum gemessenen Overflow: was das Dokument NICHT verschiebt,
    // kann auch nicht mit dem Finger weggezogen werden. Fängt Kästen, die
    // rechnerisch unsichtbar sind (`.sr-only` & Co.), aber als absolut
    // positionierte Nachfahren eines Regals am BODY hängen und die Seite
    // dennoch waagerecht aufziehen.
    window.scrollTo(9999, 0);
    const pannedX = window.scrollX;
    window.scrollTo(0, 0);
    return {
      mainOverflow: max,
      pageOverflow: document.documentElement.scrollWidth - vw,
      pannedX,
    };
  });
  console.log(
    `[MAIN OVERFLOW dossier 420] main=${mainOverflow} page=${pageOverflow} pannedX=${pannedX}`,
  );
  expect(mainOverflow, 'no <main> horizontal overflow @420').toBeLessThanOrEqual(1);
  expect(pageOverflow, 'no document horizontal scroll @420').toBeLessThanOrEqual(1);
  expect(pannedX, 'document does not pan horizontally @420').toBeLessThanOrEqual(1);
  await runAxe(page, 'dossier MOBILE');
});

/* ── Die volle Akte am Telefon: das lange Bescheide-Regal ─────────────────── */

// Der Kindergeld-Lauf oben endet mit drei Regal-Karten — zu kurz, um einen
// Seiten-Schwenk auszulösen. Die abgeschlossene Umzugs-Akte trägt neun (sechs
// davon mit Authentizitäts-Badge, dessen `.sr-only`-Kasten absolut positioniert
// ist): genau die Konstellation, die den Befund R1 erzeugt hat. Zwei Breiten,
// weil die Schwenkweite mit der Slide-Breite wächst.
for (const width of [320, 390]) {
  test(`completed Umzug dossier — no page pan @${width}`, async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vorgaenge/vg-anna-umzug-2026-completed', {
      waitUntil: 'networkidle',
    });
    await page.locator('.pgv-bescheide-shelf').waitFor({ state: 'visible', timeout: 20000 });
    const { pannedX, pageOverflow, shelfScrolls } = await page.evaluate(() => {
      window.scrollTo(9999, 0);
      const pannedX = window.scrollX;
      window.scrollTo(0, 0);
      const shelf = document.querySelector('.pgv-bescheide-shelf');
      return {
        pannedX,
        pageOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // Das Regal selbst MUSS waagerecht scrollen — sonst wäre die Sonde
        // auch grün, wenn jemand die Karten-Polka ganz abschaltet.
        shelfScrolls: shelf ? shelf.scrollWidth - shelf.clientWidth : 0,
      };
    });
    console.log(
      `[PAN umzug-dossier ${width}] panned=${pannedX} page=${pageOverflow} shelf=${shelfScrolls}`,
    );
    expect(pannedX, `document does not pan horizontally @${width}`).toBeLessThanOrEqual(1);
    expect(pageOverflow, `no document horizontal scroll @${width}`).toBeLessThanOrEqual(1);
    expect(shelfScrolls, `shelf still scrolls internally @${width}`).toBeGreaterThan(0);
  });
}
