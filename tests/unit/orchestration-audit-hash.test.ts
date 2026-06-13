/**
 * Audit-Log-Hash-Substrat (Spec § 2.3, § 9.2).
 *
 * Fixiert die zwei load-bearing Contract-Eigenschaften der Hash-Kette:
 *   - canonicalJson ist deterministisch (Key-Order-unabhängig, Whitespace-frei).
 *   - Die pure-JS-SHA-256-Fallback produziert IDENTISCHE Digests zu Web Crypto
 *     (`crypto.subtle`). Divergieren sie, schlüge jede `verifyChain()` auf dem
 *     no-subtle-Test-Pfad fehl.
 */
import { describe, expect, test } from 'vitest';
import {
  canonicalJson,
  sha256Hex,
  sha256HexPure,
} from '@/lib/mock-backend/orchestration/audit-log';

describe('canonicalJson — deterministische Serialisierung', () => {
  test('Key-Order ist irrelevant', () => {
    const a = canonicalJson({ b: 1, a: 2, c: { z: 9, y: 8 } });
    const b = canonicalJson({ c: { y: 8, z: 9 }, a: 2, b: 1 });
    expect(a).toBe(b);
  });

  test('kein Whitespace, sortierte Keys', () => {
    expect(canonicalJson({ b: 'x', a: 1 })).toBe('{"a":1,"b":"x"}');
  });

  test('Arrays behalten ihre Reihenfolge', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });
});

describe('SHA-256 — bekannte Vektoren', () => {
  test('leerer String', async () => {
    const known =
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(sha256HexPure('')).toBe(known);
    expect(await sha256Hex('')).toBe(known);
  });

  test('"abc"', async () => {
    const known =
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(sha256HexPure('abc')).toBe(known);
    expect(await sha256Hex('abc')).toBe(known);
  });

  test('langer Input (> 1 Block, prüft Padding)', async () => {
    const input = 'GovTech-DE '.repeat(64);
    expect(sha256HexPure(input)).toBe(await sha256Hex(input));
  });
});

describe('SHA-256 Fallback-Parität (§ 9.2)', () => {
  test('pure-JS und Web-Crypto liefern identische Digests für Audit-artige Payloads', async () => {
    const payload = canonicalJson({
      seq: 7,
      ts: '2027-01-01T00:00:03.000Z',
      sagaId: 'vorgang-xyz',
      stepId: 'vorgang-xyz:beitragsservice-koeln',
      type: 'STEP_RECEIPT',
      payload: { quittung: 'positive', behoerdeId: 'beitragsservice-koeln' },
    });
    const prevHash = 'deadbeef'.repeat(8);
    expect(sha256HexPure(prevHash + payload)).toBe(
      await sha256Hex(prevHash + payload),
    );
  });
});
