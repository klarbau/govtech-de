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

/** Deutsche Kurz-Labels je Frist-Typ — nur zur Unterscheidung, wenn EIN Vorgang
 *  mehrere Fristen beisteuert (sonst stünde zweimal derselbe Vorgang-Titel). */
const FRIST_TYP_LABEL: Record<string, string> = {
  abh_termin_empfehlung: 'Termin zur Verlängerung vereinbaren (Empfehlung)',
  ablauf_aufenthaltstitel: 'Ablauf des Aufenthaltstitels',
};

/**
 * Leitet aus den offenen Fristen aktiver Vorgänge je einen `Reminder` ab.
 * Deterministische ID `reminder-vorgang-<vorgangId>-<fristTyp>`, damit
 * derselbe Vorgang nicht doppelte Reminder erzeugt. Fristen, die bereits ein
 * handkuratierter Seed-Reminder desselben Vorgangs abdeckt (gleiches
 * `vorgang_id` + `frist_typ`), werden übersprungen — sonst erscheint dieselbe
 * Frist doppelt (Seed-Titel + Vorgang-Titel).
 */
function derivedFromVorgaenge(
  vorgaenge: Vorgang[],
  seeded: Reminder[],
): Reminder[] {
  const covered = new Set(
    seeded
      .filter((r) => r.vorgang_id && r.frist_typ)
      .map((r) => `${r.vorgang_id}:${r.frist_typ}`),
  );
  const out: Reminder[] = [];
  for (const v of vorgaenge) {
    if (!isActiveVorgang(v)) continue;
    const fristen = (v.fristen ?? []).filter(
      (f) =>
        /^\d{4}-\d{2}-\d{2}$/.test(f.datum) && !covered.has(`${v.id}:${f.typ}`),
    );
    for (const f of fristen) {
      const typLabel = FRIST_TYP_LABEL[f.typ] ?? f.typ;
      out.push({
        id: `reminder-vorgang-${v.id}-${f.typ}`,
        vorgang_id: v.id,
        behoerde_id: v.beteiligte_behoerden_ids[0],
        titel: fristen.length > 1 ? `${v.titel} — ${typLabel}` : v.titel,
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
      const derived = derivedFromVorgaenge(loadVorgaenge(), seeded);
      // De-Dupe nach id (Seed gewinnt vor abgeleiteten Vorgangs-Fristen).
      const byId = new Map<string, Reminder>();
      for (const r of derived) byId.set(r.id, r);
      for (const r of seeded) byId.set(r.id, r);
      return [...byId.values()].sort((a, b) => a.datum.localeCompare(b.datum));
    }),
};
