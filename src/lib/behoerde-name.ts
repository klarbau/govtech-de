import behoerdenData from '@/data/behoerden.json';
import type { Behoerde } from '@/types';

const NAME_BY_ID: Record<string, string> = Object.fromEntries(
  (behoerdenData as Array<Pick<Behoerde, 'id' | 'name_de'>>).map((b) => [
    b.id,
    b.name_de,
  ]),
);

/**
 * Behörden-ID → Anzeigename (`name_de`) aus der Seed-Quelle behoerden.json.
 *
 * Deterministischer Fallback für Oberflächen, die sonst auf den Roh-Slug
 * zurückfallen, wenn der asynchrone `api.getBehoerden()`-Namensindex noch nicht
 * geladen ist oder (5%-Fehlerrate) fehlschlägt. Unbekannte Werte — etwa
 * Freitext-Arbeitgebernamen in den Steuer-Datenquellen — werden unverändert
 * durchgereicht, sodass die Funktion auf gemischten ID/Freitext-Feldern sicher
 * ist.
 */
export function resolveBehoerdeName(idOrText: string): string {
  return NAME_BY_ID[idOrText] ?? idOrText;
}
