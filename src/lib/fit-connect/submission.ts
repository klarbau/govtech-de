/**
 * FIT-Connect submission flow (Spec § 6.3, Plan § 4 Stage 1). SERVER-ONLY.
 *
 * The concrete 7-step Submission-API-v2 flow. Tier-1 builds the **request
 * SHAPE** of each step with NO network call — deterministic and e2e-testable.
 * Tier-2 (in `rest-tier2.ts`) performs the real HTTP round-trip against the TEST
 * sandbox; only that path is reachable behind the `FIT_CONNECT_LIVE` flag.
 *
 * Honesty: Tier-1 addresses a synthetic `[MOCK destination]` (Spec § 13.2 #4).
 * The routing step (2) uses the Block-D placeholder leikaKeys LITERALLY
 * (Spec § 6.5) — never the docs example `99123456760610`, never an invented key.
 */

import {
  FIT_CONNECT_BASE_URLS,
  MOCK_ARS,
} from './config';

/** A described HTTP request shape — built but (Tier-1) never sent. */
export interface WireRequestShape {
  step: number;
  label: string;
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  /** Header names only — never secret values (no Bearer token material). */
  headers: string[];
  /** Body description (not the encrypted bytes). */
  bodyNote?: string;
}

export interface BuildWireFlowArgs {
  leikaKey: string;
  ars?: string;
  /** Synthetic destination id used to template steps 3–6. */
  destinationId: string;
  encryptionKid: string;
  submissionId: string;
  caseId: string;
  announcedAttachmentIds: string[];
}

/**
 * Build the request shapes for all 7 steps (Tier-1: no send). The strings are
 * the real TEST endpoints with the placeholder leikaKey rendered literally, so
 * the wire excerpt is standards-true and honest about what is unconfirmed.
 */
export function buildWireFlow(args: BuildWireFlowArgs): WireRequestShape[] {
  const sub = FIT_CONNECT_BASE_URLS.submission;
  const ars = args.ars ?? MOCK_ARS;

  return [
    {
      step: 1,
      label: 'OAuth client-credentials → Bearer-Token',
      method: 'POST',
      url: FIT_CONNECT_BASE_URLS.token,
      headers: ['Content-Type'],
      bodyNote: 'grant_type=client_credentials (Creds aus process.env, nie geloggt)',
    },
    {
      step: 2,
      label: 'Routing',
      method: 'GET',
      // Placeholder leikaKey rendered literally (Spec § 6.5).
      url: `${FIT_CONNECT_BASE_URLS.routing}/v1/routes?ars=${encodeURIComponent(
        ars,
      )}&leikaKey=${encodeURIComponent(args.leikaKey)}`,
      headers: ['Authorization (Bearer)'],
    },
    {
      step: 3,
      label: 'Destination-JWK holen',
      method: 'GET',
      url: `${sub}/v2/destinations/${args.destinationId}/keys/${args.encryptionKid}`,
      headers: ['Authorization (Bearer)'],
    },
    {
      step: 4,
      label: 'Submission anlegen',
      method: 'POST',
      url: `${sub}/v2/submissions`,
      headers: ['Authorization (Bearer)', 'Content-Type'],
      bodyNote: `destinationId, publicService.identifier, announcedAttachments[${args.announcedAttachmentIds.length}] (UUIDv4)`,
    },
    ...args.announcedAttachmentIds.map<WireRequestShape>((aid) => ({
      step: 5,
      label: 'Attachment hochladen (JWE Compact)',
      method: 'PUT' as const,
      url: `${sub}/v2/submissions/${args.submissionId}/attachments/${aid}`,
      headers: ['Authorization (Bearer)', 'Content-Type: application/jose'],
      bodyNote: 'JWE Compact (RSA-OAEP-256 / A256GCM), kein zip',
    })),
    {
      step: 6,
      label: 'Senden',
      method: 'PUT',
      url: `${sub}/v2/submissions/${args.submissionId}`,
      headers: ['Authorization (Bearer)', 'Content-Type'],
      bodyNote:
        'encryptedData (Fachdaten-JWE, mandatory v2) + encryptedMetadata (Metadaten-JWE), kein zip',
    },
    {
      step: 7,
      label: '(Tier-2 receive) SET-Traceability-Log',
      method: 'GET',
      url: `${sub}/v2/cases/${args.caseId}/events`,
      headers: ['Authorization (Bearer)'],
      bodyNote:
        'JWS-signierte SETs (PS512, typ secevent+jwt, authenticationTags) — nur Tier-2',
    },
  ];
}
