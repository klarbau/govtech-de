/**
 * `finde_zustaendige_stelle` — der Zuständigkeits-Lookup (wow-backlog #15).
 *
 * Löst eine mehrdeutige Bürger-Anfrage MECHANISCH-DETERMINISTISCH zu genau
 * einer benannten zuständigen Stelle auf. Anker: Kindergeld → Familienkasse
 * (Bund), NICHT das Finanzamt (Markus Schmidts dokumentierte Fehlannahme).
 *
 * Reine, offline-sichere Datenlogik (Muster wie `formuliere_sachverhalt`):
 *   - Kein Netzwerk, kein API-Key, kein async, keine Persistenz — der Katalog
 *     mappt statisch gegen `@/data/behoerden.json`. Dadurch ist der Lookup
 *     trivial unit-testbar und der Beat rendert clientseitig auch keyless.
 *   - KEINE frei halluzinierte Zuständigkeit: das Tool beantwortet AUSSCHLIESSLICH
 *     Themen, die im `ZUSTAENDIGKEIT_KATALOG` stehen. Für alles andere gibt es
 *     ehrlich `null` → „nicht im Katalog".
 *
 * HARD RULE (Verifier-Verdikt REVISE, verbindlich): die Formulierung ist immer
 * „Zuständig wäre/ist X; dorthin würde Ihre Anfrage geleitet" bzw. „Zuständig
 * ist X, nicht Y" — es wird NIEMALS impliziert, die Anfrage sei real
 * weitergeleitet worden. Rechtsgrundlage on-screen: § 25 VwVfG (Beratungs- und
 * Auskunftspflicht) — bewusst NUR § 25, nicht §§ 3/16 VwVfG (im Zweifel nur die
 * unstrittige Beratungspflicht zitieren).
 */

import behoerdenData from '@/data/behoerden.json';
import type { Behoerde } from '@/types';

const BEHOERDEN = behoerdenData as unknown as Behoerde[];

/**
 * Nur die drei staatlichen Föderalismus-Ebenen. Der Katalog referenziert
 * AUSSCHLIESSLICH echte Behörden dieser Ebenen — Beitragsservice (Anstalt) und
 * Arbeitgeber/Bank (privat) sind KEINE zuständigen Behörden und stehen nicht im
 * Katalog (Realismus-Disziplin, wow-backlog §2).
 */
export type ZustaendigkeitEbene = 'bund' | 'land' | 'kommune';

/** On-screen-Rechtsgrundlage — bewusst NUR § 25 VwVfG (siehe Modul-Doc). */
export const ZUSTAENDIGKEIT_RECHTSGRUNDLAGE =
  '§ 25 VwVfG (Beratungs- und Auskunftspflicht)';

interface KatalogEintrag {
  /**
   * Stabiler Themen-Schlüssel. Dient zugleich als i18n-Suffix
   * (`assistent.zustaendigkeit.thema.<thema>`) für die Warum-Zeile der Card.
   */
  thema: string;
  /**
   * DE-Stichwort-Phrasen. Matching ist diakritik-/case-insensitiv per Substring;
   * bei Mehrfachtreffern gewinnt die LÄNGSTE Phrase (deterministisch, stabil).
   */
  aliase: string[];
  /** behoerde-id aus behoerden.json — MUSS existieren und Ebene bund/land/kommune haben. */
  behoerdeId: string;
  /**
   * Die häufige Fehlannahme („nicht das Finanzamt"). Optional — nur gesetzt, wo
   * es eine kanonische, belegbare Verwechslung gibt.
   */
  nichtZustaendig?: string;
}

/** Aufgelöster Treffer — speist Tool-Result (Modell) UND die Zuständigkeits-Card. */
export interface ZustaendigkeitTreffer {
  /** Der gematchte Themen-Schlüssel (i18n-Suffix). */
  thema: string;
  behoerdeId: string;
  /** `name_de` aus behoerden.json. */
  name: string;
  /** Föderale Ebene aus behoerden.json (`kategorie`). */
  ebene: ZustaendigkeitEbene;
  /** Häufige Fehlannahme, falls vorhanden (z. B. „Finanzamt"). */
  nichtZustaendig?: string;
}

/**
 * Der kuratierte Themen→Behörde-Katalog. Reihenfolge = Tie-Break-Reihenfolge.
 * Jede `behoerdeId` ist gegen behoerden.json geprüft (Drift-Guard im Unit-Test);
 * jede Ebene ist bund/land/kommune. Die `nichtZustaendig`-Kontraste sind die
 * dokumentierten Verwechslungen (Föderalismus-Fallen), nicht erfunden.
 */
export const ZUSTAENDIGKEIT_KATALOG: KatalogEintrag[] = [
  {
    // Anker (Markus Schmidt): Kindergeld → Familienkasse (Bund), NICHT Finanzamt.
    thema: 'kindergeld',
    aliase: ['kindergeld'],
    behoerdeId: 'familienkasse-berlin-brandenburg',
    nichtZustaendig: 'Finanzamt',
  },
  {
    thema: 'kinderzuschlag',
    aliase: ['kinderzuschlag'],
    behoerdeId: 'familienkasse-berlin-brandenburg',
    nichtZustaendig: 'Jobcenter',
  },
  {
    // Föderalismus-Kontrast: Elterngeld ist NICHT die Familienkasse (Bund),
    // sondern die kommunale/Landes-Elterngeldstelle.
    thema: 'elterngeld',
    aliase: ['elterngeld', 'elterngeld plus', 'elterngeldplus', 'elternzeit geld'],
    behoerdeId: 'elterngeldstelle-berlin-mitte',
    nichtZustaendig: 'Familienkasse',
  },
  {
    thema: 'wohngeld',
    aliase: ['wohngeld', 'mietzuschuss', 'lastenzuschuss'],
    behoerdeId: 'wohngeldstelle-berlin-mitte',
    nichtZustaendig: 'Jobcenter',
  },
  {
    thema: 'bafoeg',
    aliase: ['bafoeg', 'ausbildungsfoerderung', 'studienfoerderung'],
    behoerdeId: 'afa-stw-berlin',
  },
  {
    thema: 'aufenthaltstitel',
    aliase: [
      'aufenthaltstitel',
      'aufenthaltserlaubnis',
      'aufenthalt verlaengern',
      'blue card',
      'blaue karte',
      'niederlassungserlaubnis',
    ],
    behoerdeId: 'abh-berlin-lea',
    nichtZustaendig: 'Bürgeramt',
  },
  {
    thema: 'einkommensteuer',
    aliase: [
      'einkommensteuer',
      'einkommenssteuer',
      'steuererklaerung',
      'lohnsteuer',
      'steuerbescheid',
    ],
    behoerdeId: 'finanzamt-berlin-mitte-tiergarten',
  },
  {
    thema: 'steuer_id',
    aliase: [
      'steuer id',
      'steueridentifikationsnummer',
      'steuerliche identifikationsnummer',
      'steuer identifikationsnummer',
    ],
    behoerdeId: 'bzst',
    nichtZustaendig: 'Finanzamt',
  },
  {
    thema: 'kfz_zulassung',
    aliase: [
      'kfz zulassung',
      'kfz ummelden',
      'auto ummelden',
      'auto anmelden',
      'fahrzeug ummelden',
      'fahrzeug anmelden',
      'fahrzeug zulassen',
    ],
    behoerdeId: 'kfz-berlin-labo',
  },
  {
    thema: 'meldewesen',
    aliase: [
      'ummeldung',
      'anmeldung wohnsitz',
      'wohnsitz ummelden',
      'wohnsitz anmelden',
      'wohnung ummelden',
      'meldebescheinigung',
      'meldebestaetigung',
    ],
    behoerdeId: 'buergeramt-berlin-mitte',
  },
  {
    thema: 'personalausweis',
    aliase: ['personalausweis', 'ausweis beantragen', 'reisepass', 'pass beantragen'],
    behoerdeId: 'buergeramt-berlin-mitte',
  },
  {
    thema: 'geburtsurkunde',
    aliase: ['geburtsurkunde', 'geburt beurkunden', 'geburt anmelden', 'geburt anzeigen'],
    behoerdeId: 'standesamt-berlin-mitte',
  },
  {
    thema: 'eheschliessung',
    aliase: ['eheschliessung', 'heirat', 'heiraten', 'trauung', 'ehe anmelden'],
    behoerdeId: 'standesamt-berlin-mitte',
  },
  {
    thema: 'rentenversicherung',
    aliase: ['rentenversicherung', 'altersrente', 'erwerbsminderungsrente', 'rentenantrag'],
    behoerdeId: 'drv-bund',
  },
];

const BEHOERDE_BY_ID = new Map(BEHOERDEN.map((b) => [b.id, b]));

/**
 * Normalisiert Freitext: klein, Umlaute/ß aufgelöst, Nicht-Alphanumerik → Space,
 * kollabierte Whitespace. Diakritik-/schreibweisen-tolerant und deterministisch.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function toEbene(kategorie: Behoerde['kategorie']): ZustaendigkeitEbene | null {
  return kategorie === 'bund' || kategorie === 'land' || kategorie === 'kommune'
    ? kategorie
    : null;
}

/**
 * Löst ein Thema/Stichwort deterministisch zur zuständigen Stelle auf.
 *
 * Matching: normalisierter Input enthält eine normalisierte Alias-Phrase.
 * Bei mehreren Treffern gewinnt die LÄNGSTE gematchte Phrase; bei Gleichstand
 * die frühere Katalog-Position (stabil). Kein Treffer → `null` („nicht im
 * Katalog"). Wirft nie — offline-graceful.
 */
export function findeZustaendigeStelle(thema: string): ZustaendigkeitTreffer | null {
  if (!thema || typeof thema !== 'string') return null;
  const hay = normalize(thema);
  if (hay.length === 0) return null;

  let best: { eintrag: KatalogEintrag; len: number } | null = null;
  for (const eintrag of ZUSTAENDIGKEIT_KATALOG) {
    for (const alias of eintrag.aliase) {
      const needle = normalize(alias);
      if (needle.length > 0 && hay.includes(needle)) {
        if (!best || needle.length > best.len) {
          best = { eintrag, len: needle.length };
        }
      }
    }
  }
  if (!best) return null;

  const behoerde = BEHOERDE_BY_ID.get(best.eintrag.behoerdeId);
  if (!behoerde) return null; // defensiv: Katalog-Drift → lieber „nicht gefunden".
  const ebene = toEbene(behoerde.kategorie);
  if (!ebene) return null; // defensiv: nur bund/land/kommune sind zuständige Behörden.

  return {
    thema: best.eintrag.thema,
    behoerdeId: behoerde.id,
    name: behoerde.name_de,
    ebene,
    nichtZustaendig: best.eintrag.nichtZustaendig,
  };
}
