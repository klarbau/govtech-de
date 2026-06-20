/**
 * Datenschutz-Cockpit — privacy-by-design Surface.
 * Spec: `docs/specs/redesign-datenschutz.md` § 6.
 *
 * Die Einwilligungs-Toggles sind funktional + persistiert (echter
 * localStorage-Write-Pfad); jede Mutation emittiert einen
 * `UebermittlungsLogEntry` in den BESTEHENDEN `uebermittlungs-log`-Bucket
 * (kein paralleler Log). Datenquellen sind read-only abgeleitet.
 */
export type EinwilligungEmpfaenger =
  | 'krankenkasse'
  | 'arbeitgeber'
  | 'familienkasse'
  | 'private';

export interface DatenschutzEinwilligung {
  empfaenger: EinwilligungEmpfaenger;
  /** true = erteilt (Ein), false = nicht erteilt (Aus). */
  erteilt: boolean;
  /** Rechtsgrundlage der Verarbeitung bei Einwilligung, z. B. 'Art. 6 Abs. 1 lit. a DSGVO'. */
  rechtsgrundlage: string;
  /** ISO-8601 letzter Änderungszeitpunkt. */
  geaendert_am?: string;
}

export type DatenZugriffsart =
  | 'automatisch_synchronisiert'
  | 'einwilligungsbasiert';

export interface DatenquellenEintrag {
  /** aus behoerden.json (BehoerdenBadge farb-frei). */
  behoerde_id: string;
  /** → Badge (Text-Label, keine reine Farbe). */
  zugriffsart: DatenZugriffsart;
  /** Rechtsgrundlage des Zugriffs (z. B. '§ 36 BMG', 'Art. 6 Abs. 1 lit. a DSGVO'). */
  rechtsgrundlage: string;
  /** ISO-8601 oder 'aktuell'-Marker → UI rendert "aktuell" / Datum. */
  aktualitaet: string;
}

export interface DatenschutzCockpit {
  persona_id: string;
  /** genau 4: krankenkasse/arbeitgeber/familienkasse/private. */
  einwilligungen: DatenschutzEinwilligung[];
  datenquellen: DatenquellenEintrag[];
}
