/**
 * Anthropic SDK client factory — server-only.
 *
 * Reads `ANTHROPIC_API_KEY` from `process.env`. This module MUST never be
 * imported from a client component, an Edge route, or anywhere that ends up
 * in the browser bundle. The route handler at `src/app/api/assistant/route.ts`
 * is the only intended consumer.
 *
 * Hard rules (per assistant-engineer charter + CLAUDE.md):
 *   - Key is never bundled to the client. Enforced by:
 *       (a) this module being imported only from `app/api/assistant/route.ts`
 *           (a Node-runtime route handler), and
 *       (b) the bare `process.env` access below — referencing it from a
 *           client component would surface a build-time error in Next 15.
 *     If `server-only` is added as an explicit dep later, re-introduce
 *     `import 'server-only'` here for belt-and-braces enforcement.
 *   - Key is read lazily (per request) so missing key surfaces as a clean
 *     500 from the route handler, not a build-time crash.
 *   - We use the stable `Anthropic` constructor; prompt caching is supported
 *     by the stable Messages API on the wire (the SDK 0.32 types just lack
 *     `cache_control` on `TextBlockParam`, which we work around in
 *     `route.ts` with a narrow local type).
 */
import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

/**
 * Returns a memoised Anthropic client. Throws if `ANTHROPIC_API_KEY` is unset
 * — the route handler should map this to a 500 with a generic message and
 * never echo the error to the client (avoids leaking stack traces).
 */
export function getAnthropicClient(): Anthropic {
  if (cached) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY ist nicht gesetzt. Lege ihn in .env.local an — siehe .env.example.',
    );
  }

  cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * The chat model used by the assistant. Hard-coded per stack discipline:
 * Haiku 4.5 must suffice for the demo. Escalation to Sonnet/Opus requires
 * explicit user approval.
 */
export const ASSISTANT_MODEL = 'claude-haiku-4-5-20251001' as const;

/** Max output tokens for chat turns. Synthesis tasks may use 2048; chat is 1024. */
export const ASSISTANT_MAX_TOKENS_CHAT = 1024 as const;
