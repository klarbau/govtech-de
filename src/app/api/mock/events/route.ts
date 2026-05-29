/**
 * GET /api/mock/events — Server-Sent-Events-Stream der Mock-Backend-Events
 * einer Session.
 *
 * Stage 2. Ersetzt clientseitig `api.subscribe(listener)`: der Client öffnet
 * eine EventSource auf diese Route; jeder `MockBackendEvent` der eigenen
 * Session kommt als `data:`-Frame an. KRITISCH: der hier abonnierte Bus ist
 * derselbe `getOrCreateSessionBus(sessionId)`, auf den `POST /api/mock`
 * emittiert — sonst würden Autopilot-Schritte nie streamen.
 *
 * MUSS auf der Node-Runtime laufen (AsyncLocalStorage + Per-Session-Bus).
 */
import { getOrCreateSessionBus } from '@/lib/mock-backend/server/bus-registry';
import { resolveSession } from '@/lib/mock-backend/server/session';
import { SESSION_COOKIE_NAME } from '@/lib/mock-backend/server/session';
import type { MockBackendEvent } from '@/types/mock-event';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENCODER = new TextEncoder();
const HEARTBEAT_MS = 15_000;

export async function GET(req: Request): Promise<Response> {
  const { sessionId, isNew } = await resolveSession();
  const bus = getOrCreateSessionBus(sessionId);

  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: Uint8Array): void => {
        try {
          controller.enqueue(chunk);
        } catch {
          // Controller bereits geschlossen (Client weg) — ignorieren.
        }
      };

      // Initialer Kommentar-Frame: öffnet den Stream sofort (kein Buffering).
      safeEnqueue(ENCODER.encode(`: connected ${sessionId}\n\n`));

      unsubscribe = bus.subscribe((event: MockBackendEvent) => {
        safeEnqueue(ENCODER.encode(`data: ${JSON.stringify(event)}\n\n`));
      });

      heartbeat = setInterval(() => {
        safeEnqueue(ENCODER.encode(`: heartbeat\n\n`));
      }, HEARTBEAT_MS);

      const cleanup = (): void => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // Bereits geschlossen.
        }
      };

      if (req.signal.aborted) {
        cleanup();
        return;
      }
      req.signal.addEventListener('abort', cleanup, { once: true });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  const headers = new Headers({
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  if (isNew) {
    headers.append(
      'set-cookie',
      `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
        60 * 60 * 24 * 30
      }`,
    );
  }

  return new Response(stream, { headers });
}
