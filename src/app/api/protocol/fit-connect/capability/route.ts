/**
 * FIT-Connect Protokoll-Modus — capability discovery (Spec § 5.1, § 4.2).
 *
 * The client never sees the `FIT_CONNECT_LIVE` flag. It GETs this route on mount
 * to decide whether to render the ProtokollInspector at all. ALWAYS 200 — this
 * IS the discovery mechanism, so it must not 404 when disabled (§ 4.2). No
 * secret is read or returned; only the structural `enabled` verdict.
 */

import { NextResponse } from 'next/server';

import { readTier2Env } from '@/lib/fit-connect/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse<{ available: boolean }> {
  return NextResponse.json({ available: readTier2Env().enabled });
}
