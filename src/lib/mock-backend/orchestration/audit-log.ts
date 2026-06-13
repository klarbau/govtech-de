/**
 * Append-only Audit-Log mit SHA-256-Hash-Kette (Spec § 2.3, § 3, § 6.2).
 *
 * Honesty (§ 10): tamper-EVIDENT, NICHT tamper-proof. Eine SHA-256-Hash-Kette
 * macht unentdeckte Veränderung ERKENNBAR (`verifyChain()` bricht), nicht
 * unmöglich. Es gibt keinen externen Anker (keine veröffentlichte Blockchain-
 * Wurzel) — wer die ganze Kette end-to-end neu schreibt, bestünde `verifyChain`.
 * Lokales Evidenz-Substrat, mehr nicht.
 *
 * Canonicalisation ist Teil des Vertrags: `hash` wird über eine deterministische
 * Serialisierung berechnet (Keys lexikografisch sortiert, kein Whitespace,
 * Zahlen in Kurzform). Write UND `verifyChain()` nutzen DENSELBEN
 * `canonicalJson()` — byte-für-byte identisch. Divergieren sie, schlägt jede
 * Verifikation fehl.
 */
import type { AuditLogEntry } from '@/types/orchestration';

// ----------------------------------------------------------------------------
// Canonical JSON — deterministic serialisation (keys sorted, no whitespace)
// ----------------------------------------------------------------------------

/**
 * Deterministische Kanonik-Serialisierung. Objekt-Keys werden rekursiv
 * lexikografisch sortiert; Arrays behalten ihre Reihenfolge; `undefined` und
 * Funktionen werden weggelassen (JSON-Semantik). Zahlen in JS-Kurzform.
 *
 * MUSS für Write + Verify byte-identisch sein (Spec § 2.3 Contract).
 */
export function canonicalJson(value: unknown): string {
  return serialise(value);
}

function serialise(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  const t = typeof value;
  if (t === 'number') {
    return Number.isFinite(value as number) ? String(value) : 'null';
  }
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => serialise(v)).join(',')}]`;
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined && typeof obj[k] !== 'function')
      .sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${serialise(obj[k])}`);
    return `{${parts.join(',')}}`;
  }
  // bigint / symbol / function — not expected in audit payloads.
  return 'null';
}

// ----------------------------------------------------------------------------
// SHA-256 — Web Crypto when available, pure-JS fallback for the no-subtle path
// ----------------------------------------------------------------------------

const hasSubtle = (): boolean =>
  typeof globalThis !== 'undefined' &&
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.subtle !== 'undefined' &&
  typeof globalThis.crypto.subtle.digest === 'function';

/**
 * Async SHA-256 hex digest. Bevorzugt Web Crypto (`crypto.subtle`), fällt auf
 * die reine JS-Implementierung zurück (jsdom/Node ohne subtle). Beide MÜSSEN
 * identische Digests liefern — durch einen Unit-Test fixiert (§ 9.2).
 */
export async function sha256Hex(input: string): Promise<string> {
  if (hasSubtle()) {
    const enc = new TextEncoder();
    const buf = await globalThis.crypto.subtle.digest(
      'SHA-256',
      enc.encode(input),
    );
    return bufToHex(new Uint8Array(buf));
  }
  return sha256HexPure(input);
}

/** Synchronous pure-JS SHA-256 — used as the canonical fallback + by tests. */
export function sha256HexPure(input: string): string {
  return bufToHex(sha256Bytes(utf8Bytes(input)));
}

function bufToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function utf8Bytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Minimal UTF-8 encoder fallback (defensive; TextEncoder is ubiquitous).
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (c >> 12),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Dependency-free SHA-256 (FIPS 180-4). Operates on a byte array and returns
 * the 32-byte digest. Standard reference implementation; not performance-tuned.
 */
function sha256Bytes(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);

  // Pre-processing (padding).
  const l = data.length;
  const bitLen = l * 8;
  const withOne = l + 1;
  const k = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + k + 8;
  const msg = new Uint8Array(total);
  msg.set(data);
  msg[l] = 0x80;
  // 64-bit big-endian length in the last 8 bytes.
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 8, hi);
  dv.setUint32(total - 4, lo);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = dv.getUint32(off + i * 4);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outDv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outDv.setUint32(i * 4, H[i]);
  return out;
}

// ----------------------------------------------------------------------------
// Chain hashing
// ----------------------------------------------------------------------------

/** The hashed payload — exactly the entry minus prevHash/hash (§ 2.3). */
function hashedView(
  entry: Pick<AuditLogEntry, 'seq' | 'ts' | 'sagaId' | 'stepId' | 'type' | 'payload'>,
): Record<string, unknown> {
  return {
    seq: entry.seq,
    ts: entry.ts,
    sagaId: entry.sagaId,
    stepId: entry.stepId,
    type: entry.type,
    payload: entry.payload,
  };
}

/**
 * Computes the chain hash of one entry given the previous entry's hash.
 * `hash = sha256Hex(prevHash + canonicalJson(hashedView))`.
 */
export async function computeEntryHash(
  entry: Pick<
    AuditLogEntry,
    'seq' | 'ts' | 'sagaId' | 'stepId' | 'type' | 'payload'
  >,
  prevHash: string,
): Promise<string> {
  return sha256Hex(prevHash + canonicalJson(hashedView(entry)));
}

/** Synchronous variant (pure-JS SHA-256) — used by the recovery integrity gate. */
export function computeEntryHashSync(
  entry: Pick<
    AuditLogEntry,
    'seq' | 'ts' | 'sagaId' | 'stepId' | 'type' | 'payload'
  >,
  prevHash: string,
): string {
  return sha256HexPure(prevHash + canonicalJson(hashedView(entry)));
}

// ----------------------------------------------------------------------------
// verifyChain — tamper detection (§ 6.2, proof (f))
// ----------------------------------------------------------------------------

export interface VerifyChainResult {
  ok: boolean;
  /** seq at which the chain first breaks, if any. */
  brokenAtSeq?: number;
  /** number of entries inspected. */
  count: number;
}

/**
 * Re-derives every entry's hash from `prevHash + canonicalJson(view)` and checks
 * (a) the stored hash matches and (b) `prevHash` links to the previous entry's
 * hash (genesis link = '' at seq 0). Returns the first broken seq.
 *
 * Synchronous (uses the pure-JS digest) so the UI can call it without awaiting a
 * digest per entry; parity with the async digest is unit-tested.
 */
export function verifyChainSync(log: AuditLogEntry[]): VerifyChainResult {
  let prevHash = '';
  for (let i = 0; i < log.length; i++) {
    const entry = log[i];
    if (entry.prevHash !== prevHash) {
      return { ok: false, brokenAtSeq: entry.seq, count: log.length };
    }
    const recomputed = computeEntryHashSync(entry, prevHash);
    if (recomputed !== entry.hash) {
      return { ok: false, brokenAtSeq: entry.seq, count: log.length };
    }
    prevHash = entry.hash;
  }
  return { ok: true, count: log.length };
}
