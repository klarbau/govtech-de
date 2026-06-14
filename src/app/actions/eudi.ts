'use server';

/**
 * Server action: `getVerifiedReferencePid` (EUDI Tier-1 UI). SERVER-ONLY.
 *
 * `src/lib/eudi` touches `node:crypto` + `jose` + the vendored demo CA — it must
 * NEVER be pulled into a client bundle. This action is the boundary: it runs the
 * fully-offline verifier server-side and returns the plain, serializable
 * `PidVerificationResult` the client card (`<EudiReferencePidCard>`) renders.
 *
 * Discipline (mirrors `src/app/actions/fit-connect.ts`): no public HTTP route,
 * no server-stateful store, deterministic + offline (ZERO network), safe on
 * Vercel serverless and in a Loom take.
 *
 * `[reference-ecosystem]`: the verified artefact is the EU reference/development
 * PID against the development demo IACA — NOT German-state, NOT eIDAS-trusted,
 * NOT production. The German national EUDI Wallet is `[ZUKUNFT]` (~2 Jan 2027).
 */

import { pidSdJwtVcForPersona, verifyPidSdJwtVc } from '@/lib/eudi';
import type { PidVerificationResult } from '@/lib/eudi';

/**
 * Verify the ACTIVE persona's vendored EU-reference PID SD-JWT VC offline and
 * return the result.
 *
 * `personaId` selects which pre-issued reference credential to verify (each demo
 * persona — anna-petrov / markus-schmidt / mehmet-yildiz — has its own real PID
 * with that persona's synthetic attributes). An unknown / omitted id falls back
 * to the default credential (Erika Mustermann) via `pidSdJwtVcForPersona`.
 *
 * The verifier never throws on bad input (it returns `{ verified: false }`), so
 * this action is render-safe: the card can always paint an honest state.
 */
export async function getVerifiedReferencePid(
  personaId?: string,
): Promise<PidVerificationResult> {
  return verifyPidSdJwtVc(pidSdJwtVcForPersona(personaId));
}
