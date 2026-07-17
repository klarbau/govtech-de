/**
 * Aufenthaltstitel-Frist-Nudge — deviceLocal Dismiss/Snooze-Gate (wow-backlog #10).
 *
 * Spiegelt das Wohngeld-Hinweis-Muster (`lebenslagen/wohngeld-estimate.ts`):
 * pro-Persona-Buckets + ein reines Suppression-Prädikat, das der Dashboard-Pfad
 * beim Mount prüft. Der View-Estimate selbst (`resolveAufenthaltFristNudge`)
 * bleibt komponentenlokal — hier lebt NUR der Persistenz-/Gate-Teil.
 *
 * Komponenten greifen NIE direkt hierauf zu — ausschließlich über `api.*`.
 */
import type { PersonaId } from '@/types';
import { readOrInit, write, type CollectionKey } from '../persistence';
import {
  aufenthaltFristNudgeDismissedBucketSchema,
  aufenthaltFristNudgeSnoozedBucketSchema,
} from '../schemas';

function loadDismissedBucket(): Record<PersonaId, string> {
  return readOrInit(
    'aufenthalt-frist-nudge:dismissed' as CollectionKey,
    aufenthaltFristNudgeDismissedBucketSchema,
    {} as Record<PersonaId, string>,
  );
}

function loadSnoozedBucket(): Record<PersonaId, string> {
  return readOrInit(
    'aufenthalt-frist-nudge:snoozed-until' as CollectionKey,
    aufenthaltFristNudgeSnoozedBucketSchema,
    {} as Record<PersonaId, string>,
  );
}

/**
 * `true`, wenn der Nudge für diese Persona unterdrückt wird:
 *  (a) dauerhaft geschlossen (dismissed-Timestamp gesetzt), oder
 *  (b) Snooze-Datum liegt in der Zukunft.
 */
export function isAufenthaltFristNudgeSuppressed(
  personaId: PersonaId,
  now: Date = new Date(),
): boolean {
  if (loadDismissedBucket()[personaId]) return true;
  const snoozedUntil = loadSnoozedBucket()[personaId];
  if (snoozedUntil && new Date(snoozedUntil).getTime() > now.getTime()) {
    return true;
  }
  return false;
}

/** Nudge dauerhaft schließen ("nicht mehr anzeigen"). */
export function persistAufenthaltFristNudgeDismiss(
  personaId: PersonaId,
  now: Date = new Date(),
): void {
  const bucket = loadDismissedBucket();
  bucket[personaId] = now.toISOString();
  write('aufenthalt-frist-nudge:dismissed' as CollectionKey, bucket);
}

/** Nudge für `tage` Tage verstecken (Snooze). */
export function persistAufenthaltFristNudgeSnooze(
  personaId: PersonaId,
  tage: number,
  now: Date = new Date(),
): void {
  const until = new Date(now.getTime() + tage * 24 * 60 * 60 * 1000);
  const bucket = loadSnoozedBucket();
  bucket[personaId] = until.toISOString();
  write('aufenthalt-frist-nudge:snoozed-until' as CollectionKey, bucket);
}
