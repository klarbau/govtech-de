/**
 * Lebenslage `wohngeld` — Wohngeld (Mietzuschuss, Wohngeld-Plus). Spec §3.7.
 *
 * mode: antrag · zukunft: true (Once-Only-Prefill der Einkommens-/Registerdaten
 * ist spekulativ; der Antrag selbst ist real).
 * Realismus (verdict-CONFIRMED §3.7/§8): NICHT antragslos (§ 22 Abs. 1 verbatim).
 * Der § 33-Abgleich ist eine behörden-initiierte Verifikation NACH dem Antrag
 * (strenge Datenminimierung: nur Name/Geb.datum/Anschrift/Status/Bezugszeitraum)
 * — KEIN Prefill-Push; als „Prüfung/Plausibilisierung" streamen (Ergebnis = keine),
 * NICHT in der Wertquittung doppelt zählen. Kein konkreter Wohngeld-Höhe
 * (unverbindliche Schätzung, [MOCK]). § 7-Ausschluss (Bürgergeld) ehrlich nennen.
 */
import type { LebenslageConfig } from '../types';

export const wohngeldConfig: LebenslageConfig = {
  slug: 'wohngeld',
  vorgangTyp: 'wohngeld',
  icon: 'home',
  kategorie: 'wohnen',
  mode: 'antrag',
  zukunft: true,
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/wohngeld',
  zustaendige_behoerden: [
    'wohngeldstelle-berlin-mitte',
    'arbeitgeber-mittelstand-software',
    'buergeramt-berlin-mitte',
    'bundesagentur-fuer-arbeit-datenabgleich',
    'drv-bund',
    'bzst',
  ],
  voraussetzungen_keys: [
    'lebenslagen.wohngeld.voraussetzungen.0',
    'lebenslagen.wohngeld.voraussetzungen.1',
    'lebenslagen.wohngeld.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.wohngeld.dokumente.0',
    'lebenslagen.wohngeld.dokumente.1',
    'lebenslagen.wohngeld.dokumente.2',
  ],
  formFields: [
    {
      key: 'name',
      typ: 'text',
      prefill: { path: 'nachname', label_de: 'Melderegister / BundID' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'geburtsdatum',
      typ: 'date',
      prefill: { path: 'geburtsdatum', label_de: 'Melderegister / BundID' },
      datenkategorie: 'Identität',
      required: true,
    },
    {
      key: 'geschlecht',
      typ: 'text',
      prefill: { path: 'geschlecht', label_de: 'Melderegister (§ 3 BMG)' },
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
      key: 'iban',
      typ: 'iban',
      prefill: { path: 'bankverbindung.iban', label_de: 'Ihre Stammdaten' },
      datenkategorie: 'Bankverbindung',
      required: true,
      validate: 'iban',
    },
    // Bruttoeinkommen: heute Nutzerangabe. Es gibt KEIN numerisches Einkommens-
    // feld in den Stammdaten, und der Arbeitgeber-Abruf (§ 23 Abs. 3 WoGG,
    // einwilligungsbasiert) ist ZUKUNFT — also kein Register-Prefill, sondern
    // eine echte Eingabe (sonst behauptet der Chip eine Herkunft, die es nicht gibt).
    {
      key: 'bruttoeinkommen',
      typ: 'number',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe — Arbeitgeber-Abruf (§ 23 Abs. 3 WoGG) ist [ZUKUNFT]',
        user_decision: true,
      },
      datenkategorie: 'Einkommen',
      required: true,
    },
    {
      key: 'steuerId',
      typ: 'text',
      prefill: { path: 'steuer_id', label_de: 'BZSt (§ 139b AO) [ZUKUNFT]' },
      datenkategorie: 'Steuer-ID',
      required: true,
    },
    // NOT prefillable: Miete (Mietvertrag), Mietzahlungsnachweis 3 Monate.
    {
      key: 'bruttokaltmiete',
      typ: 'number',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe (laut Mietvertrag)',
        user_decision: true,
      },
      datenkategorie: 'Mietverhältnis',
      required: true,
    },
    {
      key: 'mietvertrag',
      typ: 'upload',
      prefill: {
        path: null,
        label_de: 'Ihr Upload (Mietvertrag + Mietzahlungsnachweis 3 Monate)',
        user_decision: true,
      },
      datenkategorie: 'Mietverhältnis',
      required: true,
      upload_mock: true,
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 22 Abs. 1 WoGG', bedeutung_key: 'lebenslagen.wohngeld.rechtsgrundlagen.wogg22.bedeutung' },
    { norm: '§ 23 Abs. 3 WoGG', bedeutung_key: 'lebenslagen.wohngeld.rechtsgrundlagen.wogg23.bedeutung' },
    { norm: '§ 33 WoGG', bedeutung_key: 'lebenslagen.wohngeld.rechtsgrundlagen.wogg33.bedeutung' },
    { norm: '§ 7 WoGG', bedeutung_key: 'lebenslagen.wohngeld.rechtsgrundlagen.wogg7.bedeutung' },
    { norm: '§ 24, § 25 WoGG', bedeutung_key: 'lebenslagen.wohngeld.rechtsgrundlagen.wogg2425.bedeutung' },
  ],
  // Keine Ausschlussfrist, aber Zahlung erst ab Antragsmonat; Bewilligung i.d.R. 12 Monate.
  frist: { tage: 365, beschreibung_key: 'lebenslagen.wohngeld.frist_beschreibung' },
  gebuehr: { gibt_es: false, hinweis_key: 'lebenslagen.wohngeld.gebuehr_hinweis' },
  cascade: [
    {
      id: 'wohngeldstelle-antrag',
      behoerdeId: 'wohngeldstelle-berlin-mitte',
      block: 'D',
      gate: 'eid',
      aktion: 'Wohngeldantrag vorbefüllen + mit eID einreichen',
      agentLabel: 'Wir befüllen den Wohngeldantrag vor und reichen ihn mit Ihrer eID ein',
      rechtsgrundlage: '§ 22 Abs. 1 WoGG · § 2 OZG · § 18 PAuswG',
      datenkategorien: ['Identität', 'Anschrift', 'Mietverhältnis', 'Bankverbindung'],
      aktenzeichen: '[MOCK] WoG-MITTE/2026/M-0047118',
      isPrimarySubmission: true,
      latencyMs: 700,
      mints: {
        document: {
          typ: 'antragsbestaetigung',
          titelTemplate: '[MOCK] Antragsbestätigung Wohngeld — Az. {az}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'arbeitgeber-verdienstbescheinigung',
      behoerdeId: 'arbeitgeber-mittelstand-software',
      block: 'B',
      gate: 'consent',
      aktion: 'Verdienstbescheinigung beifügen',
      agentLabel: 'Mit Ihrer Einwilligung holen wir die Verdienstbescheinigung beim Arbeitgeber ein',
      rechtsgrundlage: '§ 23 Abs. 3 WoGG · Art. 6 Abs. 1 lit. a DSGVO',
      datenkategorien: ['Beschäftigung', 'Einkommen'],
      latencyMs: 1000,
      mints: {
        document: {
          typ: 'verdienstbescheinigung',
          titelTemplate: '[MOCK] Verdienstbescheinigung — {name}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'buergeramt-abgleich',
      behoerdeId: 'buergeramt-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: '§ 33-Abgleich Anschrift/Haushalt mit Melderegister (Prüfung/Plausibilisierung)',
      agentLabel: 'Die Wohngeldstelle plausibilisiert Anschrift und Haushalt mit dem Melderegister',
      rechtsgrundlage: '§ 33 WoGG · Art. 5 Abs. 1 lit. c DSGVO',
      datenkategorien: ['Identität', 'Anschrift'],
      latencyMs: 1100,
      mints: {},
    },
    {
      id: 'ba-ausschlusspruefung',
      behoerdeId: 'bundesagentur-fuer-arbeit-datenabgleich',
      block: 'A',
      gate: 'auto',
      aktion: 'Ausschlussprüfung Bürgergeld/ALG (§ 7) — Prüfung/Plausibilisierung',
      agentLabel: 'Die Bundesagentur prüft einen möglichen Leistungsausschluss nach § 7 WoGG',
      rechtsgrundlage: '§ 33 WoGG · § 7 WoGG',
      datenkategorien: ['Identität'],
      latencyMs: 1200,
      mints: {},
    },
    {
      id: 'drv-abgleich',
      behoerdeId: 'drv-bund',
      block: 'A',
      gate: 'auto',
      aktion: 'Abgleich Beschäftigung/Rentenbezug — Prüfung/Plausibilisierung',
      agentLabel: 'Die Deutsche Rentenversicherung plausibilisiert Beschäftigung und Rentenbezug',
      rechtsgrundlage: '§ 33 WoGG',
      datenkategorien: ['Identität', 'Beschäftigung'],
      latencyMs: 1300,
      mints: {},
    },
    {
      id: 'bzst-kapitalertraege',
      behoerdeId: 'bzst',
      block: 'A',
      gate: 'auto',
      aktion: 'Abgleich Kapitalerträge — Prüfung/Plausibilisierung',
      agentLabel: 'Das BZSt plausibilisiert mögliche Kapitalerträge',
      rechtsgrundlage: '§ 33 WoGG',
      datenkategorien: ['Identität'],
      latencyMs: 1300,
      mints: {},
    },
    {
      id: 'wohngeldstelle-bescheid',
      behoerdeId: 'wohngeldstelle-berlin-mitte',
      block: 'A',
      gate: 'auto',
      aktion: 'Wohngeldbescheid erlassen + zustellen',
      agentLabel: 'Die Wohngeldstelle erlässt den Wohngeldbescheid und stellt ihn zu',
      rechtsgrundlage: '§ 24 WoGG · § 25 WoGG',
      datenkategorien: ['Identität', 'Mietverhältnis', 'Einkommen', 'Bankverbindung'],
      aktenzeichen: '[MOCK] WGNr. 11-2026-047118',
      latencyMs: 1400,
      mints: {
        letter: {
          absender: 'Bezirksamt Mitte von Berlin — Wohngeldstelle',
          betreffTemplate: 'Wohngeldbescheid — Wohngeldnummer {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit erlassen wir Ihren Wohngeldbescheid (Wohngeldnummer {az}). Die konkrete Höhe ergibt sich aus dem beigefügten Bescheid; bei laufendem Bürgergeld-/ALG-II-Bezug ist Wohngeld nach § 7 WoGG ausgeschlossen. Die Bewilligung gilt i.d.R. für 12 Monate (§ 25 WoGG); Zahlbeginn ab dem {datum}.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Wohngeldstelle Mitte, Az. {az}',
          archetype: 'bescheid',
        },
      },
    },
  ],
  value_receipt: {
    behoerdengaenge_gespart: 3,
    minuten_gespart: 210,
    hinweis_key: 'lebenslagen.wohngeld.value_receipt_hinweis',
  },
};
