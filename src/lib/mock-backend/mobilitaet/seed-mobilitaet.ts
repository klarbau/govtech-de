/**
 * V1.3 — Persona-spezifische Seed-Daten für den Mobilität-Block.
 *
 * Spec: `docs/specs/stammdaten-v1-3-mobilitaet.md` § 2 Persona-Snapshot, § 5.4.
 *
 * Hard-Lines:
 *  - HL-MOB-1 / HL-MOB-10: alle Werte sind Read-Only-Snapshots; UI bietet
 *    keinen Self-Edit-Pfad.
 *  - HL-MOB-3 / HL-MOB-7: FIN masked-by-default (letzte 4 Stellen sichtbar);
 *    `fin_masked`-Werte vorberechnet, damit Tests deterministisch sind.
 *  - HL-MOB-8 / `[MOCK]`-Watermark auf FE-Nr, FIN-voll, Kennzeichen, eVB-Nr,
 *    Aktenzeichen verbindlich.
 *
 * Bundesland-Buchstaben (FS-VwV-Alphabet) für die Persona-Bestände:
 *   - Anna (Berlin, post-Anerkennungs-Umschreibung 2024) → F
 *   - Schmidt (Hamburg, Ausstellung 2002) → J
 *   - Mehmet (Köln/NRW, Ausstellung 2010 + Umtausch 14.01.2025) → N
 *
 * Lena Schmidt: KEIN Eintrag → ist Sub-Persona unter `markus-schmidt.familie.
 * partner`; Mobilität-Sektion rendert für sie via `getMobilitaet` mit `null`
 * den Empty-State (§ 6.1 Anti-Lena-Pfad).
 */
import type { Mobilitaet } from '@/types/mobilitaet';
import type { PersonaId } from '@/types/persona';

export const SEED_MOBILITAET: Record<PersonaId, Mobilitaet> = {
  // -------------------------------------------------------------------------
  // Anna Petrov (Berlin) — § 18g AufenthG Blue Card EU; FE umgeschrieben 2024
  // -------------------------------------------------------------------------
  'anna-petrov': {
    fahrerlaubnis: {
      fe_nr: '[MOCK] F0727RRE2I50',
      bundesland_kennzeichen: 'F',
      fe_behoerde_id: 'fe-berlin-labo',
      klassen: [{ klasse: 'B', erteilt_am: '2024-03-18', schluesselzahlen: [] }],
      ausstellungsdatum: '2024-03-18',
      pflichtumtausch_status: 'nicht_relevant',
      fe_aktenzeichen: '[MOCK] LABO-FE/2024-03-002831',
    },
    halter: [
      {
        kennzeichen: '[MOCK] B-AP 4711',
        marke: 'VW',
        modell: 'Polo',
        baujahr: '2019',
        fin_voll: '[MOCK] WAUZZZF40MA123456',
        fin_masked: 'WAUZZZ•••••••3456',
        zulassungsstelle_id: 'kfz-berlin-labo',
        hu_bis: '2026-06-30',
        evb_nummer: '[MOCK] AX21Q8L',
        zulassung_aktenzeichen: '[MOCK] LABO-KFZ/2024-09-104221',
      },
    ],
    halter_adresse: {
      strasse: 'Friedrichstraße',
      hausnummer: '100',
      plz: '10117',
      ort: 'Berlin',
      uebergangs_marker_via_umzug: true,
      uebergangs_marker_seit: '2026-05-08T11:24:00.000Z',
      via_umzug_vorgang_id: 'vg-anna-umzug-skalitzer-friedrichstr',
    },
  },

  // -------------------------------------------------------------------------
  // Markus Schmidt (Hamburg) — Pflichtumtausch-Wow (Stichtag 19.01.2027)
  // -------------------------------------------------------------------------
  'markus-schmidt': {
    fahrerlaubnis: {
      fe_nr: '[MOCK] J0512SCH08X1',
      bundesland_kennzeichen: 'J',
      fe_behoerde_id: 'fe-hamburg-lbv',
      klassen: [
        { klasse: 'B', erteilt_am: '2002-09-17', schluesselzahlen: [] },
        { klasse: 'BE', erteilt_am: '2010-04-22', schluesselzahlen: [] },
      ],
      ausstellungsdatum: '2002-09-17',
      pflichtumtausch_stichtag: '2027-01-19',
      pflichtumtausch_status: 'frist_aktiv',
      fe_aktenzeichen: '[MOCK] LBV-HH-FE/2002-09-007751',
    },
    halter: [
      {
        kennzeichen: '[MOCK] HH-SC 142',
        marke: 'VW',
        modell: 'Touran',
        baujahr: '2021',
        fin_voll: '[MOCK] WVWZZZ16MA0028842',
        fin_masked: 'WVWZZZ•••••••8842',
        zulassungsstelle_id: 'kfz-hamburg-lbv',
        hu_bis: '2027-09-15',
        evb_nummer: '[MOCK] VB47K3M',
        zulassung_aktenzeichen: '[MOCK] LBV-HH-KFZ/2021-04-08842',
        mitnutzer: [{ vorname: 'Lena', nachname: 'Schmidt' }],
      },
    ],
    halter_adresse: {
      strasse: 'Eppendorfer Weg',
      hausnummer: '212',
      plz: '20251',
      ort: 'Hamburg',
      uebergangs_marker_via_umzug: false,
    },
  },

  // -------------------------------------------------------------------------
  // Mehmet Yıldız (Köln) — i-Kfz-Stufe-4-Hook; Pflichtumtausch erledigt
  // 14.01.2025 (5 Tage vor Stichtag 19.01.2025) — Erfolgs-Persona-Variante.
  // -------------------------------------------------------------------------
  'mehmet-yildiz': {
    fahrerlaubnis: {
      fe_nr: '[MOCK] N0428MEH47K2',
      bundesland_kennzeichen: 'N',
      fe_behoerde_id: 'fe-koeln-stadt',
      klassen: [
        { klasse: 'B', erteilt_am: '2010-11-15', schluesselzahlen: [] },
        {
          klasse: 'C1',
          erteilt_am: '2015-06-08',
          gueltig_bis: '2030-01-19',
          schluesselzahlen: ['95'],
        },
        { klasse: 'BE', erteilt_am: '2015-06-08', schluesselzahlen: [] },
      ],
      ausstellungsdatum: '2010-11-15',
      pflichtumtausch_stichtag: '2025-01-19',
      pflichtumtausch_status: 'umtausch_erfolgt',
      pflichtumtausch_erfolgt_am: '2025-01-14',
      fe_aktenzeichen: '[MOCK] STADT-K/STR-FE-2025-01-002831',
    },
    halter: [
      {
        kennzeichen: '[MOCK] K-VR 8088E',
        marke: 'Hyundai',
        modell: 'Kona Elektro',
        baujahr: '2024',
        fin_voll: '[MOCK] KMHKM81GFNU440742',
        fin_masked: 'KMHK•••••••••0742',
        zulassungsstelle_id: 'kfz-koeln-stadt',
        hu_bis: '2027-04-20',
        evb_nummer: '[MOCK] AX99H1L',
        zulassung_aktenzeichen: '[MOCK] STADT-K/STR-KFZ-2024-09-211487',
      },
      {
        kennzeichen: '[MOCK] K-MY 4711',
        marke: 'Mercedes',
        modell: 'Sprinter',
        baujahr: '2019',
        fin_voll: '[MOCK] WDB9061331R348123',
        fin_masked: 'WDB9•••••••••8123',
        zulassungsstelle_id: 'kfz-koeln-stadt',
        hu_bis: '2026-11-15',
        evb_nummer: '[MOCK] HV21M8K',
        zulassung_aktenzeichen: '[MOCK] STADT-K/STR-KFZ-2019-03-118099',
      },
    ],
    halter_adresse: {
      strasse: 'Venloer Straße',
      hausnummer: '388',
      plz: '50825',
      ort: 'Köln',
      uebergangs_marker_via_umzug: false,
    },
  },
};

/**
 * Mock-Werte für `getPunktestandOnDemand` (FAER). Lena Schmidt n/a (kein FE).
 * Werte aus Spec § 6.2 / OQ-3-Resolution: Anna 0, Schmidt 0, Mehmet 1.
 *
 * Niemals in `localStorage` schreiben — Result hat TTL 5 min component-local
 * (HL-MOB-11 / VL-8).
 */
export const PUNKTE_MOCK: Record<PersonaId, 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = {
  'anna-petrov': 0,
  'markus-schmidt': 0,
  'mehmet-yildiz': 1,
};

/**
 * Mock-Stand-Datum für FAER-Eintragungen (Stand-Stempel). Verbatim aus
 * FAER-Mock-Brief `letter-faer-auskunft-pdf-mehmet-2026-05` (§ 5.7.3).
 */
export const PUNKTE_STICHTAG_MOCK: Record<PersonaId, string> = {
  'anna-petrov': '2026-03-31',
  'markus-schmidt': '2026-03-15',
  'mehmet-yildiz': '2024-03-16',
};
