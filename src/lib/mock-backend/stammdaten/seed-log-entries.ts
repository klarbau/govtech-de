/**
 * Initial-Aktivitätsprotokoll-Log pro Persona (Spec § 5.5). Diese Einträge
 * werden beim ersten App-Boot in `govtech-de:v1:stammdaten:uebermittlungs-log`
 * geseedt; danach kommen Live-Einträge dazu (z. B. aus Umzug-Cascade-Schritten,
 * Religion-Consent, Sperren-Toggle, IBAN-Push).
 *
 * Hard-Lines:
 *   - § 11.6 `note`-Format `<key>:<value>;`-Marker, Semicolon-getrennt;
 *     kein PII-Klartext.
 *   - § 11.7 Norm-Kürzel (`§ … BMG`) wandern später durch `<NormZitatSpan>`-
 *     Lookup-Map (Frontend); der Backend persistiert die Roh-Strings.
 *   - § 11.8 Aktenzeichen-/Identifier-Werte tragen `[MOCK]`-Watermark.
 *   - Mock-Realismus: alle Behörden-IDs existieren in `behoerden.json`;
 *     PLZ + Aktenzeichen-Formate passen zum Domain-Doc.
 *
 * Persona-Coverage:
 *   - Anna Petrov (Berlin, post-Umzug-Cascade): 7 Einträge (6 Anschrift-
 *     Übermittlungen + 1 KVNR-DEÜV-Push).
 *   - Familie Schmidt (Hamburg-Persona; Domain-Doc nennt München, Persona-
 *     Snapshot bleibt Hamburg konform Persona-Bestand): 5 Einträge inkl.
 *     historischer Eheschließung-Cascade.
 *   - Mehmet Yıldız (Köln): 5 Einträge inkl. ABH-eAT-Adressänderung
 *     (manuell, KEIN automatischer § 36-Push) + AZR-Selbstauskunft-Note.
 */
import type {
  PersonaId,
  StammdatenSektionId,
  UebermittlungsLogEntry,
} from '@/types';

/** Hilfs-Funktion: ISO-Timestamp X Minuten in der Vergangenheit. */
function isoMinutesAgo(minutes: number, base: Date = new Date()): string {
  const t = base.getTime() - minutes * 60_000;
  return new Date(t).toISOString();
}

/** Hilfs-Funktion: ISO-Timestamp X Tage in der Vergangenheit. */
function isoDaysAgo(days: number, base: Date = new Date()): string {
  return isoMinutesAgo(days * 24 * 60, base);
}

interface SeedEntryDraft {
  /** ISO-Timestamp. */
  timestamp: string;
  kategorie: UebermittlungsLogEntry['kategorie'];
  field_id?: string;
  sektion?: StammdatenSektionId;
  absender_behoerde_id?: string;
  empfaenger_id?: string;
  zweck_i18n_key: string;
  rechtsgrundlage: string;
  note?: string;
}

/**
 * Hilfs-Builder, der Roh-Drafts in `UebermittlungsLogEntry` mit
 * deterministischer ID umwandelt. ID-Format `seed-log-<persona>-<idx>` —
 * stabil für Tests und Snapshots.
 */
function buildEntries(
  personaId: PersonaId,
  drafts: SeedEntryDraft[],
): UebermittlungsLogEntry[] {
  return drafts.map((d, i) => ({
    id: `seed-log-${personaId}-${String(i + 1).padStart(3, '0')}`,
    timestamp: d.timestamp,
    kategorie: d.kategorie,
    field_id: d.field_id,
    sektion: d.sektion,
    absender_behoerde_id: d.absender_behoerde_id,
    empfaenger_id: d.empfaenger_id,
    zweck_i18n_key: d.zweck_i18n_key,
    rechtsgrundlage: d.rechtsgrundlage,
    note: d.note,
  }));
}

// ---------------------------------------------------------------------------
// Anna Petrov (Berlin, post-Umzug-Cascade)
// ---------------------------------------------------------------------------

const annaSeedTime = new Date(); // dynamic: relative to boot
const ANNA_ENTRIES: SeedEntryDraft[] = [
  // Hero-Card-Eintrag: vor 3 Min — Bürgeramt Friedrichshain-Kreuzberg →
  // Beitragsservice (Domain-Doc § Risikofelder, Loom-Cut Sek. 0–4).
  {
    timestamp: isoMinutesAgo(3, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-friedrichshain-kreuzberg',
    empfaenger_id: 'beitragsservice-koeln',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice',
    rechtsgrundlage: '§ 11 Abs. 4 RBStV i.V.m. § 36 BMG',
    note: 'persona_id:anna-petrov; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  {
    timestamp: isoMinutesAgo(4, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-friedrichshain-kreuzberg',
    empfaenger_id: 'finanzamt-koerperschaften-i-berlin',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 36 BMG i.V.m. § 139b AO',
    note: 'persona_id:anna-petrov; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  {
    timestamp: isoMinutesAgo(5, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-friedrichshain-kreuzberg',
    empfaenger_id: 'aok-nordost',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_gkv',
    rechtsgrundlage: '§ 28a SGB IV (DEÜV)',
    note: 'persona_id:anna-petrov; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  {
    timestamp: isoMinutesAgo(6, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-friedrichshain-kreuzberg',
    empfaenger_id: 'standesamt-berlin-mitte',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 36 BMG',
    note: 'persona_id:anna-petrov; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  {
    timestamp: isoMinutesAgo(7, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-friedrichshain-kreuzberg',
    empfaenger_id: 'bundesdruckerei',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 28 PAuswG',
    note: 'persona_id:anna-petrov; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  // Schließung der vorherigen Adresse beim Beitragsservice (Datenkranz-
  // Vollständigkeit; Loom-Cut Sek. 8–14).
  {
    timestamp: isoMinutesAgo(8, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschriften_historisch',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-mitte',
    empfaenger_id: 'beitragsservice-koeln',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice',
    rechtsgrundlage: '§ 36 BMG (Wegzugsmeldung)',
    note: 'persona_id:anna-petrov; field_id:anschriften_historisch; quelle:umzug_cascade; mock:true',
  },
  // KVNR-DEÜV-Push (Beschäftigungs-Daten-Adresse via Arbeitgeber).
  {
    timestamp: isoMinutesAgo(45, annaSeedTime),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'kvnr',
    sektion: 'dokumente',
    absender_behoerde_id: 'aok-nordost',
    empfaenger_id: 'aok-nordost',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_gkv',
    rechtsgrundlage: '§ 28a SGB IV (DEÜV)',
    note: 'persona_id:anna-petrov; field_id:kvnr; quelle:deuv_push; mock:true',
  },
  // -------------------------------------------------------------------------
  // Redesign-Datenschutz — App-Aktivitäts-Timeline-Seed (`redesign-datenschutz.md`
  // § 6 „Timeline-Realismus"). Damit das Cockpit ohne vorherigen Umzug-Lauf
  // gefüllt ist: Brief geöffnet / KI-Zusammenfassung / Dokument geladen /
  // Einwilligung erteilt (Adresse-übermittelt wird oben bereits abgedeckt).
  // -------------------------------------------------------------------------
  {
    timestamp: isoMinutesAgo(120, annaSeedTime),
    kategorie: 'app_aktivitaet',
    field_id: 'letter',
    sektion: 'dokumente',
    zweck_i18n_key: 'datenschutz.activity.brief_geoeffnet',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO',
    note: 'persona_id:anna-petrov; field_id:letter; quelle:user_self_view; mock:true',
  },
  {
    timestamp: isoMinutesAgo(118, annaSeedTime),
    kategorie: 'app_aktivitaet',
    field_id: 'letter',
    sektion: 'dokumente',
    zweck_i18n_key: 'datenschutz.activity.ki_zusammenfassung',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO i.V.m. Art. 28 DSGVO (AVV Anthropic)',
    note: 'persona_id:anna-petrov; field_id:letter; quelle:ki_summary; mock:true',
  },
  {
    timestamp: isoMinutesAgo(90, annaSeedTime),
    kategorie: 'app_aktivitaet',
    field_id: 'dokument',
    sektion: 'dokumente',
    zweck_i18n_key: 'datenschutz.activity.dokument_geladen',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO',
    note: 'persona_id:anna-petrov; field_id:dokument; quelle:user_self_view; mock:true',
  },
  {
    timestamp: isoMinutesAgo(60, annaSeedTime),
    kategorie: 'app_aktivitaet',
    field_id: 'datenschutz_einwilligung',
    sektion: 'sperren_einstellungen',
    empfaenger_id: 'krankenkasse',
    zweck_i18n_key: 'datenschutz.activity.einwilligung_erteilt',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    note: 'persona_id:anna-petrov; empfaenger:krankenkasse; erteilt:true; mock:true',
  },
];

// ---------------------------------------------------------------------------
// Familie Schmidt (Hamburg, Eheschließung historisch)
// ---------------------------------------------------------------------------

// Stichtag-Anker: 2024-06-22 = mock-Eheschließung (Domain-Doc § Profil-Snapshots).
// Wir loggen den Cascade rund um diesen Zeitpunkt (Tage nach Heirat).
const SCHMIDT_BASE = new Date('2024-06-22T10:00:00.000Z');
const SCHMIDT_ENTRIES: SeedEntryDraft[] = [
  // Standesamt → Bürgeramt: Heirat-Folgeeintrag.
  {
    timestamp: isoDaysAgo(-1, SCHMIDT_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'familie',
    sektion: 'familie',
    absender_behoerde_id: 'standesamt-hamburg-eimsbuettel',
    empfaenger_id: 'buergeramt-berlin-mitte', // Stand-In; Hamburg-Bürgeramt nicht modelliert
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 36 BMG i.V.m. PStG',
    note: 'persona_id:markus-schmidt; field_id:familie; quelle:eheschliessung_cascade; mock:true',
  },
  // Bürgeramt → Finanzamt Hamburg-Eimsbüttel: Steuerklassen-Anpassung
  // (Folge der Heirat).
  {
    timestamp: isoDaysAgo(-2, SCHMIDT_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'familie',
    sektion: 'familie',
    absender_behoerde_id: 'buergeramt-berlin-mitte',
    empfaenger_id: 'finanzamt-hamburg-eimsbuettel',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 36 BMG i.V.m. § 39 EStG (ELStAM)',
    note: 'persona_id:markus-schmidt; field_id:familie; quelle:eheschliessung_cascade; mock:true',
  },
  // Bürgeramt → Beitragsservice: Wohnungs-Beitrags-Konto-Konsolidierung.
  {
    timestamp: isoDaysAgo(-2, SCHMIDT_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-mitte',
    empfaenger_id: 'beitragsservice-koeln',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice',
    rechtsgrundlage: '§ 11 Abs. 4 RBStV i.V.m. § 36 BMG',
    note: 'persona_id:markus-schmidt; field_id:anschrift_aktuell; quelle:eheschliessung_cascade; mock:true',
  },
  // Standesamt → KiStAM (BZSt) — Religionsmerkmal-Übernahme.
  {
    timestamp: isoDaysAgo(-3, SCHMIDT_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'religion',
    sektion: 'sperren_einstellungen',
    absender_behoerde_id: 'standesamt-hamburg-eimsbuettel',
    empfaenger_id: 'standesamt-berlin-mitte', // KiStAM-Stand-In
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 51a EStG i.V.m. KiStAM-VO',
    note: 'persona_id:markus-schmidt; field_id:religion; quelle:eheschliessung_cascade; mock:true',
  },
  // Familienkasse → Beitragsservice (Stichprobe Kindergeld-Bezug → RBStV-
  // Befreiung; im Mock nur als Datenkranz-Ankündigung).
  {
    timestamp: isoDaysAgo(45, SCHMIDT_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'familie',
    sektion: 'familie',
    absender_behoerde_id: 'familienkasse-berlin-brandenburg',
    empfaenger_id: 'beitragsservice-koeln',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice',
    rechtsgrundlage: '§ 11 Abs. 4 RBStV',
    note: 'persona_id:markus-schmidt; field_id:familie; quelle:familienkasse_check; mock:true',
  },
];

// ---------------------------------------------------------------------------
// Mehmet Yıldız (Köln, Drittstaatsangehöriger)
// ---------------------------------------------------------------------------

// Stichtag-Anker: vor ~30 Tagen — synthetischer Umzug innerhalb Köln.
const MEHMET_BASE = new Date(); // dynamic
const MEHMET_ENTRIES: SeedEntryDraft[] = [
  // Bürgeramt → Finanzamt Köln-Mitte (automatisch via § 36 BMG).
  {
    timestamp: isoDaysAgo(28, MEHMET_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-mitte', // Stand-In; Köln-Bürgeramt nicht modelliert
    empfaenger_id: 'finanzamt-koeln-mitte',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 36 BMG i.V.m. § 139b AO',
    note: 'persona_id:mehmet-yildiz; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  // Bürgeramt → Beitragsservice.
  {
    timestamp: isoDaysAgo(28, MEHMET_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: 'buergeramt-berlin-mitte',
    empfaenger_id: 'beitragsservice-koeln',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice',
    rechtsgrundlage: '§ 11 Abs. 4 RBStV i.V.m. § 36 BMG',
    note: 'persona_id:mehmet-yildiz; field_id:anschrift_aktuell; quelle:umzug_cascade; mock:true',
  },
  // GKV-Adressmitteilung an AOK Rheinland/Hamburg (DEÜV-freiwillig).
  {
    timestamp: isoDaysAgo(27, MEHMET_BASE),
    kategorie: 'behoerde_zu_behoerde',
    field_id: 'kvnr',
    sektion: 'dokumente',
    absender_behoerde_id: 'buergeramt-berlin-mitte',
    empfaenger_id: 'aok-rheinland-hamburg',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_gkv',
    rechtsgrundlage: '§ 28a SGB IV (DEÜV)',
    note: 'persona_id:mehmet-yildiz; field_id:kvnr; quelle:deuv_push; mock:true',
  },
  // ABH-eAT-Adressänderung — manuell, KEIN automatischer § 36-Push (Hard-Line
  // Domain-Doc § Risikofelder). App-Aktivitäts-Eintrag, weil der Bürger
  // selbst beim ABH-Termin erschienen ist.
  {
    timestamp: isoDaysAgo(15, MEHMET_BASE),
    kategorie: 'app_aktivitaet',
    field_id: 'eat_can',
    sektion: 'dokumente',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt',
    rechtsgrundlage: '§ 86 AufenthG (ABH-Mitwirkungspflicht)',
    note: 'persona_id:mehmet-yildiz; field_id:eat_can; quelle:abh_termin; mock:true',
  },
  // AZR-Selbstauskunft-Hinweis (Bürger hat seine AZR-Daten in der App
  // angezeigt — § 34 AZRG-Selbstauskunft).
  {
    timestamp: isoDaysAgo(2, MEHMET_BASE),
    kategorie: 'app_aktivitaet',
    field_id: 'azr_nr',
    sektion: 'dokumente',
    zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_religion_angezeigt',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO + § 22 BDSG',
    note: 'persona_id:mehmet-yildiz; field_id:azr_nr; quelle:user_self_view; mock:true',
  },
];

// ---------------------------------------------------------------------------
// V1.2 — Kontakt-Schicht (Spec § 4.6). Pro Persona 1–2 `behoerde_zu_buerger`-
// Einträge, damit der Richtung-Filter „Eingehend" mindestens 1 Treffer rendert.
// ---------------------------------------------------------------------------

// Anna: 1 Eintrag aus 2026-05-08 — Familienkasse → Anna, Kindergeld-Bewilligung
// (Brief-Kanal, Vorher-Frame-Anker für die Cascade-Demo).
const ANNA_V12_ENTRIES: SeedEntryDraft[] = [
  {
    timestamp: '2026-05-08T09:30:00.000Z',
    kategorie: 'behoerde_zu_buerger',
    field_id: 'posteingang',
    sektion: 'sperren_einstellungen',
    absender_behoerde_id: 'familienkasse-berlin-brandenburg',
    empfaenger_id: 'anna-petrov',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.behoerde_zu_buerger_brief_eingang',
    rechtsgrundlage: '§ 41 Abs. 2 VwVfG',
    note: 'persona_id:anna-petrov; field_id:posteingang; kanal:brief; letter_id:letter-familienkasse-bewilligung; quelle:familienkasse_bewilligungsbescheid; mock:true',
  },
];

// Schmidt: 2 Einträge aus 2024-2025 — Standesamt-Eheschließung +
// Familienkasse Bayern Süd Folge-Bescheid.
const SCHMIDT_V12_ENTRIES: SeedEntryDraft[] = [
  {
    timestamp: '2024-06-22T11:00:00.000Z',
    kategorie: 'behoerde_zu_buerger',
    field_id: 'posteingang',
    sektion: 'sperren_einstellungen',
    absender_behoerde_id: 'standesamt-hamburg-eimsbuettel',
    empfaenger_id: 'markus-schmidt',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.behoerde_zu_buerger_brief_eingang',
    rechtsgrundlage: '§ 41 Abs. 2 VwVfG i.V.m. PStG',
    note: 'persona_id:markus-schmidt; field_id:posteingang; kanal:brief; quelle:standesamt_eheschliessung_bestaetigung; mock:true',
  },
  {
    timestamp: '2025-04-15T08:00:00.000Z',
    kategorie: 'behoerde_zu_buerger',
    field_id: 'posteingang',
    sektion: 'sperren_einstellungen',
    absender_behoerde_id: 'familienkasse-berlin-brandenburg', // Stand-In; Bayern Süd nicht modelliert
    empfaenger_id: 'markus-schmidt',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.behoerde_zu_buerger_brief_eingang',
    rechtsgrundlage: '§ 41 Abs. 2 VwVfG',
    note: 'persona_id:markus-schmidt; field_id:posteingang; kanal:brief; quelle:familienkasse_folgebescheid; mock:true',
  },
];

// Mehmet: 1 Eintrag — LEA Köln eAT-Verlängerungs-Hinweis als Brief
// (kanal=brief, ABH-Hard-Lock-Visualisierung Spec § 11.40).
const MEHMET_V12_ENTRIES: SeedEntryDraft[] = [
  {
    timestamp: isoDaysAgo(60, MEHMET_BASE),
    kategorie: 'behoerde_zu_buerger',
    field_id: 'posteingang',
    sektion: 'sperren_einstellungen',
    absender_behoerde_id: 'abh-koeln',
    empfaenger_id: 'mehmet-yildiz',
    zweck_i18n_key:
      'stammdaten.aktivitaet.zweck.behoerde_zu_buerger_brief_eingang',
    rechtsgrundlage: '§§ 86, 87 AufenthG i.V.m. § 41 Abs. 2 VwVfG',
    note: 'persona_id:mehmet-yildiz; field_id:posteingang; kanal:brief; quelle:abh_eat_verlaengerung_hinweis; mock:true',
  },
];

// ---------------------------------------------------------------------------
// Public Map (Persona-ID → Initial-Log).
// ---------------------------------------------------------------------------

/**
 * Pre-baked Initial-Log per Persona. Wird beim ersten Boot in den
 * `stammdaten:uebermittlungs-log`-Bucket geschrieben (siehe `seed.ts`).
 *
 * **Hard-Line § 11.6**: alle `note`-Felder enthalten ausschließlich
 * `<key>:<value>;`-Marker (semicolon-getrennt), kein PII-Klartext.
 *
 * **Hard-Line § 11.8**: keine echten Bürger:innen-Daten — alle Werte sind
 * synthetisch.
 */
export const STAMMDATEN_DEFAULT_LOG_ENTRIES: Record<
  PersonaId,
  UebermittlungsLogEntry[]
> = {
  'anna-petrov': [
    ...buildEntries('anna-petrov', ANNA_ENTRIES),
    ...buildEntries('anna-petrov-v12', ANNA_V12_ENTRIES),
  ],
  'markus-schmidt': [
    ...buildEntries('markus-schmidt', SCHMIDT_ENTRIES),
    ...buildEntries('markus-schmidt-v12', SCHMIDT_V12_ENTRIES),
  ],
  'mehmet-yildiz': [
    ...buildEntries('mehmet-yildiz', MEHMET_ENTRIES),
    ...buildEntries('mehmet-yildiz-v12', MEHMET_V12_ENTRIES),
  ],
};
