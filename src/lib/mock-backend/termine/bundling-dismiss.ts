/**
 * Termine „Übergaben" — Bündelungs-Vorschlag „Getrennt lassen" (deviceLocal
 * Dismiss-Persistenz, `termine-uebergaben.md` § 7.4/§ 9.3).
 *
 * Spiegelt das Wohngeld-/Aufenthalt-Nudge-Muster
 * (`lebenslagen/wohngeld-estimate.ts`, `dashboard/aufenthalt-frist-nudge.ts`):
 * ein pro-Persona-Bucket über `persistence.read/write` mit eigenem
 * `CollectionKey`. Anders als dort ist der Wert je Persona eine LISTE dismisster
 * später-Termin-IDs (`Record<PersonaId, string[]>`) — ein persona-boolean wäre
 * falsch, es würde jeden künftigen Bündelungs-Vorschlag unterdrücken.
 *
 * Persona-Wechsel-Semantik (konsistent zum Wohngeld-Muster): der Bucket wird
 * bei `seedForPersona`/Persona-Switch NICHT zurückgesetzt. Er ist deviceLocal
 * und im Record bereits persona-scoped — jede Persona sieht nur ihre eigenen
 * dismissten IDs. Genau wie `wohngeld-hinweis:*` / `aufenthalt-frist-nudge:*`.
 *
 * Komponenten greifen NIE direkt hierauf zu — ausschließlich über `api.*`.
 */
import type { PersonaId } from '@/types';
import { readOrInit, write, type CollectionKey } from '../persistence';
import { terminBundlingDismissedBucketSchema } from '../schemas';

function loadDismissedBucket(): Record<PersonaId, string[]> {
  return readOrInit(
    'termin-bundling:dismissed' as CollectionKey,
    terminBundlingDismissedBucketSchema,
    {} as Record<PersonaId, string[]>,
  );
}

/** Liste der für diese Persona „getrennt gelassenen" später-Termin-IDs. */
export function getTerminBundlingDismissed(personaId: PersonaId): string[] {
  return loadDismissedBucket()[personaId] ?? [];
}

/**
 * Hängt eine später-Termin-ID an die Dismiss-Liste der Persona (additiv,
 * de-dupliziert). Der zugehörige Bündelungs-Vorschlag verschwindet dann
 * dauerhaft; kein Termin wird verändert.
 */
export function persistTerminBundlingDismiss(
  personaId: PersonaId,
  spaeterTerminId: string,
): void {
  const bucket = loadDismissedBucket();
  const list = bucket[personaId] ?? [];
  if (!list.includes(spaeterTerminId)) {
    bucket[personaId] = [...list, spaeterTerminId];
    write('termin-bundling:dismissed' as CollectionKey, bucket);
  }
}
