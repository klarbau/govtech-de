/**
 * EUDI OpenID4VP — authorization request endpoint (Spec §6.1). GET.
 *
 * Serves the OpenID4VP 1.0 authorization request for a session — unsigned (plain
 * JSON request object) or x5c-signed (JAR) per the session's `requestMode`.
 * Fetching this is the wallet's "I scanned the QR" signal, so the session moves
 * pending → scanned. Flag off: 404 (§4.2).
 */

import { NextResponse } from 'next/server';

import { readEudiVpEnv } from '@/lib/eudi/vp/config';
import { getSession, setScanned } from '@/lib/eudi/vp/session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse | Response> {
  const env = readEudiVpEnv();
  if (!env.enabled || !env.externalUrl) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const { sessionId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (session.state === 'expired') {
    return NextResponse.json({ error: 'expired' }, { status: 404 });
  }

  const { buildRequestObject } = await import('@/lib/eudi/vp/verifier');
  let artifact;
  try {
    artifact = await buildRequestObject(session, env);
  } catch {
    // Framed as our own sandbox verifier, never a real authority.
    return NextResponse.json({ error: 'sandbox_request_build_failed' }, { status: 500 });
  }

  // The wallet is fetching the request → it has connected.
  setScanned(session.id);

  return new Response(artifact.body, {
    status: 200,
    headers: {
      'content-type': artifact.contentType,
      'cache-control': 'no-store',
    },
  });
}
