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

import {
  pidSdJwtVcForPersona,
  verifyPidSdJwtVc,
  issueMeldebestaetigungForPersona,
  toMeldebestaetigungReadout,
  MELDEBESTAETIGUNG_FIELDS,
  DEMO_ONCE_ONLY_CA_PEM,
  type PersonaMeldeContext,
} from '@/lib/eudi';
import type {
  PidVerificationResult,
  MeldebestaetigungField,
  MeldebestaetigungVerificationResult,
} from '@/lib/eudi';
import personasData from '@/data/personas.json';

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

/* ─────────────────────── Verifiable Once-Only (§6b) ─────────────────────────
 *
 * The OUTGOING half of the Once-Only loop. These actions mint an amtliche
 * Meldebestätigung (§ 24 Abs. 2 BMG) SD-JWT VC with the synthetic Demo-Issuer key
 * and RE-VERIFY it offline against the injected Demo-Trust-Anchor — the literal
 * round-trip proof. Deterministic + offline (ZERO network), exactly like
 * `getVerifiedReferencePid`: no `.env`, no server-stateful store, Vercel- and
 * Loom-safe (the signing key is vendored, §6a). `[reference-ecosystem]` +
 * `[ZUKUNFT]`: FORMAT + signature real, AUTHORITY Demo.
 *
 * The action derives the credential claims deterministically from the persona
 * Stammdaten fixture (`personas.json`) + the canonical demo Umzug address — the
 * SAME synthetic identity the cascade uses — so the panel round-trip is stable
 * regardless of the browser store. The authoritative, store-persisted Document
 * (which carries this exact token in `qr_payload`) is minted by the backend hook
 * (§6c) into the vault; this action is the read-only crypto verdict for Beat 1/3.
 */

/** The canonical demo Umzug address (the just-registered address) — single line. */
const DEMO_UMZUG_ANSCHRIFT = 'Müllerstr. 142a, 13353 Berlin';
/** Deterministic demo Umzug date (move-in = registration). */
const DEMO_UMZUG_DATUM = '2026-06-01';

interface SeedPersona {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  doktorgrad?: string;
}

/** Resolve a deterministic Meldebestätigung context from the persona fixture. */
function personaMeldeContext(personaId?: string): PersonaMeldeContext {
  const personas = personasData as unknown as SeedPersona[];
  const p =
    (personaId && personas.find((x) => x.id === personaId)) || personas[0];
  return {
    familienname: p.nachname,
    vornamen: p.vorname,
    ...(p.doktorgrad ? { doktorgrad: p.doktorgrad } : {}),
    geburtsdatum: p.geburtsdatum,
    anschrift: DEMO_UMZUG_ANSCHRIFT,
    einzugsdatum: DEMO_UMZUG_DATUM,
    datum_anmeldung: DEMO_UMZUG_DATUM,
    wohnungsstatus: 'hauptwohnung',
  };
}

/**
 * Mint (deterministically) + re-verify the active run's Meldebestätigung
 * credential, returning the credential-appropriate readout (§6d). The verifier
 * runs against the injected Demo-Trust-Anchor with ZERO verifier changes (C4).
 */
export async function verifyMeldebestaetigungCredential(
  personaId?: string,
  vorgangId?: string,
): Promise<MeldebestaetigungVerificationResult> {
  const ctx = personaMeldeContext(personaId);
  const token = await issueMeldebestaetigungForPersona(
    personaId,
    vorgangId ?? `vono-demo-${personaId ?? 'default'}`,
    ctx,
  );
  const result = await verifyPidSdJwtVc(token, {
    trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
  });
  return toMeldebestaetigungReadout(result);
}

/**
 * Mint ONLY (no verify) the run's Meldebestätigung credential and return the raw
 * SD-JWT VC token. This is the server-action boundary the browser mock-backend
 * (`src/lib/mock-backend/api.ts`) crosses when it persists the minted Document —
 * the issuer (`node:crypto` + `jose`) MUST stay server-side, so the backend can
 * never statically/dynamically pull `@/lib/eudi/issue` into the client bundle.
 *
 * Unlike `verifyMeldebestaetigungCredential` (which derives a deterministic demo
 * context), this accepts the caller's exact `ctx` — the backend builds it from
 * the real Vorgang (the NEW Umzug address + dates), so the persisted token's
 * claims match the cascade. Deterministic + offline; Vercel- and Loom-safe.
 */
export async function issueMeldebestaetigungToken(
  personaId: string,
  vorgangId: string,
  ctx: PersonaMeldeContext,
): Promise<string> {
  return issueMeldebestaetigungForPersona(personaId, vorgangId, ctx);
}

/**
 * Phase 2 — re-present ONLY the chosen field subset and re-verify. Mints the
 * full credential, then rebuilds a token carrying ONLY the selected disclosures
 * (issuer JWT unchanged) and re-verifies — the literal Datenminimierung proof:
 * the signature still validates and `presentFields` collapses to the selection.
 * Unknown/duplicate fields are filtered to the closed § 24 Abs. 2 set.
 */
export async function presentMeldebestaetigungSubset(
  fields: MeldebestaetigungField[],
  personaId?: string,
  vorgangId?: string,
): Promise<MeldebestaetigungVerificationResult> {
  const allowed = new Set<MeldebestaetigungField>(MELDEBESTAETIGUNG_FIELDS);
  const selected = Array.from(
    new Set(fields.filter((f) => allowed.has(f))),
  ) as MeldebestaetigungField[];

  const ctx = personaMeldeContext(personaId);
  const token = await issueMeldebestaetigungForPersona(
    personaId,
    vorgangId ?? `vono-demo-${personaId ?? 'default'}`,
    ctx,
    { discloseOnly: selected },
  );
  const result = await verifyPidSdJwtVc(token, {
    trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
  });
  return toMeldebestaetigungReadout(result);
}
