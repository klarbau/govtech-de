/**
 * Lebenslage `reisepass` — Reisepass / Personalausweis. Spec §3.4.
 *
 * mode: termin · zukunft: false.
 * Realismus (verdict-CORRECTED §3.4/§8): KEIN Online-Antrag — persönliche
 * Vorsprache ist für den GESAMTEN Antrag Pflicht (§ 5 Abs. 9 PAuswG); eID ist
 * das Ergebnis, kein Antragskanal. mode MUSS `termin` bleiben. Nie „Pass wurde
 * beantragt/eingereicht" → nur „vorbereitet + Termin vorgemerkt". Personalausweis
 * 46 € / 27,60 € (NEU seit 07.02.2026), KEIN Perso-Express. Lichtbild digital seit
 * 01.05.2025, nicht aus Register. Statusmonitor = [ZUKUNFT]. Biometrisches
 * Lichtbild + zwei Fingerabdrücke + bisheriges Dokument = user_decision/vor-Ort.
 */
import type { LebenslageConfig } from '../types';

export const reisepassConfig: LebenslageConfig = {
  slug: 'reisepass',
  vorgangTyp: 'reisepass',
  icon: 'book-marked',
  kategorie: 'mehr',
  mode: 'termin',
  zukunft: false,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/reisepass',
  zustaendige_behoerden: [
    'buergeramt-berlin-mitte',
    'bundesdruckerei',
    'buergeramt-berlin-friedrichshain-kreuzberg',
  ],
  voraussetzungen_keys: [
    'lebenslagen.reisepass.voraussetzungen.0',
    'lebenslagen.reisepass.voraussetzungen.1',
    'lebenslagen.reisepass.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.reisepass.dokumente.0',
    'lebenslagen.reisepass.dokumente.1',
    'lebenslagen.reisepass.dokumente.2',
  ],
  formFields: [
    {
      key: 'name',
      typ: 'text',
      prefill: { path: 'nachname', label_de: 'Melderegister (§ 3 Abs. 1 BMG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'geburtsdatum',
      typ: 'date',
      prefill: { path: 'geburtsdatum', label_de: 'Melderegister (§ 3 Abs. 1 BMG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'geburtsort',
      typ: 'text',
      prefill: { path: 'geburtsort', label_de: 'Melderegister (§ 3 Abs. 1 BMG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'staatsangehoerigkeit',
      typ: 'text',
      prefill: { path: 'staatsangehoerigkeit', label_de: 'Melderegister (§ 3 Abs. 1 BMG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'anschrift',
      typ: 'text',
      prefill: { path: 'adresse', label_de: 'Melderegister (§ 3 Abs. 1 BMG)' },
      datenkategorie: 'Anschrift',
      required: true,
    },
    {
      key: 'dokumentauswahl',
      typ: 'select',
      prefill: { path: null, label_de: 'Ihre Auswahl (Reisepass / Personalausweis)', user_decision: true },
      datenkategorie: 'Identität',
      required: true,
    },
    // NOT prefillable — vor Ort: Lichtbild, Fingerabdrücke, bisheriges Dokument.
    {
      key: 'lichtbild',
      typ: 'upload',
      prefill: { path: null, label_de: 'Vor Ort (biometrisches Lichtbild)', user_decision: true },
      datenkategorie: 'Identität',
      required: true,
      upload_mock: true,
    },
    {
      key: 'fingerabdruecke',
      typ: 'checkbox',
      prefill: { path: null, label_de: 'Vor Ort (zwei Fingerabdrücke)', user_decision: true },
      datenkategorie: 'Identität',
      required: true,
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 6 PassG / § 9 PAuswG', bedeutung_key: 'lebenslagen.reisepass.rechtsgrundlagen.passg.bedeutung' },
    { norm: '§ 5 Abs. 9 PAuswG', bedeutung_key: 'lebenslagen.reisepass.rechtsgrundlagen.vorsprache.bedeutung' },
    { norm: 'VO (EU) 2019/1157', bedeutung_key: 'lebenslagen.reisepass.rechtsgrundlagen.eu.bedeutung' },
    { norm: '§ 3 Abs. 1 BMG', bedeutung_key: 'lebenslagen.reisepass.rechtsgrundlagen.bmg.bedeutung' },
  ],
  // Keine Antragsfrist, aber harte faktische Frist über gültig_bis; Trigger ~8–12 Wo.
  frist: { tage: null, beschreibung_key: 'lebenslagen.reisepass.frist_beschreibung' },
  gebuehr: {
    gibt_es: true,
    betrag_key: 'lebenslagen.reisepass.gebuehr_betrag',
    hinweis_key: 'lebenslagen.reisepass.gebuehr_hinweis',
  },
  cascade: [
    {
      id: 'buergeramt-antrag-vorbereiten',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: 'Antrag aus Melderegister/Stammdaten vorbereiten + zuständige Behörde bestimmen',
      agentLabel: 'Wir bereiten Ihren Antrag aus dem Melderegister vor und bestimmen die zuständige Behörde',
      rechtsgrundlage: '§ 3 Abs. 1 BMG · Art. 5 Abs. 1 lit. c DSGVO',
      datenkategorien: ['Identität', 'Anschrift'],
      latencyMs: 700,
      mints: {
        document: {
          typ: 'antrag_vorbereitet',
          titelTemplate: '[MOCK] Vorbereiteter Pass-/Ausweisantrag — {name}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'buergeramt-termin-vormerken',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'D',
      gate: 'eid',
      aktion: 'Frist-aware Vorsprache-Termin finden + vormerken',
      agentLabel: 'Wir finden einen Vorsprache-Termin vor Ablauf und merken ihn für Sie vor',
      rechtsgrundlage: '§ 9 PAuswG / § 6 PassG · § 18 PAuswG',
      datenkategorien: ['Identität', 'Anschrift'],
      aktenzeichen: '[MOCK] BA-MITTE/PASS-2026-04-0061734',
      isPrimarySubmission: true,
      latencyMs: 900,
      mints: {
        termin: {
          betreff: 'Vorsprache Reisepass / Personalausweis',
          ort_details:
            'Bürgeramt Mitte (Müllerstraße) — [MOCK] Termin vorgemerkt, bitte bestätigen',
          status: 'vorgeschlagen',
        },
      },
    },
    {
      id: 'buergeramt-vorsprache',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'D',
      gate: 'eid',
      aktion:
        'Vor-Ort-Vorsprache (Biometrie/Fingerabdrücke) — vom System nur vorbereitet, NICHT ersetzbar',
      agentLabel: 'Die Biometrie-Vorsprache nehmen Sie persönlich wahr — wir bereiten alles vor',
      rechtsgrundlage: '§ 5 Abs. 9 PAuswG · VO (EU) 2019/1157',
      datenkategorien: ['Identität'],
      latencyMs: 1000,
      mints: {},
    },
    {
      id: 'bundesdruckerei-produktion',
      behoerdeId: 'bundesdruckerei',
      block: 'A',
      gate: 'auto',
      aktion: 'Produktionsstatus verfolgen (3–4 Wochen; Express-Pass 3–6 Werktage)',
      agentLabel: 'Wir verfolgen den Produktionsstatus bei der Bundesdruckerei',
      rechtsgrundlage: '§ 6 PassG / § 9 PAuswG · OZG-Statusmonitor',
      datenkategorien: ['Identität'],
      zukunft: true,
      latencyMs: 1200,
      mints: {},
    },
    {
      id: 'bundesdruckerei-direktversand',
      behoerdeId: 'bundesdruckerei',
      block: 'B',
      gate: 'consent',
      aktion: 'Direktversand nach Hause (kostenpflichtig, ab 16) statt Abholung',
      agentLabel: 'Mit Ihrer Einwilligung lassen wir das Dokument direkt nach Hause senden',
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO · § 16 PassG',
      datenkategorien: ['Identität', 'Anschrift'],
      latencyMs: 1100,
      mints: {},
    },
    {
      id: 'buergeramt-benachrichtigung',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: 'Abhol-/Versandbenachrichtigung → Posteingang + Dokument im Tresor [MOCK]',
      agentLabel: 'Wir benachrichtigen Sie zur Abholung und legen das Dokument im Tresor ab',
      rechtsgrundlage: '§ 9 PAuswG / § 6 PassG',
      datenkategorien: ['Identität'],
      aktenzeichen: '[MOCK] C01X00T47',
      latencyMs: 1300,
      mints: {
        letter: {
          absender: 'Bezirksamt Mitte von Berlin — Bürgeramt',
          betreffTemplate: 'Ihr Dokument ist abholbereit — Seriennr. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit ist Ihr Dokument (Seriennr. {az}) ab {datum} im Bürgeramt abholbereit bzw. wird auf Wunsch direkt versandt. Bitte bringen Sie zur Abholung Ihr bisheriges Dokument mit.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Bürgeramt Mitte, Az. {az}',
          archetype: 'mitteilung',
        },
        document: {
          typ: 'pass_status',
          titelTemplate: '[MOCK] Pass-/Ausweis-Status — Seriennr. {az}',
          eudi_compatible: false,
        },
      },
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 1,
    minuten_gespart: 75,
    hinweis_key: 'lebenslagen.reisepass.value_receipt_hinweis',
  },
};
