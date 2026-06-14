// THROWAWAY acquisition-gate script. NOT app code.
// Headless OpenID4VCI against the EU reference issuer (issuer.eudiw.dev) using the
// "FormEU" (FC) test PID source — no Android wallet, no phone, no eID.
// Obtains a real PID SD-JWT VC, then runs THE GATE: is x5c present in the issuer JWT header?
// Verifies the issuer signature offline with `jose` only, decodes disclosures.
//
// Usage: node scripts/eudi-fetch-pid.mjs
import * as jose from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const ISS = 'https://issuer.eudiw.dev';
const BE = 'https://backend.issuer.eudiw.dev';
const CONFIG_ID = 'eu.europa.ec.eudi.pid_vc_sd_jwt';
const SCOPE = 'eu.europa.ec.eudi.pid_vc_sd_jwt';
const CLIENT_ID = 'wallet-dev';
const REDIRECT = 'eudi-openid4ci://authorize';

// minimal cookie-jar + redirect-aware fetch
let cookies = {};
function setCookies(res) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
}
function cookieHeader() { return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '); }
async function go(url, opts = {}, follow = false) {
  const headers = { ...(opts.headers || {}) };
  if (Object.keys(cookies).length) headers.Cookie = cookieHeader();
  const res = await fetch(url, { ...opts, headers, redirect: follow ? 'follow' : 'manual' });
  setCookies(res);
  return res;
}
const firstMatch = (s, re) => { const m = s.match(re); return m ? m[1] : null; };

(async () => {
  // ---- PKCE ----
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  // 1) authorization request
  const authzParams = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT,
    scope: SCOPE, state: 'st1', code_challenge: challenge, code_challenge_method: 'S256',
  });
  let res = await go(`${ISS}/oidc/authorization?${authzParams}`);
  let loc = res.headers.get('location');                       // -> /auth_choice
  res = await go(loc); loc = res.headers.get('location');      // -> /dynamic/
  res = await go(loc);                                          // /dynamic/ page (payload)
  const payload0 = firstMatch(await res.text(), /name="payload" value='([^']+)'/);

  // 2) display_countries
  let f = new URLSearchParams({ payload: payload0 });
  res = await go(`${ISS}/display_countries`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: f });
  // 3) select FormEU (FC)
  res = await go(`${BE}/dynamic/country_selected`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ country: 'FC' }) });
  const payload1 = firstMatch(await res.text(), /name="payload" value='([^']+)'/);

  // 4) display_form -> the attribute entry form
  res = await go(`${ISS}/display_form`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ payload: payload1 }) });
  if (res.status >= 300 && res.status < 400) res = await go(res.headers.get('location'));

  // 5) submit the test PID data (multipart/form-data) -> /dynamic/form
  const fd = new FormData();
  fd.set('birthdate', '1990-01-01');
  fd.set('family_name', 'Mustermann');
  fd.set('given_name', 'Erika');
  fd.set('nationalities[0][country_code]', 'DE');
  fd.set('place_of_birth[0][country]', 'DE');
  fd.set('place_of_birth[0][region]', 'Berlin');
  fd.set('place_of_birth[0][locality]', 'Berlin');
  fd.set('proceed', '');                          // the submit button name
  res = await go(`${BE}/dynamic/form`, { method: 'POST', body: fd });
  let html = await res.text();
  console.log('[form submit] status', res.status);

  // 5b) the entered data is echoed into a redirect_form -> /display_authorization (consent)
  const payload2 = firstMatch(html, /name="payload" value='([^']+)'/);
  res = await go(`${ISS}/display_authorization`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ payload: payload2 }) });
  if (res.status >= 300 && res.status < 400) res = await go(res.headers.get('location'));
  html = await res.text();
  const userId = firstMatch(html, /name="user_id"[^>]*value="([^"]*)"|value="([^"]*)"[^>]*name="user_id"/) || firstMatch(html, /value="([^"]+)" name="user_id"/);
  console.log('[consent] user_id?', !!userId);

  // 5c) final consent submit -> /dynamic/redirect_wallet -> wallet redirect_uri ?code=
  const cfd = new FormData();
  if (userId) cfd.set('user_id', userId);
  cfd.set('proceed', '');
  res = await go(`${BE}/dynamic/redirect_wallet`, { method: 'POST', body: cfd });

  // 6) follow redirects until we hit the wallet redirect_uri carrying ?code=
  let authCode = null, hop = 0, cur = res;
  while (hop < 10) {
    const l = cur.headers.get('location');
    if (!l) {
      // page may carry a meta/JS redirect or an <a href=...code=...>
      const t = await cur.text();
      const href = firstMatch(t, new RegExp(REDIRECT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\'<> ]*'));
      if (href && href.includes('code=')) { authCode = new URL(href).searchParams.get('code'); console.log('[code in body href]', href.slice(0, 90)); }
      break;
    }
    if (l.startsWith(REDIRECT) || l.includes('code=')) {
      authCode = new URL(l).searchParams.get('code');
      console.log('[redirect carrying code]', l.slice(0, 90));
      if (authCode) break;
    }
    cur = await go(l);
    console.log('[hop]', l.slice(0, 90), '->', cur.status);
    hop++;
  }
  if (!authCode) {
    const body = (await cur.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('[NO CODE] final status', cur.status, 'body text:', body.slice(0, 500));
    throw new Error('Did not obtain authorization code — inspect flow above.');
  }

  // 7) token exchange (PKCE, public client)
  res = await go(`${ISS}/oidc/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: authCode, redirect_uri: REDIRECT, client_id: CLIENT_ID, code_verifier: verifier }),
  });
  const token = await res.json();
  console.log('[token] status', res.status, 'access_token?', !!token.access_token, 'c_nonce?', !!token.c_nonce, 'keys:', Object.keys(token).join(','));
  if (!token.access_token) { console.log(JSON.stringify(token)); throw new Error('token exchange failed'); }

  // 8) get a fresh c_nonce if the issuer uses a nonce endpoint
  let cNonce = token.c_nonce;
  if (!cNonce) {
    const nres = await go(`${BE}/nonce`, { method: 'POST' });
    try { cNonce = (await nres.json()).c_nonce; } catch { /* */ }
    console.log('[nonce endpoint] c_nonce?', !!cNonce);
  }

  // 9) build the holder proof JWT (ES256). cnf will be this key.
  const { publicKey, privateKey } = await jose.generateKeyPair('ES256', { extractable: true });
  const holderJwk = await jose.exportJWK(publicKey);
  const proofJwt = await new jose.SignJWT({ ...(cNonce ? { nonce: cNonce } : {}) })
    .setProtectedHeader({ alg: 'ES256', typ: 'openid4vci-proof+jwt', jwk: holderJwk })
    .setIssuer(CLIENT_ID).setAudience(ISS).setIssuedAt().sign(privateKey);

  // 10) credential request
  const credBody = { credential_configuration_id: CONFIG_ID, proofs: { jwt: [proofJwt] } };
  res = await go(`${BE}/credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.access_token}` },
    body: JSON.stringify(credBody),
  });
  let credText = await res.text();
  console.log('[credential] status', res.status, 'first 300:', credText.slice(0, 300));
  // retry with single-proof shape if needed
  if (res.status >= 400) {
    res = await go(`${BE}/credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.access_token}` },
      body: JSON.stringify({ credential_configuration_id: CONFIG_ID, proof: { proof_type: 'jwt', jwt: proofJwt } }),
    });
    credText = await res.text();
    console.log('[credential retry single-proof] status', res.status, 'first 300:', credText.slice(0, 300));
  }
  if (res.status >= 400) throw new Error('credential endpoint rejected request');

  const credJson = JSON.parse(credText);
  // OpenID4VCI 1.0: { credentials: [{ credential: "<sd-jwt-vc>" }] }  OR legacy { credential: "..." }
  let sdjwt = credJson.credential || (credJson.credentials && (credJson.credentials[0].credential || credJson.credentials[0]));
  if (typeof sdjwt !== 'string') sdjwt = JSON.stringify(sdjwt);
  console.log('\n===== GOT PID SD-JWT VC (len', sdjwt.length, ') =====');
  console.log(sdjwt.slice(0, 120) + '...');

  // ---------- THE GATE: x5c ----------
  const parts = sdjwt.split('~');
  const issuerJwt = parts[0];
  const disclosures = parts.slice(1).filter(Boolean);
  const header = JSON.parse(Buffer.from(issuerJwt.split('.')[0], 'base64url').toString());
  console.log('\n===== ISSUER JWT PROTECTED HEADER =====');
  console.log(JSON.stringify(header, null, 1));
  const hasX5c = Array.isArray(header.x5c) && header.x5c.length > 0;
  console.log('\n*** x5c PRESENT:', hasX5c, '| count:', hasX5c ? header.x5c.length : 0, '| x5u:', !!header.x5u, '| kid:', header.kid, '| alg:', header.alg, '***');

  // ---------- offline verify with jose only ----------
  let verified = false, payloadClaims = null;
  if (hasX5c) {
    const pem = `-----BEGIN CERTIFICATE-----\n${header.x5c[0].replace(/(.{64})/g, '$1\n')}\n-----END CERTIFICATE-----\n`;
    const cert = await jose.importX509(pem, header.alg);
    try {
      const { payload } = await jose.jwtVerify(issuerJwt, cert);
      verified = true; payloadClaims = payload;
      console.log('\n[OFFLINE VERIFY] issuer JWS signature VALID against x5c leaf cert.');
    } catch (e) { console.log('\n[OFFLINE VERIFY] FAILED:', e.message); payloadClaims = jose.decodeJwt(issuerJwt); }
    // dump cert subject/issuer + chain
    console.log('--- x5c chain (subject / issuer) ---');
    for (let i = 0; i < header.x5c.length; i++) {
      const p = `-----BEGIN CERTIFICATE-----\n${header.x5c[i].replace(/(.{64})/g, '$1\n')}\n-----END CERTIFICATE-----\n`;
      const x = new (await import('node:crypto')).X509Certificate(p);
      console.log(`  [${i}] subject="${x.subject.replace(/\n/g, ' ')}" issuer="${x.issuer.replace(/\n/g, ' ')}"`);
    }
  } else {
    payloadClaims = jose.decodeJwt(issuerJwt);
  }

  console.log('\n===== ISSUER JWT PAYLOAD (claims) =====');
  console.log(JSON.stringify(payloadClaims, null, 1).slice(0, 1400));

  // ---------- decode disclosures ----------
  console.log('\n===== DISCLOSURES (', disclosures.length, ') =====');
  for (const d of disclosures) {
    try { const arr = JSON.parse(Buffer.from(d, 'base64url').toString()); console.log('  ', JSON.stringify(arr)); } catch { console.log('  [kb-jwt or unparseable]', d.slice(0, 40)); }
  }

  // ---------- freeze the fixture ----------
  const dir = 'docs/research/eudi-fixtures';
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/pid-sd-jwt-vc.txt`, sdjwt);
  writeFileSync(`${dir}/issuer-jwt-header.json`, JSON.stringify(header, null, 2));
  if (hasX5c) {
    const leafPem = `-----BEGIN CERTIFICATE-----\n${header.x5c[0].replace(/(.{64})/g, '$1\n')}\n-----END CERTIFICATE-----\n`;
    writeFileSync(`${dir}/issuer-leaf-cert.pem`, leafPem);
    const anchorPem = `-----BEGIN CERTIFICATE-----\n${header.x5c[header.x5c.length - 1].replace(/(.{64})/g, '$1\n')}\n-----END CERTIFICATE-----\n`;
    writeFileSync(`${dir}/trust-anchor.pem`, anchorPem);
  }
  console.log('\n[FIXTURE] frozen under', dir);
})().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
