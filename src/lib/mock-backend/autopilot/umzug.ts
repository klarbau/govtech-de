/**
 * Umzug-Autopilot.
 *
 * Async generator, der die 4-Block-Kaskade aus `docs/specs/umzug.md §5`
 * ausführt. Yield-Werte sind `AutopilotStep`-Objekte (jeweils mit aktuellem
 * Status: 'in_progress' → 'confirmed' / 'failed' / 'pending_eid_confirmation').
 *
 * Latenz-Choreografie pro Block A (verifier-mandated):
 *   Bürgeramt → 900 ms
 *   Finanzamt → 1400 ms
 *   Beitragsservice → 1100 ms
 *   Bundesdruckerei → 1700 ms
 *
 * Block B: 400–900 ms je toggled-Empfänger.
 * Block C: keine Latenz — wird als `self_assigned` direkt in den Vorgang geschrieben.
 * Block D: yieldet `pending_eid_confirmation`-Steps; finale Bestätigung erfolgt
 *          asynchron via `api.bestätigeAutopilotSchritt(vorgangId, schrittId)`.
 *
 * Jeder erfolgreiche Block-A-/Block-D-Schritt erzeugt ein synthetisches
 * Bestätigungsschreiben mit realistischem Aktenzeichen + Briefkopf-Phrase.
 */
import type { AutopilotStep } from '@/types/vorgang';
import type { Letter } from '@/types/letter';
import type { Persona } from '@/types/persona';
import type {
  AutopilotStepDraft,
  SelfTask,
  UmzugInput,
  UmzugPreview,
} from '@/types/umzug';
import { aktenzeichenForBehoerde } from '../id';
import { uuid } from '../id';
import { wait } from '../latency';
import { getRequestContext } from '../store-context';
import { appendLogEntry } from '../stammdaten/api';
import type { UebermittlungsLogEntry } from '@/types';

const MOCK_FOOTER =
  '[MOCK – Verwaltungsdemo, keine echten Daten]';

interface BlockAEntry {
  behoerdeId: string;
  aktion: string;
  rechtsgrundlage: string;
  /** Delegierte Agent-Stimme (§B3) — DE-Primärzeile. */
  agentLabel: string;
  /** Minimal übermittelte Datenkategorien (§B4/§D7, domain note). */
  datenkategorien: string[];
  latencyMs: number;
  /** Briefkopf + Body-Template; `{az}`, `{neue_adresse}`, `{name}` werden ersetzt. */
  briefTemplate?: {
    absender: string;
    betreffTemplate: string;
    floskel: string;
    abschluss: string;
  };
  /** Wenn true, wird kein Brief erzeugt (z. B. Wegzugsmeldung als implizite Übermittlung). */
  skipLetter?: boolean;
  /** Sichtbarkeit über Persona-Flag steuern. */
  visibleIf?: (persona: Persona) => boolean;
}

interface BlockBEntry {
  behoerdeId: string;
  aktion: string;
  rechtsgrundlage: string;
  /** Delegierte Agent-Stimme (§B3) — DE-Primärzeile. */
  agentLabel: string;
  /** Minimal übermittelte Datenkategorien (§B4/§D7, domain note). */
  datenkategorien: string[];
  latencyMs: number;
  /** Sichtbarkeit über Persona-Flag steuern (z. B. Arbeitgeber nur bei `angestellt`). */
  visibleIf?: (persona: Persona) => boolean;
  /** Erzeugt ein Bestätigungsschreiben wie Block A (z. B. Arbeitgeber). */
  briefTemplate?: {
    absender: string;
    betreffTemplate: string;
    floskel: string;
    abschluss: string;
  };
}

interface BlockDEntry {
  behoerdeId: string;
  aktion: string;
  rechtsgrundlage: string;
  /** Delegierte Agent-Stimme (§B3) — DE-Primärzeile. */
  agentLabel: string;
  /** Minimal übermittelte Datenkategorien (§B4/§D7, domain note). */
  datenkategorien: string[];
  /** Persona-Flag, der die Sichtbarkeit dieses Schritts steuert (für Preview-Rendering). */
  personaFlag: 'kfz_halter' | 'kindergeld_bezug' | 'aufenthaltstitel';
  visibleIf: (persona: Persona) => boolean;
  briefTemplate: {
    absender: string;
    betreffTemplate: string;
    floskel: string;
    abschluss: string;
  };
}

// Block A — Anker (Einwohnermeldeamt) + Wohnsitz-Finanzamt + Beitragsservice +
// Bundesdruckerei. Normen + Datenkategorien verbatim aus
// docs/domain/umzug-konvenienz-und-normen.md (§2 D0/D1/D5, §D7).
const BLOCK_A: BlockAEntry[] = [
  {
    behoerdeId: 'buergeramt-berlin-mitte',
    // D0 — §17 BMG; Wohnungsgeberbestätigung §19 BMG als erfüllte Voraussetzung (D4).
    aktion: 'Anmeldung neuer Wohnort nach § 17 BMG',
    rechtsgrundlage: '§ 17 Abs. 1 BMG (Voraussetzung: § 19 BMG erfüllt)',
    agentLabel: 'Wir melden Sie beim Einwohnermeldeamt an',
    datenkategorien: ['neue_anschrift', 'einzugsdatum', 'familienstand'],
    latencyMs: 900,
    briefTemplate: {
      absender:
        'Bezirksamt Mitte von Berlin — Bürgeramt Müllerstraße\nMüllerstraße 146, 13353 Berlin',
      betreffTemplate:
        'Ihre Anmeldung nach § 17 BMG vom {stichtag} — Aktenzeichen {az}',
      floskel:
        'in oben genannter Angelegenheit bestätigen wir Ihre Anmeldung unter folgender Anschrift:\n\n{neue_adresse}\n\nDie Wohnungsgeberbestätigung (§ 19 BMG) lag vor. Die Datenübermittlung an die zuständigen öffentlichen Stellen erfolgt gemäß §§ 33, 34 und 36 BMG. Die im Personalausweis hinterlegte Anschrift wird durch die Bundesdruckerei aktualisiert.',
      abschluss: 'Mit freundlichen Grüßen\nIm Auftrag\nT. Klose, Sachbearbeiter:in',
    },
  },
  {
    // D1 — Wohnsitz-Finanzamt (§ 19 AO), NICHT Körperschaften-FA. §39 AO entfernt.
    behoerdeId: 'finanzamt-berlin-mitte-tiergarten',
    aktion: 'Mitteilung örtliche Zuständigkeit nach § 19 AO',
    rechtsgrundlage: '§ 19 AO i.V.m. § 36 BMG',
    agentLabel: 'Wir melden Ihre neue Anschrift an Ihr Wohnsitz-Finanzamt',
    datenkategorien: ['neue_anschrift', 'steuer_id'],
    latencyMs: 1400,
    briefTemplate: {
      absender:
        'Finanzamt Berlin Mitte/Tiergarten\nNeue Jakobstraße 6-7, 10179 Berlin',
      betreffTemplate:
        'Mitteilung über die örtliche Zuständigkeit nach § 19 AO — Steuernummer {az}',
      floskel:
        'aufgrund Ihres Wohnsitzwechsels richtet sich die örtliche Zuständigkeit für Ihre Einkommensteuer nach Ihrem Wohnsitz (§ 19 AO); Ihre Steuerakte ist ab dem {stichtag} an unser Finanzamt abgegeben worden. Ihre steuerliche Identifikationsnummer (§ 139b AO) bleibt unverändert; lediglich Ihre örtliche Steuernummer ändert sich durch den Zuständigkeitswechsel. Bitte verwenden Sie zukünftig die oben angegebene Steuernummer.\n\nDiese Mitteilung ergeht maschinell und ist auch ohne Unterschrift gültig.',
      abschluss: 'Mit freundlichen Grüßen\nFinanzamt Berlin Mitte/Tiergarten',
    },
  },
  {
    // D7 — Beitragsservice = Vorzeige-Beat (nur Anschrift+Einzugsdatum+Beitragsnr.).
    behoerdeId: 'beitragsservice-koeln',
    aktion: 'Adressänderung Beitragskonto nach § 11 Abs. 4 RBStV',
    rechtsgrundlage: '§ 11 Abs. 4 RBStV i.V.m. § 36 BMG',
    agentLabel: 'Wir melden Ihre neue Anschrift dem Beitragsservice',
    datenkategorien: ['neue_anschrift', 'einzugsdatum', 'beitragsnummer'],
    latencyMs: 1100,
    briefTemplate: {
      absender: 'ARD ZDF Deutschlandradio Beitragsservice, 50656 Köln',
      betreffTemplate:
        'Ihre Beitragsnummer {az} — Anschriftenänderung',
      floskel:
        'vielen Dank für die Übermittlung. Wir haben Ihre neue Anschrift zum {stichtag} in unserem System hinterlegt:\n\n{neue_adresse}\n\nÜbermittelt wurden ausschließlich Ihre neue Anschrift, das Einzugsdatum und Ihre Beitragsnummer — nicht Ihr Familienstand oder Ihre Konfession.',
      abschluss: 'Mit freundlichen Grüßen\nBeitragsservice',
    },
  },
  {
    behoerdeId: 'bundesdruckerei',
    aktion: 'Beauftragung Personalausweis-Adressaufkleber nach § 28 PAuswG',
    rechtsgrundlage: '§ 28 PAuswG',
    agentLabel: 'Wir beauftragen den Adressaufkleber für Ihren Personalausweis',
    datenkategorien: ['neue_anschrift'],
    latencyMs: 1700,
    briefTemplate: {
      absender: 'Bundesdruckerei GmbH\nKommandantenstraße 18, 10969 Berlin',
      betreffTemplate: 'Versandbestätigung Adressaufkleber Personalausweis — Auftrag {az}',
      floskel:
        'in oben genannter Angelegenheit bestätigen wir, dass der Adressaufkleber für Ihren Personalausweis nach § 28 PAuswG hergestellt und versendet wurde. Sie erhalten den Aufkleber innerhalb der nächsten 5–10 Werktage.',
      abschluss: 'Mit freundlichen Grüßen\nBundesdruckerei GmbH',
    },
  },
];

// Block B — privat/anstaltlich + Arbeitgeber, einwilligungsbasiert.
// D3 (Krankenkasse) eine Basis: Art. 6 Abs. 1 lit. a DSGVO + § 206 SGB V.
// D6 (Arbeitgeber) Art. 6 Abs. 1 lit. b DSGVO — spine-kritischer 6. Hop.
const BLOCK_B: BlockBEntry[] = [
  {
    behoerdeId: 'aok-nordost',
    aktion: 'Adressänderung Versichertenkonto',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO i.V.m. § 206 SGB V',
    agentLabel: 'Wir aktualisieren Ihre Adresse bei Ihrer Krankenkasse',
    datenkategorien: ['neue_anschrift', 'einzugsdatum', 'versichertennummer'],
    latencyMs: 600,
  },
  {
    // D6 — Arbeitgeber (private Stelle). Gated auf `angestellt` (§16.1).
    behoerdeId: 'arbeitgeber-mittelstand-software',
    aktion: 'Adressänderung Personalstammdaten / Lohnabrechnung',
    rechtsgrundlage:
      'Art. 6 Abs. 1 lit. b DSGVO — Durchführung des Arbeitsverhältnisses',
    agentLabel: 'Wir informieren Ihren Arbeitgeber über Ihre neue Anschrift',
    datenkategorien: ['neue_anschrift', 'einzugsdatum'],
    latencyMs: 700,
    visibleIf: (p) => p.beschaeftigung?.typ === 'angestellt',
    briefTemplate: {
      absender: 'Mittelstand Software GmbH\nRitterstraße 12, 10969 Berlin',
      betreffTemplate:
        'Aktualisierung Ihrer Personalstammdaten — Personalnummer {az}',
      floskel:
        'wir haben Ihre neue Anschrift für Personalstammdaten und Lohnabrechnung erfasst (Art. 6 Abs. 1 lit. b DSGVO):\n\n{neue_adresse}\n\nIhre Lohnabrechnung wird ab dem nächsten Abrechnungslauf an die neue Anschrift adressiert.',
      abschluss: 'Mit freundlichen Grüßen\nPersonalabteilung Mittelstand Software GmbH',
    },
  },
  {
    behoerdeId: 'berliner-sparkasse',
    aktion: 'Adressänderung Bankverbindung',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO + AGB',
    agentLabel: 'Wir aktualisieren Ihre Adresse bei Ihrer Bank',
    datenkategorien: ['neue_anschrift'],
    latencyMs: 800,
  },
  {
    behoerdeId: 'allianz-hausrat',
    aktion: 'Adressänderung Versicherungsvertrag',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    agentLabel: 'Wir aktualisieren Ihre Adresse bei Ihrer Versicherung',
    datenkategorien: ['neue_anschrift'],
    latencyMs: 700,
  },
  {
    behoerdeId: 'vattenfall-strom',
    aktion: 'Adressänderung Stromvertrag',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    agentLabel: 'Wir aktualisieren Ihre Adresse bei Ihrem Stromanbieter',
    datenkategorien: ['neue_anschrift'],
    latencyMs: 500,
  },
  {
    behoerdeId: 'telekom',
    aktion: 'Adressänderung Mobilfunk-/Internetvertrag',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    agentLabel: 'Wir aktualisieren Ihre Adresse bei Ihrem Telekommunikationsanbieter',
    datenkategorien: ['neue_anschrift'],
    latencyMs: 500,
  },
];

// V1.3 VL-13 + VL-14 co-correction (Spec § 9.2): Block-D-KFZ-Step ist Pre-Fill
// der i-Kfz-Adressänderung gemäß § 15 FZV. Der Frist-Wortlaut im Brief ist
// „unverzüglich (i.d.R. innerhalb einer Woche)" (VL-2). Forbidden phrases
// (per ban-list-grep test): siehe Spec § 11.13 + § 11.14.
const BLOCK_D: BlockDEntry[] = [
  {
    behoerdeId: 'kfz-berlin-labo',
    aktion: 'Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV',
    rechtsgrundlage: '§ 15 FZV + § 18 PAuswG eID',
    agentLabel: 'Wir aktualisieren die Anschrift in Ihren Fahrzeugpapieren',
    datenkategorien: ['neue_anschrift', 'kennzeichen'],
    personaFlag: 'kfz_halter',
    visibleIf: (p) => p.kfz_halter === true,
    briefTemplate: {
      absender:
        'Landesamt für Bürger- und Ordnungsangelegenheiten — KFZ-Zulassung\nJüterboger Straße 3, 10965 Berlin',
      betreffTemplate:
        'Ihre Mitteilung gem. § 15 FZV — Halteranschrift {az}',
      floskel:
        'in oben genannter Angelegenheit bestätigen wir den Eingang Ihrer Mitteilung nach § 15 FZV. Wir haben den Pre-Fill der i-Kfz-Adressänderung mit Ihrer neuen Anschrift vorbereitet:\n\n{neue_adresse}\n\nEine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu.',
      abschluss: 'Mit freundlichen Grüßen\nKFZ-Zulassung Berlin',
    },
  },
  {
    behoerdeId: 'familienkasse-berlin-brandenburg',
    aktion: 'Veränderungsmitteilung Adresse / Zuständigkeitswechsel',
    rechtsgrundlage: '§§ 67/68 EStG + § 18 PAuswG eID',
    agentLabel: 'Wir melden Ihre neue Anschrift der Familienkasse',
    datenkategorien: ['neue_anschrift', 'kindergeldnummer'],
    personaFlag: 'kindergeld_bezug',
    visibleIf: (p) => p.kindergeld_bezug === true,
    briefTemplate: {
      absender:
        'Familienkasse Berlin-Brandenburg, Friedrich-Ebert-Straße 31, 14469 Potsdam',
      betreffTemplate: 'Ihr Kindergeld — Kindergeldnummer {az}',
      floskel:
        'aufgrund Ihres Umzuges ist nunmehr die Familienkasse Berlin-Brandenburg für Sie zuständig. Wir haben Ihre Akte zum {stichtag} übernommen. Ihre Kindergeldzahlung läuft unverändert weiter.',
      abschluss: 'Mit freundlichen Grüßen\nFamilienkasse Berlin-Brandenburg',
    },
  },
  {
    // D2 — eID-Basis § 18 PAuswG; §87/§86 AufenthG entfernt (Strafverfolgungs-/
    // Erhebungskanal, NICHT Adresspflege). Kein Melderegister→ABH-Push.
    behoerdeId: 'abh-berlin-lea',
    aktion: 'Adressaktualisierung Aufenthaltstitel (Termin angeboten)',
    rechtsgrundlage: '§ 18 PAuswG',
    agentLabel:
      'Wir bereiten die Adressaktualisierung Ihres Aufenthaltstitels vor und bieten einen Termin an',
    datenkategorien: ['neue_anschrift', 'dokumentennummer'],
    personaFlag: 'aufenthaltstitel',
    visibleIf: (p) => p.aufenthaltstitel !== undefined,
    briefTemplate: {
      absender:
        'Landesamt für Einwanderung Berlin (LEA)\nFriedrich-Krause-Ufer 24, 13353 Berlin',
      betreffTemplate:
        'Ihr Aufenthaltstitel — Aktenzeichen {az}',
      floskel:
        'in oben genannter Angelegenheit bestätigen wir den Eingang Ihrer Adressmeldung. Die Aktualisierung der auf der elektronischen Aufenthaltskarte hinterlegten Anschrift erfolgt nutzergesteuert über die eID-Funktion (§ 18 PAuswG); hierzu haben wir Ihnen einen Termin angeboten. Es findet kein automatischer Melderegister→Ausländerbehörde-Abgleich statt — bitte nehmen Sie den angebotenen Termin wahr.',
      abschluss: 'Mit freundlichen Grüßen\nIm Auftrag\nS. Wegener, Sachbearbeiter:in',
    },
  },
];

interface BuildLetterOptions {
  behoerdeId: string;
  personaId: string;
  vorgangId: string;
  neueAdresseFormatted: string;
  stichtagFormatted: string;
  empfaengerName: string;
  template: NonNullable<BlockAEntry['briefTemplate']>;
}

function buildLetter(opts: BuildLetterOptions): Letter {
  const az = aktenzeichenForBehoerde(opts.behoerdeId);
  const betreff = opts.template.betreffTemplate
    .replace('{az}', az)
    .replace('{stichtag}', opts.stichtagFormatted);
  const body = [
    MOCK_FOOTER,
    '',
    opts.template.absender,
    '',
    `Sehr geehrte Frau ${opts.empfaengerName},`,
    '',
    opts.template.floskel
      .replace('{neue_adresse}', opts.neueAdresseFormatted)
      .replace('{stichtag}', opts.stichtagFormatted),
    '',
    opts.template.abschluss,
    `Az. ${az}`,
  ].join('\n');
  return {
    id: `letter-${uuid()}`,
    absender_behoerde_id: opts.behoerdeId,
    empfaenger_persona_id: opts.personaId,
    aktenzeichen: az,
    betreff,
    body_de: body,
    status: 'ungelesen',
    empfangen_am: new Date().toISOString(),
    vorgang_id: opts.vorgangId,
  };
}

function formatAdresse(input: UmzugInput['neue_adresse']): string {
  const z = input.zusatz ? ` (${input.zusatz})` : '';
  return `${input.strasse} ${input.hausnummer}${z}, ${input.plz} ${input.ort}`;
}

function formatStichtag(iso: string): string {
  // Erwartet YYYY-MM-DD oder ISO-Timestamp; gibt DD.MM.YYYY zurück.
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export interface UmzugAutopilotYield {
  step: AutopilotStep;
  /** Optional: Bestätigungsschreiben, das zusammen mit `confirmed` erzeugt wurde. */
  letter?: Letter;
}

export interface UmzugAutopilotContext {
  vorgangId: string;
  input: UmzugInput;
  persona: Persona;
}

/**
 * D7 — der minimale Datenkategorien-Satz je Empfänger (single source, deckt
 * Generator-Steps + Activity-Log + Übermittlungs-Quittung). Werte verbatim aus
 * docs/domain/umzug-konvenienz-und-normen.md §D7.
 */
export function datenkategorienForEmpfaenger(behoerdeId: string): string[] {
  switch (behoerdeId) {
    case 'buergeramt-berlin-mitte':
    case 'buergeramt-berlin-friedrichshain-kreuzberg':
      return ['neue_anschrift', 'einzugsdatum', 'familienstand'];
    case 'finanzamt-berlin-mitte-tiergarten':
    case 'finanzamt-koerperschaften-i-berlin':
      return ['neue_anschrift', 'steuer_id'];
    case 'beitragsservice-koeln':
      return ['neue_anschrift', 'einzugsdatum', 'beitragsnummer'];
    case 'aok-nordost':
    case 'tk-hamburg':
      return ['neue_anschrift', 'einzugsdatum', 'versichertennummer'];
    case 'arbeitgeber-mittelstand-software':
      return ['neue_anschrift', 'einzugsdatum'];
    case 'kfz-berlin-labo':
      return ['neue_anschrift', 'kennzeichen'];
    case 'familienkasse-berlin-brandenburg':
      return ['neue_anschrift', 'kindergeldnummer'];
    case 'abh-berlin-lea':
      return ['neue_anschrift', 'dokumentennummer'];
    case 'bundesdruckerei':
      return ['neue_anschrift'];
    default:
      return ['neue_anschrift'];
  }
}

/**
 * Stammdaten-Activity-Log-Hook (Spec § 8.1). Wird pro confirmed Cascade-Schritt
 * aufgerufen und schreibt einen `UebermittlungsLogEntry` der Kategorie
 * `behoerde_zu_behoerde` (Block A) oder `app_aktivitaet` (Block B = consent-
 * basiert; technisch privater Empfänger und damit kein behördlicher Push iSv
 * § 36 BMG).
 */
function emitStammdatenLogForCascadeStep(opts: {
  personaId: string;
  absenderBehoerdeId: string;
  empfaengerBehoerdeId: string;
  block: 'A' | 'B' | 'D';
}): void {
  const { personaId, absenderBehoerdeId, empfaengerBehoerdeId, block } = opts;
  // Heuristic: zweck per Empfänger. Frontend liest den i18n-Key direkt.
  const zweck = (() => {
    if (empfaengerBehoerdeId.startsWith('finanzamt-')) {
      return 'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt';
    }
    if (empfaengerBehoerdeId === 'beitragsservice-koeln') {
      return 'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice';
    }
    if (
      empfaengerBehoerdeId.startsWith('aok-') ||
      empfaengerBehoerdeId === 'tk-hamburg'
    ) {
      return 'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_gkv';
    }
    if (empfaengerBehoerdeId === 'bapersbw') {
      return 'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_bapersbw';
    }
    return 'stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt';
  })();

  // Normen verbatim aus docs/domain/umzug-konvenienz-und-normen.md §2 (D1–D6).
  const rechtsgrundlage = (() => {
    if (empfaengerBehoerdeId === 'beitragsservice-koeln') {
      return '§ 11 Abs. 4 RBStV i.V.m. § 36 BMG';
    }
    if (
      empfaengerBehoerdeId.startsWith('aok-') ||
      empfaengerBehoerdeId === 'tk-hamburg'
    ) {
      // D3 — §28a SGB IV (Arbeitgeberpflicht) entfernt; eine Basis: lit. a + §206 SGB V.
      return 'Art. 6 Abs. 1 lit. a DSGVO i.V.m. § 206 SGB V';
    }
    if (empfaengerBehoerdeId.startsWith('finanzamt-')) {
      // D1 — Wohnsitz-FA §19 AO; §139b AO nur für IdNr-Unveränderlichkeit.
      return '§ 19 AO i.V.m. § 36 BMG';
    }
    if (empfaengerBehoerdeId === 'arbeitgeber-mittelstand-software') {
      // D6 — privatrechtlich.
      return 'Art. 6 Abs. 1 lit. b DSGVO';
    }
    if (empfaengerBehoerdeId === 'bundesdruckerei') {
      return '§ 28 PAuswG';
    }
    if (empfaengerBehoerdeId === 'kfz-berlin-labo') {
      return '§ 15 FZV';
    }
    if (empfaengerBehoerdeId === 'abh-berlin-lea') {
      // D2 — §86/§87 AufenthG entfernt; eID-Basis §18 PAuswG.
      return '§ 18 PAuswG';
    }
    if (empfaengerBehoerdeId.startsWith('familienkasse-')) {
      return '§§ 67/68 EStG + § 36 BMG';
    }
    return '§ 36 BMG';
  })();

  // D7 — reale Datenkategorien je Empfänger (ersetzt hardcoded `anschrift_aktuell`).
  const datenkategorien = datenkategorienForEmpfaenger(empfaengerBehoerdeId);

  const entry: UebermittlungsLogEntry = {
    id: `log-${uuid()}`,
    timestamp: new Date().toISOString(),
    kategorie: block === 'B' ? 'app_aktivitaet' : 'behoerde_zu_behoerde',
    field_id: 'anschrift_aktuell',
    sektion: 'anschrift',
    absender_behoerde_id: absenderBehoerdeId,
    empfaenger_id: empfaengerBehoerdeId,
    zweck_i18n_key: zweck,
    rechtsgrundlage,
    note: `persona_id:${personaId}; field_id:anschrift_aktuell; datenkategorien:${datenkategorien.join('+')}; quelle:umzug_cascade; mock:true`,
  };
  try {
    appendLogEntry(personaId, entry);
  } catch (err) {
    // Defensiv: Stammdaten-Log darf den Cascade-Run NICHT crashen.
    if (typeof console !== 'undefined') {
      console.warn('[umzug-autopilot] stammdaten log emit failed', err);
    }
  }
}

const FAILURE_RATE = 0.05;
const isReliable = (): boolean => {
  // Stage 2: per-Request-Reliable-Flag hat Vorrang (Server-HTTP-Pfad).
  const reqCtx = getRequestContext();
  if (reqCtx) return reqCtx.reliable;
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_RELIABLE === '1') return true;
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reliable') === '1') return true;
    } catch {
      /* ignore */
    }
  }
  return false;
};

/**
 * Async-Generator, der für jeden Schritt der Kaskade einen `AutopilotStep`
 * (zusammen mit ggf. erzeugtem `Letter`) yieldet. Kann via `for await` konsumiert werden.
 */
export async function* umzugAutopilot(
  ctx: UmzugAutopilotContext,
): AsyncGenerator<UmzugAutopilotYield, void, void> {
  const { vorgangId, input, persona } = ctx;
  const neueAdresseFormatted = formatAdresse(input.neue_adresse);
  const stichtagFormatted = formatStichtag(input.stichtag);
  const empfaengerName = persona.nachname;
  const consents = new Set(input.consents ?? []);

  // ---------- Block A ----------
  for (const entry of BLOCK_A) {
    if (entry.visibleIf && !entry.visibleIf(persona)) continue;
    const stepId = `step-${uuid()}`;
    const startedAt = new Date().toISOString();
    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'A',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
        agent_label: entry.agentLabel,
        datenkategorien: entry.datenkategorien,
        status: 'in_progress',
        started_at: startedAt,
      },
    };

    await wait(entry.latencyMs);

    const fail = !isReliable() && Math.random() < FAILURE_RATE;
    if (fail) {
      yield {
        step: {
          id: stepId,
          behoerde_id: entry.behoerdeId,
          block: 'A',
          aktion: entry.aktion,
          rechtsgrundlage: entry.rechtsgrundlage,
          agent_label: entry.agentLabel,
          datenkategorien: entry.datenkategorien,
          status: 'failed',
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          failure_reason: `${entry.behoerdeId}: temporär nicht erreichbar`,
        },
      };
      continue;
    }

    let letter: Letter | undefined;
    if (!entry.skipLetter && entry.briefTemplate) {
      letter = buildLetter({
        behoerdeId: entry.behoerdeId,
        personaId: persona.id,
        vorgangId,
        neueAdresseFormatted,
        stichtagFormatted,
        empfaengerName,
        template: entry.briefTemplate,
      });
    }

    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'A',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
        agent_label: entry.agentLabel,
        datenkategorien: entry.datenkategorien,
        status: 'confirmed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        letter_id: letter?.id,
      },
      letter,
    };

    // Stammdaten-Activity-Log-Hook (Spec § 8.1): pro confirmed Block-A-Schritt
    // ein `behoerde_zu_behoerde`-Eintrag. Absender ist das Bürgeramt der
    // Anmeldung — kanonisch `buergeramt-berlin-mitte` für die V1-Demo.
    emitStammdatenLogForCascadeStep({
      personaId: persona.id,
      absenderBehoerdeId: 'buergeramt-berlin-mitte',
      empfaengerBehoerdeId: entry.behoerdeId,
      block: 'A',
    });
  }

  // ---------- Block D — vor Block B (entspricht Run-Reihenfolge der Spec) ----------
  for (const entry of BLOCK_D) {
    if (!entry.visibleIf(persona)) continue;
    const stepId = `step-${uuid()}`;
    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'D',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
        agent_label: entry.agentLabel,
        datenkategorien: entry.datenkategorien,
        status: 'pending_eid_confirmation',
        started_at: new Date().toISOString(),
        requires_eid: true,
      },
    };
    // Der Generator wartet hier NICHT auf die eID-Bestätigung — die UI-Schicht
    // ruft `api.bestätigeAutopilotSchritt(vorgangId, stepId)` auf, was den Step
    // in `confirmed` versetzt und den Brief erzeugt. Siehe api.ts.
  }

  // ---------- Block B ----------
  for (const entry of BLOCK_B) {
    if (!consents.has(entry.behoerdeId)) continue;
    if (entry.visibleIf && !entry.visibleIf(persona)) continue;
    const stepId = `step-${uuid()}`;
    const startedAt = new Date().toISOString();
    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'B',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
        agent_label: entry.agentLabel,
        datenkategorien: entry.datenkategorien,
        status: 'in_progress',
        started_at: startedAt,
        requires_consent: true,
        consent_given_at: startedAt,
      },
    };
    await wait(entry.latencyMs);
    const fail = !isReliable() && Math.random() < FAILURE_RATE;
    if (fail) {
      yield {
        step: {
          id: stepId,
          behoerde_id: entry.behoerdeId,
          block: 'B',
          aktion: entry.aktion,
          rechtsgrundlage: entry.rechtsgrundlage,
          agent_label: entry.agentLabel,
          datenkategorien: entry.datenkategorien,
          status: 'failed',
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          failure_reason: `${entry.behoerdeId}: Übermittlung fehlgeschlagen`,
          consent_given_at: startedAt,
        },
      };
      continue;
    }
    // Block-B-Empfänger mit Brieftemplate (z. B. Arbeitgeber) erzeugen ein
    // Bestätigungsschreiben analog Block A.
    let letterB: Letter | undefined;
    if (entry.briefTemplate) {
      letterB = buildLetter({
        behoerdeId: entry.behoerdeId,
        personaId: persona.id,
        vorgangId,
        neueAdresseFormatted,
        stichtagFormatted,
        empfaengerName,
        template: entry.briefTemplate,
      });
    }
    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'B',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
        agent_label: entry.agentLabel,
        datenkategorien: entry.datenkategorien,
        status: 'confirmed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        consent_given_at: startedAt,
        requires_consent: true,
        letter_id: letterB?.id,
      },
      letter: letterB,
    };

    // Stammdaten-Activity-Log-Hook für Block B (consent-basiert; Empfänger
    // ist privatrechtlich, daher `app_aktivitaet`-Kategorie statt
    // `behoerde_zu_behoerde`).
    emitStammdatenLogForCascadeStep({
      personaId: persona.id,
      absenderBehoerdeId: 'buergeramt-berlin-mitte',
      empfaengerBehoerdeId: entry.behoerdeId,
      block: 'B',
    });
  }
}

/**
 * Erzeugt einen Block-D-Bestätigungsbrief nach erfolgreicher eID-Bestätigung.
 * Wird aus `api.bestätigeAutopilotSchritt` aufgerufen.
 */
export function buildBlockDConfirmation(
  step: AutopilotStep,
  input: UmzugInput,
  persona: Persona,
): Letter | undefined {
  const entry = BLOCK_D.find((e) => e.behoerdeId === step.behoerde_id);
  if (!entry) return undefined;
  return buildLetter({
    behoerdeId: entry.behoerdeId,
    personaId: persona.id,
    vorgangId: '__assigned-by-caller__',
    neueAdresseFormatted: formatAdresse(input.neue_adresse),
    stichtagFormatted: formatStichtag(input.stichtag),
    empfaengerName: persona.nachname,
    template: entry.briefTemplate,
  });
}

/**
 * Liefert den Block-Aufbau aus Persona + Input für die Preview-Screen.
 * Trifft die gleichen Sichtbarkeits-Entscheidungen wie der Autopilot-Generator,
 * ohne tatsächlich State zu mutieren.
 *
 * Wenn `input` übergeben wird, werden Adresse + Stichtag in die `aktion`-Texte
 * der Block-A-Schritte eingebettet, damit der Preview-Screen Daten-getrieben
 * bleibt (z. B. "Anmeldung Wohnort 10117 Berlin zum 01.06.2026"). Ohne Input
 * werden die statischen Standard-Texte verwendet.
 */
export function buildUmzugPreview(
  persona: Persona,
  input?: Pick<UmzugInput, 'neue_adresse' | 'stichtag'>,
): UmzugPreview {
  const adresseSuffix = input
    ? ` — ${input.neue_adresse.plz} ${input.neue_adresse.ort}`
    : '';
  const stichtagSuffix = input ? ` zum ${formatStichtag(input.stichtag)}` : '';

  const block_a: AutopilotStepDraft[] = BLOCK_A.filter(
    (e) => !e.visibleIf || e.visibleIf(persona),
  ).map((e) => ({
    behoerde_id: e.behoerdeId,
    aktion: `${e.aktion}${adresseSuffix}${stichtagSuffix}`,
    rechtsgrundlage: e.rechtsgrundlage,
    agent_label: e.agentLabel,
    datenkategorien: e.datenkategorien,
    block: 'A',
  }));

  const block_b: AutopilotStepDraft[] = BLOCK_B.filter(
    (e) => !e.visibleIf || e.visibleIf(persona),
  ).map((e) => ({
    behoerde_id: e.behoerdeId,
    aktion: e.aktion,
    rechtsgrundlage: e.rechtsgrundlage,
    agent_label: e.agentLabel,
    datenkategorien: e.datenkategorien,
    block: 'B',
    requires_consent: true,
  }));

  const block_c: SelfTask[] = [
    {
      id: 'kita-anmeldung',
      titel: 'Kita-Anmeldung neuer Bezirk',
      beschreibung:
        'Berliner Kita-Anmeldung läuft über das jeweilige Bezirksamt. Wir generieren ein Anschreiben mit Ihrer neuen Adresse für die Wunschkitas.',
      link: 'https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/',
      generates_template: true,
    },
    {
      id: 'hausarztwahl',
      titel: 'Hausarztwahl im neuen Wohngebiet',
      beschreibung:
        'Die KV Berlin führt ein bundesweites Verzeichnis aller Vertragsärzt:innen.',
      link: 'https://arztsuche.kbv.de',
    },
    {
      id: 'vereine-abos',
      titel: 'Vereins- und Abo-Adressen',
      beschreibung:
        'Mitgliedschaften und Abonnements (Fitnessstudio, Zeitungen, Streaming) müssen Sie privat melden — wir generieren Vorlagenbriefe.',
      generates_template: true,
    },
  ];

  const block_d: AutopilotStepDraft[] = BLOCK_D.filter((e) =>
    e.visibleIf(persona),
  ).map((e) => ({
    behoerde_id: e.behoerdeId,
    aktion: e.aktion,
    rechtsgrundlage: e.rechtsgrundlage,
    agent_label: e.agentLabel,
    datenkategorien: e.datenkategorien,
    block: 'D',
    requires_eid: true,
    persona_flag: e.personaFlag,
  }));

  return { block_a, block_b, block_c, block_d };
}
