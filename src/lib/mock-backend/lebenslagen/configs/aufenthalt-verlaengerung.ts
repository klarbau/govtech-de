/**
 * Lebenslage `aufenthalt-verlaengerung` — Aufenthaltstitel verlängern. Spec §3.2.
 *
 * mode: hybrid · zukunft: true (eAT/AZR/Biometrie-Schritte sind 2027).
 * Realismus (verdict-CONFIRMED §3.2/§8): bürgergetrieben + eID; KEIN
 * Melderegister→ABH-Push. Termin = vorgemerkt, nie „gebucht". AZR-Abfrage
 * unsichtbar/intern (kein BAMF-Postfach-Brief). Fortgeltungsfiktion knüpft an
 * rechtzeitige Antragstellung, nicht an den Termin. eAT-Produktion erst NACH
 * Vorsprache. Pass-Scan + biometrisches Lichtbild = user_decision/upload.
 * Gebühr ist real (93 €). Biometrie-Vorsprache wird NICHT eingespart.
 */
import type { LebenslageConfig } from '../types';

export const aufenthaltVerlaengerungConfig: LebenslageConfig = {
  slug: 'aufenthalt-verlaengerung',
  vorgangTyp: 'aufenthaltstitel-verlaengerung',
  icon: 'globe',
  kategorie: 'migration',
  mode: 'hybrid',
  zukunft: true,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/aufenthalt-verlaengerung',
  zustaendige_behoerden: [
    'abh-berlin-lea',
    'aok-nordost',
    'arbeitgeber-mittelstand-software',
    'bamf',
    'bundesdruckerei',
  ],
  voraussetzungen_keys: [
    'lebenslagen.aufenthalt-verlaengerung.voraussetzungen.0',
    'lebenslagen.aufenthalt-verlaengerung.voraussetzungen.1',
    'lebenslagen.aufenthalt-verlaengerung.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.aufenthalt-verlaengerung.dokumente.0',
    'lebenslagen.aufenthalt-verlaengerung.dokumente.1',
    'lebenslagen.aufenthalt-verlaengerung.dokumente.2',
    'lebenslagen.aufenthalt-verlaengerung.dokumente.3',
  ],
  formFields: [
    {
      key: 'name',
      typ: 'text',
      prefill: { path: 'nachname', label_de: 'Ihre Stammdaten / Melderegister (§ 3 BMG)' },
      datenkategorie: 'Identität',
      required: true,
      validate: 'nonempty',
    },
    {
      key: 'geburtsdatum',
      typ: 'date',
      prefill: { path: 'geburtsdatum', label_de: 'Ihre Stammdaten / Melderegister (§ 3 BMG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'staatsangehoerigkeit',
      typ: 'text',
      prefill: { path: 'staatsangehoerigkeit', label_de: 'Melderegister (§ 3 BMG)' },
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
      key: 'eatDokumentnr',
      typ: 'text',
      prefill: { path: 'aufenthaltstitel.az', label_de: 'Ihre Stammdaten (Aufenthaltstitel)' },
      datenkategorie: 'Aufenthaltstitel',
      required: true,
    },
    {
      key: 'gueltigBis',
      typ: 'date',
      prefill: {
        path: 'aufenthaltstitel.valid_until',
        label_de: 'Ihre Stammdaten (Aufenthaltstitel)',
      },
      datenkategorie: 'Aufenthaltstitel',
      required: true,
    },
    // user_decision/upload: Pass-Scan + biometrisches Lichtbild — nie vorausgefüllt.
    {
      key: 'passScan',
      typ: 'upload',
      prefill: {
        path: null,
        label_de: 'Ihr Upload (Reisepass-Scan)',
        user_decision: true,
      },
      datenkategorie: 'Identität',
      required: true,
      upload_mock: true,
    },
    {
      key: 'lichtbild',
      typ: 'upload',
      prefill: {
        path: null,
        label_de: 'Ihr Upload (biometrisches Lichtbild)',
        user_decision: true,
      },
      datenkategorie: 'Identität',
      required: true,
      upload_mock: true,
    },
  ],
  rechtsgrundlagen: [
    {
      norm: '§ 81 Abs. 1 + Abs. 4 S. 1 AufenthG',
      bedeutung_key: 'lebenslagen.aufenthalt-verlaengerung.rechtsgrundlagen.aufenthg81.bedeutung',
    },
    { norm: '§ 18 PAuswG', bedeutung_key: 'lebenslagen.aufenthalt-verlaengerung.rechtsgrundlagen.pauswg.bedeutung' },
    { norm: '§ 45 Nr. 2 AufenthV', bedeutung_key: 'lebenslagen.aufenthalt-verlaengerung.rechtsgrundlagen.aufenthv.bedeutung' },
    { norm: '§ 73 AufenthG · AZRG', bedeutung_key: 'lebenslagen.aufenthalt-verlaengerung.rechtsgrundlagen.azrg.bedeutung' },
  ],
  // Antrag VOR Ablauf (Fortgeltungsfiktion § 81 Abs. 4 S. 1); Demo nutzt 90-Tage-Trigger.
  frist: { tage: null, beschreibung_key: 'lebenslagen.aufenthalt-verlaengerung.frist_beschreibung' },
  gebuehr: {
    gibt_es: true,
    betrag_key: 'lebenslagen.aufenthalt-verlaengerung.gebuehr_betrag',
    hinweis_key: 'lebenslagen.aufenthalt-verlaengerung.gebuehr_hinweis',
  },
  cascade: [
    {
      id: 'lea-antrag',
      behoerdeId: 'abh-berlin-lea',
      block: 'D',
      gate: 'eid',
      aktion: 'Verlängerungsantrag online stellen (vor Ablauf)',
      agentLabel: 'Wir stellen mit Ihrer eID den Verlängerungsantrag bei der Ausländerbehörde',
      rechtsgrundlage: '§ 81 Abs. 1 + Abs. 4 S. 1 AufenthG · § 18 PAuswG',
      datenkategorien: ['Identität', 'Anschrift', 'Aufenthaltstitel'],
      aktenzeichen: '[MOCK] LEA-B-2026/IV-A-7842',
      isPrimarySubmission: true,
      latencyMs: 700,
      mints: {
        document: {
          typ: 'antragsbestaetigung',
          titelTemplate: '[MOCK] Antragsbestätigung Aufenthaltstitel-Verlängerung — Az. {az}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'lea-gebuehr',
      behoerdeId: 'abh-berlin-lea',
      block: 'B',
      gate: 'consent',
      aktion: 'Antragsgebühr 93 € + Vorsprache-Entgelt [MOCK-Zahlung]',
      agentLabel: 'Mit Ihrer Einwilligung leiten wir die Gebührenzahlung (93 €) ein',
      rechtsgrundlage: '§ 45 Nr. 2 AufenthV · § 8 OZG',
      datenkategorien: ['Identität', 'Bankverbindung'],
      latencyMs: 900,
      mints: {},
    },
    {
      id: 'aok-kv-nachweis',
      behoerdeId: 'aok-nordost',
      block: 'B',
      gate: 'consent',
      aktion: 'Krankenversicherungs-Nachweis bereitstellen',
      agentLabel: 'Mit Ihrer Einwilligung holen wir den KV-Nachweis bei der AOK ein',
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO · § 18g AufenthG',
      datenkategorien: ['Identität', 'Krankenversicherung'],
      latencyMs: 1000,
      mints: {
        document: {
          typ: 'kv_nachweis',
          titelTemplate: '[MOCK] Krankenversicherungs-Nachweis — {name}',
          eudi_compatible: true,
        },
      },
    },
    {
      id: 'arbeitgeber-nachweis',
      behoerdeId: 'arbeitgeber-mittelstand-software',
      block: 'B',
      gate: 'consent',
      aktion: 'Beschäftigungs-/Gehaltsnachweis anfordern',
      agentLabel: 'Mit Ihrer Einwilligung fordern wir den Beschäftigungsnachweis beim Arbeitgeber an',
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO · § 18g AufenthG',
      datenkategorien: ['Beschäftigung', 'Einkommen'],
      latencyMs: 1100,
      mints: {
        document: {
          typ: 'beschaeftigungsnachweis',
          titelTemplate: '[MOCK] Beschäftigungs- und Gehaltsnachweis — {name}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'bamf-azr-abfrage',
      behoerdeId: 'bamf',
      block: 'A',
      gate: 'auto',
      aktion: 'AZR-Stammsatz + Sicherheitsabfrage (behörden-intern, unsichtbar)',
      agentLabel: 'Die Behörde gleicht den AZR-Stammsatz ab (intern, ohne Ihr Zutun)',
      rechtsgrundlage: '§ 73 AufenthG · AZRG',
      datenkategorien: ['Identität'],
      zukunft: true,
      latencyMs: 1200,
      mints: {},
    },
    {
      id: 'lea-fiktionsbescheinigung',
      behoerdeId: 'abh-berlin-lea',
      block: 'A',
      gate: 'auto',
      aktion: 'Fiktionsbescheinigung (§ 81 Abs. 5) als PDF — Titel bleibt gültig',
      agentLabel: 'Wir stellen Ihre Fiktionsbescheinigung aus — Ihr Titel gilt fort',
      rechtsgrundlage: '§ 81 Abs. 4 S. 1 + Abs. 5 AufenthG',
      datenkategorien: ['Identität', 'Aufenthaltstitel'],
      aktenzeichen: '[MOCK] LEA-B-2026/IV-A-Fiktion-7842',
      latencyMs: 1300,
      mints: {
        letter: {
          absender: 'Landesamt für Einwanderung Berlin (LEA)',
          betreffTemplate: 'Fiktionsbescheinigung nach § 81 Abs. 5 AufenthG — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit bestätigen wir den Eingang Ihres Verlängerungsantrags vor Ablauf Ihres Titels. Ihr bisheriger Aufenthaltstitel gilt nach § 81 Abs. 4 S. 1 AufenthG fort. Die beigefügte Fiktionsbescheinigung (§ 81 Abs. 5) ist als Nachweis bis zur Entscheidung gültig.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Landesamt für Einwanderung, Az. {az}',
          archetype: 'bescheid',
        },
        document: {
          typ: 'fiktionsbescheinigung',
          titelTemplate: '[MOCK] Fiktionsbescheinigung § 81 Abs. 5 AufenthG — Az. {az}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'lea-biometrie-termin',
      behoerdeId: 'abh-berlin-lea',
      block: 'D',
      gate: 'eid',
      aktion: 'Biometrie-Vorsprachetermin vormerken (Behörde lädt ein; KEINE Buchung)',
      agentLabel: 'Wir merken einen Biometrie-Vorsprachetermin vor — die Behörde bestätigt ihn',
      rechtsgrundlage: '§ 82 Abs. 4 AufenthG · § 18 PAuswG',
      datenkategorien: ['Identität'],
      zukunft: true,
      latencyMs: 1400,
      mints: {
        termin: {
          betreff: 'Biometrie-Vorsprache zur Aufenthaltstitel-Verlängerung',
          ort_details:
            'Landesamt für Einwanderung Berlin (LEA) — [MOCK] Termin vorgemerkt, Einladung folgt',
          status: 'vorgeschlagen',
        },
      },
    },
    {
      id: 'bundesdruckerei-eat',
      behoerdeId: 'bundesdruckerei',
      block: 'A',
      gate: 'auto',
      aktion: 'eAT-Karte produzieren (nach Vorsprache, 4–8 Wochen)',
      agentLabel: 'Die Bundesdruckerei produziert nach der Vorsprache Ihre eAT-Karte',
      rechtsgrundlage: '§ 78 AufenthG · AZRG',
      datenkategorien: ['Identität'],
      zukunft: true,
      latencyMs: 1300,
      mints: {
        document: {
          typ: 'eat_status',
          titelTemplate: '[MOCK] eAT-Produktionsstatus — Az. {az}',
          eudi_compatible: false,
        },
      },
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 2,
    minuten_gespart: 95,
    hinweis_key: 'lebenslagen.aufenthalt-verlaengerung.value_receipt_hinweis',
  },
};
