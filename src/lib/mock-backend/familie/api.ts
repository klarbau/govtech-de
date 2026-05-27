/**
 * Familie Mock-Backend-API (`redesign-familie.md` § 6).
 *
 * `getFamilie(personaId)` baut den „Mein Haushalt"-View read-only aus der
 * bestehenden Persona auf (`familie.partner` → Mitglied; `familie.kinder[]` →
 * Mitglieder; Anker = Hauptperson). Gemeinsame Vorgänge + Nachweise werden
 * deterministisch aus Persona-Flags abgeleitet.
 *
 * Read-only: KEINE Mutation, KEIN Activity-Log-Eintrag (konsistent mit
 * Stammdaten-Lese-Architektur). Läuft durch `withLatency()`.
 */
import type {
  FamilieNachweis,
  GemeinsamerVorgang,
  HaushaltMitglied,
  HaushaltRolle,
  HaushaltView,
  Persona,
  PersonaId,
} from '@/types';
import { MockBackendError } from '../errors';
import { withLatency } from '../latency';
import { readOrInit, type CollectionKey } from '../persistence';
import { personasArraySchema } from '../schemas';

function loadPersonaById(personaId: PersonaId): Persona {
  const personas = readOrInit<Persona[]>(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    [] as Persona[],
  );
  const persona = personas.find((p) => p.id === personaId);
  if (!persona) {
    throw new MockBackendError(`Persona "${personaId}" nicht gefunden.`, {
      code: 'PERSONA_NOT_FOUND',
      retryable: false,
    });
  }
  return persona;
}

/** Hauptperson-Rolle aus `geschlecht`. */
function ankerRolle(persona: Persona): HaushaltRolle {
  if (persona.geschlecht === 'w') return 'mutter';
  if (persona.geschlecht === 'm') return 'vater';
  return 'hauptperson';
}

/** Partner-Rolle: für die Demo neutral `partner`. */
function partnerRolle(): HaushaltRolle {
  return 'partner';
}

const ANKER_ALTER_KIND_GRENZE_JAHRE = 7;

function alterInJahren(geburtsdatum: string, now: Date): number {
  const geb = new Date(geburtsdatum);
  if (Number.isNaN(geb.getTime())) return 99;
  let alter = now.getUTCFullYear() - geb.getUTCFullYear();
  const m = now.getUTCMonth() - geb.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < geb.getUTCDate())) alter -= 1;
  return alter;
}

function buildHaushaltView(persona: Persona, now: Date): HaushaltView {
  const ankerId = persona.id;
  const partner = persona.familie?.partner;
  const kinder = persona.familie?.kinder ?? [];

  // -------------------------------------------------------------------------
  // Gemeinsame Vorgänge (deterministisch aus Persona-Flags).
  // -------------------------------------------------------------------------
  const gemeinsame_vorgaenge: GemeinsamerVorgang[] = [];

  // Kindergeld: kindergeld_bezug && Kinder vorhanden.
  if (persona.kindergeld_bezug && kinder.length > 0) {
    gemeinsame_vorgaenge.push({
      id: 'familie-vorgang-kindergeld',
      thema: 'kindergeld',
      titel_i18n_key: 'familie.vorgaenge.kindergeld',
      behoerde_id: 'familienkasse-berlin-brandenburg',
      // Betrifft Anker + alle Kinder (gemeinschaftlicher Bezug).
      betroffene_member_ids: [ankerId, ...kinder.map((k) => k.id)],
      status: 'laufend',
      // Kein Aktenzeichen im Seed → niemals erfinden (Spec § 9 Edge case).
    });
  }

  // Krankenversicherung: Anker + familienversicherte Kinder.
  if (persona.krankenversicherung) {
    const mitversicherte = kinder.filter(
      (k) => k.familienversichert_ueber === ankerId,
    );
    gemeinsame_vorgaenge.push({
      id: 'familie-vorgang-krankenkasse',
      thema: 'krankenkasse',
      titel_i18n_key: 'familie.vorgaenge.krankenkasse',
      behoerde_id:
        persona.krankenversicherung.traeger === 'AOK Nordost'
          ? 'aok-nordost'
          : undefined,
      betroffene_member_ids: [ankerId, ...mitversicherte.map((k) => k.id)],
      status: 'genehmigt',
    });
  }

  // Kita: mind. ein Kind < 7 Jahre.
  const kitaKinder = kinder.filter(
    (k) => alterInJahren(k.geburtsdatum, now) < ANKER_ALTER_KIND_GRENZE_JAHRE,
  );
  if (kitaKinder.length > 0) {
    gemeinsame_vorgaenge.push({
      id: 'familie-vorgang-kita',
      thema: 'kita',
      titel_i18n_key: 'familie.vorgaenge.kita',
      // Kita-Träger ist kein behoerde_id (Spec § 6) → Label-only.
      betroffene_member_ids: [ankerId, ...kitaKinder.map((k) => k.id)],
      status: 'warten',
    });
  }

  // -------------------------------------------------------------------------
  // Nachweise (feste 4 Einträge).
  // -------------------------------------------------------------------------
  const nachweise: FamilieNachweis[] = [
    {
      typ: 'geburtsurkunde',
      titel_i18n_key: 'familie.nachweise.geburtsurkunde',
      status: 'verifiziert',
    },
    {
      typ: 'sorge_vollmacht',
      titel_i18n_key: 'familie.nachweise.sorge_vollmacht',
      status: 'speculative',
      speculative: true,
    },
    {
      typ: 'vertretungsrechte',
      titel_i18n_key: 'familie.nachweise.vertretungsrechte',
      status: 'speculative',
      speculative: true,
    },
    {
      typ: 'verknuepfungen',
      titel_i18n_key: 'familie.nachweise.verknuepfungen',
      status: 'vorhanden',
    },
  ];

  // -------------------------------------------------------------------------
  // Mitglieder + per-Person-Counts.
  // -------------------------------------------------------------------------
  const nachweiseBetreffenAlle = nachweise.length; // alle Nachweise haushaltsweit

  function countsFor(memberId: string, istEltern: boolean) {
    const vorgaenge = gemeinsame_vorgaenge.filter((v) =>
      v.betroffene_member_ids.includes(memberId),
    ).length;
    return {
      vorgaenge,
      // Dokumente: Persona-Dokument-Refs sind im Seed nicht pro Mitglied
      // verknüpft → 0 (Spec § 6 „sonst 0").
      dokumente: 0,
      nachweise: nachweiseBetreffenAlle,
      // Vertretungen: speculative — 1 für Eltern, 0 für Kinder.
      vertretungen: istEltern ? 1 : 0,
    };
  }

  const mitglieder: HaushaltMitglied[] = [];

  mitglieder.push({
    persona_ref_id: ankerId,
    vorname: persona.vorname,
    nachname: persona.nachname,
    geburtsdatum: persona.geburtsdatum,
    rolle: ankerRolle(persona),
    ist_hauptperson: true,
    counts: countsFor(ankerId, true),
  });

  if (partner) {
    mitglieder.push({
      persona_ref_id: partner.id,
      vorname: partner.vorname,
      nachname: partner.nachname,
      geburtsdatum: partner.geburtsdatum,
      rolle: partnerRolle(),
      ist_hauptperson: false,
      counts: countsFor(partner.id, true),
    });
  }

  for (const k of kinder) {
    mitglieder.push({
      persona_ref_id: k.id,
      vorname: k.vorname,
      nachname: k.nachname,
      geburtsdatum: k.geburtsdatum,
      rolle: 'kind',
      ist_hauptperson: false,
      counts: countsFor(k.id, false),
    });
  }

  return {
    persona_id: ankerId,
    mitglieder,
    gemeinsame_vorgaenge,
    nachweise,
    vertretung_speculative: true,
  };
}

export interface FamilieApi {
  getFamilie(personaId: PersonaId): Promise<HaushaltView>;
}

export const familieApi: FamilieApi = {
  getFamilie: (personaId: PersonaId) =>
    withLatency<HaushaltView>(() => {
      const persona = loadPersonaById(personaId);
      return buildHaushaltView(persona, new Date());
    }),
};
