/**
 * EUDI OpenID4VP — capability probe (Spec §6.1). GET, ALWAYS 200.
 *
 * The client discovers whether the Protokoll-Modus is enabled via this route
 * (§4.1) — it is the ONLY VP route that answers 200 when the flag is off (a 404
 * here would break discovery). No secrets: only the structural verdict + the
 * available request modes.
 */

import { NextResponse } from 'next/server';

import { readEudiVpEnv } from '@/lib/eudi/vp/config';
import type { EudiVpCapability } from '@/lib/eudi/vp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse<EudiVpCapability> {
  const env = readEudiVpEnv();
  return NextResponse.json({
    available: env.enabled,
    requestModes: env.requestModes,
  });
}
