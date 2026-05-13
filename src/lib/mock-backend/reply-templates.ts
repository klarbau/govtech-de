/**
 * Reply-Template-Token-Resolver (V1.5).
 *
 * Single source of truth: `src/lib/i18n/locales/de.json`
 *   → `posteingang.compose.templates.<id>.body_template_de`.
 *
 * Frontend-coder ruft `resolveReplyBody(...)` aus `<ReplySheet>` (oder
 * indirekt via `api.resolveReplyBody`) und bekommt den fertigen DE-Body
 * mit aufgelösten Address-, Datums-, Aktenzeichen- und ICU-`select`-Tokens.
 *
 * Architektur-Anker:
 *   - `docs/specs/posteingang-v1.5.md` §10.3 (mock-backend-coder hand-off)
 *   - `docs/domain/posteingang-v1.5-template-bodies.md` §1–§4 (locked bodies)
 *
 * Hard rules (alle aus dem Verifier-MUST-Cover, dem RDG-Hard-line und der
 * Domain-Note 10.3):
 *   1. **Wir formulieren nichts neu.** Body-Strings kommen verbatim aus
 *      `de.json`; dieser Resolver substituiert nur Platzhalter — keine
 *      Wortlaut-Änderungen, keine Konkatenationen, keine Wenn-dann-Sätze
 *      über die Templates hinweg.
 *   2. **Mode-Keys sind ASCII-only.** `bestaetigen` / `verschieben` /
 *      `absagen` (Domain §4 Notes; Spec §6.1). UI mappt UI-Label `bestätigen`
 *      → enum-Wert `bestaetigen` BEFORE Aufruf hier.
 *   3. **Unbekannte Token bleiben unaufgelöst** + `console.warn` in dev
 *      (defensive: ein Domain-Update mit neuem Token soll nicht den ganzen
 *      Resolver crashen). Bekannte aber leere User-Input-Token werden zu
 *      `[…]` gerendert, damit die Bürger:in *sieht*, was sie noch tun muss.
 *   4. **`freitext` → leerer String** (Task-Spec; das `freitext.body_template_de`
 *      in `de.json` ist UI-Vorlage für den noch leeren Editor-State, *nicht*
 *      Output dieses Resolvers).
 */
import deLocale from '@/lib/i18n/locales/de.json';
import type { Persona, Letter, Behoerde } from '@/types';
import { MockBackendError } from './errors';
import { withLatency } from './latency';
import { read, readOrInit, type CollectionKey } from './persistence';
import {
  behoerdenArraySchema,
  lettersArraySchema,
  personasArraySchema,
  personaSchema,
} from './schemas';
import { seedIfEmpty } from './seed';

// ----------------------------------------------------------------------------
// Boot-Hook (mirror api.ts) — der Resolver greift direkt auf Buckets zu, ohne
// einen `loadXxx`-Helper aus api.ts zu durchlaufen, also stellen wir hier
// selbst sicher, dass behoerden + personas + active letters initialisiert sind.
// ----------------------------------------------------------------------------

let booted = false;
function ensureBooted(): void {
  if (booted) return;
  booted = true;
  try {
    seedIfEmpty();
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error('[mock-backend/reply-templates] seed failed', err);
    }
  }
}

// ----------------------------------------------------------------------------
// Public types — re-exported aus `@/types/letter` für Komfort (Frontend
// importiert direkt von hier).
// ----------------------------------------------------------------------------

export type ReplyTemplateId =
  | 'frist_verlaengerung'
  | 'nachweis_einreichen'
  | 'informative_rueckmeldung'
  | 'termin_antwort'
  | 'freitext'
  // V1.5.1 — Skelett-Templates (Spec § 4.2; Domain-Doc § 3). RDG-clean,
  // Werkzeug-Charakter; Resolver löst neuen Token `{datum_bescheid}` auf.
  | 'rechtsbehelf_einspruch_skelett'
  | 'rechtsbehelf_widerspruch_skelett'
  | 'aussetzung_vollziehung_skelett';

export type ReplyTerminMode = 'bestaetigen' | 'verschieben' | 'absagen';

export interface ResolveReplyBodyInput {
  /** Aktive Persona — auflöst die `absender_*`-Token. */
  personaId: string;
  /** Inbound-Brief — auflöst `empfaenger_*`, `datum_letter`, `aktenzeichen`,
   *  `termin_vorgeschlagen` (regex-extracted aus `body_de`). */
  letterId: string;
  /** Template-Auswahl. */
  templateId: ReplyTemplateId;
  /** Pflicht für `templateId === 'termin_antwort'`; sonst ignoriert. */
  mode?: ReplyTerminMode;
  /** Free-Text-Felder; leer/undefined wird zu `[…]` gerendert (User sieht
   *  unmittelbar, was noch fehlt). */
  userInput?: {
    frist_neu_gewuenscht?: string;
    begruendung_kurz?: string;
    nachweis_bezeichnung?: string;
    rueckmeldung_text?: string;
    termin_neu_gewuenscht?: string;
  };
}

// ----------------------------------------------------------------------------
// Controlled list für `{nachweis_bezeichnung}` (Domain §8 — Verifier-locked).
// Frontend rendert das als `<Select>`, niemals als Free-Text-Input.
// ----------------------------------------------------------------------------

export const nachweisBezeichnungen = [
  'Schulbescheinigung',
  'Verdienstbescheinigung',
  'Mietvertrag',
  'Wohnungsgeberbestätigung',
  'Krankenkassen-Mitgliedsbescheinigung',
  'Aktueller Reisepass (Kopie)',
  'Aktueller Arbeitsvertrag',
  'Gehaltsnachweise der letzten sechs Monate',
  'Geburtsurkunde (Kopie)',
  'Steuerbescheid (Kopie)',
  'Gewerbe-Anmeldung (Kopie)',
  'Nachweis über laufenden SGB-II-Bezug',
  'Sonstige Bescheinigung',
] as const;

// ----------------------------------------------------------------------------
// Locale-Lookup (typed) — wir wollen nicht via `any` durch das Locale-Objekt.
// ----------------------------------------------------------------------------

interface DeTemplateBlock {
  body_template_de?: string;
  // Disclaimer und Co. interessieren den Resolver nicht; nur das Body-Template.
}

function getBodyTemplate(templateId: ReplyTemplateId): string | undefined {
  const root = deLocale as unknown as {
    posteingang?: {
      compose?: {
        templates?: Record<string, DeTemplateBlock>;
      };
    };
  };
  const tpl = root.posteingang?.compose?.templates?.[templateId];
  return tpl?.body_template_de;
}

// ----------------------------------------------------------------------------
// Lookups (intern). Wir respektieren localStorage-Buckets, fallen aber auf
// die Fixtures zurück, falls ein Bucket noch nicht initialisiert wurde
// (z. B. Server-Side, oder Frontend-Coder ruft uns vor dem ersten api.* auf).
// ----------------------------------------------------------------------------

function findPersona(personaId: string): Persona | undefined {
  // Aktiver Profile-Bucket zuerst (häufigster Fall: Resolver wird für die
  // gerade angemeldete Bürger:in aufgerufen).
  const profile = read('profile' as CollectionKey, personaSchema) as
    | Persona
    | undefined;
  if (profile && profile.id === personaId) return profile;

  // Sonst: personas-Bucket (alle drei Demo-Personas, von seedIfEmpty befüllt).
  const personas = readOrInit(
    'personas' as CollectionKey,
    personasArraySchema,
    [],
  ) as Persona[];
  return personas.find((p) => p.id === personaId);
}

function findLetter(letterId: string): Letter | undefined {
  const letters = readOrInit(
    'letters' as CollectionKey,
    lettersArraySchema,
    [],
  ) as Letter[];
  return letters.find((l) => l.id === letterId);
}

function findBehoerde(behoerdeId: string): Behoerde | undefined {
  const behoerden = readOrInit(
    'behoerden' as CollectionKey,
    behoerdenArraySchema,
    [],
  ) as Behoerde[];
  return behoerden.find((b) => b.id === behoerdeId);
}

// ----------------------------------------------------------------------------
// Datum-Formatierung — German civilian convention `dd.MM.yyyy` (kein Locale-
// API-Aufruf, weil Node-Default-Locale je nach Umgebung variiert; explizit ist
// safer).
// ----------------------------------------------------------------------------

function formatDateDe(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

// ----------------------------------------------------------------------------
// Termin-Vorschlag-Extraktion aus letter.body_de (Domain Note 10.3).
//   Regex: \d{2}\.\d{2}\.\d{4}(,?\s*\d{2}:\d{2}\s*Uhr)?
// Wir nehmen den ersten Match — Demo-Briefe enthalten max. 1 Termin-Vorschlag.
// ----------------------------------------------------------------------------

const TERMIN_REGEX = /\d{2}\.\d{2}\.\d{4}(?:,?\s*\d{2}:\d{2}\s*Uhr)?/;

function extractTerminVorgeschlagen(letter: Letter): string {
  // Termin-Letters enthalten den Vorschlag im Body. Heuristik: zweiter Match
  // (Trauungstermin steht *nach* dem Empfangs-Datum) — falls weniger als 2
  // Datums-Stellen, fall back auf den ersten Match.
  const body = letter.body_de ?? '';
  const matches: string[] = [];
  const globalRe = new RegExp(TERMIN_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = globalRe.exec(body)) !== null) {
    matches.push(m[0]);
    if (matches.length >= 5) break;
  }
  if (matches.length === 0) return '';
  // Heuristik: ein Termin-Vorschlag enthält in der Regel die Uhrzeit-Komponente
  // („14:00 Uhr"). Wenn ein solcher Treffer existiert, bevorzugt zurückgeben.
  const mitUhrzeit = matches.find((s) => /\d{2}:\d{2}/.test(s));
  if (mitUhrzeit) return mitUhrzeit;
  // Sonst: zweiter Treffer (heuristisch der eigentliche Vorschlag, weil der
  // erste oft das Schreiben-Datum ist).
  return matches[1] ?? matches[0];
}

// ----------------------------------------------------------------------------
// User-Input → Anzeige-Form. Leer/undefined → bracketed-DE-Placeholder, den
// die Bürger:in als „hier muss ich noch einsetzen" interpretiert.
// ----------------------------------------------------------------------------

function userInputOrPlaceholder(
  value: string | undefined,
  placeholderLabel: string,
): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return `[${placeholderLabel}]`;
  return trimmed;
}

// ----------------------------------------------------------------------------
// ICU-`select`-Parser — minimalistisch, NUR für die in
// `posteingang.compose.templates.termin_antwort.body_template_de` verwendete
// Form: `{<name>, select, <key1> {<text>} <key2> {<text>} ... other {<text>}}`.
// `<text>` darf weitere `{token}` enthalten (Brace-Tiefe wird mit-zähler).
//
// Wir verwenden bewusst keine volle ICU-Library — die Surface ist closed-list
// (genau ein Select-Block in genau einem Template) und die Drift-Gefahr einer
// Library-Update-Race ist höher als der Wert der Vollständigkeit.
// ----------------------------------------------------------------------------

interface SelectBlock {
  /** Name der Mode-Variable, hier immer `mode`. */
  variable: string;
  /** Map von Key → Body-String (mit nested `{token}`s). */
  branches: Record<string, string>;
  /** Start-Offset im Quelltext (inklusive `{`). */
  start: number;
  /** End-Offset im Quelltext (exklusive `}`). */
  end: number;
}

/**
 * Findet den ersten `{name, select, …}`-Block. Liefert undefined, wenn keiner
 * existiert (alle Templates außer `termin_antwort`).
 */
function findSelectBlock(template: string): SelectBlock | undefined {
  // Suche `{<word>,` gefolgt von `select`.
  const headerRe = /\{([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*select\s*,\s*/g;
  const header = headerRe.exec(template);
  if (!header) return undefined;

  const variable = header[1];
  const start = header.index;
  let i = headerRe.lastIndex;

  // Branches parsen: `<key> {<body>}` (Body kann nested `{}` enthalten).
  const branches: Record<string, string> = {};
  while (i < template.length) {
    // Leading whitespace + closing brace = Ende des select-Blocks.
    while (i < template.length && /\s/.test(template[i])) i++;
    if (template[i] === '}') {
      // Konsumiere die schließende `}` des select-Blocks.
      return { variable, branches, start, end: i + 1 };
    }
    // Lese Key (alphanumerisch + ASCII).
    const keyStart = i;
    while (i < template.length && /[a-zA-Z0-9_]/.test(template[i])) i++;
    const key = template.slice(keyStart, i);
    if (!key) {
      // Defensive: unparseable Form — abbrechen.
      return undefined;
    }
    // Whitespace bis `{`.
    while (i < template.length && /\s/.test(template[i])) i++;
    if (template[i] !== '{') return undefined;
    i++; // skip opening `{`
    // Body lesen mit Brace-Counting.
    const bodyStart = i;
    let depth = 1;
    while (i < template.length && depth > 0) {
      const ch = template[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    if (depth !== 0) return undefined;
    branches[key] = template.slice(bodyStart, i);
    i++; // skip closing `}` of branch
  }
  return undefined;
}

/**
 * Wählt die passende ICU-Branch.
 * - Mode-Wert nicht in `bestaetigen`/`verschieben`/`absagen` → Fall-through
 *   auf `other` (Domain §4 Notes: konservativer Fallback ist „bestätigen"-
 *   Variante, was Domain in `other` verbatim spiegelt).
 */
function pickSelectBranch(
  block: SelectBlock,
  mode: ReplyTerminMode | undefined,
): string {
  const validKeys: ReplyTerminMode[] = ['bestaetigen', 'verschieben', 'absagen'];
  if (mode && validKeys.includes(mode) && mode in block.branches) {
    return block.branches[mode];
  }
  if ('other' in block.branches) return block.branches.other;
  // Letzter Fallback: irgendeine Branch — niemals leer-string returnen,
  // weil das den ganzen Body kaputt machen würde.
  const firstKey = Object.keys(block.branches)[0];
  return firstKey ? block.branches[firstKey] : '';
}

// ----------------------------------------------------------------------------
// Token-Substitution — wir gehen einmal durch den Template-String und
// ersetzen jedes `{token}`-Vorkommen mit dem aufgelösten Wert (oder lassen
// es stehen + warnen).
// ----------------------------------------------------------------------------

const TOKEN_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

function substituteTokens(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(TOKEN_RE, (full, name: string) => {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      return values[name];
    }
    // Unbekannter Token → unaufgelöst lassen, in dev warnen.
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production' &&
      typeof console !== 'undefined'
    ) {
      console.warn(
        `[mock-backend/reply-templates] Unbekannter Token "{${name}}" — bleibt unaufgelöst.`,
      );
    }
    return full;
  });
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Resolves a DE-locale body template into the fully-substituted citizen-letter
 * body. Reads from de.json + persona/letter/behoerden buckets.
 *
 * Latency: 100–200 ms (cheap, but realistic „generating from template" feel).
 * Error model: throws `MockBackendError` with codes:
 *   - `PERSONA_NOT_FOUND`
 *   - `LETTER_NOT_FOUND`
 *   - `TEMPLATE_NOT_FOUND` (Body-Template nicht in de.json — Drift-Indikator)
 *
 * Edge case: `templateId === 'freitext'` → returns empty string (kein
 * Skelett), unabhängig davon, was de.json an `freitext.body_template_de`
 * liefert. Der frontend-Editor startet leer für Freitext.
 */
export async function resolveReplyBody(
  input: ResolveReplyBodyInput,
): Promise<string> {
  return withLatency<string>(
    () => resolveReplyBodySync(input),
    { min: 100, max: 200 },
  );
}

/**
 * Synchroner Kern — exportiert für Unit-Tests + ggf. Server-Side-Rendering,
 * falls jemand ohne Latenz den Body braucht. Frontend ruft IMMER die async
 * Variante.
 */
export function resolveReplyBodySync(
  input: ResolveReplyBodyInput,
): string {
  ensureBooted();

  // freitext → leer (Task-Spec).
  if (input.templateId === 'freitext') return '';

  const persona = findPersona(input.personaId);
  if (!persona) {
    throw new MockBackendError(
      `Persona "${input.personaId}" nicht gefunden — Reply-Body kann nicht aufgelöst werden.`,
      { code: 'PERSONA_NOT_FOUND', retryable: false },
    );
  }

  const letter = findLetter(input.letterId);
  if (!letter) {
    throw new MockBackendError(
      `Brief "${input.letterId}" nicht gefunden — Reply-Body kann nicht aufgelöst werden.`,
      { code: 'LETTER_NOT_FOUND', retryable: false },
    );
  }

  const template = getBodyTemplate(input.templateId);
  if (template === undefined) {
    // V1.5.1 (build-pipeline-Konvention): die drei Skelett-Templates werden
    // von i18n-localizer parallel zu mock-backend-coder befüllt. Solange das
    // i18n-Leaf noch nicht existiert, sollen wir nicht hart crashen — siehe
    // V1.5-Ship-Lessons-Memory („missing-key escape-hatch"). Wir liefern einen
    // leeren String und loggen in dev. Hard-fail bleibt für die V1.5.0-Templates,
    // die bereits in de.json existieren — fehlt dort eines, ist Drift.
    const isV151SkelettTemplate =
      input.templateId === 'rechtsbehelf_einspruch_skelett' ||
      input.templateId === 'rechtsbehelf_widerspruch_skelett' ||
      input.templateId === 'aussetzung_vollziehung_skelett';
    if (isV151SkelettTemplate) {
      if (
        typeof process !== 'undefined' &&
        process.env?.NODE_ENV !== 'production' &&
        typeof console !== 'undefined'
      ) {
        console.warn(
          `[mock-backend/reply-templates] V1.5.1 Skelett-Template "${input.templateId}" not yet present in de.json — returning empty body until i18n-localizer ships the key.`,
        );
      }
      return '';
    }
    throw new MockBackendError(
      `Body-Template "${input.templateId}" nicht in de.json gefunden — Domain/i18n-Drift.`,
      { code: 'TEMPLATE_NOT_FOUND', retryable: false },
    );
  }

  // Behörde — wir tolerieren ein Fehlen (z. B. wenn Mock-Daten unvollständig
  // sind), rendern dann leere Strings für die `empfaenger_*`-Felder. Das
  // verhindert einen harten Crash im Compose-Sheet, falls Letter auf eine
  // nicht-seedete Behörde zeigt.
  const behoerde = findBehoerde(letter.absender_behoerde_id);

  const absenderName = `${persona.vorname} ${persona.nachname}`;
  const absenderStrasse =
    `${persona.adresse.strasse} ${persona.adresse.hausnummer}`.trim();
  const absenderPlz = persona.adresse.plz;
  const absenderOrt = persona.adresse.ort;

  const empfaengerName = behoerde?.name_de ?? '';
  const empfaengerStrasse = behoerde
    ? `${behoerde.adresse.strasse} ${behoerde.adresse.hausnummer}`.trim()
    : '';
  const empfaengerPlz = behoerde?.adresse.plz ?? '';
  const empfaengerOrt = behoerde?.adresse.ort ?? '';

  const datum = formatDateDe(new Date());
  // {datum_letter}: Brief-Empfangsdatum (V1.5.0 — "Schreiben vom" usage).
  const datumLetter = formatDateDe(letter.empfangen_am);
  // {datum_bescheid}: Erlassdatum des Bescheids (V1.5.1 — "Bescheid vom" usage,
  // Domain-Doc § 3 Resolver-Hard-Rule, Spec § 11.9). Fallback auf empfangen_am,
  // falls bescheid_dated_at undefined (z. B. nicht-Bescheid-Letter, die das
  // Skelett aber trotzdem rendern könnten — graceful degradation).
  // STRIKT als separate lokale Variable von datumLetter — keine Wiederverwendung
  // (Spec § 11.9 Hard-Line).
  const datumBescheid = letter.bescheid_dated_at
    ? formatDateDe(letter.bescheid_dated_at)
    : datumLetter;

  // {frist_alt}: erste Frist des Briefs (zahlung/nachweis/einspruch je nach
  // Archetyp). Wenn keine vorhanden → leerer String (nicht `[…]`, weil das
  // Template inhaltlich ohne Frist sinnlos ist; UI-Validation soll dann den
  // Send-Button disablen).
  const fristAlt = (() => {
    const frist = letter.fristen?.[0]?.datum;
    if (!frist) return '';
    return formatDateDe(frist);
  })();

  // {termin_vorgeschlagen}: regex-extracted aus body. Wenn leer → `[Termin]`,
  // damit die Bürger:in im Editor sieht, dass das Feld nicht aufgelöst werden
  // konnte (defensive — Domain Note 10.3).
  const terminVorgeschlagenRaw = extractTerminVorgeschlagen(letter);
  const terminVorgeschlagen =
    terminVorgeschlagenRaw.length > 0 ? terminVorgeschlagenRaw : '[Termin]';

  // User-Input — DE-Bracket-Placeholder (User-friendly „hier kommt was hin").
  const fristNeuGewuenscht = userInputOrPlaceholder(
    input.userInput?.frist_neu_gewuenscht,
    'gewünschte neue Frist',
  );
  const begruendungKurz = userInputOrPlaceholder(
    input.userInput?.begruendung_kurz,
    'kurze Begründung',
  );
  const nachweisBezeichnung = userInputOrPlaceholder(
    input.userInput?.nachweis_bezeichnung,
    'Nachweis-Bezeichnung',
  );
  const rueckmeldungText = userInputOrPlaceholder(
    input.userInput?.rueckmeldung_text,
    'Ihre Rückmeldung',
  );
  const terminNeuGewuenscht = userInputOrPlaceholder(
    input.userInput?.termin_neu_gewuenscht,
    'gewünschter Alternativtermin',
  );

  // Werte-Map. `ort` ist per Domain-Definition `absender_ort` (sender's city
  // for the dateline — German letter convention).
  const tokenValues: Record<string, string> = {
    absender_name: absenderName,
    absender_strasse: absenderStrasse,
    absender_plz: absenderPlz,
    absender_ort: absenderOrt,
    empfaenger_behoerde: empfaengerName,
    empfaenger_strasse: empfaengerStrasse,
    empfaenger_plz: empfaengerPlz,
    empfaenger_ort: empfaengerOrt,
    ort: absenderOrt,
    datum,
    datum_letter: datumLetter,
    // V1.5.1: separater Token mit eigener Quelle (`bescheid_dated_at`).
    datum_bescheid: datumBescheid,
    aktenzeichen: letter.aktenzeichen,
    frist_alt: fristAlt,
    frist_neu_gewuenscht: fristNeuGewuenscht,
    begruendung_kurz: begruendungKurz,
    nachweis_bezeichnung: nachweisBezeichnung,
    rueckmeldung_text: rueckmeldungText,
    termin_vorgeschlagen: terminVorgeschlagen,
    termin_neu_gewuenscht: terminNeuGewuenscht,
  };

  // 1) ICU-`select`-Block (nur in `termin_antwort`) zuerst auflösen — wir
  //    ersetzen den gesamten `{mode, select, ...}`-Block durch die ausgewählte
  //    Branch (mit eigenen `{token}`-Substitutionen).
  let resolved = template;
  const selectBlock = findSelectBlock(resolved);
  if (selectBlock) {
    const branchTemplate = pickSelectBranch(selectBlock, input.mode);
    const branchResolved = substituteTokens(branchTemplate, tokenValues);
    resolved =
      resolved.slice(0, selectBlock.start) +
      branchResolved +
      resolved.slice(selectBlock.end);
  }

  // 2) Restliche Top-Level-Token substituieren.
  resolved = substituteTokens(resolved, tokenValues);

  return resolved;
}
