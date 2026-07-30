import { formatDateDe } from '@/lib/utils';
import type {
  Behoerde,
  Persona,
  Stammdaten,
  UebermittlungsLogEntry,
} from '@/types';

/**
 * Pure view-model for the Stammdaten-Datenblatt (Spec `stammdaten-datenblatt.md`
 * § 3). No `api`, no `localStorage`, no `useTranslations` — the caller loads the
 * data and passes the handful of already-localized fragments the model cannot
 * resolve itself (`DatenblattTexte`).
 *
 * Honesty invariant: a row exists ONLY when it carries a real value. Missing
 * data produces no row (and no placeholder dash), an empty section is dropped
 * entirely, and `angabenCount` is by construction the number of value rows the
 * screen actually renders — never a checklist target or a percentage.
 */

/** Micro-line under a value: an i18n key under `stammdaten.datenblatt` + params. */
export interface DatenblattQuelle {
  key: string;
  /** Numbers stay numbers — ICU `plural` should select on a number, not on a
      string that the formatter happens to coerce back. */
  params?: Record<string, string | number>;
}

export interface DatenblattRow {
  /** Stable row id, e.g. `kontakt.email`. */
  id: string;
  /** i18n key under `stammdaten.datenblatt`. */
  labelKey: string;
  /** Ready to render; multi-line values are `\n`-separated. */
  value: string;
  /** Only contact rows: the value is BundID-verified. */
  verifiziert?: boolean;
  quelle?: DatenblattQuelle;
}

export interface DatenblattSection {
  id: string;
  titleKey: string;
  rows: DatenblattRow[];
  /** One source line for the whole section (Kontakt → „BundID-Konto"). */
  quelle?: DatenblattQuelle;
}

export interface DatenblattModel {
  /** Identity facts, incl. „Sprachen" (self-declared, not an Angabe). */
  identitaet: DatenblattRow[];
  sektionen: DatenblattSection[];
  angabenCount: number;
  letzteAktualisierung?: { iso: string; behoerdeName?: string };
}

/** Localized fragments the pure model cannot resolve itself. */
export interface DatenblattTexte {
  familienstand: string;
  staatsangehoerigkeit: string;
  /** Already localized, comma-separated („Russisch, Deutsch, Englisch"). */
  sprachen: string;
  gesetzlicheRente: string;
  /** `Lev Petrov · geb. 02.05.2020` */
  kind: (name: string, geburtsdatum: string) => string;
}

export interface DatenblattInput {
  persona: Persona;
  stammdaten: Stammdaten;
  log: UebermittlungsLogEntry[];
  behoerdenById: Record<string, Behoerde>;
  texte: DatenblattTexte;
}

/**
 * Identity rows that the „{N} Angaben"-Subline must NOT count: „Sprachen" is
 * self-declared (no register keeps it — § 3 BMG does not list language).
 * Everything else in the band is register-led, and Geburtsort explicitly so
 * (§ 3 Abs. 1 Nr. 6 BMG). Provenance is not a row here at all: it lives in the
 * portrait foot, fed directly by the view (`PortraitKarte quelleWert`).
 */
const NICHT_GEZAEHLT = new Set(['identitaet.sprachen']);

function row(
  id: string,
  labelKey: string,
  value: string | undefined,
  extra?: Omit<DatenblattRow, 'id' | 'labelKey' | 'value'>,
): DatenblattRow | null {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return null;
  return { id, labelKey, value: trimmed, ...extra };
}

function section(
  id: string,
  titleKey: string,
  rows: Array<DatenblattRow | null>,
  quelle?: DatenblattQuelle,
): DatenblattSection | null {
  const kept = rows.filter((r): r is DatenblattRow => r !== null);
  if (kept.length === 0) return null;
  return quelle ? { id, titleKey, rows: kept, quelle } : { id, titleKey, rows: kept };
}

function anschriftValue(persona: Persona, stammdaten: Stammdaten): string {
  const a = stammdaten.anschrift_aktuell ?? persona.adresse;
  if (!a) return '';
  const strasse = [a.strasse, a.hausnummer].filter(Boolean).join(' ').trim();
  const ort = [a.plz, a.ort].filter(Boolean).join(' ').trim();
  return [strasse, a.zusatz, ort].filter(Boolean).join('\n');
}

/**
 * The Meldebehörde that leads this persona's record: the first authority
 * responsible for `meldewesen` in the persona's own town. Deliberately NOT the
 * globally first `meldewesen` authority — claiming a Berlin Bürgeramt keeps
 * Mehmet's (Köln) record would be a false provenance. Without a local match the
 * caller falls back to the generic „Bürgeramt (Meldebehörde)" wording.
 */
export function findMeldebehoerde(
  behoerden: Behoerde[],
  ort: string | undefined,
): Behoerde | undefined {
  const needle = (ort ?? '').trim().toLowerCase();
  if (needle.length === 0) return undefined;
  return behoerden.find(
    (b) =>
      b.zustaendige_themen.includes('meldewesen') &&
      (b.adresse?.ort ?? '').trim().toLowerCase() === needle,
  );
}

/**
 * Volle Lebensjahre — die einzige abgeleitete Angabe dieses Screens (Spec
 * `stammdaten-akte-v2.md` § 7.1). Kalenderarithmetik, keine Registerbehauptung:
 * ist der Geburtstag im laufenden Jahr noch nicht erreicht, zählt ein Jahr
 * weniger. Der 29.02. fällt damit auf den 1.3. eines Nicht-Schaltjahres.
 *
 * Das Geburtsdatum wird stringseitig zerlegt statt über `new Date(iso)`: ein
 * reines Datum parst JS als UTC-Mitternacht, die Vergleichsgetter unten sind
 * aber lokal — westlich von UTC sprang der Geburtstag dadurch einen Tag zu früh
 * (und die Tests hingen an der Zeitzone der Maschine; code-review 2026-07-29,
 * Nit 2).
 */
export function alterInJahren(
  geburtsdatumIso: string,
  heute: Date = new Date(),
): number {
  const [jahr, monat, tag] = geburtsdatumIso.slice(0, 10).split('-').map(Number);
  let jahre = heute.getFullYear() - jahr;
  const monate = heute.getMonth() + 1 - monat;
  if (monate < 0 || (monate === 0 && heute.getDate() < tag)) {
    jahre -= 1;
  }
  return jahre;
}

export function buildDatenblattModel({
  persona,
  stammdaten,
  log,
  behoerdenById,
  texte,
}: DatenblattInput): DatenblattModel {
  const identitaet = [
    row(
      'identitaet.geburtsdatum',
      'identitaet.geburtsdatum',
      formatDateDe(stammdaten.identitaet.geburtsdatum),
      {
        quelle: {
          key: 'value.alter',
          params: {
            jahre: alterInJahren(stammdaten.identitaet.geburtsdatum),
          },
        },
      },
    ),
    row(
      'identitaet.geburtsort',
      'identitaet.geburtsort',
      stammdaten.identitaet.geburtsort,
    ),
    row(
      'identitaet.staatsangehoerigkeit',
      'identitaet.staatsangehoerigkeit',
      texte.staatsangehoerigkeit,
    ),
    row('identitaet.familienstand', 'identitaet.familienstand', texte.familienstand),
    row('identitaet.sprachen', 'identitaet.sprachen', texte.sprachen, {
      quelle: { key: 'quelle.selbstauskunft' },
    }),
  ].filter((r): r is DatenblattRow => r !== null);

  const email =
    persona.kontakt?.bundid_email.value ?? stammdaten.kontakt.email;
  const mobil = persona.kontakt?.bundid_mobil?.value ?? stammdaten.kontakt.mobil;

  const anschriftBestaetigtIso = log.find(
    (e) => e.sektion === 'anschrift',
  )?.timestamp;

  const partner = stammdaten.familie.partner;
  const kinder = stammdaten.familie.kinder ?? [];
  /* „Ehegatte / Lebenspartner:in" only when the Familienstand actually says so —
   * Anna is `ledig` with an unmarried partner; the marital label next to
   * „Familienstand: ledig" would contradict the record. */
  const verpartnert =
    stammdaten.familie.familienstand === 'verheiratet' ||
    stammdaten.familie.familienstand === 'eingetragene_lebenspartnerschaft';

  const personalausweis = stammdaten.dokumente_refs.personalausweis;
  const reisepass = stammdaten.dokumente_refs.reisepass;
  const aufenthalt = persona.aufenthaltstitel;

  const krankenkasse = persona.krankenversicherung?.traeger;
  const kvnr =
    persona.kvnr_v1_1?.unveraenderbar ??
    persona.krankenversicherung?.versichertennummer;

  const sektionen = [
    section(
      'kontakt',
      'sektion.kontakt',
      [
        row('kontakt.email', 'label.email', email, {
          verifiziert: Boolean(persona.kontakt?.bundid_email.verified),
        }),
        row('kontakt.mobil', 'label.mobil', mobil, {
          verifiziert: Boolean(persona.kontakt?.bundid_mobil?.verified),
        }),
      ],
      { key: 'quelle.bundid' },
    ),
    section('anschrift', 'sektion.anschrift', [
      row(
        'anschrift.haupt',
        'label.hauptanschrift',
        anschriftValue(persona, stammdaten),
        {
          quelle: anschriftBestaetigtIso
            ? {
                key: 'quelle.melderegister',
                params: { datum: formatDateDe(anschriftBestaetigtIso) },
              }
            : { key: 'quelle.melderegister_ohne_datum' },
        },
      ),
    ]),
    section('familie', 'sektion.familie', [
      row(
        'familie.partner',
        verpartnert ? 'label.partner' : 'label.partner_unverheiratet',
        partner ? `${partner.vorname} ${partner.nachname}` : undefined,
      ),
      row(
        'familie.kinder',
        'label.kinder',
        kinder
          .map((kind) =>
            texte.kind(
              `${kind.vorname} ${kind.nachname}`,
              formatDateDe(kind.geburtsdatum),
            ),
          )
          .join('\n'),
      ),
    ]),
    section(
      'dokumente',
      aufenthalt ? 'sektion.dokumente_aufenthalt' : 'sektion.dokumente',
      [
        row(
          'dokumente.personalausweis',
          'label.personalausweis',
          personalausweis?.nummer,
          personalausweis
            ? {
                quelle: {
                  key: 'value.gueltig_bis',
                  params: { datum: formatDateDe(personalausweis.gueltig_bis) },
                },
              }
            : undefined,
        ),
        row(
          'dokumente.reisepass',
          'label.reisepass',
          reisepass?.nummer,
          reisepass
            ? {
                quelle: {
                  key: 'value.gueltig_bis',
                  params: { datum: formatDateDe(reisepass.gueltig_bis) },
                },
              }
            : undefined,
        ),
        row(
          'dokumente.aufenthaltstitel',
          'label.aufenthaltstitel',
          aufenthalt?.az,
          aufenthalt
            ? {
                quelle: {
                  key: 'value.norm_gueltig_bis',
                  params: {
                    norm: aufenthalt.norm,
                    datum: formatDateDe(aufenthalt.valid_until),
                  },
                },
              }
            : undefined,
        ),
      ],
    ),
    section('versicherung', 'sektion.versicherung', [
      row('versicherung.krankenkasse', 'label.krankenkasse', krankenkasse),
      row(
        'versicherung.altersvorsorge',
        'label.altersvorsorge',
        persona.rentenversicherungsnummer ? texte.gesetzlicheRente : undefined,
      ),
    ]),
    section('kennungen', 'sektion.kennungen', [
      row('kennungen.steuer_id', 'label.steuer_id', persona.steuer_id, {
        quelle: { key: 'quelle.bzst' },
      }),
      row(
        'kennungen.sozialversicherungsnummer',
        'label.sozialversicherungsnummer',
        persona.rentenversicherungsnummer,
        { quelle: { key: 'quelle.drv' } },
      ),
      row(
        'kennungen.kvnr',
        'label.kvnr',
        kvnr,
        krankenkasse
          ? { quelle: { key: 'quelle.traeger', params: { traeger: krankenkasse } } }
          : undefined,
      ),
    ]),
  ].filter((s): s is DatenblattSection => s !== null);

  const angabenCount =
    identitaet.filter((r) => !NICHT_GEZAEHLT.has(r.id)).length +
    sektionen.reduce((sum, s) => sum + s.rows.length, 0);

  const neuester = log[0];

  return {
    identitaet,
    sektionen,
    angabenCount,
    ...(neuester
      ? {
          letzteAktualisierung: {
            iso: neuester.timestamp,
            behoerdeName: neuester.absender_behoerde_id
              ? behoerdenById[neuester.absender_behoerde_id]?.name_de
              : undefined,
          },
        }
      : {}),
  };
}
