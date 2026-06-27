import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';

// The EUDI Meldebestätigung Once-Only credential is presented INLINE in the live
// document-detail dialog (DokumenteView → <DialogContent data-doc-detail-panel>),
// NOT in a standalone panel: the old `MeldebestaetigungCredentialPanel` was
// superseded by this inline rendering and removed (it had 0 importers). These
// selectors target the live dialog's default Übersicht tab, which holds the
// Echtheits-/verification block and the Datenminimierung field readout once the
// async `verifyMeldebestaetigungCredential` action resolves.
const PANEL = '[data-doc-detail-panel]';
const VERIFIED = '.dd-verified'; // header "Verifiziert" badge — shown once chain-validated
const ECHTHEIT = '.dd-echtheit'; // Übersicht authenticity block (icon + title + body)
const FIELDS = '.dd-fields'; // <dl> credential-field readout (Datenminimierung)
const SEEDED_DOC_TITLE = 'Meldebestätigung Berlin-Mitte — Friedrichstraße 100';

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

function summarize(results: AxeResults) {
  return {
    total: results.violations.length,
    bySeverity: {
      critical: results.violations.filter((v) => v.impact === 'critical').length,
      serious: results.violations.filter((v) => v.impact === 'serious').length,
      moderate: results.violations.filter((v) => v.impact === 'moderate').length,
      minor: results.violations.filter((v) => v.impact === 'minor').length,
    },
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.map((n) => n.target).slice(0, 4),
      sampleFailure: v.nodes[0]?.failureSummary,
    })),
  };
}

async function setLocale(page: Page, locale: string) {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
}

async function waitForDokumente(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page
      .locator('table, [data-slot="empty-state"]')
      .first()
      .waitFor({ state: 'visible', timeout: 9000 })
      .catch(() => undefined);
    await page.waitForTimeout(700);
    const hasTable = await page.locator('main table').count();
    if (hasTable > 0) return;
    const retry = page
      .getByRole('button', { name: /erneut versuchen|retry|wiederholen/i })
      .first();
    if ((await retry.count()) > 0) {
      await retry.click().catch(() => undefined);
      await page.waitForTimeout(500);
    } else {
      return;
    }
  }
}

// Opens the seeded EUDI Meldebestätigung document and waits for the inline
// credential verification to resolve (the `.dd-fields` readout renders only when
// `vState === 'ready' && result !== null`, i.e. the verify action has returned).
async function openCredentialPanel(page: Page) {
  const viewBtn = page
    .getByRole('button', { name: new RegExp(SEEDED_DOC_TITLE + ' ansehen') })
    .first();
  // Cold first load (or the 5% mock-error empty state) can leave the seeded row
  // not-yet-rendered. Re-drive waitForDokumente until the seeded view button is
  // visible (the doc is seed-guaranteed for the default persona).
  let visible = false;
  for (let attempt = 0; attempt < 5 && !visible; attempt++) {
    visible = await viewBtn
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true, () => false);
    if (!visible) await waitForDokumente(page);
  }
  await expect(
    viewBtn,
    'seeded EUDI Meldebestaetigung view button',
  ).toBeVisible({ timeout: 6000 });

  for (let attempt = 0; attempt < 4; attempt++) {
    await viewBtn.click();
    const dialog = page
      .locator('[role="dialog"], [data-slot="dialog-content"]')
      .first();
    await expect(dialog).toBeVisible({ timeout: 4000 });

    const panel = page.locator(PANEL);
    await expect(panel, 'detail panel mounted').toBeVisible({ timeout: 4000 });

    // The Datenminimierung readout appears only after the async credential
    // verification resolves — our "ready" signal.
    const ready = await page
      .locator(FIELDS)
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    if (ready) return { viewBtn, dialog, panel };

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 4000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
  throw new Error('Credential detail never reached the ready (fields) state');
}

test('axe LIGHT — credential detail panel (WCAG 2.1 AA)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const verifiedText =
    (await page.locator(VERIFIED).first().textContent())?.trim() ?? '';
  expect(verifiedText.length, 'verified verdict carries text').toBeGreaterThan(3);

  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const summary = summarize(results);
  console.log('[AXE-LIGHT once-only] ' + JSON.stringify(summary));

  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blockers, 'serious-or-critical (light)').toHaveLength(0);
});

test('axe DARK — credential detail panel (WCAG 2.1 AA)', async ({ page }) => {
  await setLocale(page, 'de');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const summary = summarize(results);
  console.log('[AXE-DARK once-only] ' + JSON.stringify(summary));

  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blockers, 'serious-or-critical (dark)').toHaveLength(0);
});

test('colour-contrast clean within the credential detail panel (both modes)', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);
  const light = await new AxeBuilder({ page })
    .withTags(axeTags)
    .include(PANEL)
    .analyze();
  const lightContrast = light.violations.filter((v) => v.id === 'color-contrast');
  console.log(
    '[CONTRAST-LIGHT once-only] ' +
      JSON.stringify(
        lightContrast.map((v) => ({
          nodes: v.nodes.length,
          t: v.nodes.map((n) => n.target),
        })),
      ),
  );
  expect(lightContrast, 'color-contrast within panel (light)').toHaveLength(0);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(200);
  const dark = await new AxeBuilder({ page })
    .withTags(axeTags)
    .include(PANEL)
    .analyze();
  const darkContrast = dark.violations.filter((v) => v.id === 'color-contrast');
  console.log(
    '[CONTRAST-DARK once-only] ' +
      JSON.stringify(
        darkContrast.map((v) => ({
          nodes: v.nodes.length,
          t: v.nodes.map((n) => n.target),
        })),
      ),
  );
  expect(darkContrast, 'color-contrast within panel (dark)').toHaveLength(0);
});

test('verification verdict conveyed by text, not colour/icon alone — WCAG 1.4.1', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const info = await page.evaluate(
    ({ panelSel, verifiedSel, echtheitSel, fieldsSel }) => {
      const panel = document.querySelector(panelSel);
      if (!panel) return { found: false as const };
      // A decorative status icon counts as AT-hidden if the svg OR any ancestor
      // inside the panel carries aria-hidden="true" (lucide renders the icon
      // inside an aria-hidden <span>, so hiding is inherited — correct 1.4.1).
      const isEffectivelyHidden = (el: Element | null) => {
        let node: Element | null = el;
        while (node && node !== panel.parentElement) {
          if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') {
            return true;
          }
          node = node.parentElement;
        }
        return false;
      };
      // Status/verification icons live in the verified badge + Echtheit block.
      const statusIcons = Array.from(
        panel.querySelectorAll(`${verifiedSel} svg, ${echtheitSel} svg`),
      );
      const allStatusIconsHidden = statusIcons.every((s) =>
        isEffectivelyHidden(s),
      );
      const verifiedText = (
        panel.querySelector(verifiedSel)?.textContent ?? ''
      ).trim();
      const echtheitText = (
        panel.querySelector(echtheitSel)?.textContent ?? ''
      ).trim();
      const fieldRows = Array.from(
        panel.querySelectorAll(`${fieldsSel} .dd-field`),
      );
      const everyRowHasText = fieldRows.every(
        (r) => (r.textContent ?? '').trim().length > 2,
      );
      return {
        found: true as const,
        statusIconCount: statusIcons.length,
        allStatusIconsHidden,
        verifiedText,
        echtheitText,
        fieldRowCount: fieldRows.length,
        everyRowHasText,
      };
    },
    { panelSel: PANEL, verifiedSel: VERIFIED, echtheitSel: ECHTHEIT, fieldsSel: FIELDS },
  );
  console.log('[1.4.1 once-only] ' + JSON.stringify(info));

  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.statusIconCount, 'panel exposes status icons').toBeGreaterThan(0);
    expect(
      info.allStatusIconsHidden,
      'every verification status icon is aria-hidden',
    ).toBe(true);
    // The "verified" verdict must be carried by text, not the green icon alone.
    expect(
      (info.verifiedText + info.echtheitText).length,
      'verification verdict carries text',
    ).toBeGreaterThan(3);
    expect(info.fieldRowCount, 'credential field rows present').toBeGreaterThanOrEqual(3);
    expect(info.everyRowHasText, 'every disclosed field carries text').toBe(true);
  }
});

test('heading order: dialog title is h2, no skipped levels', async ({ page }) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  const { dialog } = await openCredentialPanel(page);

  const info = await page.evaluate((panelSel) => {
    const dlg =
      document.querySelector('[data-slot="dialog-content"]') ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector(panelSel);
    const panel = document.querySelector(panelSel);
    if (!dlg || !panel) return { found: false as const };
    const dialogLevels = Array.from(
      dlg.querySelectorAll('h1,h2,h3,h4,h5,h6'),
    ).map((h) => Number(h.tagName.slice(1)));
    const panelTitle = panel.querySelector('.dd-title');
    return {
      found: true as const,
      dialogLevels,
      panelTitleTag: panelTitle?.tagName ?? null,
    };
  }, PANEL);
  console.log('[HEADINGS once-only] ' + JSON.stringify(info));

  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.panelTitleTag, 'dialog title is h2').toBe('H2');
    for (let i = 1; i < info.dialogLevels.length; i++) {
      const delta =
        (info.dialogLevels[i] ?? 0) - (info.dialogLevels[i - 1] ?? 0);
      expect(delta, 'heading delta at index ' + i).toBeLessThanOrEqual(1);
    }
  }

  const dlgAxe = await new AxeBuilder({ page })
    .withTags(axeTags)
    .include('[role="dialog"], [data-slot="dialog-content"]')
    .analyze();
  const headingOrder = dlgAxe.violations.find((v) => v.id === 'heading-order');
  console.log(
    '[HEADING-ORDER axe once-only] ' +
      JSON.stringify(
        headingOrder ? headingOrder.nodes.map((n) => n.target) : 'none',
      ),
  );
  expect(headingOrder, 'no heading-order violation').toBeUndefined();
  expect(dialog).toBeTruthy();
});

test('Datenminimierung readout uses definition-list semantics', async ({
  page,
}) => {
  await setLocale(page, 'de');
  await page.goto('/dokumente', { waitUntil: 'domcontentloaded' });
  await waitForDokumente(page);
  await openCredentialPanel(page);

  const info = await page.evaluate(
    ({ panelSel, fieldsSel }) => {
      const panel = document.querySelector(panelSel);
      if (!panel) return { found: false as const };
      const fields = panel.querySelector(fieldsSel);
      const fieldRows = fields
        ? Array.from(fields.querySelectorAll(':scope > .dd-field'))
        : [];
      const everyRowHasDtDd = fieldRows.every(
        (r) => !!r.querySelector('dt') && !!r.querySelector('dd'),
      );
      return {
        found: true as const,
        fieldsIsDl: fields?.tagName === 'DL',
        fieldRowCount: fieldRows.length,
        everyRowHasDtDd,
      };
    },
    { panelSel: PANEL, fieldsSel: FIELDS },
  );
  console.log('[FIELDS-DL once-only] ' + JSON.stringify(info));

  expect(info.found).toBe(true);
  if (info.found) {
    expect(info.fieldsIsDl, 'disclosed fields in a <dl>').toBe(true);
    expect(info.fieldRowCount, 'at least three disclosed fields').toBeGreaterThanOrEqual(3);
    expect(info.everyRowHasDtDd, 'each field is a dt/dd pair').toBe(true);
  }
});
