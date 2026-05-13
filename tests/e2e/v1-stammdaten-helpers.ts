import type { Page } from '@playwright/test';

export const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
export const NS = 'govtech-de:v1:';

/**
 * Stellt Persona-Kontext für Stammdaten-e2e-Specs her: setzt Locale-Cookie
 * und initialisiert `govtech-de:v1:meta` mit der aktiven Persona-ID, damit
 * `seedIfEmpty()` beim ersten Read korrekt seedet.
 */
export async function setupStammdatenPersona(
  page: Page,
  personaId: string,
): Promise<void> {
  await page.context().addCookies([
    {
      name: LOCALE_COOKIE_NAME,
      value: 'de',
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        // Stammdaten-Buckets immer aus Seed neu aufbauen, damit Tests nicht
        // auf Reste vorheriger Sessions zurückfallen.
        for (const key of [
          'profile',
          'stammdaten:sperren',
          'stammdaten:iban-speculative',
          'stammdaten:kontakt',
          'stammdaten:uebermittlungs-log',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
        // Religion-Consent darf nie persistiert sein (Hard-Line § 11.4).
        window.localStorage.removeItem(`${ns}stammdaten:religion-consent`);
        // Session-Storage räumen, damit Anzeige collapsed startet. Der reale
        // Key in `src/lib/mock-backend/stammdaten/api.ts:64` trägt das
        // `-session`-Suffix; ohne Suffix ist der removeItem-Aufruf ein No-Op.
        window.sessionStorage.removeItem(
          `${ns}stammdaten:religion-consent-session`,
        );
      } catch {
        // ignore — non-browser env
      }
    },
    [NS, personaId],
  );
}

/**
 * Wartet, bis die Stammdaten-View tatsächlich gerendert ist (nicht nur
 * `networkidle` — V1.5-Lessons: das ist ein false-PASS-Pfad).
 */
export async function warmStammdaten(page: Page): Promise<void> {
  await page.goto('/stammdaten', { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="stammdaten-view"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
  // Hero-Card als Indikator für „erfolgreich geladen".
  await page
    .locator('[data-testid="stammdaten-hero"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
}
