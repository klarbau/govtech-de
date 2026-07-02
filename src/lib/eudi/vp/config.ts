/**
 * EUDI OpenID4VP verifier — env reader (Spec `protokoll-modus.md` §6.2).
 *
 * SERVER-ONLY. Mirrors `readTier2Env` (`src/lib/fit-connect/config.ts`):
 * returns a STRUCTURAL verdict only — never the secret values themselves, never
 * throws. If the flag is unset or the tunnel URL is missing, `enabled` is false
 * and every action route falls back to 404 (Demo-Modus byte-identical).
 *
 * The signing JWK PATH may be surfaced (it is a path, not a secret value); the
 * key material behind it is read with `node:fs` inside the verifier and NEVER
 * bundled, logged, or returned.
 */

import type { RequestMode } from './types';

export interface EudiVpEnv {
  /** `EUDI_VP_LIVE==='1'` AND a public tunnel URL is present. */
  enabled: boolean;
  /** Public base URL the wallet can reach (dev tunnel). Rotates — read per request. */
  externalUrl?: string;
  /** Absolute path to the demo verifier signing JWK (enables x5c-signed mode). */
  signingJwkPath?: string;
  /** Which request modes the verifier can currently serve. */
  requestModes: RequestMode[];
}

/**
 * Reads the EUDI VP enablement flag + tunnel URL from `process.env` (server
 * only). Structural verdict; never the secret material. `EUDI_VP_EXTERNAL_URL`
 * rotates with the dev tunnel, so callers MUST call this at request time and
 * never cache the result.
 */
export function readEudiVpEnv(): EudiVpEnv {
  const live = process.env.EUDI_VP_LIVE === '1';
  const externalUrl = process.env.EUDI_VP_EXTERNAL_URL?.trim() || undefined;
  const signingJwkPath = process.env.EUDI_VP_SIGNING_JWK_PATH?.trim() || undefined;

  const enabled = live && Boolean(externalUrl);

  // Unsigned mode is always available when enabled; x5c-signed additionally
  // needs a demo signing JWK path (its cert/key are read server-side).
  const requestModes: RequestMode[] = ['unsigned'];
  if (signingJwkPath) requestModes.push('x5c-signed');

  return {
    enabled,
    externalUrl,
    signingJwkPath,
    requestModes,
  };
}
