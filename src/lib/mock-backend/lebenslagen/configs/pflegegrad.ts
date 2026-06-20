/**
 * Lebenslage `pflegegrad` — Pflegegrad / Leistungen der Pflegeversicherung. Spec §3.6.
 *
 * mode: antrag · zukunft: true (die digitale eID-Hülle ist spekulativ; der
 * Pflegekasse→MD-Push ist heute REAL).
 * Realismus (verdict-CORRECTED §-split §3.6/§8): Antrag → Pflegekasse (§ 33);
 * der MD wird von der KASSE beauftragt, nie vom Bürger direkt (§ 18). Pflegegrad
 * nur via MD-Hausbesuch (§ 18a) — nie auto-„errechnen", nur [MOCK]-Platzhalter.
 * Frist = Behörden-Frist (§ 18c, 25 Arbeitstage; 70 €/Woche schuldet die KASSE,
 * Richtung nicht umgekehrt). Arbeitstage, nicht Werktage. Art-9-Gesundheitsdaten
 * nur mit ausdrücklicher Einwilligung; kein automatischer ePA-Abruf ([ZUKUNFT]).
 * Der Pflegekasse→MD-Hop (#3) ist `auto` und REAL (nicht ZUKUNFT).
 */
import type { LebenslageConfig } from '../types';

export const pflegegradConfig: LebenslageConfig = {
  slug: 'pflegegrad',
  vorgangTyp: 'pflegegrad',
  icon: 'heart-handshake',
  kategorie: 'mehr',
  mode: 'antrag',
  zukunft: true,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/pflegegrad',
  zustaendige_behoerden: [
    'aok-nordost-pflegekasse',
    'md-berlin-brandenburg',
    'buergeramt-berlin-mitte',
    'bzst',
  ],
  voraussetzungen_keys: [
    'lebenslagen.pflegegrad.voraussetzungen.0',
    'lebenslagen.pflegegrad.voraussetzungen.1',
    'lebenslagen.pflegegrad.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.pflegegrad.dokumente.0',
    'lebenslagen.pflegegrad.dokumente.1',
  ],
  formFields: [
    {
      key: 'name',
      typ: 'text',
      prefill: { path: 'nachname', label_de: 'Melderegister (§ 3 BMG) / eID' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'geburtsdatum',
      typ: 'date',
      prefill: { path: 'geburtsdatum', label_de: 'Melderegister (§ 3 BMG) / eID' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'anschrift',
      typ: 'text',
      prefill: { path: 'adresse', label_de: 'Melderegister (§ 3 BMG)' },
      datenkategorie: 'Anschrift',
      required: true,
    },
    {
      key: 'kvnr',
      typ: 'text',
      prefill: {
        path: 'krankenversicherung.versichertennummer',
        label_de: 'Versichertenkonto / eGK',
      },
      datenkategorie: 'Krankenversicherung',
      required: true,
    },
    {
      key: 'pflegekasse',
      typ: 'text',
      prefill: {
        path: 'krankenversicherung.traeger',
        label_de: 'Abgeleitet aus Ihrer Krankenversicherung (§ 46 SGB XI)',
      },
      datenkategorie: 'Krankenversicherung',
      required: true,
    },
    // NOT prefillable: Vollmacht/Betreuung, ärztliche Befunde (Art-9), Pflegetagebuch.
    {
      key: 'vollmacht',
      typ: 'upload',
      prefill: { path: null, label_de: 'Ihr Upload (Vollmacht / Betreuung, falls vorhanden)', user_decision: true },
      datenkategorie: 'Identität',
      required: false,
      upload_mock: true,
    },
    {
      key: 'aerztlicheBefunde',
      typ: 'upload',
      prefill: {
        path: null,
        label_de: 'Ihr Upload mit Einwilligung (ärztliche Befunde — Gesundheitsdaten)',
        user_decision: true,
      },
      datenkategorie: 'Gesundheitsdaten',
      required: false,
      upload_mock: true,
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 33 Abs. 1 SGB XI', bedeutung_key: 'lebenslagen.pflegegrad.rechtsgrundlagen.sgbxi33.bedeutung' },
    { norm: '§ 18 SGB XI', bedeutung_key: 'lebenslagen.pflegegrad.rechtsgrundlagen.sgbxi18.bedeutung' },
    { norm: '§ 18a SGB XI', bedeutung_key: 'lebenslagen.pflegegrad.rechtsgrundlagen.sgbxi18a.bedeutung' },
    { norm: '§ 18c SGB XI', bedeutung_key: 'lebenslagen.pflegegrad.rechtsgrundlagen.sgbxi18c.bedeutung' },
    { norm: '§§ 14, 15 SGB XI', bedeutung_key: 'lebenslagen.pflegegrad.rechtsgrundlagen.sgbxi1415.bedeutung' },
  ],
  // Behörden-Frist § 18c Abs. 1 SGB XI: 25 Arbeitstage; sonst 70 €/Woche schuldet die Kasse.
  frist: { tage: 25, beschreibung_key: 'lebenslagen.pflegegrad.frist_beschreibung' },
  gebuehr: { gibt_es: false, hinweis_key: 'lebenslagen.pflegegrad.gebuehr_hinweis' },
  cascade: [
    {
      id: 'pflegekasse-erstantrag',
      behoerdeId: 'aok-nordost-pflegekasse',
      block: 'D',
      gate: 'eid',
      aktion: 'Pflegegrad-Erstantrag bei der Pflegekasse einreichen',
      agentLabel: 'Wir reichen mit Ihrer eID den Pflegegrad-Erstantrag bei der Pflegekasse ein',
      rechtsgrundlage: '§ 33 Abs. 1 SGB XI · § 18 PAuswG',
      datenkategorien: ['Identität', 'Anschrift', 'Krankenversicherung'],
      aktenzeichen: '[MOCK] AOK-PK-NO/2026/PG-0471132',
      isPrimarySubmission: true,
      latencyMs: 700,
      mints: {
        letter: {
          absender: 'AOK Nordost — Pflegekasse',
          betreffTemplate: 'Eingangsbestätigung Pflegegrad-Antrag — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit bestätigen wir den Eingang Ihres Pflegegrad-Erstantrags am {datum}. Az. {az}. Das gesetzliche Antragsdatum ist zugleich Ihr Leistungsbeginn (§ 33 Abs. 1 S. 4 SGB XI). Wir beauftragen den Medizinischen Dienst mit der Begutachtung.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, AOK Nordost — Pflegekasse, Az. {az}',
          archetype: 'eingangsbestaetigung',
        },
      },
    },
    {
      id: 'pflegekasse-eingangsbestaetigung',
      behoerdeId: 'aok-nordost-pflegekasse',
      block: 'A',
      gate: 'auto',
      aktion: 'Eingangsbestätigung + gesetzliches Antragsdatum (= Leistungsbeginn)',
      agentLabel: 'Die Pflegekasse bestätigt das Antragsdatum — Ihr Leistungsbeginn',
      rechtsgrundlage: '§ 33 Abs. 1 S. 4 SGB XI',
      datenkategorien: ['Identität'],
      latencyMs: 900,
      mints: {
        letter: {
          absender: 'AOK Nordost — Pflegekasse',
          betreffTemplate: 'Antragsdatum und Leistungsbeginn — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nwir bestätigen, dass Ihr Antrag am {datum} eingegangen ist. Dieses Datum gilt als Leistungsbeginn (§ 33 Abs. 1 S. 4 SGB XI). Az. {az}.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, AOK Nordost — Pflegekasse, Az. {az}',
          archetype: 'mitteilung',
        },
      },
    },
    {
      id: 'md-begutachtungsauftrag',
      behoerdeId: 'md-berlin-brandenburg',
      block: 'A',
      gate: 'auto',
      aktion: 'Begutachtungsauftrag von Kasse an MD (binnen 3 Arbeitstagen) — REAL, kein ZUKUNFT',
      agentLabel: 'Die Pflegekasse beauftragt den Medizinischen Dienst mit der Begutachtung',
      rechtsgrundlage: '§ 18 SGB XI',
      datenkategorien: ['Identität', 'Krankenversicherung'],
      latencyMs: 1100,
      mints: {},
    },
    {
      id: 'md-hausbesuch-termin',
      behoerdeId: 'md-berlin-brandenburg',
      block: 'B',
      gate: 'consent',
      aktion: 'Hausbesuch-Begutachtungstermin vorschlagen (MD vergibt)',
      agentLabel: 'Mit Ihrer Einwilligung schlägt der MD einen Hausbesuch-Begutachtungstermin vor',
      rechtsgrundlage: '§ 18a SGB XI · Art. 6 Abs. 1 lit. a DSGVO',
      datenkategorien: ['Identität', 'Anschrift', 'Gesundheitsdaten'],
      aktenzeichen: '[MOCK] MD-BB/2026/G-884217',
      latencyMs: 1200,
      mints: {
        termin: {
          betreff: 'MD-Begutachtung Pflegegrad (Hausbesuch)',
          ort_details:
            'Medizinischer Dienst Berlin-Brandenburg — [MOCK] Hausbesuch vorgeschlagen, MD bestätigt',
          status: 'vorgeschlagen',
        },
      },
    },
    {
      id: 'pflegekasse-bescheid',
      behoerdeId: 'aok-nordost-pflegekasse',
      block: 'A',
      gate: 'auto',
      aktion: 'Bescheid über Pflegegrad (1–5) auf MD-Gutachten — binnen 25 Arbeitstagen',
      agentLabel: 'Die Pflegekasse erlässt den Bescheid über Ihren Pflegegrad (auf MD-Gutachten)',
      rechtsgrundlage: '§ 18c Abs. 1 · §§ 14, 15 SGB XI',
      datenkategorien: ['Identität', 'Gesundheitsdaten'],
      aktenzeichen: '[MOCK] AOK-PK-NO/2026/PG-0471132',
      latencyMs: 1400,
      mints: {
        letter: {
          absender: 'AOK Nordost — Pflegekasse',
          betreffTemplate: 'Bescheid über den Pflegegrad — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nauf Grundlage des Gutachtens des Medizinischen Dienstes setzen wir Ihren Pflegegrad fest: [MOCK – Pflegegrad wird ausschließlich nach MD-Hausbesuch festgestellt]. Az. {az}. Die Entscheidung ergeht innerhalb der gesetzlichen Frist von 25 Arbeitstagen (§ 18c Abs. 1 SGB XI).\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, AOK Nordost — Pflegekasse, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
    {
      id: 'pflegekasse-folgeleistungen',
      behoerdeId: 'aok-nordost-pflegekasse',
      block: 'B',
      gate: 'consent',
      aktion:
        'Folgeleistungen: Pflegegeld, Pflicht-Beratungseinsatz, Pflegehilfsmittel (42 €/Monat)',
      agentLabel: 'Mit Ihrer Einwilligung richten wir Folgeleistungen ein (Pflegegeld, Hilfsmittel)',
      rechtsgrundlage: '§ 37 / § 37 Abs. 3 / § 40 Abs. 2 SGB XI',
      datenkategorien: ['Identität', 'Bankverbindung'],
      latencyMs: 1300,
      mints: {
        letter: {
          absender: 'AOK Nordost — Pflegekasse',
          betreffTemplate: 'Einrichtung Folgeleistungen — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nwir richten zum {datum} die von Ihnen gewählten Folgeleistungen ein (Pflegegeld nach § 37, Pflichtberatungseinsatz nach § 37 Abs. 3, Pflegehilfsmittel bis 42 €/Monat nach § 40 Abs. 2 SGB XI). Az. {az}.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, AOK Nordost — Pflegekasse, Az. {az}',
          archetype: 'mitteilung',
        },
      },
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 3,
    minuten_gespart: 210,
    hinweis_key: 'lebenslagen.pflegegrad.value_receipt_hinweis',
  },
};
