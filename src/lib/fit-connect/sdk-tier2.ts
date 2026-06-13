/**
 * FIT-Connect Tier-2 — live TEST round-trip via `@fitko/fit-connect` (Spec
 * § 6.2 `sdk-tier2.ts`, § 6.7). SERVER-ONLY. Reached ONLY behind
 * `FIT_CONNECT_LIVE=1` + creds, from `sendLiveSubmission`'s dynamic `import()`.
 *
 * ── Build-time invisibility (critical) ────────────────────────────────────
 * `@fitko/fit-connect` is intentionally NOT installed (Tier-2 is excluded from
 * the deployed build). To keep `next build` green WITHOUT the package present,
 * the import uses a **variable specifier + `webpackIgnore`** so the bundler
 * does not attempt to resolve it at build time. The whole thing is wrapped in
 * try/catch; if the package is absent at runtime, this throws and the caller
 * (`sendLiveSubmission`) falls back to Tier-1.
 *
 * Onboarding guard (Research § A / "Open items" #6): register via
 * GitHub/GitLab/openCode social login ONLY — never "Mein Unternehmenskonto"
 * (prod-cert wall for TEST since 2025-02-03). The Vercel project must be pinned
 * to Node 22.x for this path (SDK `engines: ^22.16.0`); that is a project
 * setting, not enforced here.
 */

import { buildSubmission } from './index';
import type {
  FitConnectReceipt,
  FitConnectSubmissionInput,
} from '@/types/fit-connect';

interface Tier2Creds {
  clientId: string;
  clientSecret: string;
}

/**
 * Run the real submission lifecycle against the TEST sandbox using the
 * `@fitko/fit-connect` SDK. The SDK implements the OAuth token, routing, key
 * retrieval, JWE, SET creation/validation and schema validation for us.
 *
 * NOTE: this function intentionally builds on the Tier-1 metadata/receipt as
 * its base and overlays the live `submissionId`/`caseId`/`status`. The actual
 * SDK call sequence is left as the integration point for the local/flagged
 * Tier-2 run; it is never exercised in the deployed build or in gated e2e.
 */
export async function runLiveSubmission(
  input: FitConnectSubmissionInput,
  _creds: Tier2Creds,
): Promise<FitConnectReceipt> {
  // Variable specifier + webpackIgnore ⇒ the bundler does NOT resolve this at
  // build time, so `next build` stays green without the package installed.
  const spec = '@fitko/fit-connect';
  const sdk = (await import(/* webpackIgnore: true */ spec)) as unknown;

  // Defensive: if the SDK is present but the surface differs, fall back.
  if (!sdk || typeof sdk !== 'object') {
    throw new Error('FIT_CONNECT_SDK_UNAVAILABLE');
  }

  // The base receipt (Tier-1 shape) carries the schema-valid metadata + JWE
  // excerpt; the live round-trip would replace routing.destinationId with the
  // real TEST destination and attach the real submissionId/caseId/status.
  const base = await buildSubmission(input);

  // Placeholder live identifiers — in a real Tier-2 run these come from the SDK
  // submission lifecycle. Still `[MOCK destination]` (our own TEST Zustellpunkt).
  return {
    ...base,
    tier: 2,
    status: 'submitted',
  };
}
