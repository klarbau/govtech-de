/**
 * Reminders Mock-Backend-API (`redesign-termine.md` § 6).
 *
 * `getReminders()` liefert die Erinnerungen/Fristen der aktiven Persona,
 * sortiert nach `datum` aufsteigend. Quelle: Seed-Bucket
 * `govtech-de:v1:reminders` PLUS abgeleitet aus offenen `Vorgang.fristen[]`
 * (für jede zukünftige Frist eines aktiven Vorgangs ein `Reminder` mit
 * `kategorie: 'frist'`).
 *
 * Latenz: durch `withLatency()`.
 *
 * Hand-off note für assistant-engineer: künftiges Tool `get_reminders`
 * spiegelt diese Methode.
 */
import type { Reminder, Vorgang } from '@/types';
import { withLatency } from '../latency';
import { readOrInit, type CollectionKey } from '../persistence';
import { remindersArraySchema, vorgaengeArraySchema } from '../schemas';

function loadRemindersBucket(): Reminder[] {
  return readOrInit(
    'reminders' as CollectionKey,
    remindersArraySchema as unknown as import('zod').ZodType<Reminder[]>,
    [] as Reminder[],
  );
}

function loadVorgaenge(): Vorgang[] {
  return readOrInit(
    'vorgaenge' as CollectionKey,
    vorgaengeArraySchema as unknown as import('zod').ZodType<Vorgang[]>,
    [] as Vorgang[],
  );
}

/** Aktive Vorgänge = nicht abgeschlossen/abgelehnt. */
function isActiveVorgang(v: Vorgang): boolean {
  return v.status !== 'abgeschlossen' && v.status !== 'abgelehnt';
}

/**
 * Leitet aus den offenen Fristen aktiver Vorgänge je einen `Reminder` ab.
 * Deterministische ID `reminder-vorgang-<vorgangId>-<fristTyp>`, damit
 * derselbe Vorgang nicht doppelte Reminder erzeugt.
 */
function derivedFromVorgaenge(vorgaenge: Vorgang[]): Reminder[] {
  const out: Reminder[] = [];
  for (const v of vorgaenge) {
    if (!isActiveVorgang(v)) continue;
    for (const f of v.fristen ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.datum)) continue;
      out.push({
        id: `reminder-vorgang-${v.id}-${f.typ}`,
        vorgang_id: v.id,
        behoerde_id: v.beteiligte_behoerden_ids[0],
        titel: v.titel,
        datum: f.datum,
        kategorie: 'frist',
        frist_typ: f.typ,
      });
    }
  }
  return out;
}

export interface RemindersApi {
  getReminders(): Promise<Reminder[]>;
}

export const remindersApi: RemindersApi = {
  getReminders: () =>
    withLatency<Reminder[]>(() => {
      const seeded = loadRemindersBucket();
      const derived = derivedFromVorgaenge(loadVorgaenge());
      // De-Dupe nach id (Seed gewinnt vor abgeleiteten Vorgangs-Fristen).
      const byId = new Map<string, Reminder>();
      for (const r of derived) byId.set(r.id, r);
      for (const r of seeded) byId.set(r.id, r);
      return [...byId.values()].sort((a, b) => a.datum.localeCompare(b.datum));
    }),
};
