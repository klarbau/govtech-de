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
 * Scope: only the three Posteingang tools added per docs/specs/posteingang.md
 * §7.1. The five existing tools (`starte_umzug`, `lese_posteingang`,
 * `hole_vorgang`, `hole_profil`, `liste_termine`) were shipped without zod
 * mirrors; we don't retrofit them here to keep this PR scoped.
 */

import { z } from 'zod';

import { ERKLAERE_BRIEF_LOCALES } from './tools';

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

/* ─────────────────────────── unified dispatcher ──────────────────────────── */

/**
 * Lookup table mapping the new Posteingang tool names to their input
 * validator. Used by the client-side dispatch path before it hands the input
 * to the mock-backend.
 *
 * Existing five tools are not present here; the dispatcher should treat a
 * missing entry as "no zod validation, pass-through" — matching today's
 * behaviour for the five legacy tools.
 */
export const POSTEINGANG_TOOL_VALIDATORS = {
  erklaere_brief: erklaereBriefInput,
  extrahiere_frist: extrahiereFristInput,
  vorschlage_naechsten_schritt: vorschlageNaechstenSchrittInput,
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
