/**
 * UPDATE-ARC STILLS — clean reference screenshots for the AI video generator.
 *
 * This is NOT a recorder and NOT a test gate. It produces PRISTINE 1920×1080
 * stills of every beat in the update arc (docs/UPDATE-LOG.md) for use as
 * image-to-video REFERENCE FRAMES (aimlapi.com). Unlike the recorder
 * (tests/demo/update-arc-demo.spec.ts) it deliberately omits ALL demo chrome —
 * no injected cursor, no lower-third captions, no pre-applied zoom transform —
 * because a generative video model warps any baked-in text/overlay it is asked
 * to animate. The model does the zoom; we hand it a clean frame.
 *
 *   npx playwright test --config=playwright.stills.config.ts
 *
 * Output: demo-recording/refs/NN-name.png (full viewport) + a few NN-name@el.png
 * tight element crops for the hero panels. Deterministic + key-independent: the
 * assistant SSE is mocked (same shape as the recorder), Anna's authenticated
 * state is seeded, ?reliable=1 disables the 5% mock-error injection.
 */
import { test, expect, type Page, type Route, type Locator } from '@playwright/test';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';
const REFS = 'demo-recording/refs';

const PROPOSED_ADRESSE = {
  strasse: 'Torstraße',
  hausnummer: '120',
  plz: '10119',
  ort: 'Berlin',
  land: 'DE' as const,
};
const PROPOSED_STICHTAG = '2026-07-01';
const ONCE_ONLY_DOC_TITLE = 'Meldebestätigung Berlin-Mitte — Friedrichstraße 100';

const beat = (page: Page, ms = 900) => page.waitForTimeout(ms);

/** Full-viewport still. */
async function shot(page: Page, name: string): Promise<void> {
  await beat(page, 500);
  await page.screenshot({ path: `${REFS}/${name}.png`, animations: 'disabled' });
}

/** Tight element crop — a second, framed reference for a hero panel. */
async function shotEl(page: Page, locator: Locator, name: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await beat(page, 400);
  await locator
    .screenshot({ path: `${REFS}/${name}@el.png`, animations: 'disabled' })
    .catch(() => {});
}

async function center(page: Page, locator: Locator): Promise<void> {
  await locator
    .evaluate((el) => el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' }))
    .catch(() => {});
  await beat(page, 500);
}

/** Hide scrollbars + freeze the caret so stills are crisp. Re-applied per nav. */
async function installCleanStyle(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
      * { scrollbar-width: none !important; caret-color: transparent !important; }
    `,
  }).catch(() => {});
}

async function setupAuthenticatedAnna(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__stills_seeded`;
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.setItem(sentinel, '1');
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        for (const key of [
          'profile', 'letters', 'vorgaenge', 'documents', 'termine',
          'orchestration:sagas', 'orchestration:outbox', 'orchestration:audit-log',
          'orchestration:dlq', 'orchestration:breakers',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        /* non-browser env — ignore */
      }
    },
    [NS, ACTIVE_PERSONA],
  );
}

function sseFrame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function mockAssistantRoute(page: Page): Promise<void> {
  await page.route('**/api/assistant', async (route: Route) => {
    const postData = route.request().postData() ?? '';
    const hasToolResult = postData.includes('"tool_result"');
    const frames: string[] = [];
    if (hasToolResult) {
      frames.push(sseFrame({ type: 'text_delta', text: 'Ich habe die zuständigen Behörden zusammengestellt. Prüfen Sie die Angaben und bestätigen Sie den Umzug.' }));
      frames.push(sseFrame({ type: 'message_stop', stop_reason: 'end_turn' }));
    } else {
      frames.push(sseFrame({ type: 'text_delta', text: 'Gerne — einen Moment, ich bereite Ihren Umzug vor.' }));
      frames.push(sseFrame({ type: 'tool_use', id: 'toolu_stills_preview_umzug', name: 'preview_umzug', input: { neue_adresse: PROPOSED_ADRESSE, stichtag_iso: PROPOSED_STICHTAG } }));
      frames.push(sseFrame({ type: 'message_stop', stop_reason: 'tool_use' }));
    }
    frames.push('data: [DONE]\n\n');
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform' },
      body: frames.join(''),
    });
  });
}

/* ─── dark IDE code card as a standalone full-frame still ────────────────── */

type CodeSpec = { file: string; tab: string; kicker: string; caption: string; lines: string[] };

const VERIFY_CODE: CodeSpec = {
  file: 'src/lib/eudi/verify.ts',
  tab: 'EUDI · SD-JWT VC',
  kicker: 'Echte Kryptographie · offline',
  caption: 'Offline-Verifikation eines EU-Referenz-Credentials: ES256-Signatur, Zertifikatskette und SHA-256-Recombination — kein Netz, kein Geheimnis.',
  lines: [
    '// EUDI Tier-1 — offline SD-JWT VC verifier (ZERO network calls)',
    'export async function verifyPidSdJwtVc(token, opts = {}) {',
    "  const [issuerJwt, ...disclosures] = token.split('~').filter(Boolean);",
    '',
    '  // 1. ES256 issuer signature against the x5c leaf certificate',
    "  const leafKey = await importX509(x5cToPem(header.x5c[0]), 'ES256');",
    "  await jwtVerify(issuerJwt, leafKey, { algorithms: ['ES256'] });",
    '',
    '  // 2. Chain the leaf to the vendored demo CA (node:crypto)',
    '  chainValid = leaf.checkIssued(ca) && leaf.verify(ca.publicKey);',
    '',
    '  // 3. Recombine: SHA-256 each disclosure, match the signed _sd digests',
    "  const digest = createHash('sha256').update(raw).digest('base64url');",
    '  //    an unbound disclosure ⇒ verified:false   — tamper-evident',
    '  return { verified, chainValid, claims, alg, expired };',
    '}',
  ],
};

const JWE_CODE: CodeSpec = {
  file: 'src/lib/fit-connect/jwe.ts',
  tab: 'FIT-Connect · JWE Compact',
  kicker: 'Standardtreue OZG-Einreichung',
  caption: 'Jeder Datensatz wird einzeln JWE-verschlüsselt (RSA-OAEP-256 / A256GCM, kein zip) — byte-genau nach Submission-API v2, live gegen die FITKO-Test-Umgebung erprobt.',
  lines: [
    '// FIT-Connect — JWE Compact Serialization, no zip (Submission API v2)',
    'export async function encryptCompact(payload) {',
    '  const key = await getRecipientPublicKey();           // RSA-4096',
    '  const plaintext = new TextEncoder().encode(JSON.stringify(payload));',
    '',
    '  const compact = await new CompactEncrypt(plaintext)',
    "    .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })",
    '    .encrypt(key);',
    '',
    '  return { compact, excerpt: renderWireExcerpt(compact) };',
    '}',
  ],
};

async function shotCodeCard(page: Page, spec: CodeSpec, name: string): Promise<void> {
  await page.evaluate((json) => {
    const s = JSON.parse(json) as {
      file: string; tab: string; kicker: string; caption: string; lines: string[];
    };
    const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const KW = /\b(const|let|var|await|async|function|return|export|import|from|new|if|else|for|of|typeof)\b/g;
    const STR = /('[^']*'|"[^"]*"|`[^`]*`)/g;
    const hl = (line: string): string => {
      const ci = line.indexOf('//');
      const codePart = ci >= 0 ? line.slice(0, ci) : line;
      const commentPart = ci >= 0 ? line.slice(ci) : '';
      let h = esc(codePart).replace(STR, '<span class="c-str">$1</span>').replace(KW, '<span class="c-kw">$1</span>');
      if (commentPart) h += '<span class="c-com">' + esc(commentPart) + '</span>';
      return h === '' ? '&nbsp;' : h;
    };
    const dots = ['#FF5F57', '#FEBC2E', '#28C840']
      .map((c) => `<span style="width:11px;height:11px;border-radius:9999px;background:${c}"></span>`)
      .join('');
    const body = s.lines
      .map((l) => `<span class="__demo_codeline">${hl(l)}</span>`)
      .join('\n');
    document.documentElement.innerHTML = `
      <head><style>
        html,body{margin:0;height:100%}
        body{background:#060A14;display:flex;align-items:center;justify-content:center;
          font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}
        .wrap{width:min(1140px,84vw);display:flex;flex-direction:column;gap:18px}
        .kick{margin:0;font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#60A5FA;text-align:left}
        .card{border-radius:14px;overflow:hidden;background:#0B1220;border:1px solid #1E293B;
          box-shadow:0 40px 90px rgba(2,6,23,.6),0 2px 10px rgba(2,6,23,.5)}
        .bar{display:flex;align-items:center;gap:8px;padding:12px 18px;background:#0E1729;border-bottom:1px solid #1E293B}
        .file{margin-left:12px;font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;font-size:13px;color:#94A3B8}
        .tab{margin-left:auto;font-size:11px;color:#64748B;letter-spacing:.12em;text-transform:uppercase}
        .codebody{margin:0;padding:24px 30px;counter-reset:ln;text-align:left;
          font-family:ui-monospace,"JetBrains Mono",Menlo,Consolas,monospace;
          font-size:16.5px;line-height:1.78;color:#E2E8F0;white-space:pre-wrap;tab-size:2}
        .__demo_codeline{display:block}
        .__demo_codeline::before{content:counter(ln);counter-increment:ln;display:inline-block;
          width:2.2em;margin-right:1.5em;text-align:right;color:#334155;user-select:none}
        .cap{margin:0;font-size:17px;line-height:1.5;color:#94A3B8;text-align:left;max-width:980px}
        .c-kw{color:#7DA9FF}.c-str{color:#6EE7B7}.c-com{color:#64748B;font-style:italic}.c-fn{color:#C4B5FD}
      </style></head>
      <body><div class="wrap">
        <p class="kick">${s.kicker}</p>
        <div class="card"><div class="bar">${dots}
          <span class="file">${s.file}</span><span class="tab">${s.tab}</span></div>
          <pre class="codebody">${body}</pre></div>
        <p class="cap">${s.caption}</p>
      </div></body>`;
  }, JSON.stringify(spec));
  await beat(page, 600);
  await page.screenshot({ path: `${REFS}/${name}.png` });
}

/* ─────────────────────────────  capture  ─────────────────────────────── */

test('UPDATE-ARC stills (Anna)', async ({ page }) => {
  test.setTimeout(240_000);
  await setupAuthenticatedAnna(page);
  await mockAssistantRoute(page);

  /* 00 — Dashboard establishing shot */
  await page.goto('/dashboard?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('heading', { name: /Petrov/i }).waitFor({ timeout: 12_000 }).catch(() => {});
  await installCleanStyle(page);
  await beat(page, 1200);
  await shot(page, '00-dashboard');

  /* 01 — Assistent: the confirm card (recipients + Rechtsgrundlage) */
  await page.goto('/assistent?reliable=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Hallo Anna/).first()).toBeVisible({ timeout: 30_000 });
  await installCleanStyle(page);
  const composer = page.getByPlaceholder(/.+/).first();
  await composer.click();
  await composer.pressSequentially('leite meinen Umzug ein', { delay: 12 });
  await composer.press('Enter');
  const confirmCard = page.getByRole('group', { name: 'Umzug bestätigen' });
  await expect(confirmCard).toBeVisible({ timeout: 30_000 });
  await center(page, confirmCard);
  await shot(page, '01-assistent-confirm');
  await shotEl(page, confirmCard, '01-assistent-confirm');

  await confirmCard.getByRole('button', { name: 'Umzug starten' }).click();

  /* 02 — Resilient saga cascade running inline */
  const inlineCascade = page.getByTestId('inline-cascade');
  await expect(inlineCascade).toBeVisible({ timeout: 30_000 });
  await beat(page, 2600); // let the statutory rows auto-confirm
  await center(page, inlineCascade);
  await shot(page, '02-cascade');

  /* 05 — Termin-Autopilot row (gefunden + vorgemerkt) */
  const terminRow = inlineCascade.getByTestId('termin-vorschlag-row');
  if (await terminRow.count()) {
    await center(page, terminRow);
    await shot(page, '05-termin-autopilot');
    await shotEl(page, terminRow, '05-termin-autopilot');
  }

  /* 03 — Hash-chained audit log */
  const toggle = page.getByTestId('orchestration-inline-toggle');
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  await toggle.click();
  const auditRow = page.getByTestId('orchestration-audit-row').first();
  await expect(auditRow).toBeVisible({ timeout: 30_000 });
  await center(page, auditRow);
  await shot(page, '03-audit-chain');
  const auditPanel = page.getByTestId('orchestration-inline-panel');
  if (await auditPanel.count()) await shotEl(page, auditPanel.first(), '03-audit-chain');

  /* 04 — verifyChain() green verdict */
  const verifyCta = page.getByTestId('orchestration-verify-cta');
  if (await verifyCta.count()) {
    await verifyCta.click();
    const verifyResult = page.getByTestId('orchestration-verify-result');
    await verifyResult
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
    await center(page, verifyResult);
    await shot(page, '04-verify-ok');
    await shotEl(page, verifyResult, '04-verify-ok');
  }

  /* 06 — eID gate (sensitive rows, before confirm) */
  const eidButtons = inlineCascade.getByTestId('inline-eid-confirm');
  await expect(eidButtons.first()).toBeVisible({ timeout: 30_000 });
  await center(page, eidButtons.first());
  await shot(page, '06-eid-gate');

  /* 07 — FIT-Connect JWE receipt (after both eID confirms) */
  await eidButtons.first().click();
  await expect(eidButtons).toHaveCount(1, { timeout: 20_000 }).catch(() => {});
  await beat(page, 700);
  if (await eidButtons.count()) {
    await eidButtons.first().click();
    await expect(eidButtons).toHaveCount(0, { timeout: 20_000 }).catch(() => {});
  }
  const jweExcerpt = page.getByTestId('fit-connect-jwe-excerpt').first();
  await expect(jweExcerpt).toBeVisible({ timeout: 30_000 });
  await center(page, jweExcerpt);
  await shot(page, '07-fitconnect-jwe');
  await shotEl(page, jweExcerpt, '07-fitconnect-jwe');

  /* 08 — EUDI reference-PID card (Stammdaten) */
  await page.goto('/stammdaten?reliable=1', { waitUntil: 'domcontentloaded' });
  const eudiCard = page.getByTestId('eudi-reference-pid-card');
  await expect(eudiCard).toBeVisible({ timeout: 30_000 });
  await installCleanStyle(page);
  await center(page, eudiCard);
  await shot(page, '08-eudi-card');
  await shotEl(page, eudiCard, '08-eudi-card');

  /* 09 — Verifiable Once-Only credential panel (Dokumente) */
  await page.goto('/dokumente?reliable=1', { waitUntil: 'domcontentloaded' });
  const viewBtn = page
    .getByRole('button', { name: new RegExp(ONCE_ONLY_DOC_TITLE + ' ansehen') })
    .first();
  await expect(viewBtn).toBeVisible({ timeout: 30_000 });
  await installCleanStyle(page);
  await viewBtn.click();
  const panel = page.getByTestId('meldebestaetigung-credential-panel');
  const onceStatus = page.getByTestId('meldebestaetigung-status');
  let onceReady = await onceStatus.waitFor({ state: 'visible', timeout: 9000 }).then(() => true, () => false);
  for (let attempt = 0; attempt < 4 && !onceReady; attempt += 1) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await viewBtn.click();
    onceReady = await onceStatus.waitFor({ state: 'visible', timeout: 9000 }).then(() => true, () => false);
  }
  await beat(page, 900);
  await shot(page, '09-once-only');
  if (await panel.count()) await shotEl(page, panel.first(), '09-once-only');

  /* 10 / 11 — dark IDE code cards (real crypto excerpts) */
  await shotCodeCard(page, VERIFY_CODE, '10-code-verify');
  await shotCodeCard(page, JWE_CODE, '11-code-jwe');
});
