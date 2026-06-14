// THROWAWAY acquisition-gate script. NOT app code.
// Headless OpenID4VCI against the EU reference issuer (issuer.eudiw.dev) using the
// "FormEU" (FC) test PID source — no Android wallet, no phone, no eID.
// Obtains a real PID SD-JWT VC, then runs THE GATE: is x5c present in the issuer JWT header?
// Verifies the issuer signature offline with `jose` only, decodes disclosures.
//
// PERSONA-AWARE: issue one PID per demo persona with that persona's synthetic attrs.
//   node scripts/eudi-fetch-pid.mjs                 # issue ALL personas
//   node scripts/eudi-fetch-pid.mjs anna-petrov     # issue a single persona
//   node scripts/eudi-fetch-pid.mjs erika           # legacy single Erika fixture
//
// Each persona's attrs are entered into the FormEU test source. ISO codes:
//   place_of_birth → {country (alpha-2), region, locality}
//   nationalities  → [{country_code}]  (alpha-2)
import * as jose from 'jose';
import { createHash, randomBytes, X509Certificate } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const ISS = 'https://issuer.eudiw.dev';
const BE = 'https://backend.issuer.eudiw.dev';
const CONFIG_ID = 'eu.europa.ec.eudi.pid_vc_sd_jwt';
const SCOPE = 'eu.europa.ec.eudi.pid_vc_sd_jwt';
const CLIENT_ID = 'wallet-dev';
const REDIRECT = 'eudi-openid4ci://authorize';

// ── Persona registry: demo personas → synthetic FormEU PID attributes ──────────
// Maps src/data/personas.json (vorname/nachname/geburtsdatum/geburtsort/
// staatsangehoerigkeit) to the issuer's PID field shapes. Country/nationality are
// ISO 3166-1 alpha-2. geburtsort "City, Country" → place_of_birth.locality + .country.
const PERSONAS = {
  'anna-petrov': {
    family_name: 'Petrov',
    given_name: 'Anna',
    birthdate: '1997-03-22',
    place_of_birth: { country: 'BG', region: 'Sofia', locality: 'Sofia' },
    nationality: 'RU',
  },
  'markus-schmidt': {
    family_name: 'Schmidt',
    given_name: 'Markus',
    birthdate: '1988-02-14',
    place_of_birth: { country: 'DE', region: 'Hamburg', locality: 'Hamburg' },
    nationality: 'DE',
  },
  'mehmet-yildiz': {
    family_name: 'Yıldız',
    given_name: 'Mehmet',
    birthdate: '1990-09-04',
    place_of_birth: { country: 'TR', region: 'Konya', locality: 'Konya' },
    nationality: 'TR',
  },
  // legacy single-subject fixture (the original gate artefact)
  erika: {
    family_name: 'Mustermann',
    given_name: 'Erika',
    birthdate: '1990-01-01',
    place_of_birth: { country: 'DE', region: 'Berlin', locality: 'Berlin' },
    nationality: 'DE',
  },
};

// minimal cookie-jar + redirect-aware fetch (per-run jar, reset between personas)
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

/** Run the full headless OpenID4VCI flow for one persona's attrs → SD-JWT VC string. */
async function issuePid(attrs) {
  cookies = {}; // fresh jar per persona

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
  fd.set('birthdate', attrs.birthdate);
  fd.set('family_name', attrs.family_name);
  fd.set('given_name', attrs.given_name);
  fd.set('nationalities[0][country_code]', attrs.nationality);
  fd.set('place_of_birth[0][country]', attrs.place_of_birth.country);
  fd.set('place_of_birth[0][region]', attrs.place_of_birth.region);
  fd.set('place_of_birth[0][locality]', attrs.place_of_birth.locality);
  fd.set('proceed', '');                          // the submit button name
  res = await go(`${BE}/dynamic/form`, { method: 'POST', body: fd });
  let html = await res.text();
  console.log('  [form submit] status', res.status);

  // 5b) the entered data is echoed into a redirect_form -> /display_authorization (consent)
  const payload2 = firstMatch(html, /name="payload" value='([^']+)'/);
  res = await go(`${ISS}/display_authorization`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ payload: payload2 }) });
  if (res.status >= 300 && res.status < 400) res = await go(res.headers.get('location'));
  html = await res.text();
  const userId = firstMatch(html, /name="user_id"[^>]*value="([^"]*)"|value="([^"]*)"[^>]*name="user_id"/) || firstMatch(html, /value="([^"]+)" name="user_id"/);
  console.log('  [consent] user_id?', !!userId);

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
      const t = await cur.text();
      const href = firstMatch(t, new RegExp(REDIRECT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\'<> ]*'));
      if (href && href.includes('code=')) { authCode = new URL(href).searchParams.get('code'); }
      break;
    }
    if (l.startsWith(REDIRECT) || l.includes('code=')) {
      authCode = new URL(l).searchParams.get('code');
      if (authCode) break;
    }
    cur = await go(l);
    hop++;
  }
  if (!authCode) {
    const body = (await cur.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('  [NO CODE] final status', cur.status, 'body text:', body.slice(0, 500));
    throw new Error('Did not obtain authorization code — inspect flow above.');
  }

  // 7) token exchange (PKCE, public client)
  res = await go(`${ISS}/oidc/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: authCode, redirect_uri: REDIRECT, client_id: CLIENT_ID, code_verifier: verifier }),
  });
  const token = await res.json();
  if (!token.access_token) { console.log(JSON.stringify(token)); throw new Error('token exchange failed'); }

  // 8) get a fresh c_nonce if the issuer uses a nonce endpoint
  let cNonce = token.c_nonce;
  if (!cNonce) {
    const nres = await go(`${BE}/nonce`, { method: 'POST' });
    try { cNonce = (await nres.json()).c_nonce; } catch { /* */ }
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
  if (res.status >= 400) {
    res = await go(`${BE}/credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.access_token}` },
      body: JSON.stringify({ credential_configuration_id: CONFIG_ID, proof: { proof_type: 'jwt', jwt: proofJwt } }),
    });
    credText = await res.text();
    console.log('  [credential retry single-proof] status', res.status, 'first 200:', credText.slice(0, 200));
  }
  if (res.status >= 400) throw new Error('credential endpoint rejected request: ' + credText.slice(0, 300));

  const credJson = JSON.parse(credText);
  let sdjwt = credJson.credential || (credJson.credentials && (credJson.credentials[0].credential || credJson.credentials[0]));
  if (typeof sdjwt !== 'string') sdjwt = JSON.stringify(sdjwt);
  return sdjwt;
}

/** Offline-verify with jose only: x5c gate + signature + chain to demo CA + decode disclosures. */
async function offlineVerify(sdjwt, expectAttrs) {
  const parts = sdjwt.split('~');
  const issuerJwt = parts[0];
  const disclosures = parts.slice(1).filter(Boolean);
  const header = JSON.parse(Buffer.from(issuerJwt.split('.')[0], 'base64url').toString());
  const hasX5c = Array.isArray(header.x5c) && header.x5c.length > 0;
  console.log('  *** x5c PRESENT:', hasX5c, '| count:', hasX5c ? header.x5c.length : 0, '| alg:', header.alg, '***');

  let verified = false;
  let leafNotAfter = null;
  if (hasX5c) {
    const pem = `-----BEGIN CERTIFICATE-----\n${header.x5c[0].replace(/(.{64})/g, '$1\n')}\n-----END CERTIFICATE-----\n`;
    const cert = await jose.importX509(pem, header.alg);
    try {
      // pin clock inside validity window so a frozen artefact verifies regardless of wall clock
      const p = jose.decodeJwt(issuerJwt);
      const mid = (typeof p.iat === 'number' && typeof p.exp === 'number') ? new Date(((p.iat + p.exp) / 2) * 1000) : undefined;
      await jose.jwtVerify(issuerJwt, cert, mid ? { currentDate: mid } : {});
      verified = true;
      console.log('  [OFFLINE VERIFY] issuer JWS signature VALID against x5c leaf cert.');
    } catch (e) { console.log('  [OFFLINE VERIFY] FAILED:', e.message); }
    const leafX = new X509Certificate(pem);
    leafNotAfter = leafX.validTo;
    console.log('  [leaf] subject="' + leafX.subject.replace(/\n/g, ' ') + '" notAfter=' + leafX.validTo);
  }

  // decode disclosures into a flat name→value map (+ nested place_of_birth)
  const flat = {};
  const pob = {};
  for (const d of disclosures) {
    try {
      const arr = JSON.parse(Buffer.from(d, 'base64url').toString());
      if (arr.length === 3) {
        const [, name, val] = arr;
        if (['country', 'region', 'locality'].includes(name)) pob[name] = val;
        else flat[name] = val;
      } else if (arr.length === 2) {
        flat['nationality_value'] = arr[1]; // array-element form for nationalities
      }
    } catch { /* kb-jwt */ }
  }
  console.log('  [decoded] family_name=' + flat.family_name + ' given_name=' + flat.given_name +
    ' birthdate=' + flat.birthdate + ' place_of_birth=' + JSON.stringify(pob) +
    ' nationality=' + flat.nationality_value + ' date_of_expiry=' + flat.date_of_expiry);

  // attr cross-check against what we asked for
  const mism = [];
  if (expectAttrs) {
    if (flat.family_name !== expectAttrs.family_name) mism.push(`family_name ${flat.family_name}≠${expectAttrs.family_name}`);
    if (flat.given_name !== expectAttrs.given_name) mism.push(`given_name ${flat.given_name}≠${expectAttrs.given_name}`);
    if (flat.birthdate !== expectAttrs.birthdate) mism.push(`birthdate ${flat.birthdate}≠${expectAttrs.birthdate}`);
    if (pob.country !== expectAttrs.place_of_birth.country) mism.push(`pob.country ${pob.country}≠${expectAttrs.place_of_birth.country}`);
    if (pob.locality !== expectAttrs.place_of_birth.locality) mism.push(`pob.locality ${pob.locality}≠${expectAttrs.place_of_birth.locality}`);
    if (flat.nationality_value !== expectAttrs.nationality) mism.push(`nationality ${flat.nationality_value}≠${expectAttrs.nationality}`);
  }
  if (mism.length) console.log('  [ATTR MISMATCH] issuer changed/rejected:', mism.join('; '));
  else console.log('  [ATTR MATCH] all submitted attrs round-tripped.');

  return { hasX5c, verified, header, flat, pob, leafNotAfter };
}

(async () => {
  const arg = process.argv[2];
  const targets = arg ? [arg] : ['anna-petrov', 'markus-schmidt', 'mehmet-yildiz'];

  const dir = 'docs/research/eudi-fixtures';
  mkdirSync(dir, { recursive: true });

  for (const id of targets) {
    const attrs = PERSONAS[id];
    if (!attrs) { console.log('UNKNOWN persona id:', id, '- valid:', Object.keys(PERSONAS).join(', ')); continue; }
    console.log('\n========== ISSUE PID for', id, '==========');
    console.log('  attrs:', JSON.stringify(attrs));
    const sdjwt = await issuePid(attrs);
    console.log('  GOT SD-JWT VC (len', sdjwt.length, ')');
    const v = await offlineVerify(sdjwt, attrs);

    // freeze per-persona fixture
    writeFileSync(`${dir}/pid-${id}.txt`, sdjwt);
    writeFileSync(`${dir}/issuer-jwt-header-${id}.json`, JSON.stringify(v.header, null, 2));
    console.log('  [FIXTURE] frozen', `${dir}/pid-${id}.txt`, '| leaf notAfter=', v.leafNotAfter, '| verified=', v.verified);
  }
  console.log('\nDONE.');
})().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
