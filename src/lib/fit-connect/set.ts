/**
 * FIT-Connect Security Event Token (SET) — JWS-signed (Spec § 6.2,
 * Research § D "ADDED PRECISION"). SERVER-ONLY.
 *
 * Status events in FIT-Connect are JWS-signed Security Event Tokens per
 * RFC 8417, signed with **PS512** (RSASSA-PSS / SHA-512) under the fixed `typ`
 * header `secevent+jwt`. The payload carries `authenticationTags` — the
 * trailing AEAD tags of each component's JWE Compact Serialization
 * (metadata / data / attachments).
 *
 * Tier-1 use here is RENDER-ONLY: we build a standards-true SET to show the
 * traceability shape; we do not post it anywhere. The signing key is an
 * ephemeral synthetic key — there is no real subscriber. Tier-2 (live receive)
 * would validate the subscriber's real SET; that path lives in `sdk-tier2.ts`.
 */

import { generateKeyPair, SignJWT } from 'jose';

import { SET_SIGNING } from './config';

/** Extract the trailing AEAD-tag segment of a JWE Compact Serialization. */
function authTagOf(jweCompact: string): string {
  const parts = jweCompact.split('.');
  return parts[parts.length - 1] ?? '';
}

export interface BuildSetArgs {
  /** Full JWE Compact of the metadata. */
  metadataJwe: string;
  /** Full JWE Compact of the Fachdaten. */
  fachdatenJwe: string;
  /** Full JWE Compact of each attachment. */
  attachmentJwes: string[];
  /** Subject of the SET — the synthetic submissionId. */
  submissionId: string;
}

/**
 * Build a JWS-signed SET (`PS512`, `typ: secevent+jwt`) with `authenticationTags`
 * for the three component categories. Returns the Compact JWS.
 *
 * The 2048-bit signer is intentional: the SET signer is synthetic and
 * render-only, so a smaller modulus keeps Tier-1 fast and deterministic-in-shape
 * without weakening any real security claim (no real subscriber exists).
 */
export async function buildRenderedSet(args: BuildSetArgs): Promise<string> {
  const { privateKey } = await generateKeyPair(SET_SIGNING.alg, {
    modulusLength: 2048,
  });

  const authenticationTags = {
    metadata: authTagOf(args.metadataJwe),
    data: authTagOf(args.fachdatenJwe),
    attachment: args.attachmentJwes.map(authTagOf),
  };

  return new SignJWT({ authenticationTags })
    .setProtectedHeader({ alg: SET_SIGNING.alg, typ: SET_SIGNING.typ })
    .setIssuedAt()
    .setSubject(args.submissionId)
    .setJti(args.submissionId)
    .sign(privateKey);
}
