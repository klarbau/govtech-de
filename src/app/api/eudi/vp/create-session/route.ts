/**
 * EUDI OpenID4VP — create a presentation session (Spec §6.1). POST.
 *
 * Flag on: creates a server-memory session, builds the `openid4vp://` deep link
 * (request-by-reference) + a QR PNG, returns {@link CreateVpSessionResult}.
 * Flag off / no tunnel URL: 404 `{ error: 'disabled' }` (§4.2). The tunnel URL
 * is read at request time (it rotates — §6.1); the verifier core + `qrcode` are
 * dynamic-imported inside the enabled branch so nothing loads them flag-off.
 */

import { NextResponse } from 'next/server';

import { readEudiVpEnv } from '@/lib/eudi/vp/config';
import { createSession } from '@/lib/eudi/vp/session-store';
import type { CreateVpSessionResult, RequestMode } from '@/lib/eudi/vp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const env = readEudiVpEnv();
  if (!env.enabled || !env.externalUrl) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { requestMode?: string };
  const requestMode: RequestMode =
    body.requestMode === 'x5c-signed' && env.requestModes.includes('x5c-signed')
      ? 'x5c-signed'
      : 'unsigned';

  const session = createSession(requestMode);

  const { openid4vpUriFor, requestUriFor } = await import('@/lib/eudi/vp/verifier');
  const openid4vpUri = await openid4vpUriFor(session, env);
  const requestUri = requestUriFor(session.id, env.externalUrl);

  const QRCode = (await import('qrcode')).default;
  const qrPngDataUrl = await QRCode.toDataURL(openid4vpUri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });

  const result: CreateVpSessionResult = {
    sessionId: session.id,
    openid4vpUri,
    qrPngDataUrl,
    requestUri,
    expiresAt: session.expiresAt,
  };
  return NextResponse.json(result);
}
