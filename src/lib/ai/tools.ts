/**
 * Anthropic tool definitions exposed to the assistant.
 *
 * Each entry has a 1:1 counterpart in `src/lib/mock-backend/api.ts`. The
 * route handler does NOT execute these tools server-side — we picked
 * Approach B (client-executes-tools) per `docs/architecture.md`. The route
 * handler just streams `tool_use` blocks back to the browser; the client
 * dispatches them against its in-process mock-backend and POSTs the next
 * turn with `tool_result` blocks attached.
 *
 * Tool descriptions are written in DE (the source-of-truth language). The
 * model self-translates as needed when explaining capabilities to the user.
 *
 * Schema notes:
 *   - `input_schema.type` is always `'object'`. Anthropic enforces this.
 *   - Use `required` aggressively — the model fills missing required fields
 *     by asking the user (good) rather than hallucinating defaults (bad).
 *   - String enums + format hints (`pattern`, `format: 'date'`) are honoured
 *     by Claude well; we use them where they buy us safety.
 */

import type Anthropic from '@anthropic-ai/sdk';

/**
 * Stable list of tool names. Single source of truth consumed by:
 *   - this file (tool registration),
 *   - the client-side dispatch table (`src/lib/mock-backend/api.ts` consumer).
 *
 * Keep in sync — adding a name here without a dispatch entry means the model
 * can call something that returns an error.
 */
export const TOOL_NAMES = [
  'starte_umzug',
  // Read-only Vorschau-Tool (redesign-assistent.md §7.2). Ermittelt die je
  // Block (A/B/C/D) zu informierenden Behörden für eine Adresse + Stichtag,
  // OHNE etwas auszulösen. Speist `<UmzugConfirmCard>` BEVOR `starte_umzug`
  // läuft (propose-before-act). Braucht KEINE Bestätigung.
  'preview_umzug',
  'lese_posteingang',
  'hole_vorgang',
  'hole_profil',
  'liste_termine',
  // Posteingang-Tools — spec/posteingang.md §7.1. Read-only, citation-bound,
  // catalog-driven. NO Antwort-Generator (V1 OUT, Smartlaw-Linie BGH I ZR 113/20).
  'erklaere_brief',
  'extrahiere_frist',
  'vorschlage_naechsten_schritt',
  // Convenience Pass-1 (convenience-pass1.md §7). Read-only, no confirm gate.
  // `hole_ersparnis` mirrors the ValueReceipt into the chat after an Umzug run;
  // `hole_autopilot_katalog` answers "was kannst du noch automatisieren?".
  'hole_ersparnis',
  'hole_autopilot_katalog',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

/**
 * Locale codes accepted by `erklaere_brief`. Mirrors `SupportedLocale` in
 * `language.ts` — kept as a literal here so the JSONSchema enum and the
 * runtime validator (`tool-schemas.ts`) stay in sync without a circular import.
 */
export const ERKLAERE_BRIEF_LOCALES = ['de', 'en', 'ru', 'uk', 'ar', 'tr'] as const;

export const tools: Anthropic.Tool[] = [
  /* ───────────────────────────── starte_umzug ───────────────────────────── */
  {
    name: 'starte_umzug',
    description: [
      'Legt einen neuen Umzug-Vorgang an und startet die 4-Block-Autopilot-Kaskade.',
      '',
      'Block A (automatisch, §§ 33/34/36 BMG): Bürgeramt neuer Wohnort, Bürgeramt alt (Wegzugsmitteilung), Bundesdruckerei (Personalausweis-Adressaufkleber), Finanzamt, Beitragsservice ARD/ZDF/Dlr.',
      '',
      'Block B (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO): privatrechtliche Empfänger wie Krankenkasse, Bank, Arbeitgeber, Hausratversicherung, Energie-/Telekom-Anbieter. Wird nur für die in "block_b_consent" gelisteten Empfänger ausgeführt — leeres Array überspringt Block B vollständig. Frage die Nutzerin VOR dem Aufruf, welche Empfänger sie freigibt; widerruflich jederzeit.',
      '',
      'Block C (Eigen-Erledigung): Kita-Anmeldung, Hausarztwahl, Vereins-/Abo-Adressen — werden im UI als Checkliste mit Vorlagen angezeigt; kein Tool-Effekt.',
      '',
      'Block D (eID-Bestätigung, persona-abhängig): KFZ-Zulassung, Familienkasse, Ausländerbehörde. Wird nur eingeplant, wenn die jeweiligen Persona-Flags aktiv sind. Nach Tool-Aufruf erscheinen im UI eID-Tap-Dialoge — die eID-Bestätigung läuft NICHT über dieses Tool.',
      '',
      'Vorbedingungen: Wohnungsgeberbestätigung nach § 19 BMG muss vorliegen (im Demo: Beispiel-Datei verfügbar). Aufrufer MUSS die Nutzerin zuvor um Bestätigung gebeten haben — niemals ohne explizites Einverständnis aufrufen.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        neue_adresse: {
          type: 'object',
          description: 'Die neue Wohnanschrift in Deutschland (Auslandsumzug ist nicht im Scope).',
          properties: {
            strasse: { type: 'string', description: 'Straßenname ohne Hausnummer.' },
            hausnummer: { type: 'string', description: 'Hausnummer inkl. eventueller Zusatzbuchstaben (z. B. „142a").' },
            zusatz: { type: 'string', description: 'Optionaler Adresszusatz (z. B. „c/o", „2. OG").' },
            plz: {
              type: 'string',
              pattern: '^\\d{5}$',
              description: 'Fünfstellige deutsche Postleitzahl.',
            },
            ort: { type: 'string', description: 'Stadt bzw. Gemeinde.' },
            land: {
              type: 'string',
              enum: ['DE'],
              description: 'Muss „DE" sein — Auslandsumzug ist out-of-scope.',
            },
          },
          required: ['strasse', 'hausnummer', 'plz', 'ort', 'land'],
        },
        stichtag_iso: {
          type: 'string',
          format: 'date',
          description: 'Einzugsdatum als ISO-Datum (YYYY-MM-DD).',
        },
        block_b_consent: {
          type: 'array',
          description:
            'Liste der behoerde_id-Werte (z. B. "aok-nordost", "sparkasse-berlin"), für die die Nutzerin DSGVO-Einwilligung erteilt hat. Leeres Array → Block B wird übersprungen. Die behoerde_id-Werte stammen aus dem Mock-Backend; frage notfalls "lese_posteingang" oder "hole_profil" zur Klärung.',
          items: { type: 'string' },
        },
      },
      required: ['neue_adresse', 'stichtag_iso', 'block_b_consent'],
    },
  },

  /* ───────────────────────────── preview_umzug ──────────────────────────── */
  {
    name: 'preview_umzug',
    description: [
      'Ermittelt, welche Behörden bei einem Umzug informiert würden (Block A automatisch nach §§ 33/34/36 BMG, Block B mit Einwilligung, Block C selbst, Block D mit eID), OHNE etwas auszulösen.',
      '',
      'Nutze dieses Werkzeug, um der Nutzerin VOR der Bestätigung eine Vorschau zu zeigen. Aus dem Ergebnis baut die UI eine Bestätigungskarte; erst nach dem ausdrücklichen Klick „Umzug starten" wird "starte_umzug" ausgeführt.',
      '',
      'Es ist read-only und braucht keine Bestätigung. Rufe es auf, sobald du Adresse + Stichtag von der Nutzerin hast — auch wenn die Block-B-Einwilligung noch offen ist (die Block-B-Liste wird in der Karte angezeigt und dort bestätigt).',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        neue_adresse: {
          type: 'object',
          description: 'Die neue Wohnanschrift in Deutschland (Auslandsumzug ist nicht im Scope).',
          properties: {
            strasse: { type: 'string', description: 'Straßenname ohne Hausnummer.' },
            hausnummer: { type: 'string', description: 'Hausnummer inkl. eventueller Zusatzbuchstaben (z. B. „142a").' },
            zusatz: { type: 'string', description: 'Optionaler Adresszusatz (z. B. „c/o", „2. OG").' },
            plz: {
              type: 'string',
              pattern: '^\\d{5}$',
              description: 'Fünfstellige deutsche Postleitzahl.',
            },
            ort: { type: 'string', description: 'Stadt bzw. Gemeinde.' },
            land: {
              type: 'string',
              enum: ['DE'],
              description: 'Muss „DE" sein — Auslandsumzug ist out-of-scope.',
            },
          },
          required: ['strasse', 'hausnummer', 'plz', 'ort', 'land'],
        },
        stichtag_iso: {
          type: 'string',
          format: 'date',
          description: 'Einzugsdatum als ISO-Datum (YYYY-MM-DD).',
        },
      },
      required: ['neue_adresse', 'stichtag_iso'],
    },
  },

  /* ─────────────────────────── lese_posteingang ─────────────────────────── */
  {
    name: 'lese_posteingang',
    description: [
      'Liest den Posteingang (Behörden-Briefe) der aktiven Persona. Ergebnis ist eine Liste mit Absender, Aktenzeichen, Betreff, Status (ungelesen/gelesen/erledigt), Eingangsdatum und — falls vorhanden — KI-Zusammenfassung in mehreren Sprachen.',
      '',
      'Filter sind optional. Häufigste Anwendung: Frage „Was steht im Brief von …?" → mit "absender" filtern, dann den Body zusammenfassen.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          description: 'Optionale Einschränkung der Treffermenge.',
          properties: {
            absender: {
              type: 'string',
              description:
                'Behörden-id oder Behörden-Name-Substring (case-insensitive, z. B. "finanzamt", "beitragsservice", "abh").',
            },
            status: {
              type: 'string',
              enum: ['ungelesen', 'gelesen', 'erledigt'],
              description: 'Filter nach Brief-Status.',
            },
            vorgang_id: {
              type: 'string',
              description: 'Nur Briefe zu einem bestimmten Vorgang.',
            },
            max: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              description: 'Maximale Anzahl zurückgelieferter Briefe (Default 10).',
            },
          },
        },
      },
    },
  },

  /* ─────────────────────────────── hole_vorgang ─────────────────────────── */
  {
    name: 'hole_vorgang',
    description:
      'Liefert den vollständigen Status eines Vorgangs anhand seiner ID — Schritte je Block (A/B/C/D), Status pro Behörde, Aktenzeichen, gekoppelte Briefe und Termine. Verwende dieses Tool, wenn die Nutzerin nach „dem Stand meines Umzugs" o. ä. fragt und du eine vorgang_id aus dem letzten Turn oder aus "lese_posteingang" kennst.',
    input_schema: {
      type: 'object',
      properties: {
        vorgang_id: {
          type: 'string',
          description: 'Eindeutige Vorgangs-ID, z. B. "vorgang-umzug-2026-04-2841".',
        },
      },
      required: ['vorgang_id'],
    },
  },

  /* ─────────────────────────────── hole_profil ──────────────────────────── */
  {
    name: 'hole_profil',
    description: [
      'Liefert die vollständigen Stammdaten der aktiven Persona: Name, Geburtsdatum, Staatsangehörigkeit, Adresse, Familienstand, Kinder, Beschäftigung, Aufenthaltstitel (falls vorhanden) inkl. Gültigkeitsdatum, KFZ-Halter-Flag, Krankenkasse.',
      '',
      'Aufrufen, wenn die Nutzerin nach einem konkreten Stammdaten-Wert fragt („Wann läuft mein Aufenthaltstitel ab?", „Wo bin ich gemeldet?") und der Wert NICHT im Persona-Kontext-Block des Systems steht. Niemals erfinden.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  /* ─────────────────────────────── liste_termine ────────────────────────── */
  {
    name: 'liste_termine',
    description:
      'Liefert die anstehenden und vergangenen Behörden-Termine der aktiven Persona (Datum, Uhrzeit, Behörde, Ort/Video, gekoppelter Vorgang, Status). Optional nach Vorgang oder Zeitraum filterbar.',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            vorgang_id: {
              type: 'string',
              description: 'Nur Termine zu einem bestimmten Vorgang.',
            },
            ab_datum: {
              type: 'string',
              format: 'date',
              description: 'Nur Termine ab diesem Datum (ISO YYYY-MM-DD).',
            },
            bis_datum: {
              type: 'string',
              format: 'date',
              description: 'Nur Termine bis zu diesem Datum (ISO YYYY-MM-DD).',
            },
          },
        },
      },
    },
  },

  /* ─────────────────────────────── erklaere_brief ───────────────────────── */
  {
    name: 'erklaere_brief',
    description: [
      'Erstellt die Post-Open-Zusammenfassung eines Behörden­briefs als 5–8 strukturelle Bullets MIT Citation-Pflicht (Original-Zitat pro Bullet aus body_de). Diese Erklärung paraphrasiert den Originaltext — Originaltext bleibt rechtsverbindlich.',
      '',
      'Ablauf: lädt den Letter aus dem Mock-Backend, extrahiert je Bullet einen Original-Satz aus body_de als Citation. Output bleibt deskriptiv und nicht-handlungsanweisend; gibt KEINE einzelfallbezogene Rechtsbewertung ab (BGH I ZR 113/20 „Smartlaw"-Linie).',
      '',
      'Pro Bullet ein `original_zitat`-Beleg. Wenn ein Bullet rein Norm-Kontext ist (z. B. „§ 240 AO Säumniszuschlag 1 % pro Monat"), bleibt `original_zitat` leer und der Bullet wird im UI mit Norm-Tooltip statt Citation-Marker gerendert.',
      '',
      'Sprache des Outputs richtet sich nach UI-Locale (de/en/ru/uk/ar/tr). Liegen für die gewählte Sprache (noch) keine gepflegten Bullets vor, werden DE-Bullets mit einem `note: "Übersetzungen kommen mit der nächsten Iteration"`-Hinweis zurückgegeben — Übersetzungen werden NICHT erfunden. Originaltext bleibt immer DE.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        letterId: {
          type: 'string',
          description:
            'Brief-ID aus dem Mock-Backend (z. B. „letter-schmidt-fa-steuerbescheid-2024"). Erforderlich; aus `lese_posteingang` lesbar.',
        },
        locale: {
          type: 'string',
          enum: [...ERKLAERE_BRIEF_LOCALES],
          description:
            'Ziel-Sprache der Bullets. Optional; Default = UI-Locale der aktiven Persona.',
        },
      },
      required: ['letterId'],
    },
  },

  /* ─────────────────────────────── extrahiere_frist ─────────────────────── */
  {
    name: 'extrahiere_frist',
    description: [
      'Extrahiert ALLE Fristen aus einem Behörden­brief (Mehrfach-Fristen möglich) MIT Citation-Pflicht.',
      '',
      'Hybrid-Pipeline: LLM (Verständnis: Frist-Typ „zahlung" / „einspruch" / „widerspruch" / „klage" / „nachweis" / „antragstellung" / „sonstige") + Regex (`\\d{1,2}\\.\\d{1,2}\\.\\d{4}` Datums-Match im body_de). Pro Frist obligatorisch ein `original_zitat`-Satz. Wenn das LLM-Datum NICHT mit dem Regex-Treffer im Brief übereinstimmt, wird `citation_match: false` gesetzt — die Frist wird in diesem Fall NICHT in den Kalender übernommen, Bürger:in muss selbst prüfen.',
      '',
      'Wenn der Brief keine Frist enthält: leeres `fristen`-Array. Frist-Daten leiten sich strikt aus dem Original-Zitat ab, niemals aus eigener Berechnung.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        letterId: {
          type: 'string',
          description: 'Brief-ID aus dem Mock-Backend.',
        },
      },
      required: ['letterId'],
    },
  },

  /* ──────────────────────── vorschlage_naechsten_schritt ────────────────── */
  {
    name: 'vorschlage_naechsten_schritt',
    description: [
      'Liefert eine INFORMATIVE Liste möglicher Handlungen pro Brief-Archetyp aus einem festen Katalog — KEIN Antwort-Generator (V1 strikt out-of-scope), KEIN Versand-Button, KEIN Brief-Entwurf.',
      '',
      'Diese Liste ist allgemeine Information aus einem Katalog. Sie ist keine Bewertung Ihres Einzelfalls. Eine konkrete rechtliche Bewertung — etwa Erfolgsaussichten eines Widerspruchs — kann nur durch eine zur Rechtsdienstleistung befugte Person erfolgen (Anwält:in, Verbraucherzentrale, Sozialverband). Vergleiche § 2 RDG, BGH I ZR 113/20 „Smartlaw"-Linie.',
      '',
      'Output ist eine fixe Liste aus dem Brief-Archetyp-Katalog. Beispiele: Steuerbescheid → [„zahlung", „einspruch", „aussetzung", „saeumniszuschlag_info"]; ABH-Verlängerung → [„termin_buchen", „nachweise_sammeln", „fiktionsbescheinigung_info"]; Bürgeramt-Meldung → [„keine_aktion", „folgeprozesse_pruefen"]. Die UI rendert die Liste mit dem Disclaimer `posteingang.disclaimer.no_legal_advice`.',
      '',
      'Smartlaw-Konformität: Wenn die Bürger:in nach „Wird mein Einspruch Erfolg haben?" o. ä. fragt, antworte NICHT mit einer Erfolgs-Prognose, sondern verweise auf Verbraucherzentrale / Anwält:in.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        letterId: {
          type: 'string',
          description: 'Brief-ID aus dem Mock-Backend.',
        },
      },
      required: ['letterId'],
    },
  },

  /* ─────────────────────────────── hole_ersparnis ───────────────────────── */
  {
    name: 'hole_ersparnis',
    description: [
      'Liefert die Wert-/Konvenienz-Bilanz (ValueReceipt) eines abgeschlossenen Umzug-Vorgangs: Anzahl der für die Nutzerin informierten Behörden, geschätzte Zeitersparnis in Minuten (konservativ, „ca."), Anzahl der klassischen Schritte (Behördengänge/Anträge im Status quo) und der eigene Aufwand der Nutzerin (genau 1 — „ein Satz").',
      '',
      'Aufrufen, NACHDEM ein Umzug per "starte_umzug" abgeschlossen wurde oder wenn die Nutzerin fragt „Was hast du erledigt?", „Wie viel Zeit habe ich gespart?" o. ä. Verwende eine vorgang_id aus einem vorherigen Turn (z. B. aus dem starte_umzug-Ergebnis oder aus "lese_posteingang"/"hole_vorgang").',
      '',
      'WICHTIG: Alle Zahlen stammen aus diesem Tool — erfinde NIE eigene Zahlen und runde nicht nach oben. Gib Zeit-/Schrittangaben immer als „ca." aus. Liefert das Tool null (kein bestätigter Schritt oder Vorgang unbekannt), sage sachlich, dass noch keine Bilanz vorliegt. Die Zahlen sind illustrativ ([MOCK], konservative Schätzung).',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        vorgang_id: {
          type: 'string',
          description:
            'ID des Umzug-Vorgangs, dessen Ersparnis-Bilanz geholt werden soll (z. B. aus dem starte_umzug-Ergebnis oder aus "lese_posteingang").',
        },
      },
      required: ['vorgang_id'],
    },
  },

  /* ──────────────────────────── hole_autopilot_katalog ──────────────────── */
  {
    name: 'hole_autopilot_katalog',
    description: [
      'Liefert den Autopilot-Katalog: welche Lebenslagen heute automatisiert werden können und welche „demnächst" geplant sind.',
      '',
      'Aufrufen, wenn die Nutzerin fragt „Was kannst du noch automatisieren?", „Was geht außer Umzug?" o. ä. Pass-1-Stand: „umzug" ist live (verfügbar); „kindergeburt" und „steuererklaerung" sind „demnaechst" (noch NICHT ausführbar — nur Vorschau).',
      '',
      'Verspreche nichts, was nicht „live" ist: nenne Kindergeburt und Steuererklärung ausdrücklich als geplant/demnächst, nicht als heute startbar. Pro Eintrag stehen reale Behörden-Vorschauen (behoerden_preview) bereit — nenne keine Behörden, die nicht im Tool-Ergebnis stehen.',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Type guard — narrows an arbitrary string to `ToolName`. Used by the route
 * handler when it logs / inspects tool_use blocks.
 */
export function isKnownTool(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}

/* ──────────────────── Posteingang-Tool Output Contracts ────────────────────
 * Documented contract that the client-side dispatch layer (consumed by
 * `src/lib/mock-backend/api.ts`) must honour. mock-backend-coder ships these
 * shapes; assistant-engineer relies on them. If the names below ever change,
 * both sides must be updated in lockstep — concept-verifier will flag drift.
 *
 * Source-of-truth: docs/specs/posteingang.md §6.1 + §7.1.
 *
 * `erklaere_brief(letterId, locale?)` → {
 *   ai_summary_post_open: LetterAiSummaryPostOpen,   // bullets[] + citations[] + generated_at + model
 *   fristen: LetterFrist[],                          // typ + datum + original_zitat + citation_match + rechtsgrundlage?
 *   was_kann_ich_tun_options: string[],              // catalog keys, e.g. "steuerbescheid.einspruch"
 *   archetype: LetterArchetype,
 *   auth_channel: LetterAuthChannel,
 *   note?: string,                                   // present iff requested locale lacks bullets
 * }
 *   Backed by `api.extrahiereAktion(letterId)` (mock-backend-coder, ships
 *   `letter-summaries.json` with locale-keyed bullets). For non-DE locales
 *   without seeded translations, the dispatch layer returns DE bullets +
 *   the i18n-pending note — translations are never fabricated.
 *
 * `extrahiere_frist(letterId)` → {
 *   fristen: LetterFrist[],                          // possibly empty (Edge case #2)
 * }
 *   Backed by `api.extrahiereAktion(letterId).fristen` — same source so the
 *   UI's Frist-Chip and the assistant's quoted Frist always agree on
 *   `citation_match`. If `citation_match === false`, the UI keeps "Frist
 *   in Kalender" disabled until the citizen verifies manually.
 *
 * `vorschlage_naechsten_schritt(letterId)` → {
 *   options: string[],                               // catalog keys per spec §8.4
 *   disclaimer_key: 'posteingang.disclaimer.no_legal_advice',  // verbatim
 * }
 *   Backed by `api.extrahiereAktion(letterId).was_kann_ich_tun_options`
 *   (catalog lookup, NOT a per-letter LLM-generated list — Smartlaw-line).
 *
 * Latency expectation (per spec §12 review-checklist, also wired in
 * mock-backend latency.ts): `extrahiereAktion` simulates 1.5–3.5 s on the
 * first call per letter; cached subsequent calls ~200 ms.
 * ───────────────────────────────────────────────────────────────────────── */

/* ─────────────── Client-side tool dispatch contract (§7.3) ──────────────────
 * The chat client (`<AssistentView>`) owns a dispatch table that maps each
 * `tool_use.name` → an `api.*` call, serialises the result into a
 * `tool_result` block, and POSTs the next turn. Source-of-truth for that
 * mapping is `TOOL_DISPATCH` in `tool-schemas.ts` (machine-readable so the
 * frontend can drive its dispatcher off it). The table below is the
 * human-readable contract — keep both in lockstep with redesign-assistent.md
 * §7.3.
 *
 *   tool name                    → api method                        | confirm?
 *   ─────────────────────────────────────────────────────────────────────────
 *   lese_posteingang             → api.getLetters(toLetterFilter(…)) | no
 *        ↑ the tool's public filter shape ({absender, status:string, max})
 *          deliberately differs from LetterFilter; dispatch-tool.ts validates
 *          it (lesePosteingangInput) then translates: status→[status],
 *          absender→post-fetch substring (id+name_de), max→post-fetch slice.
 *   hole_vorgang                 → api.getVorgang(vorgang_id)        | no
 *   hole_profil                  → api.getProfile()                  | no
 *   liste_termine                → api.getTermine() (+client-filter) | no
 *   erklaere_brief               → api.extrahiereAktion(letterId)    | no
 *   extrahiere_frist             → api.extrahiereAktion(id).fristen  | no
 *   vorschlage_naechsten_schritt → api.extrahiereAktion(id).options  | no
 *   hole_ersparnis               → api.getValueReceipt(vorgang_id)   | no
 *   hole_autopilot_katalog       → api.getAutopilotKatalog()         | no
 *   preview_umzug                → api.previewUmzug({adresse,stichtag})| no  → renders <UmzugConfirmCard>
 *   starte_umzug                 → api.startUmzug({…})               | YES → gated by <UmzugConfirmCard> click
 *
 * CRITICAL GATING RULE (§7.3 + §9): `starte_umzug` MUST NOT be dispatched
 * automatically when the model streams the block. The system prompt tells the
 * model to call `preview_umzug` first and wait for confirmation — but the
 * client enforces this STRUCTURALLY, not just by prompt: a `starte_umzug`
 * tool_use block is HELD (never dispatched) until the citizen clicks
 * „Umzug starten" in the confirm card. `requiresConfirmation('starte_umzug')`
 * (see tool-schemas.ts) is the single source of truth the dispatcher checks.
 * ───────────────────────────────────────────────────────────────────────── */
