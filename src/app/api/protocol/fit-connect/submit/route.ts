/**
 * FIT-Connect Protokoll-Modus — one live i-Kfz submission (Spec § 5.1, § 4.2).
 *
 * Flag ON  → runs ONE spine-legitimate FIT-Connect leg (the i-Kfz
 *            Adressänderung, `kfz-berlin-labo`, the least-sensitive Block-D row,
 *            no eID gate needed to make the wire point) against OUR OWN FITKO
 *            TEST Zustellpunkt (`[MOCK destination]`), and returns
 *            `{ receipt, sets }`. The Familienkasse/ABH rows are NEVER submitted
 *            from here — they stay eID-gated in the cascade.
 * Flag OFF → 404 `{ error: 'disabled' }`.
 *
 * HARD-RULE: click-triggered only (POST from the inspector button) — never a
 * write on page load. `force-dynamic` keeps it off the prerender/build. Heavy
 * protocol deps (`sendLiveSubmission`, `pollCaseEvents`) are dynamic-imported
 * INSIDE the enabled branch, mirroring the shipped `import('./rest-tier2')`
 * pattern, so the flag-off bundle stays lean and `next build` green either way.
 * No secret is ever logged, returned, or embedded in an error; a sandbox
 * failure is framed as the TEST sandbox / our own destination, never a real
 * Behörde.
 */

import { NextResponse } from 'next/server';

import { readTier2Env, MOCK_ARS } from '@/lib/fit-connect/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const env = readTier2Env();
  if (!env.enabled) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  try {
    const { sendLiveSubmission } = await import('@/lib/fit-connect');
    const { pollCaseEvents } = await import('@/lib/fit-connect/rest-tier2');
    const { decodeSet } = await import('@/lib/fit-connect/set-decode');

    // The spine-legitimate leg: i-Kfz Adressänderung. `leikaKey` is the
    // configured `FIT_CONNECT_LEIKA_KEY` (env.leikaKey), the same key the live
    // round-trip actually sends; `datenkategorien` mirror the live recon set.
    const receipt = await sendLiveSubmission({
      behoerdeId: 'kfz-berlin-labo',
      leikaKey: env.leikaKey!,
      leikaKeyConfirmed: false,
      datenkategorien: ['adresse', 'kfz-kennzeichen'],
      ars: MOCK_ARS,
      loa: 'high',
    });

    // `sendLiveSubmission` swallows a sandbox failure and returns a Tier-2
    // receipt with `status: 'error'` (never a real Behörde). Surface it as an
    // error response so the inspector shows `state_error`, not a success card
    // (Spec § 10: FITKO sandbox 4xx/5xx → inspector shows the sandbox error).
    if (receipt.status === 'error') {
      return NextResponse.json({ error: 'sandbox' }, { status: 502 });
    }

    // Decode the freshly-polled event log into the inspector's SET timeline.
    // The per-SET signature verdict was decided server-side in `pollCaseEvents`.
    let sets: ReturnType<typeof decodeSet>[] = [];
    if (receipt.caseId) {
      const raw = await pollCaseEvents(receipt.caseId, env);
      sets = raw.map((r) => decodeSet(r.compact, r.signatureVerified));
    }

    return NextResponse.json({ receipt, sets });
  } catch {
    // Never surface the underlying error / any secret. Frame as the TEST sandbox.
    return NextResponse.json({ error: 'sandbox' }, { status: 502 });
  }
}
