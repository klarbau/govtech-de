/**
 * Lebenslage `geburt` — Geburt eines Kindes (ELFE-Bündel). Spec §3.1.
 *
 * mode: hybrid · zukunft: true (volle Auto-Kaskade ist 2027/Bremen-only).
 * Realismus (verdict-locked §3.1/§8): ELFE ist eltern-initiiert +
 * einwilligungsbasiert, KEIN klinik-getriggerter Auto-Push → Schritte 4–6 sind
 * eid/consent, nie auto. Namensbestimmung = `user_decision` (nie vorausgefüllt).
 * Geburtsurkunde ist das Ergebnis-Dokument, kein hochgeladener Antrags-Input.
 */
import type { LebenslageConfig } from '../types';

export const geburtConfig: LebenslageConfig = {
  slug: 'geburt',
  vorgangTyp: 'kindergeburt',
  icon: 'baby',
  kategorie: 'familie',
  mode: 'hybrid',
  zukunft: true,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/geburt',
  zustaendige_behoerden: [
    'standesamt-berlin-mitte',
    'buergeramt-berlin-mitte',
    'bzst',
    'familienkasse-berlin-brandenburg',
    'elterngeldstelle-berlin-mitte',
    'aok-nordost',
  ],
  voraussetzungen_keys: [
    'lebenslagen.geburt.voraussetzungen.0',
    'lebenslagen.geburt.voraussetzungen.1',
    'lebenslagen.geburt.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.geburt.dokumente.0',
    'lebenslagen.geburt.dokumente.1',
    'lebenslagen.geburt.dokumente.2',
  ],
  formFields: [
    {
      key: 'elternname',
      typ: 'text',
      prefill: { path: 'nachname', label_de: 'Melderegister (§ 3 BMG) / eID' },
      datenkategorie: 'Identität',
      required: true,
      validate: 'nonempty',
    },
    {
      key: 'anschrift',
      typ: 'text',
      prefill: { path: 'adresse', label_de: 'Melderegister (§ 3 BMG)' },
      datenkategorie: 'Anschrift',
      required: true,
    },
    {
      key: 'familienstand',
      typ: 'text',
      prefill: {
        path: 'familienstand',
        label_de: 'Melderegister (§ 3 Abs. 1 Nr. 8 BMG)',
      },
      datenkategorie: 'Familienstand',
      required: true,
    },
    {
      key: 'staatsangehoerigkeit',
      typ: 'text',
      prefill: {
        path: 'staatsangehoerigkeit',
        label_de: 'Melderegister (§ 3 BMG)',
      },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'elternSteuerId',
      typ: 'text',
      prefill: { path: 'steuer_id', label_de: 'BZSt (§ 139b AO)' },
      datenkategorie: 'Steuer-ID',
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
    // user_decision: Namensbestimmung des Kindes — NIE vorausgefüllt (§3.1/§G3).
    {
      key: 'kindVornamen',
      typ: 'text',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe (Namensbestimmung des Kindes)',
        user_decision: true,
      },
      datenkategorie: 'Identität',
      required: true,
      validate: 'nonempty',
    },
    {
      key: 'kindGeburtsdatum',
      typ: 'date',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe (laut Geburtsanzeige)',
        user_decision: true,
      },
      datenkategorie: 'Identität',
      required: true,
      validate: 'date',
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 18, § 20, § 21 PStG', bedeutung_key: 'lebenslagen.geburt.rechtsgrundlagen.pstg.bedeutung' },
    { norm: '§ 139b AO', bedeutung_key: 'lebenslagen.geburt.rechtsgrundlagen.ao.bedeutung' },
    { norm: '§§ 62, 67 EStG', bedeutung_key: 'lebenslagen.geburt.rechtsgrundlagen.estg.bedeutung' },
    { norm: '§ 1, § 4, § 7 BEEG', bedeutung_key: 'lebenslagen.geburt.rechtsgrundlagen.beeg.bedeutung' },
    { norm: '§ 10 SGB V', bedeutung_key: 'lebenslagen.geburt.rechtsgrundlagen.sgbv.bedeutung' },
  ],
  frist: { tage: 7, beschreibung_key: 'lebenslagen.geburt.frist_beschreibung' },
  gebuehr: {
    gibt_es: true,
    betrag_key: 'lebenslagen.geburt.gebuehr_betrag',
    hinweis_key: 'lebenslagen.geburt.gebuehr_hinweis',
  },
  cascade: [
    {
      id: 'standesamt-beurkundung',
      behoerdeId: 'standesamt-berlin-mitte',
      block: 'D',
      gate: 'eid',
      aktion:
        'Geburt beurkunden + Geburtsurkunde ausstellen (auf Geburtsanzeige + bestätigte Namensbestimmung)',
      agentLabel:
        'Wir beurkunden die Geburt beim Standesamt und stellen die Geburtsurkunde aus',
      rechtsgrundlage: '§ 18, § 20, § 21 PStG',
      datenkategorien: ['Identität', 'Anschrift', 'Familienstand'],
      aktenzeichen: '[MOCK] G 247/2026',
      isPrimarySubmission: true,
      latencyMs: 700,
      mints: {
        document: {
          typ: 'geburtsurkunde',
          titelTemplate: '[MOCK] Geburtsurkunde — {name}, Az. {az}',
          eudi_compatible: true,
        },
      },
    },
    {
      id: 'buergeramt-melderegister',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: 'Kind ins Melderegister eintragen + Geburtsdaten an BZSt übermitteln',
      agentLabel: 'Wir tragen das Kind ins Melderegister ein und melden die Geburt dem BZSt',
      rechtsgrundlage: '§ 17 BMG i.V.m. § 139b AO',
      datenkategorien: ['Identität', 'Anschrift'],
      latencyMs: 900,
      mints: {
        letter: {
          absender: 'Bezirksamt Mitte von Berlin — Bürgeramt',
          betreffTemplate: 'Anmeldung Ihres Kindes im Melderegister — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit haben wir Ihr Kind zum {datum} im Melderegister eingetragen. Die Geburtsdaten wurden gemäß § 17 BMG i.V.m. § 139b AO an das Bundeszentralamt für Steuern übermittelt.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Bürgeramt Mitte, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
    {
      id: 'bzst-steuerid-kind',
      behoerdeId: 'bzst',
      block: 'A',
      gate: 'auto',
      aktion: 'Steuer-Identifikationsnummer des Kindes antragslos vergeben',
      agentLabel: 'Das BZSt vergibt automatisch die Steuer-ID Ihres Kindes',
      rechtsgrundlage: '§ 139b AO',
      datenkategorien: ['Identität', 'Steuer-ID'],
      aktenzeichen: '[MOCK] 73 014 920 815',
      latencyMs: 1100,
      mints: {
        letter: {
          absender: 'Bundeszentralamt für Steuern (BZSt)',
          betreffTemplate: 'Steuerliche Identifikationsnummer Ihres Kindes — {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nfür Ihr Kind wurde am {datum} antragslos eine steuerliche Identifikationsnummer nach § 139b AO vergeben: {az}. Sie gilt lebenslang und ist für Kindergeld und Steuerverfahren maßgeblich.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Bundeszentralamt für Steuern, Az. {az}',
          archetype: 'mitteilung',
        },
      },
    },
    {
      id: 'familienkasse-kindergeld',
      behoerdeId: 'familienkasse-berlin-brandenburg',
      block: 'D',
      gate: 'eid',
      aktion:
        'Kindergeld festsetzen (heute § 67 EStG antragsbasiert; antragslose Festsetzung = ZUKUNFT)',
      agentLabel: 'Wir setzen mit Ihrer eID-Bestätigung das Kindergeld bei der Familienkasse fest',
      rechtsgrundlage: '§§ 62, 67 EStG · §§ 62 ff. antragslos',
      datenkategorien: ['Identität', 'Steuer-ID', 'Bankverbindung'],
      aktenzeichen: '[MOCK] 234 FK 567890',
      zukunft: true,
      latencyMs: 1300,
      mints: {
        letter: {
          absender: 'Familienkasse Berlin-Brandenburg',
          betreffTemplate: 'Festsetzung Kindergeld — Kindergeldnummer {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit setzen wir das Kindergeld ab Geburtsmonat fest. Ihre Kindergeldnummer lautet {az}. Die Auszahlung erfolgt auf die hinterlegte Bankverbindung; der Bescheid mit Betrag und Zahlungsterminen folgt gesondert.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Familienkasse Berlin-Brandenburg, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
    {
      id: 'elterngeld-festsetzung',
      behoerdeId: 'elterngeldstelle-berlin-mitte',
      block: 'D',
      gate: 'eid',
      aktion:
        'Elterngeld festsetzen (einwilligungsbasiert ELFE; Einkommensdaten mit Einwilligung)',
      agentLabel: 'Wir setzen mit Ihrer eID-Bestätigung das Elterngeld bei der Elterngeldstelle fest',
      rechtsgrundlage: '§ 1, § 4, § 7 BEEG · Art. 6 Abs. 1 lit. a DSGVO',
      datenkategorien: ['Identität', 'Einkommen', 'Bankverbindung'],
      aktenzeichen: '[MOCK] EG-MITTE/2026/04-08831',
      zukunft: true,
      latencyMs: 1400,
      mints: {
        letter: {
          absender: 'Bezirksamt Mitte von Berlin — Elterngeldstelle',
          betreffTemplate: 'Elterngeldbescheid — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit setzen wir Ihr Elterngeld nach §§ 1, 4, 7 BEEG fest. Die Einkommensdaten wurden mit Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) verarbeitet. Den vollständigen Bescheid mit Bezugsmonaten und Höhe entnehmen Sie der Anlage.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Elterngeldstelle Mitte, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
    {
      id: 'aok-familienversicherung',
      behoerdeId: 'aok-nordost',
      block: 'B',
      gate: 'consent',
      aktion: 'Kind beitragsfrei familienversichern (Anmeldung durch Mitglied)',
      agentLabel: 'Mit Ihrer Einwilligung melden wir das Kind beitragsfrei in der Familienversicherung an',
      rechtsgrundlage: '§ 10 SGB V · Art. 6 Abs. 1 lit. a DSGVO',
      datenkategorien: ['Identität', 'Krankenversicherung'],
      latencyMs: 1000,
      mints: {
        letter: {
          absender: 'AOK Nordost',
          betreffTemplate: 'Beitragsfreie Familienversicherung Ihres Kindes — {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nwir haben Ihr Kind zum {datum} beitragsfrei in die Familienversicherung nach § 10 SGB V aufgenommen. Eine eigene elektronische Gesundheitskarte wird Ihnen zugesandt. Versicherungsnachweis-Az. {az}.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, AOK Nordost, Az. {az}',
          archetype: 'mitteilung',
        },
      },
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 5,
    minuten_gespart: 240,
    hinweis_key: 'lebenslagen.geburt.value_receipt_hinweis',
  },
};
