/**
 * Once-per-Vorgang-Marker „frisch erstellt" (sessionStorage): die
 * Erstellungs-Flows (Umzug-Wizard, AntragForm, antragsloser Start,
 * Brief-Modal) setzen ihn unmittelbar vor der Navigation, die
 * Vorgang-Übersicht liest ihn beim ersten Mount und räumt ihn ab —
 * nur dieser eine Besuch spielt die Anlege-Choreografie der
 * Schritt-Karten. Lesen und Abräumen sind getrennt, damit der
 * StrictMode-Doppel-Render den Marker nicht vor dem State-Init frisst.
 */
const KEY_PREFIX = 'govtech-de:vorgang-fresh:';

export function markVorgangFresh(vorgangId: string): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + vorgangId, '1');
  } catch {
    // Storage gesperrt (z. B. Private Mode) → Choreografie entfällt still.
  }
}

export function isVorgangFresh(vorgangId: string): boolean {
  try {
    return sessionStorage.getItem(KEY_PREFIX + vorgangId) === '1';
  } catch {
    return false;
  }
}

export function clearVorgangFresh(vorgangId: string): void {
  try {
    sessionStorage.removeItem(KEY_PREFIX + vorgangId);
  } catch {
    // noop
  }
}
