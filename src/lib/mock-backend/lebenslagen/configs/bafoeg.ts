/**
 * Lebenslage `bafoeg` — Ausbildungsförderung. Spec §3.5.
 *
 * mode: antrag · zukunft: false.
 * Realismus (verdict-CONFIRMED §3.5/§8): NICHT antragslos. KEIN automatischer
 * Einkommens-Prefill vom Finanzamt (BZSt-Abgleich = NACHGELAGERTE
 * Missbrauchskontrolle → Schritt markiert [ZUKUNFT] + consent). Formblatt 2 =
 * Hochschule reicht separat ein (kein Echtzeit-Bestätigungsbrief). Zuständig =
 * studierendenWERK-AfA (§ 45 Abs. 3/4), NICHT Bezirk/Bürgeramt. BAföG Digital ≠
 * BundID-Postfach. Bewilligung nicht garantiert (kann 0 € sein). Förderungsnummer
 * erst MIT Bescheid. Elterneinkommen NICHT eingespart.
 */
import type { LebenslageConfig } from '../types';

export const bafoegConfig: LebenslageConfig = {
  slug: 'bafoeg',
  vorgangTyp: 'bafoeg',
  icon: 'graduation-cap',
  kategorie: 'arbeit',
  mode: 'antrag',
  zukunft: false,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/bafoeg',
  zustaendige_behoerden: [
    'afa-stw-berlin',
    'hochschule-immatrikulationsamt',
    'finanzamt-berlin-mitte-tiergarten',
    'bzst',
  ],
  voraussetzungen_keys: [
    'lebenslagen.bafoeg.voraussetzungen.0',
    'lebenslagen.bafoeg.voraussetzungen.1',
    'lebenslagen.bafoeg.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.bafoeg.dokumente.0',
    'lebenslagen.bafoeg.dokumente.1',
    'lebenslagen.bafoeg.dokumente.2',
  ],
  formFields: [
    {
      key: 'name',
      typ: 'text',
      prefill: { path: 'nachname', label_de: 'Ihre Stammdaten' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'geburtsdatum',
      typ: 'date',
      prefill: { path: 'geburtsdatum', label_de: 'Ihre Stammdaten' },
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
      key: 'steuerId',
      typ: 'text',
      prefill: { path: 'steuer_id', label_de: 'BZSt (§ 139b AO)' },
      datenkategorie: 'Steuer-ID',
      required: true,
    },
    {
      key: 'staatsangehoerigkeit',
      typ: 'text',
      prefill: { path: 'staatsangehoerigkeit', label_de: 'Melderegister (§ 3 BMG) · § 8 BAföG' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'iban',
      typ: 'iban',
      prefill: { path: 'bankverbindung.iban', label_de: 'Ihre Stammdaten' },
      datenkategorie: 'Bankverbindung',
      required: true,
      validate: 'iban',
    },
    {
      key: 'kvNachweis',
      typ: 'text',
      prefill: {
        path: 'krankenversicherung.versichertennummer',
        label_de: 'Ihre Stammdaten (Krankenversicherung)',
      },
      datenkategorie: 'Krankenversicherung',
      required: true,
    },
    // Nutzerangabe, verifiziert via Formblatt 2 (Hochschule reicht separat ein).
    {
      key: 'hochschuleStudiengang',
      typ: 'text',
      prefill: {
        path: null,
        label_de: 'Ihre Angabe (verifiziert via Formblatt 2)',
        user_decision: true,
      },
      datenkategorie: 'Identität',
      required: true,
      validate: 'nonempty',
    },
    // NOT prefillable: Elterneinkommen (Formblatt 3 + Steuerbescheid).
    {
      key: 'elterneinkommen',
      typ: 'upload',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe (Formblatt 3 + Steuerbescheid der Eltern)',
        user_decision: true,
      },
      datenkategorie: 'Einkommen',
      required: true,
      upload_mock: true,
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 46 BAföG', bedeutung_key: 'lebenslagen.bafoeg.rechtsgrundlagen.bafoeg46.bedeutung' },
    { norm: '§ 9 BAföG', bedeutung_key: 'lebenslagen.bafoeg.rechtsgrundlagen.bafoeg9.bedeutung' },
    { norm: '§ 24 BAföG', bedeutung_key: 'lebenslagen.bafoeg.rechtsgrundlagen.bafoeg24.bedeutung' },
    { norm: '§ 51 Abs. 2 BAföG', bedeutung_key: 'lebenslagen.bafoeg.rechtsgrundlagen.bafoeg51.bedeutung' },
    { norm: '§ 41 Abs. 4 BAföG · § 45d EStG', bedeutung_key: 'lebenslagen.bafoeg.rechtsgrundlagen.abgleich.bedeutung' },
  ],
  // Keine Ausschlussfrist, aber Förderung erst ab Antragsmonat; § 51 Abs. 2.
  frist: { tage: 70, beschreibung_key: 'lebenslagen.bafoeg.frist_beschreibung' },
  gebuehr: { gibt_es: false, hinweis_key: 'lebenslagen.bafoeg.gebuehr_hinweis' },
  cascade: [
    {
      id: 'afa-erstantrag',
      behoerdeId: 'afa-stw-berlin',
      block: 'D',
      gate: 'eid',
      aktion: 'BAföG-Erstantrag (Formblatt 1) via BAföG Digital einreichen',
      agentLabel: 'Wir reichen mit Ihrer eID den BAföG-Erstantrag (Formblatt 1) beim AfA ein',
      rechtsgrundlage: '§ 46 BAföG · § 45 Abs. 3 BAföG · § 18 PAuswG',
      datenkategorien: ['Identität', 'Anschrift', 'Steuer-ID', 'Bankverbindung'],
      aktenzeichen: '[MOCK] 702-014711',
      isPrimarySubmission: true,
      latencyMs: 700,
      mints: {
        document: {
          typ: 'antragsbestaetigung',
          titelTemplate: '[MOCK] Eingangsbestätigung BAföG-Erstantrag — {name}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'hochschule-formblatt2',
      behoerdeId: 'hochschule-immatrikulationsamt',
      block: 'B',
      gate: 'consent',
      aktion: 'Bescheinigung nach § 9 BAföG (Formblatt 2) anfordern (Hochschule reicht direkt ein)',
      agentLabel: 'Mit Ihrer Einwilligung fordern wir die Bescheinigung nach § 9 BAföG bei der Hochschule an',
      rechtsgrundlage: '§ 9 BAföG',
      datenkategorien: ['Identität'],
      latencyMs: 1000,
      mints: {
        document: {
          typ: 'studienbescheinigung',
          titelTemplate: '[MOCK] Bescheinigung nach § 9 BAföG (Formblatt 2) — {name}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'finanzamt-elterneinkommen',
      behoerdeId: 'finanzamt-berlin-mitte-tiergarten',
      block: 'B',
      gate: 'consent',
      aktion:
        'Elterneinkommen (Steuerbescheid vorletztes Jahr) per Register-Abruf — heute manuell, nur mit Einwilligung',
      agentLabel: 'Mit Ihrer Einwilligung würden wir das Elterneinkommen beim Finanzamt abrufen (heute manuell)',
      rechtsgrundlage: '§ 24 BAföG · Art. 6 Abs. 1 lit. a DSGVO',
      datenkategorien: ['Einkommen'],
      zukunft: true,
      latencyMs: 1200,
      mints: {},
    },
    {
      id: 'afa-bescheid',
      behoerdeId: 'afa-stw-berlin',
      block: 'A',
      gate: 'auto',
      aktion: 'Amt prüft, vergibt Förderungsnummer, erlässt Bescheid; bei Verzug 80 % Abschlag',
      agentLabel: 'Das AfA prüft Ihren Antrag, vergibt die Förderungsnummer und erlässt den Bescheid',
      rechtsgrundlage: '§ 50 BAföG · § 51 Abs. 2 BAföG',
      datenkategorien: ['Identität', 'Einkommen', 'Bankverbindung'],
      aktenzeichen: '[MOCK] 702-014711',
      latencyMs: 1400,
      mints: {
        letter: {
          absender: 'Amt für Ausbildungsförderung beim studierendenWERK BERLIN',
          betreffTemplate: 'BAföG-Bescheid — Förderungsnummer {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit haben wir Ihren BAföG-Erstantrag geprüft. Ihre Förderungsnummer lautet {az}. Höhe und Bewilligungszeitraum entnehmen Sie dem beigefügten Bescheid; bei Bearbeitungsverzug erfolgt ab dem {datum} ein Abschlag von 80 % (§ 51 Abs. 2 BAföG). Eine Bewilligung ist nicht garantiert und kann 0 € betragen.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Amt für Ausbildungsförderung, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
    {
      id: 'bzst-missbrauchskontrolle',
      behoerdeId: 'bzst',
      block: 'A',
      gate: 'auto',
      aktion: 'NACHGELAGERT: Datenabgleich zur Missbrauchskontrolle (kein Prefill, keine Aktion)',
      agentLabel: 'Nachgelagert gleicht das BZSt die Daten zur Missbrauchskontrolle ab (ohne Ihr Zutun)',
      rechtsgrundlage: '§ 41 Abs. 4 BAföG · § 45d EStG',
      datenkategorien: ['Identität'],
      latencyMs: 1300,
      mints: {},
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 3,
    minuten_gespart: 95,
    hinweis_key: 'lebenslagen.bafoeg.value_receipt_hinweis',
  },
};
