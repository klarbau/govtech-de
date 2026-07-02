/**
 * EUDI OpenID4VP — direct_post response endpoint (Spec §6.1). POST.
 *
 * The wallet posts `vp_token` (+ optional `state`) here. We parse it via
 * oid4vc-ts and verify it (Spec §6.4): shipped issuer-credential verifier +
 * NEW KB-JWT holder-binding. On success → `setVerified` with the 3 claims; on
 * failure → `setError` with an honest, PII-free, sandbox-framed reason. A second
 * direct_post on an already-verified session is idempotently ignored (§10).
 * Flag off: 404 (§4.2).
 */

import { NextResponse } from 'next/server';

import { readEudiVpEnv } from '@/lib/eudi/vp/config';
import { getSession, setError, setVerified } from '@/lib/eudi/vp/session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function parseResponseParams(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  const form = await req.formData().catch(() => null);
  if (form) for (const [key, value] of form) out[key] = value;
  return out;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const env = readEudiVpEnv();
  if (!env.enabled || !env.externalUrl) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const { sessionId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // Idempotent double-submit guard (§10): ignore a repeat post.
  if (session.state === 'verified') {
    return NextResponse.json({ status: 'ok' });
  }
  if (session.state === 'expired') {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }

  const params = await parseResponseParams(req);

  const { verifyVpResponse } = await import('@/lib/eudi/vp/verifier');
  let result;
  try {
    result = await verifyVpResponse(session, params, env);
  } catch {
    setError(session.id, 'sandbox-verification-error');
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 });
  }

  if (result.ok) {
    setVerified(session.id, result.claims ?? {});
    return NextResponse.json({ status: 'ok' });
  }

  setError(session.id, result.reason ?? 'verification-failed');
  return NextResponse.json({ error: 'verification_failed', reason: result.reason }, { status: 400 });
}
