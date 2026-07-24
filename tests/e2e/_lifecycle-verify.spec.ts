/**
 * Vorgang-Lifecycle-Semantik — "Akte statt Video", jetzt EINE kanonische Akte
 * `/vorgaenge/[id]` (das alte Run-/Kaskaden-Interface ist entfernt).
 * Diagnose-/Verifikationsspec (underscore = kein Gate): Shim-Redirects der
 * Alt-Routen, statisches Abgeschlossen-Dossier ohne Replay, Live-Vollzug aus
 * echten Events (kein Reveal-Pacer mehr), kein Duplikat-Vorgang bei Reload.
 * Test 3 fährt `?reliable=1` (deterministische eID-Autorisierungen); die
 * Routing-Tests 2/4/5/6/7 bleiben ohne reliable. Screenshots im Scratchpad.
 */
import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.LIFECYCLE_SHOTS_DIR || 'test-results/lifecycle-shots';

async function settle(page: Page, ms = 600) {
  await page.waitForTimeout(ms);
}

/**
 * Waits for `target`, riding out the mock backend's simulated 5% transient
 * error rate (this spec intentionally runs WITHOUT ?reliable=1): whenever the
 * generic error state surfaces, its "Erneut versuchen" button is clicked and
 * the wait continues.
 */
async function waitForOrRetry(
  page: Page,
  target: () => ReturnType<Page['locator']>,
  timeout = 20000,
) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if ((await target().count()) > 0) return;
    const retry = page.getByRole('button', { name: 'Erneut versuchen' });
    if ((await retry.count()) > 0) await retry.first().click();
    if (Date.now() > deadline) {
      await target().first().waitFor({ timeout: 1000 });
      return;
    }
    await page.waitForTimeout(400);
  }
}

test.describe('Vorgang lifecycle — Akte statt Video', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'govtech-de:v1:locale', value: 'de', domain: 'localhost', path: '/' },
    ]);
  });

  test('1) bare /vorgaenge/umzug/run redirects to wizard', async ({ page }) => {
    await page.goto('/vorgaenge/umzug/run', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/vorgaenge/umzug/start', { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('2) completed Vorgang Akte is a static record — no play button', async ({ page }) => {
    await page.goto('/vorgaenge/vg-anna-umzug-2026-completed', {
      waitUntil: 'domcontentloaded',
    });
    await waitForOrRetry(page, () => page.locator('.vd-timeline'), 20000);
    await settle(page, 1200);
    // no replay affordances anywhere (the run-page demo player is gone)
    await expect(page.locator('.vab-demo-btn')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
    await expect(page.getByText('Live-Demo')).toHaveCount(0);
    // static done state: the completed value receipt + the abgeschlossen badge
    await expect(page.locator('.vr-card')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/02-completed-record.png`, fullPage: false });
  });

  test('3) wizard → new Vorgang → live cascade on the Akte → complete → record', async ({ page }) => {
    test.setTimeout(180_000);
    // -- wizard step 1: address + stichtag + wohnungsgeber demo file.
    //    `?reliable=1` macht die spätere eID-Autorisierungskette deterministisch
    //    (Sticky-Flag persistiert über die Navigation zur Akte).
    await page.goto('/vorgaenge/umzug/start?reliable=1', { waitUntil: 'domcontentloaded' });
    await waitForOrRetry(page, () => page.getByLabel(/Straße/i), 20000);
    await page.getByLabel(/Straße/i).first().fill('Waldstraße');
    await page.getByLabel(/Hausnummer/i).first().fill('12');
    await page.getByLabel(/^PLZ/i).first().fill('04105');
    await page.getByLabel('Ort', { exact: true }).fill('Leipzig');
    const stichtag = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel('Einzugsdatum').fill(stichtag);
    await page.getByRole('button', { name: 'Beispiel verwenden' }).click();
    await page.screenshot({ path: `${SHOTS}/03a-wizard-start.png` });
    await page.getByRole('button', { name: /Weiter zur Vorschau/i }).click();

    // optional identitaet interstitial
    await page.waitForURL(/\/vorgaenge\/umzug\/(identitaet|preview)/, { timeout: 15000 });
    if (page.url().includes('identitaet')) {
      await page
        .getByRole('button', { name: /weiter|fortfahren|bestätigen/i })
        .first()
        .click();
      await page.waitForURL('**/vorgaenge/umzug/preview', { timeout: 15000 });
    }

    // -- wizard step 2: preview → start
    const startBtn = page.getByRole('button', { name: 'Autopilot starten' });
    await waitForOrRetry(page, () => page.getByRole('button', { name: 'Autopilot starten' }), 20000);
    await page.screenshot({ path: `${SHOTS}/03b-wizard-preview.png` });
    await startBtn.click();

    // -- lands on the canonical Akte; the cascade streams LIVE from real events
    //    (no reveal pacer, no staging marker anymore).
    await page.waitForURL('**/vorgaenge/vorgang-**', { timeout: 20000 });
    const akteUrl = page.url();
    await waitForOrRetry(page, () => page.locator('.vd-timeline .vd-step'), 30000);
    await settle(page, 1200);
    await page.screenshot({ path: `${SHOTS}/03c-cascade-live.png` });

    // eID gate surfaces as the full-width NextStepBanner CTA (Block-D, needs_eid).
    const eidBtn = page.getByRole('button', { name: 'Mit eID bestätigen' }).first();
    await eidBtn.waitFor({ timeout: 40000 });
    await page.screenshot({ path: `${SHOTS}/03d-eid-gate.png` });

    // -- reload mid-run: the Akte re-fetches the authoritative snapshot →
    //    confirmed Block-A steps are already `is-done`, no re-animation.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForOrRetry(page, () => page.locator('.vd-timeline .vd-step'), 30000);
    await settle(page, 500);
    const doneEarly = await page.locator('.vd-step.is-done').count();
    await page.screenshot({ path: `${SHOTS}/03e-after-reload-snapshot.png` });
    expect(doneEarly, 'confirmed steps visible immediately after reload').toBeGreaterThan(0);

    // -- authorise every eID gate via the confirm dialog → Vorgang completes.
    for (let i = 0; i < 4; i++) {
      const gate = page.getByRole('button', { name: 'Mit eID bestätigen' }).first();
      if ((await gate.count()) === 0) break;
      try {
        await gate.click({ timeout: 5000 });
        const dialogConfirm = page
          .getByRole('alertdialog')
          .or(page.getByRole('dialog'))
          .getByRole('button', { name: 'Mit eID bestätigen' });
        await dialogConfirm.click({ timeout: 5000 });
      } catch {
        break;
      }
      await settle(page, 2500);
    }

    // -- completed record: the value receipt renders, no replay affordances.
    await waitForOrRetry(page, () => page.locator('.vr-card'), 60000);
    await settle(page, 1000);
    await expect(page.locator('.vab-demo-btn')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/03f-new-vorgang-record.png` });

    // -- revisit the same Akte URL later: still the static record.
    await page.goto(akteUrl, { waitUntil: 'domcontentloaded' });
    await waitForOrRetry(page, () => page.locator('.vr-card'), 20000);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
  });

  test('4) antragslos CTA click-starts once; lands on the Akte; reload mints no duplicate', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/lebenslagen/kindergeld', { waitUntil: 'domcontentloaded' });
    const cta = page.getByRole('button', { name: 'Automatische Bearbeitung starten' });
    await cta.waitFor({ timeout: 20000 });
    await page.screenshot({ path: `${SHOTS}/04a-kindergeld-cta.png` });
    await cta.click();
    await page.waitForURL('**/vorgaenge/vorgang-**', { timeout: 20000 });
    const url1 = page.url();

    const countVorgaenge = () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('govtech-de:v1:vorgaenge');
        if (!raw) return -1;
        try {
          const list = JSON.parse(raw);
          return Array.isArray(list) ? list.length : -1;
        } catch {
          return -1;
        }
      });
    const before = await countVorgaenge();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await settle(page, 2000);
    expect(page.url(), 'URL keeps the same vorgangId after reload').toBe(url1);
    const after = await countVorgaenge();
    expect(after, `vorgaenge count stable (${before} → ${after})`).toBe(before);
    await page.screenshot({ path: `${SHOTS}/04b-kindergeld-cascade.png` });
  });

  test('5) bare cascade URL redirects to Leistung detail', async ({ page }) => {
    await page.goto('/lebenslagen/kindergeld/cascade', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/lebenslagen\/kindergeld(?!\/cascade)/, { timeout: 15000 });
  });

  test('6) legacy run URL redirects to the canonical Akte', async ({ page }) => {
    await page.goto('/vorgaenge/umzug/run?vorgangId=vg-anna-umzug-2026-completed', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL('**/vorgaenge/vg-anna-umzug-2026-completed', { timeout: 15000 });
    await waitForOrRetry(page, () => page.locator('.vd-timeline'), 20000);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
  });

  test('7) antragslos-Start landet auf der Akte und rendert das Kaskaden-Dossier', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/lebenslagen/kindergeld', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Automatische Bearbeitung starten' }).click();
    await page.waitForURL('**/vorgaenge/vorgang-**', { timeout: 20000 });
    const akteUrl = page.url();
    await settle(page, 1500);
    // stays on the Akte (no redirect back to a cascade route); the dossier renders
    expect(page.url()).toBe(akteUrl);
    await waitForOrRetry(page, () => page.locator('.vd-timeline'), 20000);
  });

  test('8) Stub-Vorgang ohne Dossier bleibt auf der Detailseite', async ({ page }) => {
    await page.goto('/vorgaenge/vorgang-anna-kindergeld-aktualisierung-2026', {
      waitUntil: 'domcontentloaded',
    });
    await settle(page, 2500);
    expect(page.url()).toContain('/vorgaenge/vorgang-anna-kindergeld-aktualisierung-2026');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
    // Konversion des Selbstreport-Stubs: der CTA autorisiert jetzt per eID
    // (needs_eid), statt „Als erledigt" zu melden.
    await expect(
      page.getByRole('button', { name: 'Mit eID bestätigen' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('9) Autopilot-Vollzug: eID-Autorisierung → Live-Vollzug → Brief-Mint', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // Der Ziel-Vorgang ist persona-gebunden (markus-schmidt): active_persona_id
    // setzen + persona-scoped Buckets einmalig reseeden. reliable_mode schaltet
    // die 5%-Fehlerrate ab, damit die Autorisierung deterministisch durchläuft.
    const NS = 'govtech-de:v1:';
    await page.addInitScript((ns) => {
      try {
        const sentinel = `${ns}__vollzug_seeded`;
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: 'markus-schmidt',
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
    }, NS);

    // `?reliable=1` macht die eine Autorisierung deterministisch (5%-Fehler aus).
    // Anders als bei den Kaskaden-Seiten (Test 3) gibt es hier KEIN Fresh-Run-
    // Staging, das reliable stören würde — die Detailseite treibt Banner-Advance
    // + Choreo aus echten Status-Übergängen. Die URL-Quelle wird vor `meta`
    // gelesen und übersteht das Reseed-Fenster (robuster als meta.reliable_mode).
    await page.goto('/vorgaenge/vg-schmidt-kindergeburt-mia-2026?reliable=1', {
      waitUntil: 'domcontentloaded',
    });
    await waitForOrRetry(
      page,
      () => page.getByRole('heading', { name: 'Ihr Vorgang im Überblick' }),
      20000,
    );

    // (1) Ruhezustand: Banner zeigt den ersten Bürger-Schritt (Elterngeld,
    //     needs_eid), CTA „Mit eID bestätigen" (kein Selbst-Abhaken mehr).
    await expect(page.locator('.vd-next .vd-next-aktion')).toHaveText(
      'Elterngeld für Mia beantragen',
      { timeout: 15000 },
    );
    const bannerCta = page.getByRole('button', { name: 'Mit eID bestätigen' });
    await bannerCta.waitFor({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/09a-ruhezustand.png` });

    // (2) CTA-Klick → Autorisierungs-Dialog öffnet; dessen Confirm-Button klicken.
    await bannerCta.click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/09b-auth-dialog.png` });
    await dialog.getByRole('button', { name: 'Mit eID bestätigen' }).click();

    // (3) KEIN Ganzseiten-Skeleton (silent reconcile); „Ihr Vorgang im Überblick"
    //     bleibt durchgehend sichtbar.
    await expect(page.locator('[role="status"][aria-busy="true"]')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Ihr Vorgang im Überblick' }),
    ).toBeVisible();

    // (4) Live-Vollzug: Banner rückt nach confirmed auf den nächsten Bürger-
    //     Schritt „Familienversicherung Mia anmelden" (CTA jetzt „Übermittlung
    //     freigeben"), Zähler springt auf „2 von 3".
    await expect(page.locator('.vd-next .vd-next-aktion')).toHaveText(
      'Familienversicherung Mia anmelden',
      { timeout: 25000 },
    );
    await expect(
      page.getByRole('button', { name: 'Übermittlung freigeben' }),
    ).toBeVisible({ timeout: 25000 });
    await expect(page.getByText('2 von 3 Schritten').first()).toBeVisible({
      timeout: 25000,
    });
    await page.screenshot({ path: `${SHOTS}/09c-nach-vollzug.png` });

    // (4b) WCAG 2.4.3: nach dem Vollzug ruht der Fokus auf dem neuen CTA der
    //      Kette (Einwilligung) — NICHT auf <body>.
    await page.waitForFunction(
      () => {
        const el = document.activeElement;
        return (
          el instanceof HTMLElement &&
          el.matches('[data-vd-cta]') &&
          (el.textContent ?? '').includes('Übermittlung freigeben')
        );
      },
      undefined,
      { timeout: 20000 },
    );

    // (5) aria-live-Region trägt die Ansage.
    await expect(page.locator('p[aria-live="polite"]').first()).toContainText(
      'Schritt erledigt',
      { timeout: 15000 },
    );

    // (6) Brief-Mint: die Eingangsbestätigung der Elterngeldstelle landet im
    //     Posteingang zu diesem Vorgang.
    const posteingang = page.getByRole('region', {
      name: /Posteingang zu diesem Vorgang/,
    });
    await expect(posteingang).toBeVisible({ timeout: 25000 });
    await expect(posteingang.getByText(/Elterngeldstelle/).first()).toBeVisible({
      timeout: 25000,
    });

    // (7) Zweiter Schritt der Kette (Einwilligung) → Done; der Fokus landet auf
    //     der Done-Section (tabIndex=-1), nicht auf <body> (WCAG 2.4.3).
    await page.getByRole('button', { name: 'Übermittlung freigeben' }).click();
    const dialog2 = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog2).toBeVisible({ timeout: 10000 });
    await dialog2.getByRole('button', { name: 'Übermittlung freigeben' }).click();
    await expect(page.locator('.vd-next.is-done')).toBeVisible({ timeout: 25000 });
    await page.waitForFunction(
      () => {
        const el = document.activeElement;
        return (
          el instanceof HTMLElement &&
          el.classList.contains('vd-next') &&
          el.classList.contains('is-done')
        );
      },
      undefined,
      { timeout: 20000 },
    );
  });
});
