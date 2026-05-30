/**
 * Runtime input-schema validators for the Posteingang tool calls.
 *
 * Why a second source of schema next to the JSONSchema in `tools.ts`?
 *   - The JSONSchema in `tools.ts` is what we send to Anthropic so the model
 *     can fill `tool_use.input` correctly. It is a *contract with the model*.
 *   - The zod schemas here are what we use to *validate* a `tool_use.input`
 *     before the client-side dispatch layer (`src/lib/mock-backend/api.ts`
 *     consumer) executes against the mock backend. Belt-and-braces: even if
 *     the model produces a malformed object, we surface a clean error.
 *
 * The two definitions mirror each other 1:1; a divergence is a bug. The
 * smoke test in `__smoke__.ts` asserts representative payloads validate and
 * that obvious malformed payloads reject — that's the unit-level test the
 * spec asks for in deliverable §6.
 *
 * Scope (initial PR): the three Posteingang tools added per
 * docs/specs/posteingang.md §7.1. The redesign-assistent.md §7.2/§7.3 work
 * adds zod mirrors for the two Umzug write/preview tools (`preview_umzug`,
 * `starte_umzug`) plus a machine-readable dispatch table (`TOOL_DISPATCH`)
 * and the irreversible-action gate (`requiresConfirmation`). `lese_posteingang`
 * now also carries a zod mirror (`lesePosteingangInput`) because its public
 * JSONSchema shape (`{absender, status, max}`) deliberately differs from the
 * internal `LetterFilter` and the dispatch layer must translate it — an
 * unvalidated blind-cast silently returned EMPTY results (a single-string
 * `status: 'ungelesen'` was iterated char-by-char by `getLetters`). The
 * remaining legacy read tools (`hole_vorgang`, `hole_profil`, `liste_termine`)
 * stay pass-through (no zod) — they take only a required id or optional
 * filters the dispatcher reads field-by-field, so a malformed input degrades
 * to "no filter", not a write.
 */

import { z } from 'zod';

import { ERKLAERE_BRIEF_LOCALES, type ToolName } from './tools';

/* ───────────────────────────── erklaere_brief ────────────────────────────── */

/**
 * Input for the `erklaere_brief` tool. `letterId` is required; `locale` is
 * optional and defaults (downstream) to the persona's UI locale.
 *
 * `letterId` shape: any non-empty string. We deliberately do NOT regex-pin
 * the shape (`letter-…`) here — mock-backend-coder owns that namespace and
 * may evolve the prefix; over-pinning would break the contract.
 */
export const erklaereBriefInput = z
  .object({
    letterId: z.string().min(1, 'letterId darf nicht leer sein'),
    locale: z.enum(ERKLAERE_BRIEF_LOCALES).optional(),
  })
  .strict();

export type ErklaereBriefInput = z.infer<typeof erklaereBriefInput>;

/* ───────────────────────────── extrahiere_frist ──────────────────────────── */

export const extrahiereFristInput = z
  .object({
    letterId: z.string().min(1, 'letterId darf nicht leer sein'),
  })
  .strict();

export type ExtrahiereFristInput = z.infer<typeof extrahiereFristInput>;

/* ────────────────────── vorschlage_naechsten_schritt ─────────────────────── */

export const vorschlageNaechstenSchrittInput = z
  .object({
    letterId: z.string().min(1, 'letterId darf nicht leer sein'),
  })
  .strict();

export type VorschlageNaechstenSchrittInput = z.infer<
  typeof vorschlageNaechstenSchrittInput
>;

/* ───────────────────────────── lese_posteingang ──────────────────────────── */

/**
 * Input for the `lese_posteingang` read tool. ALL fields are optional (a bare
 * `{}` lists everything). This validator exists because the tool's public
 * JSONSchema (`tools.ts`) advertises an `absender` / single-`status` / `max`
 * shape that does NOT match `LetterFilter` — the dispatch layer translates the
 * validated object into a real `LetterFilter`. `.strict()` so the model can't
 * smuggle in an unknown filter that silently no-ops.
 *
 * `status` is the SINGLE-string contract the model fills (one of three letter
 * states); the dispatcher lifts it into `LetterFilter.status: [status]`.
 */
export const lesePosteingangInput = z
  .object({
    filter: z
      .object({
        absender: z.string().min(1).optional(),
        status: z.enum(['ungelesen', 'gelesen', 'erledigt']).optional(),
        vorgang_id: z.string().min(1).optional(),
        max: z.number().int().min(1).max(50).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type LesePosteingangInput = z.infer<typeof lesePosteingangInput>;

/* ───────────────────────────── hole_ersparnis ────────────────────────────── */

/**
 * Input for the convenience-Pass-1 `hole_ersparnis` tool (§7). `vorgang_id` is
 * required; backs `api.getValueReceipt(vorgangId)`. Read-only, no confirm gate.
 * Not regex-pinned — mock-backend owns the Vorgang-id namespace.
 */
export const holeErsparnisInput = z
  .object({
    vorgang_id: z.string().min(1, 'vorgang_id darf nicht leer sein'),
  })
  .strict();

export type HoleErsparnisInput = z.infer<typeof holeErsparnisInput>;

/* ─────────────────────────── unified dispatcher ──────────────────────────── */

/**
 * Lookup table mapping the new Posteingang tool names to their input
 * validator. Used by the client-side dispatch path before it hands the input
 * to the mock-backend.
 *
 * The remaining legacy read tools (`hole_vorgang`, `hole_profil`,
 * `liste_termine`) are not present here; the dispatcher treats a missing entry
 * as "no zod validation, pass-through" — matching today's behaviour for those
 * required-id / optional-filter tools.
 */
export const POSTEINGANG_TOOL_VALIDATORS = {
  erklaere_brief: erklaereBriefInput,
  extrahiere_frist: extrahiereFristInput,
  vorschlage_naechsten_schritt: vorschlageNaechstenSchrittInput,
  // Convenience Pass-1 (§7): read-only, required vorgang_id. Validated here so a
  // malformed input surfaces a clean error before `api.getValueReceipt` is hit.
  // `hole_autopilot_katalog` takes no input → no validator (pass-through).
  hole_ersparnis: holeErsparnisInput,
  // Read-only inbox filter. Validated so the dispatch layer can safely translate
  // the model's `{absender, status, max}` shape into a real `LetterFilter`
  // (the two shapes deliberately differ — see lesePosteingangInput doc).
  lese_posteingang: lesePosteingangInput,
} as const;

export type PosteingangToolName = keyof typeof POSTEINGANG_TOOL_VALIDATORS;

/**
 * Validate a tool_use.input object against the corresponding zod schema.
 * Returns a discriminated result so call sites don't have to try/catch zod.
 */
export function validatePosteingangToolInput(
  name: PosteingangToolName,
  input: unknown,
):
  | { ok: true; data: z.infer<(typeof POSTEINGANG_TOOL_VALIDATORS)[PosteingangToolName]> }
  | { ok: false; issues: z.ZodIssue[] } {
  const schema = POSTEINGANG_TOOL_VALIDATORS[name];
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, issues: parsed.error.issues };
}

/* ─────────────────────────── Umzug tool schemas ──────────────────────────── */

/**
 * The new German address shape both Umzug tools accept. Mirrors the
 * JSONSchema `neue_adresse` in `tools.ts` 1:1. `land` is pinned to `'DE'`
 * (Auslandsumzug is out-of-scope); `plz` must be five digits.
 */
const neueAdresseSchema = z
  .object({
    strasse: z.string().min(1, 'strasse darf nicht leer sein'),
    hausnummer: z.string().min(1, 'hausnummer darf nicht leer sein'),
    zusatz: z.string().optional(),
    plz: z.string().regex(/^\d{5}$/, 'plz muss fünfstellig sein'),
    ort: z.string().min(1, 'ort darf nicht leer sein'),
    land: z.literal('DE'),
  })
  .strict();

const stichtagIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'stichtag_iso muss ISO-YYYY-MM-DD sein');

/**
 * `preview_umzug` — read-only. Takes the proposed address + Stichtag and
 * returns the Behörden per block WITHOUT writing. The model fills this so the
 * client can render `<UmzugConfirmCard>` before any irreversible action.
 */
export const previewUmzugInput = z
  .object({
    neue_adresse: neueAdresseSchema,
    stichtag_iso: stichtagIsoSchema,
  })
  .strict();

export type PreviewUmzugInput = z.infer<typeof previewUmzugInput>;

/**
 * `starte_umzug` — the single irreversible write tool. `block_b_consent` is a
 * list of behoerde_id strings the citizen has consented to (Art. 6 Abs. 1
 * lit. a DSGVO); an empty array skips Block B entirely. Validating this
 * before dispatch is belt-and-braces: the structural confirm-gate
 * (`requiresConfirmation`) is the primary safety layer.
 */
export const starteUmzugInput = z
  .object({
    neue_adresse: neueAdresseSchema,
    stichtag_iso: stichtagIsoSchema,
    block_b_consent: z.array(z.string()),
  })
  .strict();

export type StarteUmzugInput = z.infer<typeof starteUmzugInput>;

/* ──────────────────── Tool → api dispatch contract (§7.3) ─────────────────── */

/**
 * Machine-readable dispatch contract. `<AssistentView>` drives its dispatcher
 * off this table so the tool→api mapping and the irreversible-action gate
 * have a single source of truth shared with the human-readable table in
 * `tools.ts`. Keep all three (this, tools.ts comment, redesign-assistent.md
 * §7.3) in lockstep — code-reviewer flags drift.
 *
 * `api_method`: the `lib/mock-backend/api.ts` method the client calls.
 * `requires_confirmation`: when true the dispatcher MUST hold the tool_use
 *   block and surface a confirm UI BEFORE executing — never auto-dispatch.
 * `ui`: the chat-flow effect (informational; the frontend owns rendering).
 */
export interface ToolDispatchEntry {
  api_method: string;
  requires_confirmation: boolean;
  ui:
    | 'tool_call_card'
    | 'tool_call_card_disclaimer'
    | 'umzug_confirm_card'
    | 'umzug_started_card';
}

export const TOOL_DISPATCH: Record<ToolName, ToolDispatchEntry> = {
  lese_posteingang: {
    api_method: 'getLetters',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  hole_vorgang: {
    api_method: 'getVorgang',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  hole_profil: {
    api_method: 'getProfile',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  liste_termine: {
    api_method: 'getTermine',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  erklaere_brief: {
    api_method: 'extrahiereAktion',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  extrahiere_frist: {
    api_method: 'extrahiereAktion',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  vorschlage_naechsten_schritt: {
    api_method: 'extrahiereAktion',
    requires_confirmation: false,
    ui: 'tool_call_card_disclaimer',
  },
  // Convenience Pass-1 (§7) — read-only mirrors. No confirm gate.
  hole_ersparnis: {
    api_method: 'getValueReceipt',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  hole_autopilot_katalog: {
    api_method: 'getAutopilotKatalog',
    requires_confirmation: false,
    ui: 'tool_call_card',
  },
  preview_umzug: {
    api_method: 'previewUmzug',
    requires_confirmation: false,
    ui: 'umzug_confirm_card',
  },
  // THE one confirm-gated tool. The dispatcher must NEVER auto-dispatch this
  // — it is executed only after the citizen clicks „Umzug starten" in
  // <UmzugConfirmCard>. See redesign-assistent.md §7.3 gating-rule + §9.
  starte_umzug: {
    api_method: 'startUmzug',
    requires_confirmation: true,
    ui: 'umzug_started_card',
  },
};

/**
 * THE irreversible-action gate. The client dispatcher calls this for every
 * `tool_use` block; a `true` result means "do not execute now — render the
 * confirm card and wait for the explicit user click". This is the structural
 * safety layer (independent of the system prompt). Currently true only for
 * `starte_umzug`.
 */
export function requiresConfirmation(name: string): boolean {
  return (
    name in TOOL_DISPATCH &&
    TOOL_DISPATCH[name as ToolName].requires_confirmation
  );
}

/* ───────────────── Umzug input validation (used at dispatch) ──────────────── */

/**
 * Validate a `preview_umzug` / `starte_umzug` tool_use.input. The client
 * calls this before mapping the input to `api.previewUmzug` / `api.startUmzug`
 * arguments. Mirrors the Posteingang validator's discriminated-result shape.
 */
export function validateUmzugToolInput(
  name: 'preview_umzug' | 'starte_umzug',
  input: unknown,
):
  | { ok: true; data: PreviewUmzugInput | StarteUmzugInput }
  | { ok: false; issues: z.ZodIssue[] } {
  const schema = name === 'preview_umzug' ? previewUmzugInput : starteUmzugInput;
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, issues: parsed.error.issues };
}
