import type { BehoerdeId } from './behoerde';

export type TerminStatus = 'gebucht' | 'bestaetigt' | 'abgesagt';
export type TerminOrtTyp = 'praesenz' | 'video' | 'telefon';

export interface TerminOrt {
  typ: TerminOrtTyp;
  /** Adresse oder Video-Link / Telefonnummer (Klartext für UI). */
  details: string;
}

export interface Termin {
  id: string;
  behoerde_id: BehoerdeId;
  vorgang_id?: string;
  /** ISO-Timestamp inkl. Uhrzeit. */
  datum: string;
  ort: TerminOrt;
  status: TerminStatus;
  /** Anzeige-Titel ('Adressaktualisierung Aufenthaltstitel', 'Anmeldung neuer Wohnort'). */
  betreff: string;
}
