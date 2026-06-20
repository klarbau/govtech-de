/**
 * Lebenslage `kindergeld` — antragslose Auszahlung (ZUKUNFT 2027) /
 * vorausgefüllter Antrag (heute). Spec §3.3.
 *
 * mode: antragslos · zukunft: true.
 * Realismus (verdict-CORRECTED §3.3/§8): antragslos ist legislatiert, aber NICHT
 * in Kraft (Kabinett 18.03.2026, BT-Drs. 21/5874; gestuft 03/2027 → 11/2027).
 * Der GESAMTE Auto-Flow trägt **[ZUKUNFT 2027]**; heute = § 67 EStG
 * antragspflichtig (ehrlicher Heute-Wert = vorausgefüllter Antrag). NUR
 * Melderegister→BZSt ist produktiv (kein Heute-realer BZSt→Familienkasse-Push).
 * Begriff „Direktauszahlung" vermeiden → „automatische Auszahlung". Einzige
 * nutzerberührte Aktion = IBAN-Bestätigung (eID-gated).
 */
import type { LebenslageConfig } from '../types';

export const kindergeldConfig: LebenslageConfig = {
  slug: 'kindergeld',
  vorgangTyp: 'kindergeld',
  icon: 'piggy-bank',
  kategorie: 'familie',
  mode: 'antragslos',
  zukunft: true,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/kindergeld',
  antragslos_note_key: 'lebenslagen.kindergeld.antragslos_note',
  zustaendige_behoerden: [
    'familienkasse-berlin-brandenburg',
    'bzst',
    'standesamt-berlin-mitte',
    'buergeramt-berlin-mitte',
  ],
  voraussetzungen_keys: [
    'lebenslagen.kindergeld.voraussetzungen.0',
    'lebenslagen.kindergeld.voraussetzungen.1',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.kindergeld.dokumente.0',
  ],
  // antragslos: das einzige nutzerberührte Feld ist die IBAN-Bestätigung (eID).
  formFields: [
    {
      key: 'kindName',
      typ: 'text',
      prefill: { path: 'familie.kinder[0].vorname', label_de: 'Geburtenregister (§ 21 PStG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'kindGeburtsdatum',
      typ: 'date',
      prefill: { path: 'familie.kinder[0].geburtsdatum', label_de: 'Geburtenregister (§ 21 PStG)' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'kindSteuerId',
      typ: 'text',
      prefill: { path: 'familie.kinder[0].steuer_id', label_de: 'BZSt (§ 139b AO)' },
      datenkategorie: 'Steuer-ID',
      required: true,
    },
    {
      key: 'berechtigteSteuerId',
      typ: 'text',
      prefill: { path: 'steuer_id', label_de: 'BZSt (§ 139b AO) / Ihre Stammdaten' },
      datenkategorie: 'Steuer-ID',
      required: true,
    },
    {
      key: 'anschrift',
      typ: 'text',
      prefill: { path: 'adresse', label_de: 'Melderegister (§ 3 BMG)' },
      datenkategorie: 'Anschrift',
      required: true,
    },
    // Einziges eID-bestätigtes Feld: IBAN-Bestätigung (Schutz vor Fehlleitung).
    {
      key: 'iban',
      typ: 'iban',
      prefill: { path: 'bankverbindung.iban', label_de: 'Ihre Stammdaten' },
      datenkategorie: 'Bankverbindung',
      required: true,
      validate: 'iban',
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 21 PStG', bedeutung_key: 'lebenslagen.kindergeld.rechtsgrundlagen.pstg.bedeutung' },
    { norm: '§ 139b AO', bedeutung_key: 'lebenslagen.kindergeld.rechtsgrundlagen.ao.bedeutung' },
    { norm: '§ 66, § 70 EStG', bedeutung_key: 'lebenslagen.kindergeld.rechtsgrundlagen.estg.bedeutung' },
    { norm: 'BT-Drs. 21/5874', bedeutung_key: 'lebenslagen.kindergeld.rechtsgrundlagen.btdrs.bedeutung' },
  ],
  // Zahlung ab Geburtsmonat (§ 66 EStG); rückwirkend max. 6 Monate (§ 70).
  frist: { tage: null, beschreibung_key: 'lebenslagen.kindergeld.frist_beschreibung' },
  gebuehr: { gibt_es: false, hinweis_key: 'lebenslagen.kindergeld.gebuehr_hinweis' },
  cascade: [
    {
      id: 'standesamt-beurkundung',
      behoerdeId: 'standesamt-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: 'Geburt beurkunden — Ursprung der Datenkette',
      agentLabel: 'Die Geburtsbeurkundung beim Standesamt ist der Ursprung der Datenkette',
      rechtsgrundlage: '§ 21 PStG',
      datenkategorien: ['Identität'],
      latencyMs: 700,
      mints: {
        document: {
          typ: 'geburtsurkunde',
          titelTemplate: '[MOCK] Geburtsurkunde (Datenkette) — {name}',
          eudi_compatible: true,
        },
      },
    },
    {
      id: 'buergeramt-melderegister-bzst',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: 'Melderegister + Identitätsdaten an BZSt (heute produktiv)',
      agentLabel: 'Die Identitätsdaten gehen vom Melderegister automatisch an das BZSt',
      rechtsgrundlage: '§ 139b Abs. 7 i.V.m. Abs. 6 AO',
      datenkategorien: ['Identität', 'Anschrift'],
      latencyMs: 900,
      mints: {},
    },
    {
      id: 'bzst-steuerid-kind',
      behoerdeId: 'bzst',
      block: 'A',
      gate: 'auto',
      aktion: 'Steuer-ID Kind zuteilen + mit Eltern-Steuer-ID/IBAN verknüpfen',
      agentLabel: 'Das BZSt teilt die Steuer-ID des Kindes zu und verknüpft sie',
      rechtsgrundlage: '§ 139b AO',
      datenkategorien: ['Identität', 'Steuer-ID', 'Bankverbindung'],
      aktenzeichen: '[MOCK] 28 472 619 304',
      latencyMs: 1100,
      mints: {
        document: {
          typ: 'steuerid_mitteilung',
          titelTemplate: '[MOCK] Steuer-ID-Mitteilung Kind — {az}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'bzst-an-familienkasse',
      behoerdeId: 'bzst',
      block: 'A',
      gate: 'auto',
      aktion: 'Steuer-ID + Elterndaten + IBAN an Familienkasse (Auslöser)',
      agentLabel: 'Das BZSt stößt die Festsetzung bei der Familienkasse an (geplant)',
      rechtsgrundlage: 'BT-Drs. 21/5874 (geplant)',
      datenkategorien: ['Identität', 'Steuer-ID', 'Bankverbindung'],
      zukunft: true,
      latencyMs: 1200,
      mints: {},
    },
    {
      id: 'familienkasse-iban-bestaetigung',
      behoerdeId: 'familienkasse-berlin-brandenburg',
      block: 'D',
      gate: 'eid',
      aktion: 'Bankverbindung bestätigen (Schutz vor Fehlleitung)',
      agentLabel: 'Bitte bestätigen Sie mit Ihrer eID die Bankverbindung für die Auszahlung',
      rechtsgrundlage: '§ 67 EStG / BT-Drs. 21/5874',
      datenkategorien: ['Bankverbindung'],
      aktenzeichen: '[MOCK] 134FK072519',
      isPrimarySubmission: true,
      latencyMs: 1000,
      mints: {},
    },
    {
      id: 'familienkasse-festsetzung',
      behoerdeId: 'familienkasse-berlin-brandenburg',
      block: 'A',
      gate: 'auto',
      aktion: 'Kindergeld festsetzen + automatische Auszahlung ab Geburtsmonat',
      agentLabel: 'Die Familienkasse setzt das Kindergeld fest — automatische Auszahlung ab Geburtsmonat',
      rechtsgrundlage: '§ 66, § 70 EStG',
      datenkategorien: ['Identität', 'Steuer-ID', 'Bankverbindung'],
      zukunft: true,
      latencyMs: 1300,
      mints: {},
    },
    {
      id: 'familienkasse-bescheid',
      behoerdeId: 'familienkasse-berlin-brandenburg',
      block: 'A',
      gate: 'auto',
      aktion: 'Kindergeldbescheid in Posteingang (Nummer, Betrag, Termin)',
      agentLabel: 'Der Kindergeldbescheid landet in Ihrem Posteingang',
      rechtsgrundlage: '§ 70 EStG, § 122 AO',
      datenkategorien: ['Identität', 'Bankverbindung'],
      aktenzeichen: '[MOCK] FK-BB/2027-KG-04711',
      latencyMs: 1400,
      mints: {
        letter: {
          absender: 'Familienkasse Berlin-Brandenburg',
          betreffTemplate: 'Kindergeldbescheid — Kindergeldnummer {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit setzen wir das Kindergeld nach § 70 EStG fest. Kindergeldnummer: {az}. Die automatische Auszahlung erfolgt ab dem Geburtsmonat auf die von Ihnen bestätigte Bankverbindung; der nächste Zahlungstermin ist der {datum}.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Familienkasse Berlin-Brandenburg, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 2,
    minuten_gespart: 55,
    hinweis_key: 'lebenslagen.kindergeld.value_receipt_hinweis',
  },
};
