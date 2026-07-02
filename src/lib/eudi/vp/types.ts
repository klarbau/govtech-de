/**
 * EUDI OpenID4VP verifier — shared types (Spec `protokoll-modus.md` §7.2).
 *
 * SERVER-ONLY conceptually (sessions live in server memory; secrets never
 * reach the client). These are plain data shapes — no crypto, no library
 * imports — so they are safe to reference from the (client) UI panel for the
 * status/capability response shapes.
 *
 * Honesty (§9): `sandbox: true` on {@link VpStatusResult} is a STRUCTURAL
 * marker — the code cannot emit a "real Behörde"/production path. The verified
 * PID is EU reference/development ecosystem, NOT German-state, NOT eIDAS, NOT
 * production.
 */

export type VpState = 'pending' | 'scanned' | 'verified' | 'error' | 'expired';
export type RequestMode = 'unsigned' | 'x5c-signed';

export interface VpSession {
  id: string;
  nonce: string;
  state: VpState;
  requestMode: RequestMode;
  createdAt: number; // ms epoch
  expiresAt: number; // ms epoch
  claims?: { given_name?: string; family_name?: string; birthdate?: string };
  verifiedAt?: number;
  error?: string; // honest reason, no PII
}

export interface CreateVpSessionResult {
  sessionId: string;
  openid4vpUri: string; // the openid4vp:// deep link (also the QR payload)
  qrPngDataUrl: string; // rendered server-side via `qrcode`
  requestUri: string; // ${EUDI_VP_EXTERNAL_URL}/api/eudi/vp/request/{sessionId}
  expiresAt: number;
}

export interface VpStatusResult {
  state: VpState;
  claims?: VpSession['claims'];
  verifiedAt?: number;
  sandbox: true; // structural honesty marker (always true)
}

export interface EudiVpCapability {
  available: boolean;
  requestModes: RequestMode[];
}
