/**
 * Lebenslage `kinderzuschlag` — Kinderzuschlag (§ 6a BKGG). Spec `anspruch-arc.md`
 * § 6, Beat c.
 *
 * mode: antrag · zukunft: true (proaktive daten-getriggerte Erkennung + Once-Only-
 * Prefill sind spekulativ; der Antrag selbst ist real).
 * Realismus (Honesty-Locks § 11): KiZ ist **antragsgebunden** (§ 6a Abs. 7 BKGG)
 * und **einkommensgeprüft** → NIE „läuft schon"; die Höhe wird per Bescheid
 * festgesetzt → die Kaskade mintet eine **Eingangsbestätigung**, KEINEN Betrags-
 * Bescheid. Träger = **Familienkasse der Bundesagentur für Arbeit (Bund)** — für
 * die Hamburg-Persona die regional korrekte `familienkasse-nord-hamburg` (NICHT
 * Berlin-Brandenburg). `assistant_trigger: 'antragsgebunden'` hält KiZ ehrlich
 * aus dem antragslos-Kaskaden-Pfad des Assistenten heraus (§ 5).
 */
import type { LebenslageConfig } from '../types';

export const kinderzuschlagConfig: LebenslageConfig = {
  slug: 'kinderzuschlag',
  vorgangTyp: 'kinderzuschlag',
  icon: 'baby',
  kategorie: 'familie',
  mode: 'antrag',
  zukunft: true,
  // Antragsgebunden → läuft über AntragForm, NIE über den Assistenten-
  // `starte_lebenslage`-Schreibpfad (der nur antragslos-cascade-Slugs zulässt).
  assistant_trigger: 'antragsgebunden',
  engine: 'lebenslage-cascade',
  href: '/lebenslagen/kinderzuschlag',
  dauer_geschaetzt_key: 'lebenslagen.kinderzuschlag.dauer_geschaetzt',
  zustaendige_behoerden: ['familienkasse-nord-hamburg'],
  voraussetzungen_keys: [
    'lebenslagen.kinderzuschlag.voraussetzungen.0',
    'lebenslagen.kinderzuschlag.voraussetzungen.1',
    'lebenslagen.kinderzuschlag.voraussetzungen.2',
  ],
  benoetigte_dokumente_keys: [
    'lebenslagen.kinderzuschlag.dokumente.0',
    'lebenslagen.kinderzuschlag.dokumente.1',
    'lebenslagen.kinderzuschlag.dokumente.2',
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
    // feld in den Stammdaten; der einwilligungsbasierte Arbeitgeber-/Register-
    // Abruf ist ZUKUNFT → echte Eingabe, kein Register-Prefill.
    {
      key: 'bruttoeinkommen',
      typ: 'number',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe — automatischer Einkommensabruf ist [ZUKUNFT]',
        user_decision: true,
      },
      datenkategorie: 'Einkommen',
      required: true,
    },
    {
      key: 'wohnkosten',
      typ: 'number',
      prefill: {
        path: null,
        label_de: 'Ihre Eingabe (Bruttokaltmiete laut Mietvertrag)',
        user_decision: true,
      },
      datenkategorie: 'Mietverhältnis',
      required: true,
    },
  ],
  rechtsgrundlagen: [
    { norm: '§ 6a BKGG', bedeutung_key: 'lebenslagen.kinderzuschlag.rechtsgrundlagen.bkgg6a.bedeutung' },
    { norm: '§ 2 OZG', bedeutung_key: 'lebenslagen.kinderzuschlag.rechtsgrundlagen.ozg2.bedeutung' },
    { norm: '§ 18 PAuswG', bedeutung_key: 'lebenslagen.kinderzuschlag.rechtsgrundlagen.pauswg18.bedeutung' },
  ],
  // Kein Ausschlussfrist; Zahlung ab Antragsmonat (§ 6a Abs. 7 BKGG).
  frist: { tage: null, beschreibung_key: 'lebenslagen.kinderzuschlag.frist_beschreibung' },
  gebuehr: { gibt_es: false, hinweis_key: 'lebenslagen.kinderzuschlag.gebuehr_hinweis' },
  cascade: [
    {
      id: 'familienkasse-antrag',
      behoerdeId: 'familienkasse-nord-hamburg',
      block: 'D',
      gate: 'eid',
      aktion: 'Kinderzuschlag-Antrag vorbefüllen + mit eID einreichen',
      kurzlabel: 'Antrag einreichen',
      behoerdeKurz: 'Familienkasse',
      agentLabel: 'Wir befüllen den Kinderzuschlag-Antrag vor und reichen ihn mit Ihrer eID ein',
      rechtsgrundlage: '§ 6a BKGG · § 2 OZG · § 18 PAuswG',
      datenkategorien: ['Identität', 'Anschrift', 'Bankverbindung'],
      aktenzeichen: '[MOCK] FK-NORD/2026/KiZ-0047118',
      isPrimarySubmission: true,
      latencyMs: 700,
      mints: {
        document: {
          typ: 'antragsbestaetigung',
          titelTemplate: '[MOCK] Antragsbestätigung Kinderzuschlag — Az. {az}',
          eudi_compatible: false,
        },
      },
    },
    {
      id: 'einkommens-haushaltsabgleich',
      behoerdeId: 'familienkasse-nord-hamburg',
      block: 'A',
      gate: 'auto',
      aktion: 'Einkommens-/Haushaltsplausibilisierung (Prüfung/Plausibilisierung)',
      kurzlabel: 'Einkommensabgleich',
      behoerdeKurz: 'Familienkasse',
      agentLabel: 'Die Familienkasse plausibilisiert Einkommen und Haushalt nach dem Antrag',
      rechtsgrundlage: '§ 6a BKGG',
      // Behörde-initiiert NACH Antrag, strenge Datenminimierung. Zählt NICHT
      // doppelt in der Wertquittung (mints {}).
      datenkategorien: ['Einkommen'],
      latencyMs: 1100,
      mints: {},
    },
    {
      id: 'familienkasse-eingangsbestaetigung',
      behoerdeId: 'familienkasse-nord-hamburg',
      block: 'A',
      gate: 'auto',
      aktion: 'Eingang bestätigen — Bearbeitung eingeleitet',
      kurzlabel: 'Eingangsbestätigung',
      behoerdeKurz: 'Familienkasse',
      agentLabel: 'Die Familienkasse bestätigt den Eingang und leitet die Bearbeitung ein',
      rechtsgrundlage: '§ 6a BKGG',
      datenkategorien: ['Identität'],
      aktenzeichen: '[MOCK] FK-NORD/2026/KiZ-0047118',
      latencyMs: 1300,
      mints: {
        // Eingangsbestätigung — KEIN Bewilligungsbescheid mit Betrag: die KiZ-
        // Höhe ist einkommensgeprüft und wird per späterem Bescheid festgesetzt
        // (Overclaim-Sperre § 11).
        letter: {
          absender: 'Familienkasse Nord der Bundesagentur für Arbeit',
          betreffTemplate: 'Eingangsbestätigung Kinderzuschlag-Antrag — Az. {az}',
          floskel:
            'Sehr geehrte/r Herr/Frau {name},\n\nin oben genannter Angelegenheit bestätigen wir den Eingang Ihres Kinderzuschlag-Antrags am {datum}. Az. {az}. Wir prüfen nun Einkommen und Bedarf nach § 6a BKGG; die konkrete Höhe des Kinderzuschlags ergibt sich erst aus dem noch folgenden Bescheid. Über das Ergebnis unterrichten wir Sie gesondert.\n\n[MOCK – Verwaltungsdemo, keine echten Daten]',
          abschluss: 'Mit freundlichen Grüßen, Familienkasse Nord der Bundesagentur für Arbeit, Az. {az}',
          archetype: 'eingangsbestaetigung',
        },
      },
    },
  ],
  value_receipt: {
    // Konservative Demo-Schätzung (kein rechtlicher/Register-Claim); der
    // §-Abgleich-Schritt zählt NICHT doppelt.
    behoerdengaenge_gespart: 3,
    minuten_gespart: 180,
    hinweis_key: 'lebenslagen.kinderzuschlag.value_receipt_hinweis',
  },
};
