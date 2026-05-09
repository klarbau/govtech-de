/**
 * POST /api/assistant
 *
 * Conversational AI endpoint. Streams Server-Sent Events back to the browser.
 *
 * Execution model: **Approach B (client-executes-tools)** — see
 * `docs/architecture.md` § "AI assistant execution model". The route handler
 * does NOT execute tools server-side. It streams `tool_use` blocks to the
 * client; the client runs them against its in-process mock-backend and POSTs
 * the next turn (with `tool_result` content blocks attached) to this same
 * endpoint. The loop terminates when `stop_reason !== 'tool_use'`.
 *
 * Hard rules enforced here:
 *   - Prompt caching ON (cache_control: ephemeral on both system blocks).
 *   - max_tokens 1024 for chat (synthesis would use 2048 — not yet wired).
 *   - Streaming ON (`anthropic.messages.stream`).
 *   - Server-only secret access (`getAnthropicClient()` reads `process.env`).
 *   - No PII echoed in error responses.
 */

import type Anthropic from '@anthropic-ai/sdk';

import {
  ASSISTANT_MAX_TOKENS_CHAT,
  ASSISTANT_MODEL,
  getAnthropicClient,
} from '@/lib/ai/client';
import { resolveLocale, type SupportedLocale } from '@/lib/ai/language';
import {
  detectRefusal,
  type RefusalCategory,
  staticRefusal,
} from '@/lib/ai/safety';
import {
  type AssistantStreamEvent,
  SSE_HEADERS,
  toReadableStream,
} from '@/lib/ai/stream';
import {
  BASE_SYSTEM_PROMPT,
  localeHint,
  personaContext,
  type PersonaContextInput,
} from '@/lib/ai/system-prompt';
import { tools } from '@/lib/ai/tools';

/**
 * Force the Node runtime — Edge cannot run the @anthropic-ai/sdk reliably,
 * and we want process.env access semantics (not `globalThis.process`).
 */
export const runtime = 'nodejs';

/** Disable any caching on the route response itself. */
export const dynamic = 'force-dynamic';

/* ────────────────────────────── input shape ─────────────────────────────── */

interface AssistantRequestBody {
  /** Full conversation so far. Last entry should be the new user (or tool_result) turn. */
  messages: Anthropic.MessageParam[];
  /** Active persona summary — built client-side from the chosen persona. */
  persona: PersonaContextInput;
  /** UI locale; we use it as a hint when sniffing fails. */
  locale?: string;
}

/**
 * SDK 0.32 ships `cache_control` only on the prompt-caching beta types. The
 * stable Messages API accepts it on the wire — we declare a minimal local
 * shape and pass it through with one cast at the call site, so the rest of
 * the file stays strictly typed.
 */
type CachedSystemBlock = {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
};

/* ───────────────────────────── handler ──────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  let body: AssistantRequestBody;
  try {
    body = (await req.json()) as AssistantRequestBody;
  } catch {
    return jsonError(400, 'invalid_json', 'Anfrage-Body ist kein gültiges JSON.');
  }

  const validation = validateBody(body);
  if (!validation.ok) {
    return jsonError(400, 'invalid_body', validation.message);
  }

  const { messages, persona } = body;
  const latestUserText = extractLatestUserText(messages);
  const locale = resolveLocale(latestUserText, body.locale);

  // Hard-refusal short-circuit. Two of the four categories below were added
  // for the Posteingang capability per docs/specs/posteingang.md §11:
  //   - `real_letter_paste`: V1 has Brief-Upload deaktiviert. We mirror that
  //     hard-refusal in the chat surface so the model doesn't half-process
  //     a pasted real Brief and extract a Frist out of it.
  //   - `erfolgsprognose`: RDG-/Smartlaw-Linie. Even with the system-prompt
  //     constraint, a regex short-circuit guarantees no token budget is
  //     spent on a request the model is bound to refuse anyway.
  // The other two (legal_advice, real_world_action, explicit_content) were
  // already in safety.ts; all four are honoured uniformly.
  const refusal = latestUserText ? detectRefusal(latestUserText) : undefined;
  if (refusal) {
    return new Response(
      toReadableStream(refusalStream(refusal.category, locale)),
      { headers: SSE_HEADERS },
    );
  }

  let anthropic: Anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch {
    // Don't echo the original message — could leak deployment hints.
    return jsonError(
      500,
      'assistant_unavailable',
      'Der Assistent ist gerade nicht verfügbar. Bitte später erneut versuchen.',
    );
  }

  // Build the cached system blocks. Two blocks, both ephemerally cached:
  // (1) base prompt (huge, stable across all sessions),
  // (2) persona context + locale hint (small, persona-stable).
  const systemBlocks: CachedSystemBlock[] = [
    {
      type: 'text',
      text: BASE_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `${personaContext(persona)}\n\n${localeHint(locale)}`,
      cache_control: { type: 'ephemeral' },
    },
  ];

  // Stream open. Type-cast the system param because SDK 0.32's stable types
  // don't include `cache_control` on TextBlockParam — the wire API does.
  const stream = anthropic.messages.stream({
    model: ASSISTANT_MODEL,
    max_tokens: ASSISTANT_MAX_TOKENS_CHAT,
    system: systemBlocks as unknown as Anthropic.TextBlockParam[],
    tools,
    messages,
  });

  return new Response(toReadableStream(toAssistantEvents(stream)), {
    headers: SSE_HEADERS,
  });
}

/* ───────────────────────── stream → events bridge ────────────────────────── */

/**
 * Turn an Anthropic `MessageStream` into our normalised event stream.
 *
 * We listen at the `streamEvent` level so we can:
 *   - forward text deltas as they arrive (typing feel),
 *   - hold tool_use blocks until they're complete (input JSON arrives in
 *     `input_json_delta` chunks; we use `finalMessage` to grab the parsed
 *     `input` object instead of reassembling JSON ourselves),
 *   - emit a final `message_stop` carrying `stop_reason` so the client knows
 *     whether to dispatch tools and call back, or finish.
 *
 * This implementation is deliberately simple — Anthropic's SDK offers a
 * higher-level `.on('text', …)` event, but we want a single async iterator
 * we can wrap in our SSE encoder.
 */
async function* toAssistantEvents(
  stream: ReturnType<Anthropic['messages']['stream']>,
): AsyncGenerator<AssistantStreamEvent> {
  // We only forward text deltas live. Tool_use blocks need their assembled
  // `input` object, which we get reliably from `finalMessage()`.
  for await (const ev of stream) {
    if (
      ev.type === 'content_block_delta' &&
      ev.delta.type === 'text_delta' &&
      typeof ev.delta.text === 'string' &&
      ev.delta.text.length > 0
    ) {
      yield { type: 'text_delta', text: ev.delta.text };
    }
    // We intentionally drop input_json_delta events — handled at finalMessage.
  }

  // Stream is fully consumed; pull the final message for tool_use blocks +
  // stop_reason + usage.
  let final: Anthropic.Message;
  try {
    final = await stream.finalMessage();
  } catch (err) {
    yield {
      type: 'error',
      message:
        err instanceof Error
          ? err.message
          : 'Antwort konnte nicht abgeschlossen werden.',
      code: 'final_message_failed',
    };
    return;
  }

  for (const block of final.content) {
    if (block.type === 'tool_use') {
      yield {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input,
      };
    }
  }

  yield {
    type: 'usage',
    input_tokens: final.usage.input_tokens,
    output_tokens: final.usage.output_tokens,
    // Cache stats are present on the wire even on the stable endpoint, but
    // SDK 0.32's stable Usage type doesn't expose them. Read via a narrow cast.
    cache_read_input_tokens:
      (final.usage as unknown as { cache_read_input_tokens?: number | null })
        .cache_read_input_tokens ?? null,
    cache_creation_input_tokens:
      (final.usage as unknown as { cache_creation_input_tokens?: number | null })
        .cache_creation_input_tokens ?? null,
  };

  yield { type: 'message_stop', stop_reason: final.stop_reason };
}

/* ─────────────────────────── validation + utils ──────────────────────────── */

function validateBody(
  body: unknown,
): { ok: true } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Body fehlt oder ist kein Objekt.' };
  }
  const b = body as Partial<AssistantRequestBody>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { ok: false, message: '`messages` muss ein nicht-leeres Array sein.' };
  }
  if (!b.persona || typeof b.persona !== 'object') {
    return { ok: false, message: '`persona` ist erforderlich.' };
  }
  const p = b.persona as Partial<PersonaContextInput>;
  if (!p.id || !p.vorname || !p.nachname) {
    return {
      ok: false,
      message: '`persona` benötigt mindestens id, vorname, nachname.',
    };
  }
  return { ok: true };
}

/**
 * Extract the most recent user-role message text. Returns the first text
 * block content or the raw string if `content` is a string. Used as a hint
 * for language detection.
 */
function extractLatestUserText(
  messages: Anthropic.MessageParam[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    for (const block of m.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        return block.text;
      }
    }
    return undefined;
  }
  return undefined;
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Yield a single-text-delta + message_stop pair using the static refusal copy
 * from `safety.ts`. Same SSE shape the chat panel already consumes — no
 * client changes required, no `tool_use` blocks, no Anthropic call (saves
 * tokens + latency).
 *
 * `stop_reason` is reported as `end_turn` because, from the client's
 * perspective, the conversation step is over: there is nothing to dispatch
 * and no follow-up turn expected.
 */
async function* refusalStream(
  category: RefusalCategory,
  locale: SupportedLocale,
): AsyncGenerator<AssistantStreamEvent> {
  yield { type: 'text_delta', text: staticRefusal(category, locale) };
  yield {
    type: 'usage',
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
  yield { type: 'message_stop', stop_reason: 'end_turn' };
}
