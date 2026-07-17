/**
 * Vorgang-Lifecycle-Semantik — "Akte statt Video" (Rework 2026-07-10).
 * Diagnose-/Verifikationsspec (underscore = kein Gate): bare-Route-Redirects,
 * statisches Abgeschlossen-Dossier ohne Replay, Once-only-Reveal-Marker,
 * kein Duplikat-Vorgang bei Reload. NICHT mit ?reliable=1 fahren — der
 * reliable-Modus deaktiviert das Fresh-Run-Staging, dessen Once-Semantik
 * Test 3 gerade nachweist. Screenshots landen im Session-Scratchpad.
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

  test('2) completed Vorgang is a static record — no play button', async ({ page }) => {
    await page.goto(
      '/vorgaenge/umzug/run?vorgangId=vg-anna-umzug-2026-completed',
      { waitUntil: 'domcontentloaded' },
    );
    await waitForOrRetry(page, () => page.locator('.vab-layout'), 20000);
    await settle(page, 1200);
    // no replay affordances anywhere
    await expect(page.locator('.vab-demo-btn')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
    await expect(page.getByText('Live-Demo')).toHaveCount(0);
    // static done state: progress 100%, done pill
    await expect(page.locator('.vab-overview-pill')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/02-completed-record.png`, fullPage: false });
  });

  test('3) wizard → new Vorgang → cascade runs once → reload = snapshot', async ({ page }) => {
    test.setTimeout(180_000);
    // -- wizard step 1: address + stichtag + wohnungsgeber demo file
    await page.goto('/vorgaenge/umzug/start', { waitUntil: 'domcontentloaded' });
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

    // -- run page: live cascade (staged reveal plays exactly now)
    await page.waitForURL('**/vorgaenge/umzug/run?vorgangId=**', { timeout: 20000 });
    const runUrl = page.url();
    await settle(page, 1500);
    await page.screenshot({ path: `${SHOTS}/03c-cascade-live.png` });

    // sessionStorage marker set → reveal is one-shot
    const marker = await page.evaluate(() =>
      Object.keys(window.sessionStorage).find((k) => k.startsWith('gt-umzug-reveal:')),
    );
    expect(marker, 'reveal marker set after staging').toBeTruthy();

    // wait for eID gates (Umzug pauses at sensitive authorities)
    const eidBtn = page.getByRole('button', { name: 'Mit eID bestätigen' }).first();
    await eidBtn.waitFor({ timeout: 40000 });
    await page.screenshot({ path: `${SHOTS}/03d-eid-gate.png` });

    // -- reload mid-run: must show the authoritative snapshot, not re-animate.
    await page.reload({ waitUntil: 'domcontentloaded' });
    // sample early: confirmed checkmarks must already be visible (staged replay
    // would show them pending for the first ~1-2s of beats)
    await waitForOrRetry(page, () => page.locator('.vlf-eid, [class*="vlf"], .vab-layout'), 30000);
    await settle(page, 400);
    const confirmedEarly = await page.getByText('Erledigt', { exact: false }).count();
    await page.screenshot({ path: `${SHOTS}/03e-after-reload-snapshot.png` });
    expect(confirmedEarly, 'confirmed steps visible immediately after reload').toBeGreaterThan(0);

    // -- confirm all eID gates → Vorgang completes → record, no play button
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
    await waitForOrRetry(page, () => page.locator('.vab-layout'), 60000);
    await settle(page, 1500);
    await expect(page.locator('.vab-demo-btn')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/03f-new-vorgang-record.png` });

    // -- revisit the same URL later: still the static record
    await page.goto(runUrl, { waitUntil: 'domcontentloaded' });
    await waitForOrRetry(page, () => page.locator('.vab-layout'), 20000);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
  });

  test('4) antragslos CTA click-starts once; reload mints no duplicate', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/lebenslagen/kindergeld', { waitUntil: 'domcontentloaded' });
    const cta = page.getByRole('button', { name: 'Automatische Bearbeitung starten' });
    await cta.waitFor({ timeout: 20000 });
    await page.screenshot({ path: `${SHOTS}/04a-kindergeld-cta.png` });
    await cta.click();
    await page.waitForURL(/\/lebenslagen\/kindergeld\/cascade\?vorgangId=/, { timeout: 20000 });
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

  test('6) /vorgaenge/[id] dispatcht Umzug auf das kanonische Dossier', async ({ page }) => {
    await page.goto('/vorgaenge/vg-anna-umzug-2026-completed', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/vorgaenge/umzug/run?vorgangId=vg-anna-umzug-2026-completed', {
      timeout: 15000,
    });
    await waitForOrRetry(page, () => page.locator('.vab-layout'), 20000);
    await expect(page.getByRole('button', { name: /abspielen/i })).toHaveCount(0);
  });

  test('7) /vorgaenge/[id] dispatcht engine-gelaufene Lebenslage aufs Kaskaden-Dossier', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/lebenslagen/kindergeld', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Automatische Bearbeitung starten' }).click();
    await page.waitForURL(/\/lebenslagen\/kindergeld\/cascade\?vorgangId=/, { timeout: 20000 });
    const vorgangId = new URL(page.url()).searchParams.get('vorgangId')!;
    await settle(page, 1500);
    await page.goto(`/vorgaenge/${vorgangId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(
      (u) => u.pathname === '/lebenslagen/kindergeld/cascade' && u.searchParams.get('vorgangId') === vorgangId,
      { timeout: 15000 },
    );
  });

  test('8) Stub-Vorgang ohne Dossier bleibt auf der Detailseite', async ({ page }) => {
    await page.goto('/vorgaenge/vorgang-anna-kindergeld-aktualisierung-2026', {
      waitUntil: 'domcontentloaded',
    });
    await settle(page, 2500);
    expect(page.url()).toContain('/vorgaenge/vorgang-anna-kindergeld-aktualisierung-2026');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
  });
});
