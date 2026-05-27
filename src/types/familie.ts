/**
 * Familie — „Mein Haushalt" Lese-/Wegweiser-Sicht über die bestehende Persona.
 * Spec: `docs/specs/redesign-familie.md` § 6.
 *
 * Read-only: `getFamilie()` leitet alles aus `Persona.familie` + Persona-Flags
 * ab. Keine Mutation, kein Activity-Log-Eintrag (konsistent mit Stammdaten-
 * Lese-Architektur). Vertretungs-/Vollmacht-Funktionen sind 2027-Vision.
 */
export type HaushaltRolle =
  | 'hauptperson'
  | 'partner'
  | 'kind'
  | 'mutter'
  | 'vater';

export interface HaushaltMitglied {
  /** PersonaId oder Kind/Partner-Sub-ID aus Seed. */
  persona_ref_id: string;
  vorname: string;
  nachname: string;
  /** ISO-Datum. */
  geburtsdatum: string;
  rolle: HaushaltRolle;
  ist_hauptperson: boolean;
  /** Pro-Person-Zählung für die "Was betrifft wen?"-Rail. */
  counts: {
    vorgaenge: number;
    dokumente: number;
    nachweise: number;
    vertretungen: number;
  };
}

export interface GemeinsamerVorgang {
  /** z. B. 'familie-vorgang-kindergeld'. */
  id: string;
  thema: 'kindergeld' | 'krankenkasse' | 'kita' | string;
  titel_i18n_key: string;
  /** aus behoerden.json (Familienkasse, Krankenkasse, …). */
  behoerde_id?: string;
  betroffene_member_ids: string[];
  /** → StatusBadge variant. */
  status: 'laufend' | 'genehmigt' | 'warten' | 'abgeschlossen' | string;
  /** [MOCK] Aktenzeichen falls vorhanden. */
  aktenzeichen?: string;
}

export type NachweisTyp =
  | 'geburtsurkunde'
  | 'sorge_vollmacht'
  | 'vertretungsrechte'
  | 'verknuepfungen';

export interface FamilieNachweis {
  typ: NachweisTyp;
  titel_i18n_key: string;
  status: 'vorhanden' | 'verifiziert' | 'speculative' | 'fehlt' | string;
  /** true = 2027-Vision (Sorge-Vollmacht, Vertretungsrechte) → speculative-Marker. */
  speculative?: boolean;
}

export interface HaushaltView {
  persona_id: string;
  mitglieder: HaushaltMitglied[];
  gemeinsame_vorgaenge: GemeinsamerVorgang[];
  nachweise: FamilieNachweis[];
  /** true = Vertretungs-/Vollmacht-Funktionen sind 2027-Vision. */
  vertretung_speculative: boolean;
}
