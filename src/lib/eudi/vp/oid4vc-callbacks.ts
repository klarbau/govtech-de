/**
 * EUDI OpenID4VP verifier — jose-backed oid4vc-ts callback context (Spec §6.4).
 *
 * SERVER-ONLY. `@openid4vc/openid4vp` is transport/parsing only — it delegates
 * every crypto operation to injected callbacks. This module provides the small
 * subset the VERIFIER's request-creation path needs
 * (`Pick<CallbackContext, 'signJwt' | 'encryptJwe'>`), all via `jose`:
 *
 *  - `signJwt` runs only in the x5c-signed JAR mode (signs the request object
 *    with the demo verifier key). In unsigned mode it is never invoked.
 *  - `encryptJwe` is never invoked here (we request no response encryption) but
 *    the option type requires it to be present.
 *
 * `import type` of the oauth2 callback types is erased at compile time — no
 * runtime dependency is pulled into the flag-off bundle.
 *
 * No secret ever leaves this module: the signing private key is held only in the
 * closure and used to produce a signature; it is never returned or logged.
 */

import { SignJWT, type CryptoKey, type JWK, type JWTHeaderParameters, type JWTPayload } from 'jose';

import type { CallbackContext, Jwk } from '@openid4vc/oauth2';

export interface VerifierSigningKey {
  /** The demo verifier private key (EC) for x5c-signed request objects. */
  privateKey: CryptoKey | Uint8Array;
  /** Its public JWK (returned to the library as `signerJwk`). */
  publicJwk: JWK;
}

/**
 * Build the callback subset for the verifier's request-creation path. `signing`
 * is required only for the x5c-signed mode; in unsigned mode `signJwt` is never
 * called, so it may be omitted.
 */
export function makeVerifierCallbacks(
  signing?: VerifierSigningKey,
): Pick<CallbackContext, 'signJwt' | 'encryptJwe'> {
  const signJwt: CallbackContext['signJwt'] = async (_jwtSigner, jwt) => {
    if (!signing) {
      throw new Error('signJwt invoked without a demo signing key');
    }
    const compact = await new SignJWT(jwt.payload as JWTPayload)
      .setProtectedHeader(jwt.header as unknown as JWTHeaderParameters)
      .sign(signing.privateKey);
    return { jwt: compact, signerJwk: signing.publicJwk as unknown as Jwk };
  };

  const encryptJwe: CallbackContext['encryptJwe'] = async () => {
    throw new Error('encryptJwe not supported by the demo verifier');
  };

  return { signJwt, encryptJwe };
}
