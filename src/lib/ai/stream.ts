/**
 * Server-Sent Events (SSE) helpers for the assistant route handler.
 *
 * The route handler streams a normalised event stream to the browser. We
 * deliberately do NOT forward Anthropic's raw SSE wire format — instead we
 * project the stream into a small set of well-typed events that the React
 * chat panel can consume without knowing SDK internals.
 *
 * Wire format (one frame per event):
 *
 *     data: {"type":"text_delta","text":"Gut"}\n\n
 *     data: {"type":"tool_use","id":"toolu_…","name":"…","input":{…}}\n\n
 *     data: {"type":"message_stop","stop_reason":"end_turn"}\n\n
 *     data: [DONE]\n\n
 *
 * Approach B (client-executes-tools, see `docs/architecture.md`):
 *   - The server emits `tool_use` blocks as-is into the stream.
 *   - The client collects them, runs them against its in-process mock-backend,
 *     then POSTs the next turn (with `tool_result` content blocks) back to
 *     `/api/assistant`. The route handler does NOT loop server-side.
 *   - Each round-trip is one server response — small, simple, cache-friendly.
 */

/**
 * SSE response headers. `cache-control: no-cache, no-transform` is mandatory
 * — proxies will buffer otherwise. `x-accel-buffering: no` defeats nginx's
 * default 1 KB buffer. `connection: keep-alive` lets the client hold the
 * line open for the full stream.
 */
export const SSE_HEADERS: Record<string, string> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};

/* ─────────────────────────── normalised events ──────────────────────────── */

export type AssistantStreamEvent =
  /** A chunk of assistant prose. Concatenate in render order. */
  | { type: 'text_delta'; text: string }
  /**
   * A complete tool_use block. The route handler accumulates partial JSON
   * deltas server-side and emits ONE frame per finished tool_use, so the
   * client doesn't have to re-implement Anthropic's input-json-delta protocol.
   */
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  /**
   * Marks the end of the assistant turn. `stop_reason: 'tool_use'` tells
   * the client "execute the queued tool_use blocks, then call me back with
   * tool_result content". Anything else means the turn is finished.
   */
  | {
      type: 'message_stop';
      stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
    }
  /** Token / cache stats for the frame, optional, sent once at end of turn. */
  | {
      type: 'usage';
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number | null;
      cache_creation_input_tokens?: number | null;
    }
  /** Server-side error wrapped for the client. Never includes the raw key/stack. */
  | { type: 'error'; message: string; code?: string };

/* ──────────────────────────── encoder helper ────────────────────────────── */

const ENCODER = new TextEncoder();

/** Serialise one event into an SSE frame as raw bytes. */
export function encodeSseFrame(event: AssistantStreamEvent): Uint8Array {
  return ENCODER.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** Final marker. Some clients (EventSource polyfills) prefer an explicit DONE. */
export function encodeDoneFrame(): Uint8Array {
  return ENCODER.encode('data: [DONE]\n\n');
}

/* ─────────────────────── ReadableStream construction ────────────────────── */

/**
 * Build a `ReadableStream` from an async iterable of events. The route
 * handler hands this directly to `new Response(stream, { headers })`.
 *
 * Errors during iteration are caught and surfaced as a final
 * `{ type: 'error' }` frame instead of an aborted connection — gives the
 * client UI something to render.
 */
export function toReadableStream(
  events: AsyncIterable<AssistantStreamEvent>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of events) {
          controller.enqueue(encodeSseFrame(ev));
        }
        controller.enqueue(encodeDoneFrame());
        controller.close();
      } catch (err) {
        // Never leak stack traces; clients render whatever string is here.
        const message =
          err instanceof Error
            ? err.message
            : 'Unbekannter Fehler im Assistenten-Stream.';
        controller.enqueue(
          encodeSseFrame({ type: 'error', message, code: 'stream_error' }),
        );
        controller.enqueue(encodeDoneFrame());
        controller.close();
      }
    },
  });
}
