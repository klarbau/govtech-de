import behoerdenData from '@/data/behoerden.json';
import type { Behoerde } from '@/types';

const BEHOERDEN = behoerdenData as unknown as Behoerde[];
const BY_ID = new Map(BEHOERDEN.map((b) => [b.id, b]));

function normOrt(ort: string | undefined): string {
  return ort?.trim().toLowerCase() ?? '';
}

/**
 * Löst eine Template-Behörde (typischerweise ein Berlin-Seed) auf die am Wohnort
 * der Persona zuständige, gleichartige Stelle auf — damit Katalog und
 * Zuständigkeits-Auskunft nicht Berlin hartkodieren.
 *
 * Matching (deterministisch, rein über behoerden.json):
 *  - `bund` / `sozialversicherung` sind NICHT ortsgebunden (Bundesbehörde bzw.
 *    wahlfreie Kasse) → die Template-Behörde bleibt unverändert.
 *  - `kommune` / `land` sind ortsgebunden: liegt die Template-Behörde bereits am
 *    Persona-Ort, bleibt sie; sonst wird eine Stelle am Persona-Ort gesucht, die
 *    ≥ 1 `zustaendige_themen` mit der Template-Behörde teilt (die föderale Ebene
 *    darf wechseln — z. B. ABH: Berlin `land` (LEA) ↔ Köln `kommune` (Stadt)).
 *
 * Rückgabe:
 *  - lokale Stelle gefunden → deren Eintrag,
 *  - bundesweit/wahlfrei → die Template-Behörde,
 *  - ortsgebunden, aber KEIN lokaler Seed → `null`. Der Aufrufer fällt dann auf
 *    eine generische Formulierung zurück — NIEMALS stillschweigend auf Berlin.
 */
export function resolveZustaendigeBehoerde(
  templateId: string,
  ort: string | undefined,
): Behoerde | null {
  const template = BY_ID.get(templateId);
  if (!template) return null;

  // Nicht ortsgebunden — Bundesbehörde (BZSt, DRV-Bund, Familienkasse/BA) bzw.
  // wahlfreie Sozialversicherung (Kranken-/Pflegekasse). Unverändert lassen.
  if (template.kategorie !== 'kommune' && template.kategorie !== 'land') {
    return template;
  }

  const wanted = normOrt(ort);
  if (!wanted) return null;

  // Template liegt bereits am Persona-Ort (Standardfall Berlin-Persona).
  if (normOrt(template.adresse?.ort) === wanted) return template;

  const themen = new Set(template.zustaendige_themen ?? []);
  const local = BEHOERDEN.find(
    (b) =>
      (b.kategorie === 'kommune' || b.kategorie === 'land') &&
      normOrt(b.adresse?.ort) === wanted &&
      (b.zustaendige_themen ?? []).some((th) => themen.has(th)),
  );
  return local ?? null;
}
