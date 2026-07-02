/**
 * FIT-Connect Protokoll-Modus — re-poll a case's event log (Spec § 5.1, § 4.2).
 *
 * Flag ON  → `?caseId=…` re-polls `GET /v2/cases/{caseId}/events`, verifies each
 *            SET's PS512 signature server-side (per-issuer, in `pollCaseEvents`)
 *            and returns `{ sets: DecodedSet[] }` (decoded for display). Powers
 *            the inspector's "Event-Log aktualisieren" affordance.
 * Flag OFF → 404 `{ error: 'disabled' }`.
 *
 * `force-dynamic` keeps it off the prerender/build; heavy deps are
 * dynamic-imported inside the enabled branch. No secret is ever returned or
 * logged; a sandbox failure is framed as the TEST sandbox, never a real Behörde.
 */

import { NextResponse } from 'next/server';

import { readTier2Env } from '@/lib/fit-connect/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const env = readTier2Env();
  if (!env.enabled) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const caseId = new URL(request.url).searchParams.get('caseId');
  if (!caseId) {
    return NextResponse.json({ sets: [] });
  }

  try {
    const { pollCaseEvents } = await import('@/lib/fit-connect/rest-tier2');
    const { decodeSet } = await import('@/lib/fit-connect/set-decode');

    const raw = await pollCaseEvents(caseId, env);
    return NextResponse.json({ sets: raw.map((r) => decodeSet(r.compact, r.signatureVerified)) });
  } catch {
    return NextResponse.json({ error: 'sandbox' }, { status: 502 });
  }
}
