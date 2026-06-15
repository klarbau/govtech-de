/**
 * Termin-Autopilot — deterministischer „letzter sicherer Slot"-Ranker.
 *
 * Spec: `docs/specs/termin-autopilot.md` §5 (Frist → letzter-sicherer-Slot-Ranking).
 * Domain: `docs/domain/umzug.md` §5 („zwei Wochen ab Einzug").
 *
 * Bewusst minimal — KEIN Slot-Grid, KEINE User-Präferenzen, KEIN Free/Busy (§10).
 * Determinismus-Disziplin: das Slot-Datum wird AUSSCHLIESSLICH aus `stichtag`
 * (Seed-/Kontext-Datum) + `BUFFER_TAGE` gerechnet. **Kein `Date.now()`, kein
 * `Math.random()`** im Slot-Pfad (Repo-Regel für demo-stabile Pfade). Der „now"-
 * Bezug wird nur für die Frist-abgelaufen-Edge (§9) konsultiert und ist optional
 * injiziert (`nowIso`), damit Tests den Pfad deterministisch halten können.
 */

/** Komfort-Puffer vor Fristablauf, in Kalendertagen. */
export const BUFFER_TAGE = 5;

/** Gesetzliche Anmeldefrist nach Einzug, in Kalendertagen (§ 17 BMG, „zwei Wochen"). */
export const FRIST_TAGE = 14;

/** Mindest-Vorlauf für die Edge „Slot läge vor jetzt" (§9), in Kalendertagen. */
const MIN_VORLAUF_TAGE = 2;

const MS_PER_TAG = 86_400_000;

export interface AnmeldungSlot {
  /** ISO-Timestamp des vorgeschlagenen Termin-Slots (09:00 Ortszeit). */
  slotIso: string;
  /** ISO-Timestamp der gesetzlichen Anmeldefrist (stichtag + 14 Kalendertage, 09:00). */
  fristIso: string;
  /** Tage zwischen Slot und Frist (Kalendertage) — für den Reasoning-String „{n} Tage vor Ihrer Frist". */
  tageVorFrist: number;
}

/** Setzt eine Date-Instanz auf 09:00 Ortszeit (Demo-Konvention für Behördentermine). */
function atNeun(d: Date): Date {
  const out = new Date(d);
  out.setHours(9, 0, 0, 0);
  return out;
}

/** Ganze Kalendertage zwischen zwei Daten (gerundet, vorzeichenbehaftet a→b). */
function tageZwischen(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_TAG);
}

/**
 * Letzter sicherer Anmeldungs-Slot vor der gesetzlichen Frist.
 *
 * Regel (Spec §5):
 *  1. Frist = stichtag + 14 Kalendertage (09:00).
 *  2. Slot  = Frist − BUFFER_TAGE (09:00) — der „letzte sichere Slot vor der Frist".
 *  3. tageVorFrist = Frist − Slot in Kalendertagen (mit BUFFER_TAGE=5 ⇒ „5 Tage vor Ihrer Frist").
 *  4. Edge (§9): liegt der Slot vor `nowIso`, fällt er auf
 *     `max(now + MIN_VORLAUF_TAGE, …)` zurück, bleibt aber `≤ Frist`.
 *
 * Determinismus: ist `nowIso` nicht gesetzt oder liegt der Slot bereits in der
 * Zukunft, hängt das Ergebnis NUR vom `stichtag` ab.
 *
 * @param stichtagIso ISO-Datum des Einzugs (`vorgang.context.stichtag` / `fristen[typ='stichtag']`).
 * @param nowIso      Optionaler „jetzt"-Bezug (nur für die Frist-abgelaufen-Edge). Default: kein Clamp.
 */
export function letzterSichererAnmeldungSlot(
  stichtagIso: string,
  nowIso?: string,
): AnmeldungSlot {
  const stichtag = new Date(stichtagIso);
  // Defensiv: ungültiger stichtag → behandelt wie „heute" über nowIso bzw. epoch.
  const basis = Number.isNaN(stichtag.getTime())
    ? new Date(nowIso ?? new Date(0).toISOString())
    : stichtag;

  const frist = atNeun(new Date(basis.getTime() + FRIST_TAGE * MS_PER_TAG));
  let slot = atNeun(new Date(frist.getTime() - BUFFER_TAGE * MS_PER_TAG));

  // Edge §9: Slot läge vor jetzt → auf min. Vorlauf schieben, aber ≤ Frist.
  if (nowIso) {
    const now = new Date(nowIso);
    if (!Number.isNaN(now.getTime()) && slot.getTime() < now.getTime()) {
      const verschoben = atNeun(new Date(now.getTime() + MIN_VORLAUF_TAGE * MS_PER_TAG));
      // Nicht über die Frist hinausschieben — so nah wie möglich an ≤ Frist.
      slot = verschoben.getTime() <= frist.getTime() ? verschoben : frist;
    }
  }

  return {
    slotIso: slot.toISOString(),
    fristIso: frist.toISOString(),
    tageVorFrist: Math.max(0, tageZwischen(slot, frist)),
  };
}
