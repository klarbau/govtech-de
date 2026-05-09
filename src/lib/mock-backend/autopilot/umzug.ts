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

const MOCK_FOOTER =
  '[MOCK – Verwaltungsdemo, keine echten Daten]';

interface BlockAEntry {
  behoerdeId: string;
  aktion: string;
  rechtsgrundlage: string;
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
  latencyMs: number;
}

interface BlockDEntry {
  behoerdeId: string;
  aktion: string;
  rechtsgrundlage: string;
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

const BLOCK_A: BlockAEntry[] = [
  {
    behoerdeId: 'buergeramt-berlin-mitte',
    aktion: 'Anmeldung neuer Wohnort nach § 17 BMG',
    rechtsgrundlage: '§ 17 BMG',
    latencyMs: 900,
    briefTemplate: {
      absender:
        'Bezirksamt Mitte von Berlin — Bürgeramt Müllerstraße\nMüllerstraße 146, 13353 Berlin',
      betreffTemplate:
        'Ihre Anmeldung nach § 17 BMG vom {stichtag} — Aktenzeichen {az}',
      floskel:
        'in oben genannter Angelegenheit bestätigen wir Ihre Anmeldung unter folgender Anschrift:\n\n{neue_adresse}\n\nDie Datenübermittlung an die zuständigen öffentlichen Stellen erfolgt gemäß §§ 33, 34 und 36 BMG. Die im Personalausweis hinterlegte Anschrift wird durch die Bundesdruckerei aktualisiert.',
      abschluss: 'Mit freundlichen Grüßen\nIm Auftrag\nT. Klose, Sachbearbeiter:in',
    },
  },
  {
    behoerdeId: 'finanzamt-koerperschaften-i-berlin',
    aktion: 'Mitteilung örtliche Zuständigkeit nach § 39 AO',
    rechtsgrundlage: '§ 39 AO + § 36 BMG',
    latencyMs: 1400,
    briefTemplate: {
      absender:
        'Finanzamt für Körperschaften I Berlin\nBredtschneiderstraße 5, 14057 Berlin',
      betreffTemplate:
        'Mitteilung über die örtliche Zuständigkeit — Steuernummer {az}',
      floskel:
        'aufgrund Ihres Wohnsitzwechsels ist Ihre Steuerakte ab dem {stichtag} an unser Finanzamt abgegeben worden. Bitte verwenden Sie zukünftig die oben angegebene Steuernummer in Ihrer Korrespondenz und Ihrer ELSTER-Erklärung.\n\nDiese Mitteilung ergeht maschinell und ist auch ohne Unterschrift gültig.',
      abschluss: 'Mit freundlichen Grüßen\nFinanzamt für Körperschaften I Berlin',
    },
  },
  {
    behoerdeId: 'beitragsservice-koeln',
    aktion: 'Adressänderung Beitragskonto nach § 11 Abs. 4 RBStV',
    rechtsgrundlage: '§ 11 Abs. 4 RBStV',
    latencyMs: 1100,
    briefTemplate: {
      absender: 'ARD ZDF Deutschlandradio Beitragsservice, 50656 Köln',
      betreffTemplate:
        'Ihre Beitragsnummer {az} — Anschriftenänderung',
      floskel:
        'vielen Dank für die Übermittlung. Wir haben Ihre neue Anschrift zum {stichtag} in unserem System hinterlegt:\n\n{neue_adresse}',
      abschluss: 'Mit freundlichen Grüßen\nBeitragsservice',
    },
  },
  {
    behoerdeId: 'bundesdruckerei',
    aktion: 'Beauftragung Personalausweis-Adressaufkleber nach § 28 PAuswG',
    rechtsgrundlage: '§ 28 PAuswG',
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

const BLOCK_B: BlockBEntry[] = [
  {
    behoerdeId: 'aok-nordost',
    aktion: 'Adressänderung Versichertenkonto',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    latencyMs: 600,
  },
  {
    behoerdeId: 'berliner-sparkasse',
    aktion: 'Adressänderung Bankverbindung',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO + AGB',
    latencyMs: 800,
  },
  {
    behoerdeId: 'allianz-hausrat',
    aktion: 'Adressänderung Versicherungsvertrag',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    latencyMs: 700,
  },
  {
    behoerdeId: 'vattenfall-strom',
    aktion: 'Adressänderung Stromvertrag',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    latencyMs: 500,
  },
  {
    behoerdeId: 'telekom',
    aktion: 'Adressänderung Mobilfunk-/Internetvertrag',
    rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    latencyMs: 500,
  },
];

const BLOCK_D: BlockDEntry[] = [
  {
    behoerdeId: 'kfz-berlin-labo',
    aktion:
      'Halter-Adressänderung Zulassungsbescheinigung Teil I (§ 15 FZV)',
    rechtsgrundlage: '§ 15 FZV + § 18 PAuswG eID',
    personaFlag: 'kfz_halter',
    visibleIf: (p) => p.kfz_halter === true,
    briefTemplate: {
      absender:
        'Landesamt für Bürger- und Ordnungsangelegenheiten — KFZ-Zulassung\nJüterboger Straße 3, 10965 Berlin',
      betreffTemplate:
        'Ihre Mitteilung gem. § 15 FZV — Halteranschrift {az}',
      floskel:
        'in oben genannter Angelegenheit haben wir die Halteranschrift Ihres Fahrzeugs auf Ihre neue Anschrift aktualisiert:\n\n{neue_adresse}\n\nEine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu.',
      abschluss: 'Mit freundlichen Grüßen\nKFZ-Zulassung Berlin',
    },
  },
  {
    behoerdeId: 'familienkasse-berlin-brandenburg',
    aktion: 'Veränderungsmitteilung Adresse / Zuständigkeitswechsel',
    rechtsgrundlage: '§§ 67/68 EStG + § 18 PAuswG eID',
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
    behoerdeId: 'abh-berlin-lea',
    aktion: 'Adress-Update auf eAT-Karte + Termin-Buchung',
    rechtsgrundlage: '§ 87 AufenthG + § 18 PAuswG eID',
    personaFlag: 'aufenthaltstitel',
    visibleIf: (p) => p.aufenthaltstitel !== undefined,
    briefTemplate: {
      absender:
        'Landesamt für Einwanderung Berlin (LEA)\nFriedrich-Krause-Ufer 24, 13353 Berlin',
      betreffTemplate:
        'Ihr Aufenthaltstitel — Aktenzeichen {az}',
      floskel:
        'in oben genannter Angelegenheit bestätigen wir die Übermittlung Ihrer neuen Anschrift. Zur Aktualisierung der auf der elektronischen Aufenthaltskarte hinterlegten Anschrift bitten wir Sie, den vereinbarten Termin wahrzunehmen.',
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

const FAILURE_RATE = 0.05;
const isReliable = (): boolean => {
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
        status: 'confirmed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        letter_id: letter?.id,
      },
      letter,
    };
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
    const stepId = `step-${uuid()}`;
    const startedAt = new Date().toISOString();
    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'B',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
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
          status: 'failed',
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          failure_reason: `${entry.behoerdeId}: Übermittlung fehlgeschlagen`,
          consent_given_at: startedAt,
        },
      };
      continue;
    }
    yield {
      step: {
        id: stepId,
        behoerde_id: entry.behoerdeId,
        block: 'B',
        aktion: entry.aktion,
        rechtsgrundlage: entry.rechtsgrundlage,
        status: 'confirmed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        consent_given_at: startedAt,
        requires_consent: true,
      },
    };
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
    block: 'A',
  }));

  const block_b: AutopilotStepDraft[] = BLOCK_B.map((e) => ({
    behoerde_id: e.behoerdeId,
    aktion: e.aktion,
    rechtsgrundlage: e.rechtsgrundlage,
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
    block: 'D',
    requires_eid: true,
    persona_flag: e.personaFlag,
  }));

  return { block_a, block_b, block_c, block_d };
}
