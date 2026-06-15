// THROWAWAY PKI-generation gate script. NOT app code.
//
// Generates the DEMO Once-Only PKI for the "Verifiable Once-Only" feature
// (docs/specs/verifiable-once-only.md §6a):
//   1. a self-signed ES256/P-256 Demo-CA  ("GovTech-DE Demo Once-Only CA [MOCK]")
//   2. a leaf DS (document-signer) cert it issues, also ES256/P-256
//
// The CA + leaf certs and the leaf's PKCS#8 private key are vendored as inline
// PEM constants into `src/lib/eudi/fixtures/once-only-issuer.ts` so runtime
// issuance (`src/lib/eudi/issue.ts`) is keyless / offline / Vercel-safe — no
// `.env`, no `fs`, no network at runtime (mirrors the Tier-1 verifier discipline).
//
// REPRODUCIBILITY: this script is deterministic in STRUCTURE (same DNs, same
// extensions, same key type). The keys themselves are fresh random ES256 keys
// each run — that is fine: they are purely synthetic and sign ONLY demo
// credentials with ZERO real authority. Re-run only if you intend to ROTATE the
// vendored demo keys (you must then re-paste the printed PEMs into the fixture).
//
// THE GATE this script proves before printing:
//   - the leaf chains to the CA via node:crypto X509Certificate
//     (leaf.checkIssued(ca) && leaf.verify(ca.publicKey)) — exactly what
//     verify.ts step 4 runs.
//
//   node scripts/once-only-gen-pki.mjs            # generate + gate + print PEMs
//   node scripts/once-only-gen-pki.mjs --write     # also write copies under docs/research/once-only-pki/
//
// Requires OpenSSL on PATH (this host: OpenSSL 3.5.6 via git-bash).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';

const CA_SUBJECT = '/CN=GovTech-DE Demo Once-Only CA [MOCK]/O=GovTech-DE Verwaltungsdemo (synthetic, no authority)/C=DE';
const LEAF_SUBJECT = '/CN=GovTech-DE Demo Once-Only DS [MOCK]/O=GovTech-DE Verwaltungsdemo (synthetic, no authority)/C=DE';

function openssl(args, opts = {}) {
  return execFileSync('openssl', args, { encoding: 'utf8', ...opts });
}

const dir = mkdtempSync(path.join(tmpdir(), 'vono-pki-'));
const p = (f) => path.join(dir, f);

try {
  // ── 1. CA: P-256 key + self-signed cert (CA:TRUE, keyCertSign) ──────────────
  openssl(['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', p('ca.key')]);

  const caExt = [
    'basicConstraints = critical, CA:TRUE',
    'keyUsage = critical, keyCertSign, cRLSign',
    'subjectKeyIdentifier = hash',
  ].join('\n');
  writeFileSync(
    p('ca.cnf'),
    [
      '[req]',
      'distinguished_name = dn',
      'x509_extensions = v3_ca',
      'prompt = no',
      '[dn]',
      'CN = GovTech-DE Demo Once-Only CA [MOCK]',
      'O = GovTech-DE Verwaltungsdemo (synthetic, no authority)',
      'C = DE',
      '[v3_ca]',
      caExt,
    ].join('\n'),
  );

  openssl([
    'req', '-new', '-x509', '-key', p('ca.key'),
    '-sha256', '-days', '3650',
    '-extensions', 'v3_ca', '-config', p('ca.cnf'),
    '-out', p('ca.crt'),
  ]);

  // ── 2. Leaf DS: P-256 key + CSR + cert signed by the CA ─────────────────────
  openssl(['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', p('leaf.ec.key')]);
  // Convert to PKCS#8 (what jose importPKCS8 + the vendored constant expect).
  openssl(['pkcs8', '-topk8', '-nocrypt', '-in', p('leaf.ec.key'), '-out', p('leaf.key')]);

  openssl(['req', '-new', '-key', p('leaf.key'), '-subj', LEAF_SUBJECT, '-out', p('leaf.csr')]);

  const leafExt = [
    'basicConstraints = critical, CA:FALSE',
    'keyUsage = critical, digitalSignature',
    'extendedKeyUsage = 1.3.6.1.5.5.7.3.36', // id-kp-documentSigning (eIDAS DS EKU)
    'subjectKeyIdentifier = hash',
    'authorityKeyIdentifier = keyid:always',
  ].join('\n');
  writeFileSync(p('leaf.ext'), leafExt);

  openssl([
    'x509', '-req', '-in', p('leaf.csr'),
    '-CA', p('ca.crt'), '-CAkey', p('ca.key'), '-CAcreateserial',
    '-sha256', '-days', '1825',
    '-extfile', p('leaf.ext'),
    '-out', p('leaf.crt'),
  ]);

  const caPem = readFileSync(p('ca.crt'), 'utf8').trim() + '\n';
  const leafPem = readFileSync(p('leaf.crt'), 'utf8').trim() + '\n';
  const leafKeyPkcs8 = readFileSync(p('leaf.key'), 'utf8').trim() + '\n';

  // ── THE GATE: node:crypto chain check (mirrors verify.ts step 4) ────────────
  const leafCert = new X509Certificate(leafPem);
  const caCert = new X509Certificate(caPem);
  const chainValid = leafCert.checkIssued(caCert) && leafCert.verify(caCert.publicKey);
  if (!chainValid) {
    console.error('GATE FAILED: leaf does not chain to CA via node:crypto.');
    process.exit(1);
  }

  // Single-line base64 DER of the leaf (the x5c[0] entry the issuer header carries).
  const leafDerB64 = leafCert.raw.toString('base64');

  console.log('GATE PASSED: leaf.checkIssued(ca) && leaf.verify(ca.publicKey) === true');
  console.log('CA subject :', caCert.subject.replace(/\r?\n/g, ', '));
  console.log('leaf subject:', leafCert.subject.replace(/\r?\n/g, ', '));
  console.log('\n──────── DEMO_ONCE_ONLY_CA_PEM ────────\n');
  console.log(caPem);
  console.log('──────── DEMO_ONCE_ONLY_LEAF_PEM ────────\n');
  console.log(leafPem);
  console.log('──────── DEMO_ONCE_ONLY_LEAF_X5C_DER_B64 (single line) ────────\n');
  console.log(leafDerB64);
  console.log('\n──────── DEMO_ONCE_ONLY_ISSUER_PRIVATE_KEY_PKCS8_PEM ────────\n');
  console.log(leafKeyPkcs8);

  if (process.argv.includes('--write')) {
    const outDir = path.resolve('docs/research/once-only-pki');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, 'demo-ca.crt.pem'), caPem);
    writeFileSync(path.join(outDir, 'demo-leaf.crt.pem'), leafPem);
    writeFileSync(path.join(outDir, 'demo-leaf.x5c.der.b64.txt'), leafDerB64 + '\n');
    writeFileSync(path.join(outDir, 'demo-leaf.pkcs8.key.pem'), leafKeyPkcs8);
    writeFileSync(
      path.join(outDir, 'README.md'),
      [
        '# Demo Once-Only PKI (source-of-truth copies) `[MOCK]`',
        '',
        'Generated by `scripts/once-only-gen-pki.mjs`. Purely synthetic ES256/P-256',
        'keys with ZERO real authority — they sign ONLY demo Meldebestätigung',
        'credentials. The vendored runtime copies live in',
        '`src/lib/eudi/fixtures/once-only-issuer.ts`.',
        '',
        '- `demo-ca.crt.pem` — self-signed Demo-CA (the trust anchor).',
        '- `demo-leaf.crt.pem` — leaf DS cert issued by the CA (PEM).',
        '- `demo-leaf.x5c.der.b64.txt` — same leaf as single-line base64 DER (the `x5c[0]` header entry).',
        '- `demo-leaf.pkcs8.key.pem` — the leaf private signing key (PKCS#8).',
        '',
        'NOT eIDAS-trusted, NOT German-state, NOT production. `[reference-ecosystem]` + `[ZUKUNFT]`.',
        '',
      ].join('\n'),
    );
    console.log('\nWrote copies under docs/research/once-only-pki/');
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
