/**
 * POST /api/mock — RPC-Dispatcher für die Mock-Backend-`api`.
 *
 * Stage 2 der HTTP-Migration. Der Client (Stage 3) ruft hier statt der
 * In-Process-`api` an: ein JSON-Body `{ method, args }`, Antwort
 * `{ ok, data }` bzw. `{ ok:false, error }`. Jede Session ist über das
 * `mock_sid`-Cookie isoliert (eigener In-Memory-Store + Event-Bus).
 *
 * Reliable-Mode: per Header `x-mock-reliable: 1` ODER Body-Feld
 * `reliable: true`. Default OFF. Schaltet die 5%-Fehler-Injektion in
 * `latency.ts` + Autopilot ab (Spine-e2e / Loom-Determinismus).
 *
 * MUSS auf der Node-Runtime laufen — unter Edge ist der AsyncLocalStorage-Shim
 * ein No-op und die Per-Session-Isolation bricht still.
 */
import { NextResponse } from 'next/server';

import { dispatch } from '@/lib/mock-backend/server/dispatch';
import {
  attachSessionCookie,
  resolveSession,
} from '@/lib/mock-backend/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RpcBody {
  method?: unknown;
  args?: unknown;
  reliable?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  let body: RpcBody;
  try {
    body = (await req.json()) as RpcBody;
  } catch {
    return jsonResponse(
      400,
      { ok: false, error: { code: 'INVALID_JSON', message: 'Body ist kein gültiges JSON.' } },
      null,
    );
  }

  if (typeof body.method !== 'string' || body.method.length === 0) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: { code: 'INVALID_BODY', message: '`method` (string) ist erforderlich.' },
      },
      null,
    );
  }

  if (body.args !== undefined && !Array.isArray(body.args)) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: { code: 'INVALID_BODY', message: '`args` muss ein Array sein, falls gesetzt.' },
      },
      null,
    );
  }

  const reliable = resolveReliable(req, body);
  const { sessionId, isNew } = await resolveSession();

  const result = await dispatch({
    method: body.method,
    args: (body.args as unknown[]) ?? [],
    sessionId,
    reliable,
  });

  if (result.ok) {
    return jsonResponse(200, { ok: true, data: result.data }, isNew ? sessionId : null);
  }
  return jsonResponse(
    result.status,
    { ok: false, error: result.error },
    isNew ? sessionId : null,
  );
}

/** Reliable-Flag: Header `x-mock-reliable: 1|true` hat Vorrang vor Body. */
function resolveReliable(req: Request, body: RpcBody): boolean {
  const header = req.headers.get('x-mock-reliable');
  if (header !== null) {
    return header === '1' || header.toLowerCase() === 'true';
  }
  return body.reliable === true;
}

function jsonResponse(
  status: number,
  payload: unknown,
  newSessionId: string | null,
): NextResponse {
  const res = NextResponse.json(payload, { status });
  if (newSessionId) attachSessionCookie(res, newSessionId);
  return res;
}
