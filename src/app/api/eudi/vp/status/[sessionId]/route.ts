/**
 * EUDI OpenID4VP — session status endpoint (Spec §6.1). GET.
 *
 * Polled by the dialog (~1.2 s) to drive pending → scanned → verified (or
 * expired/error). Returns {@link VpStatusResult} with the structural honesty
 * marker `sandbox: true` (§9). An unknown/evicted session degrades to `expired`
 * (graceful — the dialog offers a fresh QR). Flag off: 404 (§4.2).
 */

import { NextResponse } from 'next/server';

import { readEudiVpEnv } from '@/lib/eudi/vp/config';
import { getSession } from '@/lib/eudi/vp/session-store';
import type { VpStatusResult } from '@/lib/eudi/vp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<VpStatusResult | { error: string }>> {
  const env = readEudiVpEnv();
  if (!env.enabled) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const { sessionId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    // Unknown or swept — the honest UI is "session expired, get a new QR".
    return NextResponse.json({ state: 'expired', sandbox: true });
  }

  const result: VpStatusResult = { state: session.state, sandbox: true };
  if (session.state === 'verified') {
    result.claims = session.claims;
    result.verifiedAt = session.verifiedAt;
  }
  return NextResponse.json(result);
}
