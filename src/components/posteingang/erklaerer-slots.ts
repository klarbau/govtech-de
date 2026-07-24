import type { Letter, LetterFristTyp } from '@/types';

/**
 * Fakten-Slots des KI-Erklärers („Einfach erklärt") — brief-spezifisch statt
 * starrer Zahlungs-Archetyp. Der Erklärer rendert immer den „Worum geht es?"-Block
 * plus die hier abgeleiteten Fakten-Slots (2–3 Blöcke gesamt), nie einen
 * „der Brief nennt kein X"-Füller.
 *
 * Diese Datei ist bewusst i18n-frei und rein: sie liefert Deskriptoren, der
 * Aufrufer (PostDetail) mappt sie auf lokalisierte Fragen/Antworten. Beträge und
 * Datumsangaben bleiben deutsch-abgeleitet (Honesty-Guardrail).
 */

export interface BetragSlot {
  kind: 'betrag';
  richtung: 'erstattung' | 'nachzahlung';
  /** Euro-Cent, > 0. */
  betrag_cent: number;
}

export interface FristSlot {
  kind: 'frist';
  /** Fristtyp der frühesten Frist — typisiert die Erklärer-Frage. */
  typ: LetterFristTyp;
  /** ISO-Datum YYYY-MM-DD der frühesten Frist. */
  datum: string;
}

/**
 * Antwort-Variante des „Muss ich etwas tun?"-Slots:
 *  - `cta`          → das Schreiben nennt eine konkrete Aufforderung (`cta` gesetzt)
 *  - `bestaetigung` → Bestätigungs-/Bescheinigungs-Schreiben (Betreff-Match)
 *  - `information`  → reines Informationsschreiben
 */
export type HandelnAntwort = 'cta' | 'bestaetigung' | 'information';

export interface HandelnSlot {
  kind: 'handeln';
  antwort: HandelnAntwort;
  /** Nur bei `antwort === 'cta'`: verbatim deutscher Seed-CTA-Text. */
  cta?: string;
}

export type ErklaererFaktenSlot = BetragSlot | FristSlot | HandelnSlot;

/** Früheste Frist nach `datum` (ISO sortiert lexikografisch = chronologisch). */
function earliestFrist(letter: Letter): FristSlot | null {
  const fristen = letter.fristen ?? [];
  if (fristen.length === 0) return null;
  const first = [...fristen].sort((a, b) => a.datum.localeCompare(b.datum))[0];
  return { kind: 'frist', typ: first.typ, datum: first.datum };
}

function handelnSlot(letter: Letter): HandelnSlot {
  const cta = letter.required_action?.cta;
  if (cta && cta.trim().length > 0) {
    return { kind: 'handeln', antwort: 'cta', cta };
  }
  if (/(bestätigung|bescheinigung)/i.test(letter.betreff)) {
    return { kind: 'handeln', antwort: 'bestaetigung' };
  }
  return { kind: 'handeln', antwort: 'information' };
}

/**
 * Leitet die Fakten-Slots eines Briefs ab:
 *  - `betrag`-Slot, falls `betrag_cent > 0`.
 *  - `frist`-Slot, falls `fristen` nicht leer (früheste nach `datum`, mit `typ`).
 *  - genau ein `handeln`-Slot, falls WEDER Betrag NOCH Frist vorliegt.
 *
 * Betrag und Frist können gemeinsam auftreten (→ 2 Fakten-Slots); zusammen mit
 * dem „Worum"-Block sind das max. 3 Blöcke.
 */
export function deriveErklaererSlots(letter: Letter): ErklaererFaktenSlot[] {
  const slots: ErklaererFaktenSlot[] = [];

  const betragCent = letter.betrag_cent;
  if (typeof betragCent === 'number' && betragCent > 0) {
    slots.push({
      kind: 'betrag',
      richtung: letter.betrag_richtung === 'erstattung' ? 'erstattung' : 'nachzahlung',
      betrag_cent: betragCent,
    });
  }

  const frist = earliestFrist(letter);
  if (frist) slots.push(frist);

  if (slots.length === 0) slots.push(handelnSlot(letter));

  return slots;
}
