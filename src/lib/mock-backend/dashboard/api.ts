/**
 * Dashboard Mock-Backend-API (`dashboard.md` § 5.1 + `redesign-dashboard.md`).
 *
 * Abgeleitetes Read-Model über Letter / Vorgang / Termin / Stammdaten /
 * Persona / behoerden. `getDashboard()` aggregiert; `setLastSeen()` persistiert
 * den deviceLocal-Timestamp; `getDsc()` aggregiert das App-Activity-Log;
 * `getCandidatesForTopActions()` liefert strukturierte AI-Eingaben (KEINE
 * Brief-Bodies); `getLebenslagenHinweise()` liefert proaktive Hinweise.
 *
 * `prioritizeTopActions()` ist AI-seitig (assistant-engineer) — hier nur als
 * typisierter, deterministischer Fallback-Stub vorhanden (Frist-Sortierung).
 *
 * Latenz: `getDashboard` 600–900 ms (Aggregation; verifier-akzeptiert);
 * übrige Reads Standard 300–800 ms.
 */
import type {
  Behoerde,
  DashboardSnapshot,
  DashboardSortMode,
  DscSnapshot,
  LebenslagenHinweis,
  Letter,
  Persona,
  PersonaId,
  PrioritizedTopAction,
  Termin,
  TopActionCandidateInput,
  TopActionItem,
  TopActionReasonToken,
  UebermittlungsLogEntry,
  Vorgang,
} from '@/types';
import { MockBackendError } from '../errors';
import { withLatency } from '../latency';
import { readOrInit, write, type CollectionKey } from '../persistence';
import {
  behoerdenArraySchema,
  dashboardLastSeenBucketSchema,
  dashboardSortModeBucketSchema,
  lettersArraySchema,
  personasArraySchema,
  termineArraySchema,
  vorgaengeArraySchema,
  stammdatenUebermittlungsLogBucketSchema,
} from '../schemas';

const EXTERNAL_DSC_URL = 'https://www.bva.bund.de/datenschutzcockpit';

// ---------------------------------------------------------------------------
// Bucket-Loader
// ---------------------------------------------------------------------------

function loadPersonas(): Persona[] {
  return readOrInit<Persona[]>(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    [] as Persona[],
  );
}

function loadPersonaById(personaId: PersonaId): Persona {
  const persona = loadPersonas().find((p) => p.id === personaId);
  if (!persona) {
    throw new MockBackendError(`Persona "${personaId}" nicht gefunden.`, {
      code: 'PERSONA_NOT_FOUND',
      retryable: false,
    });
  }
  return persona;
}

function loadLetters(): Letter[] {
  return readOrInit<Letter[]>(
    'letters' as CollectionKey,
    lettersArraySchema as unknown as import('zod').ZodType<Letter[]>,
    [] as Letter[],
  );
}

function loadVorgaenge(): Vorgang[] {
  return readOrInit<Vorgang[]>(
    'vorgaenge' as CollectionKey,
    vorgaengeArraySchema as unknown as import('zod').ZodType<Vorgang[]>,
    [] as Vorgang[],
  );
}

function loadTermine(): Termin[] {
  return readOrInit<Termin[]>(
    'termine' as CollectionKey,
    termineArraySchema as unknown as import('zod').ZodType<Termin[]>,
    [] as Termin[],
  );
}

function loadBehoerden(): Behoerde[] {
  return readOrInit<Behoerde[]>(
    'behoerden' as CollectionKey,
    behoerdenArraySchema as unknown as import('zod').ZodType<Behoerde[]>,
    [] as Behoerde[],
  );
}

function loadActivityLogFor(personaId: PersonaId): UebermittlungsLogEntry[] {
  const bucket = readOrInit(
    'stammdaten:uebermittlungs-log' as CollectionKey,
    stammdatenUebermittlungsLogBucketSchema,
    {} as Record<PersonaId, UebermittlungsLogEntry[]>,
  );
  return bucket[personaId] ?? [];
}

type LastSeenBucket = Record<PersonaId, string>;
type SortModeBucket = Record<PersonaId, DashboardSortMode>;

/**
 * Geseedete prior-login-Timestamps pro Persona (deviceLocal). Damit der
 * „Seit Ihrem letzten Login"-Diff auf dem allerersten Load sofort
 * aussagekräftig ist (dashboard.md § 5.5 Demo-Werte), statt einen Erst-Login
 * (`!last_seen_at`) zu zeigen.
 *
 * Anna: bewusst auf den 06.05.2026 gesetzt — damit der Diff genau die zwei
 * jüngsten ungelesenen Briefe (Eheschließungs-Termin + Renteninformation, beide
 * 08.05.2026) als „neue Briefe" zählt und so die Prototyp-Zahl „2 neue Briefe"
 * trifft (dashboard.md § 5.5.1 nannte 2026-04-17, aber seit jenem Spec-Stand
 * kamen weitere ungelesene Briefe hinzu — dieser Anker hält die 2 stabil und
 * clock-unabhängig, weil `neue_briefe` rein `empfangen_am`-getrieben ist).
 * Schmidt/Mehmet: § 5.5.2/§ 5.5.3 Demo-Anker.
 *
 * NICHT in `seed.ts` geschrieben, sondern lazy beim ersten `getLastSeen` /
 * `getDashboard`-Read in den Bucket gehoben — so bleibt der Wert deviceLocal
 * und überlebt einen Persona-Switch nicht ungewollt (Seed pro Read-Pfad).
 */
const SEEDED_PRIOR_LOGIN: Record<string, string> = {
  'anna-petrov': '2026-05-06T08:14:23.000Z',
  'markus-schmidt': '2026-05-19T07:41:00.000Z',
  'mehmet-yildiz': '2026-05-21T17:33:00.000Z',
};

function loadLastSeenBucket(): LastSeenBucket {
  return readOrInit(
    'dashboard:last-seen' as CollectionKey,
    dashboardLastSeenBucketSchema,
    {} as LastSeenBucket,
  );
}

function saveLastSeenBucket(bucket: LastSeenBucket): void {
  write('dashboard:last-seen' as CollectionKey, bucket);
}

/**
 * Liest den persistierten last-seen-Timestamp einer Persona. Existiert noch
 * keiner (Erst-Load), wird der geseedete prior-login-Anker (falls vorhanden)
 * einmalig in den Bucket geschrieben und zurückgegeben — so ist der Diff schon
 * beim ersten Render aussagekräftig. Personas ohne Seed → `null` (echter
 * Erst-Login-Zustand).
 */
function resolveLastSeen(personaId: PersonaId): string | null {
  const bucket = loadLastSeenBucket();
  const existing = bucket[personaId];
  if (existing !== undefined) return existing;
  const seeded = SEEDED_PRIOR_LOGIN[personaId];
  if (seeded === undefined) return null;
  bucket[personaId] = seeded;
  saveLastSeenBucket(bucket);
  return seeded;
}

function loadSortModeBucket(): SortModeBucket {
  return readOrInit(
    'dashboard:sort-mode' as CollectionKey,
    dashboardSortModeBucketSchema,
    {} as SortModeBucket,
  );
}

function saveSortModeBucket(bucket: SortModeBucket): void {
  write('dashboard:sort-mode' as CollectionKey, bucket);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function behoerdeName(behoerden: Behoerde[], id: string): string {
  return behoerden.find((b) => b.id === id)?.name_de ?? id;
}

function behoerdeKategorie(
  behoerden: Behoerde[],
  id: string,
): Behoerde['kategorie'] {
  return behoerden.find((b) => b.id === id)?.kategorie ?? 'kommune';
}

function isActiveVorgang(v: Vorgang): boolean {
  return v.status !== 'abgeschlossen' && v.status !== 'abgelehnt';
}

function anrede(persona: Persona): 'frau' | 'herr' | 'neutral' {
  if (persona.geschlecht === 'w') return 'frau';
  if (persona.geschlecht === 'm') return 'herr';
  return 'neutral';
}

/** Tage-Differenz von now bis Datum (positiv = Zukunft). */
function tageBis(datumIso: string, now: Date): number {
  const d = new Date(datumIso).getTime();
  if (Number.isNaN(d)) return Number.POSITIVE_INFINITY;
  return Math.ceil((d - now.getTime()) / (24 * 60 * 60 * 1000));
}

interface FristCandidate {
  letter_id?: string;
  vorgang_id?: string;
  titel: string;
  aktenzeichen: string;
  behoerde_id: string;
  frist_datum: string;
  frist_typ: string;
  original_zitat: string;
}

/** Sammelt offene (zukünftige) Fristen aus Letters + aktiven Vorgängen. */
function collectFristen(
  letters: Letter[],
  vorgaenge: Vorgang[],
  now: Date,
): FristCandidate[] {
  const out: FristCandidate[] = [];

  for (const l of letters) {
    for (const f of l.fristen ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.datum)) continue;
      out.push({
        letter_id: l.id,
        vorgang_id: l.vorgang_id,
        titel: l.betreff,
        aktenzeichen: l.aktenzeichen,
        behoerde_id: l.absender_behoerde_id,
        frist_datum: f.datum,
        frist_typ: f.typ,
        original_zitat: f.original_zitat ?? '',
      });
    }
  }

  for (const v of vorgaenge) {
    if (!isActiveVorgang(v)) continue;
    for (const f of v.fristen ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.datum)) continue;
      out.push({
        vorgang_id: v.id,
        titel: v.titel,
        aktenzeichen: v.id,
        behoerde_id: v.beteiligte_behoerden_ids[0] ?? '',
        frist_datum: f.datum,
        frist_typ: f.typ,
        original_zitat: '',
      });
    }
  }

  // Sortiert nach Nähe (frühestes Datum oben); abgelaufene Fristen bleiben
  // sichtbar, rutschen aber ans Ende (höhere absolute Vergangenheit zuerst
  // raus). Wir sortieren rein nach Datum aufsteigend.
  void now;
  return out.sort((a, b) => a.frist_datum.localeCompare(b.frist_datum));
}

// ---------------------------------------------------------------------------
// Candidates für AI-Top-3 (NUR strukturierte Felder — Hard-Line § 11.44)
// ---------------------------------------------------------------------------

function buildCandidates(
  personaId: PersonaId,
  letters: Letter[],
  vorgaenge: Vorgang[],
  termine: Termin[],
  behoerden: Behoerde[],
  now: Date,
): TopActionCandidateInput[] {
  const candidates: TopActionCandidateInput[] = [];
  const terminByVorgang = new Map<string, Termin>();
  for (const t of termine) {
    if (t.vorgang_id && t.status !== 'abgesagt') {
      terminByVorgang.set(t.vorgang_id, t);
    }
  }

  // Letter-Kandidaten: ungelesen ODER mit offener Frist.
  for (const l of letters) {
    const naechsteFrist = (l.fristen ?? [])
      .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f.datum))
      .sort((a, b) => a.datum.localeCompare(b.datum))[0];
    const istKandidat = l.status === 'ungelesen' || naechsteFrist !== undefined;
    if (!istKandidat) continue;
    candidates.push({
      id: `cand-letter-${l.id}`,
      source_typ: 'letter',
      source_id: l.id,
      titel: l.betreff,
      behoerde_id: l.absender_behoerde_id,
      absender_kategorie: behoerdeKategorie(behoerden, l.absender_behoerde_id),
      absender_name: behoerdeName(behoerden, l.absender_behoerde_id),
      aktenzeichen: l.aktenzeichen,
      frist_datum: naechsteFrist?.datum,
      frist_typ: naechsteFrist?.typ,
      behoerden_kategorie: behoerdeKategorie(
        behoerden,
        l.absender_behoerde_id,
      ),
      termin_steht: l.vorgang_id
        ? terminByVorgang.has(l.vorgang_id)
        : false,
      target_route: `/posteingang/${l.id}`,
    });
  }

  // Vorgangs-Kandidaten: aktive Vorgänge mit offener Frist.
  for (const v of vorgaenge) {
    if (!isActiveVorgang(v)) continue;
    const naechsteFrist = (v.fristen ?? [])
      .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f.datum))
      .sort((a, b) => a.datum.localeCompare(b.datum))[0];
    if (!naechsteFrist) continue;
    const behId = v.beteiligte_behoerden_ids[0] ?? '';
    candidates.push({
      id: `cand-vorgang-${v.id}`,
      source_typ: 'vorgang',
      source_id: v.id,
      titel: v.titel,
      behoerde_id: behId,
      absender_kategorie: behoerdeKategorie(behoerden, behId),
      absender_name: behoerdeName(behoerden, behId),
      aktenzeichen: v.id,
      frist_datum: naechsteFrist.datum,
      frist_typ: naechsteFrist.typ as TopActionCandidateInput['frist_typ'],
      vorgangs_status: v.status,
      behoerden_kategorie: behoerdeKategorie(behoerden, behId),
      termin_steht: terminByVorgang.has(v.id),
      folgevorgang_von: (v.context?.seed_letter_id ?? undefined) as
        | string
        | undefined,
      target_route: `/vorgaenge/${v.id}`,
    });
  }

  void personaId;
  void now;
  return candidates;
}

// ---------------------------------------------------------------------------
// Deterministischer Fallback-Ranking (Hard-Line § 11.44)
// ---------------------------------------------------------------------------

/**
 * Deterministische Frist-Sortierung als Fallback, wenn die AI-Pipeline nicht
 * läuft (Server-Side-Render, Schema-Fehler, Timeout). Frühestes Frist-Datum
 * oben; Reason-Token `frist_naehe` für alle.
 */
function deterministicRank(
  candidates: TopActionCandidateInput[],
): PrioritizedTopAction[] {
  const withFrist = candidates.filter((c) => c.frist_datum);
  const ohneFrist = candidates.filter((c) => !c.frist_datum);
  const sorted = [
    ...withFrist.sort((a, b) =>
      (a.frist_datum ?? '').localeCompare(b.frist_datum ?? ''),
    ),
    ...ohneFrist,
  ];
  return sorted.slice(0, 3).map((c, i) => ({
    id: c.id,
    rank: (i + 1) as 1 | 2 | 3,
    reason_token: c.termin_steht
      ? ('termin_steht' as TopActionReasonToken)
      : c.folgevorgang_von
        ? ('folgevorgang' as TopActionReasonToken)
        : ('frist_naehe' as TopActionReasonToken),
  }));
}

/** Hydriert ein Ranking-Ergebnis zu vollständigen TopActionItems. */
function hydrateTopActions(
  candidates: TopActionCandidateInput[],
  ranking: PrioritizedTopAction[],
): TopActionItem[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const items: TopActionItem[] = [];
  for (const r of ranking) {
    const c = byId.get(r.id);
    if (!c) continue;
    items.push({
      id: c.id,
      source_typ: c.source_typ,
      source_id: c.source_id,
      titel: c.titel,
      behoerde_id: c.behoerde_id,
      aktenzeichen: c.aktenzeichen,
      frist_datum: c.frist_datum,
      frist_typ: c.frist_typ,
      reason_token: r.reason_token,
      reason_context: c.folgevorgang_von,
      rank: r.rank,
      target_route: c.target_route,
    });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

// ---------------------------------------------------------------------------
// DSC-Snapshot (App-Activity-Aggregat letzte 30 Tage)
// ---------------------------------------------------------------------------

function buildDsc(personaId: PersonaId, now: Date): DscSnapshot {
  const log = loadActivityLogFor(personaId);
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });

  const briefe_geoeffnet = recent.filter(
    (e) => e.field_id === 'letter' || /brief|posteingang/.test(e.zweck_i18n_key),
  ).length;
  const ki_zusammenfassungen_erstellt = recent.filter((e) =>
    /summary|zusammenfassung|ki/.test(e.zweck_i18n_key),
  ).length;
  const ai_uebermittlungen = recent.filter((e) =>
    /anthropic|ki|summary/.test(`${e.zweck_i18n_key}${e.note ?? ''}`),
  ).length;
  const stammdaten_aktivitaeten = recent.filter(
    (e) => e.kategorie === 'app_aktivitaet',
  ).length;

  return {
    app_activity: {
      briefe_geoeffnet,
      ki_zusammenfassungen_erstellt,
      ai_uebermittlungen,
      stammdaten_aktivitaeten,
      zeitraum_tage: 30,
    },
    speculative_aggregate: {
      datenabfragen_30d: recent.length,
      is_speculative: true,
      external_dsc_url: EXTERNAL_DSC_URL,
    },
    external_dsc_url: EXTERNAL_DSC_URL,
  };
}

// ---------------------------------------------------------------------------
// Lebenslagen-Hinweise (whitelist-getrieben, persona-spezifisch)
// ---------------------------------------------------------------------------

function buildLebenslagenHinweise(persona: Persona): LebenslagenHinweis[] {
  const out: LebenslagenHinweis[] = [];
  // Steuer-Vorausfüllung (immer relevant für Angestellte mit Steuer-ID).
  if (persona.steuer_id) {
    out.push({
      id: 'hinweis-steuer-vorausfuellen',
      text_i18n_key: 'dashboard.lebenslagen.steuer_vorausfuellen',
      target_route: '/steuer',
    });
  }
  // Aufenthaltstitel-Ablauf-Erinnerung (Drittstaatsangehörige).
  if (persona.aufenthaltstitel) {
    out.push({
      id: 'hinweis-aufenthaltstitel-ablauf',
      text_i18n_key: 'dashboard.lebenslagen.aufenthaltstitel_ablauf',
      target_route: '/vorgaenge',
      trigger_condition_label: persona.aufenthaltstitel.valid_until,
    });
  }
  return out.slice(0, 2);
}

// ---------------------------------------------------------------------------
// Snapshot-Builder
// ---------------------------------------------------------------------------

function buildDashboard(
  personaId: PersonaId,
  lastSeenAt: string | undefined,
  now: Date,
): DashboardSnapshot {
  const persona = loadPersonaById(personaId);
  const letters = loadLetters();
  const vorgaenge = loadVorgaenge();
  const termine = loadTermine();
  const behoerden = loadBehoerden();

  // Diff-Block.
  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : undefined;
  const neue_briefe =
    lastSeenMs === undefined
      ? letters.filter((l) => l.status === 'ungelesen').length
      : letters.filter(
          (l) =>
            l.status === 'ungelesen' &&
            new Date(l.empfangen_am).getTime() > lastSeenMs,
        ).length;
  // Fristen näher gerückt: offene Fristen, die innerhalb 30 Tagen liegen
  // (heuristisch — der „seit-Login"-Countdown-Vergleich ist deviceLocal-Sicht).
  const offeneFristen = collectFristen(letters, vorgaenge, now).filter(
    (f) => tageBis(f.frist_datum, now) >= 0 && tageBis(f.frist_datum, now) <= 30,
  );
  const fristen_naeher_gerueckt = lastSeenMs === undefined ? 0 : offeneFristen.length;
  const vorgaenge_abgeschlossen =
    lastSeenMs === undefined
      ? 0
      : vorgaenge.filter(
          (v) =>
            v.status === 'abgeschlossen' &&
            v.abgeschlossen_am !== undefined &&
            new Date(v.abgeschlossen_am).getTime() > lastSeenMs,
        ).length;
  const total_changes =
    neue_briefe + fristen_naeher_gerueckt + vorgaenge_abgeschlossen;

  // Top-Actions (deterministischer Fallback; AI rerankt im Frontend via
  // prioritizeTopActions).
  const candidates = buildCandidates(
    personaId,
    letters,
    vorgaenge,
    termine,
    behoerden,
    now,
  );
  const ranking = deterministicRank(candidates);
  const top_actions = hydrateTopActions(candidates, ranking);

  // Frist-Tile (Top-3 offene Fristen).
  const frist_tile = collectFristen(letters, vorgaenge, now)
    .filter((f) => tageBis(f.frist_datum, now) >= -365)
    .slice(0, 3)
    .map((f) => ({
      letter_id: f.letter_id,
      vorgang_id: f.vorgang_id,
      titel: f.titel,
      aktenzeichen: f.aktenzeichen,
      behoerde_id: f.behoerde_id,
      frist_datum: f.frist_datum,
      frist_typ: f.frist_typ as DashboardSnapshot['frist_tile'][number]['frist_typ'],
      original_zitat: f.original_zitat,
    }));

  // Posteingang-Tile.
  const ungelesen = letters.filter((l) => l.status === 'ungelesen').length;
  const letzterBrief = [...letters].sort((a, b) =>
    b.empfangen_am.localeCompare(a.empfangen_am),
  )[0];
  const posteingang_tile = {
    ungelesen,
    gesamt: letters.length,
    letzter_brief: letzterBrief
      ? {
          absender_behoerde_id: letzterBrief.absender_behoerde_id,
          eingang_datum: letzterBrief.empfangen_am,
          betreff_pre_open_snippet:
            letzterBrief.ai_summary?.pre_open?.text ??
            letzterBrief.betreff.slice(0, 120),
        }
      : undefined,
  };

  // Vorgangs-Stand-Tile (Top-3 laufende Vorgänge).
  const vorgangs_stand_tile = vorgaenge
    .filter(isActiveVorgang)
    .map((v) => {
      const bewegungen = [
        v.angelegt_am,
        ...v.schritte.flatMap((s) =>
          [s.started_at, s.completed_at].filter(
            (x): x is string => typeof x === 'string',
          ),
        ),
      ].sort((a, b) => b.localeCompare(a));
      const letzteBewegung = bewegungen[0] ?? v.angelegt_am;
      return {
        vorgang_id: v.id,
        titel: v.titel,
        status: v.status,
        beteiligte_anzahl: v.beteiligte_behoerden_ids.length,
        letzte_bewegung_iso: letzteBewegung,
        letzte_bewegung_label: letzteBewegung,
      };
    })
    .sort((a, b) => b.letzte_bewegung_iso.localeCompare(a.letzte_bewegung_iso))
    .slice(0, 3);

  // Termin-Tile (nächster zukünftiger, nicht-abgesagter Termin).
  const naechsterTermin = [...termine]
    .filter(
      (t) => t.status !== 'abgesagt' && new Date(t.datum).getTime() >= now.getTime(),
    )
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];
  const termin_tile = naechsterTermin
    ? {
        termin_id: naechsterTermin.id,
        behoerde_id: naechsterTermin.behoerde_id,
        datum_iso: naechsterTermin.datum,
        ort_typ: naechsterTermin.ort.typ,
        ort_details: naechsterTermin.ort.details,
        betreff: naechsterTermin.betreff,
      }
    : undefined;

  // Stammdaten-Tile.
  const a = persona.adresse;
  const anschrift_aktuell_einzeiler = `${a.strasse} ${a.hausnummer}, ${a.plz} ${a.ort}`;
  const log = loadActivityLogFor(personaId);
  const letzteBestaetigung = [...log]
    .filter(
      (e) =>
        e.kategorie === 'app_aktivitaet' && e.field_id === 'anschrift_aktuell',
    )
    .sort((x, y) => y.timestamp.localeCompare(x.timestamp))[0];

  // Vorgänge-im-Jahr (Achievement).
  const jahr = now.getUTCFullYear();
  const vorgaenge_abgeschlossen_jahr = vorgaenge.filter(
    (v) =>
      v.status === 'abgeschlossen' &&
      v.abgeschlossen_am !== undefined &&
      new Date(v.abgeschlossen_am).getUTCFullYear() === jahr,
  ).length;

  return {
    persona_id: personaId,
    last_login_at: lastSeenAt,
    greeting: {
      vorname: persona.vorname,
      nachname: persona.nachname,
      geschlecht_anrede: anrede(persona),
    },
    diff_block: {
      last_seen_at: lastSeenAt,
      neue_briefe,
      fristen_naeher_gerueckt,
      vorgaenge_abgeschlossen,
      total_changes,
    },
    top_actions,
    frist_tile,
    posteingang_tile,
    vorgangs_stand_tile,
    termin_tile,
    dsc_tile: buildDsc(personaId, now),
    stammdaten_tile: {
      anschrift_aktuell_einzeiler,
      letzte_bestaetigung_durch_buerger: letzteBestaetigung?.timestamp,
    },
    lebenslagen_hinweise: buildLebenslagenHinweise(persona),
    vorgaenge_abgeschlossen_jahr,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DashboardApi {
  getDashboard(
    personaId: PersonaId,
    opts?: { last_seen_at?: string },
  ): Promise<DashboardSnapshot>;
  setLastSeen(personaId: PersonaId, timestamp: string): Promise<void>;
  /**
   * Liest den persistierten deviceLocal last-seen-Timestamp einer Persona
   * (`dashboard:last-seen`-Bucket). Liefert `null`, wenn weder ein gespeicherter
   * noch ein geseedeter prior-login existiert (echter Erst-Login). Beim ersten
   * Aufruf wird ein geseedeter prior-login-Anker (falls vorhanden) idempotent in
   * den Bucket gehoben, damit der „Seit letztem Login"-Diff sofort greift.
   */
  getLastSeen(personaId: PersonaId): Promise<string | null>;
  /** Liest den persistierten Sort-Mode (`dashboard:sort-mode`-Bucket). Default `'ki'`. */
  getDashboardSortMode(personaId: PersonaId): Promise<DashboardSortMode>;
  /** Persistiert den Sort-Mode der „Heute zu tun"-Liste. */
  setDashboardSortMode(
    personaId: PersonaId,
    mode: DashboardSortMode,
  ): Promise<void>;
  getDsc(personaId: PersonaId): Promise<DscSnapshot>;
  getCandidatesForTopActions(
    personaId: PersonaId,
  ): Promise<TopActionCandidateInput[]>;
  getLebenslagenHinweise(personaId: PersonaId): Promise<LebenslagenHinweis[]>;
  /**
   * AI-seitig (assistant-engineer): rankt Kandidaten via Anthropic-Tool-Use.
   * Hier nur deterministischer Fallback-Stub (Frist-Sortierung). Läuft NICHT
   * durch `withLatency()` (echte API-Roundtrip ist Latenz genug).
   */
  prioritizeTopActions(
    candidates: TopActionCandidateInput[],
  ): Promise<PrioritizedTopAction[]>;
}

export const dashboardApi: DashboardApi = {
  getDashboard: (personaId, opts) =>
    withLatency<DashboardSnapshot>(
      () => {
        // Wird `last_seen_at` nicht explizit übergeben, nutzt der Snapshot den
        // persistierten/geseedeten prior-login aus dem `dashboard:last-seen`-
        // Bucket (statt Erst-Login). Das hält den Diff aussagekräftig, ohne dass
        // das Frontend einen Anker raten muss. `setLastSeen(now)` schreibt das
        // Frontend ERST NACH dem Render (nicht hier) — der Diff wird also nicht
        // beim ersten View genullt.
        const lastSeen =
          opts?.last_seen_at ?? resolveLastSeen(personaId) ?? undefined;
        return buildDashboard(personaId, lastSeen, new Date());
      },
      { min: 600, max: 900 },
    ),

  setLastSeen: (personaId, timestamp) =>
    withLatency<void>(
      () => {
        const bucket = loadLastSeenBucket();
        bucket[personaId] = timestamp;
        saveLastSeenBucket(bucket);
      },
      { min: 100, max: 250 },
    ),

  getLastSeen: (personaId) =>
    withLatency<string | null>(() => resolveLastSeen(personaId), {
      min: 100,
      max: 250,
    }),

  getDashboardSortMode: (personaId) =>
    withLatency<DashboardSortMode>(
      () => loadSortModeBucket()[personaId] ?? 'ki',
      { min: 100, max: 250 },
    ),

  setDashboardSortMode: (personaId, mode) =>
    withLatency<void>(
      () => {
        const bucket = loadSortModeBucket();
        bucket[personaId] = mode;
        saveSortModeBucket(bucket);
      },
      { min: 100, max: 250 },
    ),

  getDsc: (personaId) =>
    withLatency<DscSnapshot>(() => buildDsc(personaId, new Date())),

  getCandidatesForTopActions: (personaId) =>
    withLatency<TopActionCandidateInput[]>(() =>
      buildCandidates(
        personaId,
        loadLetters(),
        loadVorgaenge(),
        loadTermine(),
        loadBehoerden(),
        new Date(),
      ),
    ),

  getLebenslagenHinweise: (personaId) =>
    withLatency<LebenslagenHinweis[]>(() =>
      buildLebenslagenHinweise(loadPersonaById(personaId)),
    ),

  // AI-seitiger Stub (assistant-engineer ersetzt die Implementierung durch
  // den echten `prioritize_top_actions`-Tool-Use-Call). Bis dahin liefert er
  // den deterministischen Frist-Fallback (Hard-Line § 11.44).
  prioritizeTopActions: (candidates) =>
    Promise.resolve(deterministicRank(candidates)),
};
