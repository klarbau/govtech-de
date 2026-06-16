/**
 * FIT-Connect metadata schema validation (Spec § 6.2, § 6.4). SERVER-ONLY.
 *
 * Loads the VENDORED FIT-Connect metadata 2.1.0 schema
 * (`schema/metadata-2.1.0.schema.json`, fetched at build time from
 * `https://schema.fitko.de/fit-connect/metadata/2.1.0/metadata.schema.json`)
 * and validates against it with Ajv2020 + ajv-formats. No network fetch at
 * runtime — Tier-1 validation is fully offline & deterministic (Spec § 12: "a
 * Tier-1 schema fail in CI is a build bug").
 *
 * ── Dependency note ────────────────────────────────────────────────────────
 * `ajv` is a DIRECT dependency pinned to ^8, so the top-level `node_modules/ajv`
 * is the v8 build (with JSON-Schema-2020-12 support) and Ajv2020 imports cleanly
 * as `ajv/dist/2020` in ANY install layout — npm-nested locally or a clean pnpm
 * store on Vercel. `ajv-formats@3` peer-depends on `ajv@^8`, so the two are
 * version-matched. (A transitive `ajv@6` pulled in elsewhere keeps its own
 * nested copy and does not collide with our top-level v8.)
 *
 * NB: do NOT revert to `ajv-formats/node_modules/ajv/dist/2020` — that deep path
 * only resolves under npm's nesting and breaks the Vercel pnpm build.
 */

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import metadataSchema from './schema/metadata-2.1.0.schema.json';

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Lazily compiled validator — compiled once per server process. The vendored
 * schema's `$ref`s are all internal (`#/…`), so it compiles standalone with no
 * external subschema registration.
 */
let compiled: ((data: unknown) => boolean) | null = null;
let lastErrors: string[] = [];

function getValidator(): (data: unknown) => boolean {
  if (compiled) return compiled;
  // `strict: false` — the FITKO schema uses keywords (e.g. `examples`,
  // `minContains` on non-array contexts) that Ajv's strict mode flags; FITKO
  // publishes it as-is, so we validate against it as-published.
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv as never);
  const validate = ajv.compile(metadataSchema as object);
  compiled = (data: unknown) => {
    const ok = validate(data);
    lastErrors = ok
      ? []
      : (validate.errors ?? []).map(
          (e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`,
        );
    return ok;
  };
  return compiled;
}

/**
 * Validate a candidate FIT-Connect metadata object against the vendored 2.1.0
 * schema. Returns `{ valid, errors }`. Never throws on invalid input.
 */
export function validateMetadata(obj: unknown): SchemaValidationResult {
  const validate = getValidator();
  const valid = validate(obj);
  return { valid, errors: valid ? [] : [...lastErrors] };
}
