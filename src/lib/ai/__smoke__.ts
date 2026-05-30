/**
 * Unit-level smoke test for the Posteingang AI tools.
 *
 * Deliberately framework-free: the project only ships Playwright today, and
 * pulling a unit-test runner into the demo for three smoke-asserts is more
 * weight than warranted (assistant-engineer charter: "manual smoke test").
 *
 * Run via:   npx tsx src/lib/ai/__smoke__.ts
 *
 * Exits non-zero on the first failed assertion. Keep this file dependency-free
 * (only imports from `./tools` and `./tool-schemas` — both pure server-safe
 * modules) so it can run in any node-able environment.
 */

import {
  ERKLAERE_BRIEF_LOCALES,
  TOOL_NAMES,
  isKnownTool,
  tools,
} from './tools';
import {
  TOOL_DISPATCH,
  requiresConfirmation,
  validatePosteingangToolInput,
  validateUmzugToolInput,
} from './tool-schemas';

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    // eslint-disable-next-line no-console
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
     
    console.error(`  FAIL ${label}`, detail ?? '');
  }
}

// eslint-disable-next-line no-console
console.log('## smoke: posteingang AI tools');

/* ── Registry presence ─────────────────────────────────────────────────── */

check('TOOL_NAMES contains erklaere_brief', isKnownTool('erklaere_brief'));
check('TOOL_NAMES contains extrahiere_frist', isKnownTool('extrahiere_frist'));
check(
  'TOOL_NAMES contains vorschlage_naechsten_schritt',
  isKnownTool('vorschlage_naechsten_schritt'),
);
check(
  'TOOL_NAMES has 11 entries (5 legacy + 3 posteingang + 1 preview_umzug + 2 convenience)',
  TOOL_NAMES.length === 11,
  TOOL_NAMES,
);
check('TOOL_NAMES contains preview_umzug', isKnownTool('preview_umzug'));
check('TOOL_NAMES contains hole_ersparnis', isKnownTool('hole_ersparnis'));
check(
  'TOOL_NAMES contains hole_autopilot_katalog',
  isKnownTool('hole_autopilot_katalog'),
);

const toolsByName = new Map(tools.map((t) => [t.name, t]));
check('tools[] has erklaere_brief def', toolsByName.has('erklaere_brief'));
check('tools[] has extrahiere_frist def', toolsByName.has('extrahiere_frist'));
check(
  'tools[] has vorschlage_naechsten_schritt def',
  toolsByName.has('vorschlage_naechsten_schritt'),
);

/* ── Input-schema descriptions carry the mandatory phrases ─────────────── */

const erklaere = toolsByName.get('erklaere_brief');
check(
  'erklaere_brief description references Smartlaw / BGH I ZR 113/20',
  Boolean(erklaere?.description?.includes('Smartlaw') || erklaere?.description?.includes('I ZR 113/20')),
);
check(
  'erklaere_brief description states Originaltext bleibt rechtsverbindlich',
  Boolean(erklaere?.description?.includes('rechtsverbindlich')),
);
check(
  'erklaere_brief input_schema.locale enum has 6 supported locales',
  ERKLAERE_BRIEF_LOCALES.length === 6,
);

const extrahiere = toolsByName.get('extrahiere_frist');
check(
  'extrahiere_frist description mentions Citation-Mismatch hand-off',
  Boolean(
    extrahiere?.description?.includes('Citation') ||
      extrahiere?.description?.includes('selbst prüfen'),
  ),
);

const vorschlag = toolsByName.get('vorschlage_naechsten_schritt');
check(
  'vorschlage_naechsten_schritt description references RDG / § 2',
  Boolean(
    vorschlag?.description?.includes('§ 2 RDG') ||
      vorschlag?.description?.includes('RDG'),
  ),
);
check(
  'vorschlage_naechsten_schritt description mentions Verbraucherzentrale',
  Boolean(vorschlag?.description?.includes('Verbraucherzentrale')),
);

/* ── Zod input validators accept representative payloads ───────────────── */

const okErklaereDe = validatePosteingangToolInput('erklaere_brief', {
  letterId: 'letter-schmidt-fa-steuerbescheid-2024',
});
check('erklaere_brief accepts {letterId}', okErklaereDe.ok);

const okErklaereLocale = validatePosteingangToolInput('erklaere_brief', {
  letterId: 'letter-mehmet-ihk-beitrag-2026',
  locale: 'tr',
});
check('erklaere_brief accepts {letterId, locale: "tr"}', okErklaereLocale.ok);

const okFrist = validatePosteingangToolInput('extrahiere_frist', {
  letterId: 'letter-anna-abh-erinnerung-verlaengerung',
});
check('extrahiere_frist accepts {letterId}', okFrist.ok);

const okVorschlag = validatePosteingangToolInput('vorschlage_naechsten_schritt', {
  letterId: 'letter-schmidt-standesamt-geburtsurkunde',
});
check('vorschlage_naechsten_schritt accepts {letterId}', okVorschlag.ok);

/* ── Zod validators reject malformed payloads ──────────────────────────── */

const missingLetterId = validatePosteingangToolInput('erklaere_brief', {});
check('erklaere_brief rejects missing letterId', !missingLetterId.ok);

const emptyLetterId = validatePosteingangToolInput('extrahiere_frist', {
  letterId: '',
});
check('extrahiere_frist rejects empty letterId', !emptyLetterId.ok);

const badLocale = validatePosteingangToolInput('erklaere_brief', {
  letterId: 'letter-x',
  locale: 'pl',
});
check('erklaere_brief rejects unsupported locale "pl"', !badLocale.ok);

const extraField = validatePosteingangToolInput('vorschlage_naechsten_schritt', {
  letterId: 'letter-x',
  draftAntwort: true, // Antwort-Generator must not slip through V1
});
check(
  'vorschlage_naechsten_schritt rejects unknown field draftAntwort (V1 OUT)',
  !extraField.ok,
);

/* ── lese_posteingang filter validator ─────────────────────────────────── */

const lese = toolsByName.get('lese_posteingang');
check('tools[] has lese_posteingang def', Boolean(lese));

const okLeseEmpty = validatePosteingangToolInput('lese_posteingang', {});
check('lese_posteingang accepts {} (list everything)', okLeseEmpty.ok);

const okLeseStatus = validatePosteingangToolInput('lese_posteingang', {
  filter: { status: 'ungelesen' },
});
check('lese_posteingang accepts {filter:{status:"ungelesen"}}', okLeseStatus.ok);

const okLeseFull = validatePosteingangToolInput('lese_posteingang', {
  filter: { absender: 'finanzamt', status: 'gelesen', vorgang_id: 'vg-x', max: 5 },
});
check('lese_posteingang accepts full filter', okLeseFull.ok);

const badLeseStatus = validatePosteingangToolInput('lese_posteingang', {
  filter: { status: 'archiviert' },
});
check('lese_posteingang rejects unknown status value', !badLeseStatus.ok);

const badLeseMax = validatePosteingangToolInput('lese_posteingang', {
  filter: { max: 0 },
});
check('lese_posteingang rejects max < 1', !badLeseMax.ok);

const badLeseExtra = validatePosteingangToolInput('lese_posteingang', {
  filter: { vorlesen: true },
});
check('lese_posteingang rejects unknown filter field (strict)', !badLeseExtra.ok);

/* ── preview_umzug tool registration ───────────────────────────────────── */

const previewUmzug = toolsByName.get('preview_umzug');
check('tools[] has preview_umzug def', Boolean(previewUmzug));
check(
  'preview_umzug description states read-only / ohne Bestätigung',
  Boolean(
    previewUmzug?.description?.includes('read-only') ||
      previewUmzug?.description?.includes('OHNE etwas auszulösen'),
  ),
);
check(
  'preview_umzug requires neue_adresse + stichtag_iso',
  Array.isArray(previewUmzug?.input_schema?.required) &&
    (previewUmzug!.input_schema.required as string[]).includes('neue_adresse') &&
    (previewUmzug!.input_schema.required as string[]).includes('stichtag_iso'),
);

/* ── Convenience Pass-1 tools (§7) ─────────────────────────────────────── */

const ersparnis = toolsByName.get('hole_ersparnis');
check('tools[] has hole_ersparnis def', Boolean(ersparnis));
check(
  'hole_ersparnis requires vorgang_id',
  Array.isArray(ersparnis?.input_schema?.required) &&
    (ersparnis!.input_schema.required as string[]).includes('vorgang_id'),
);
check(
  'hole_ersparnis description insists on ca./conservative, no invented numbers',
  Boolean(
    ersparnis?.description?.includes('ca.') &&
      (ersparnis?.description?.includes('erfinde') ||
        ersparnis?.description?.includes('konservativ')),
  ),
);

const katalog = toolsByName.get('hole_autopilot_katalog');
check('tools[] has hole_autopilot_katalog def', Boolean(katalog));
check(
  'hole_autopilot_katalog flags kindergeburt/steuer as demnächst (no over-promise)',
  Boolean(
    katalog?.description?.includes('demnächst') ||
      katalog?.description?.includes('demnaechst'),
  ),
);

const okErsparnis = validatePosteingangToolInput('hole_ersparnis', {
  vorgang_id: 'vg-anna-umzug-skalitzer-friedrichstr',
});
check('hole_ersparnis accepts {vorgang_id}', okErsparnis.ok);

const ersparnisMissing = validatePosteingangToolInput('hole_ersparnis', {});
check('hole_ersparnis rejects missing vorgang_id', !ersparnisMissing.ok);

/* ── Dispatch table + irreversible-action gate (§7.3) ──────────────────── */

check(
  'TOOL_DISPATCH has an entry per tool name',
  TOOL_NAMES.every((n) => n in TOOL_DISPATCH),
  Object.keys(TOOL_DISPATCH),
);
check(
  'starte_umzug → startUmzug, confirm-gated',
  TOOL_DISPATCH.starte_umzug.api_method === 'startUmzug' &&
    TOOL_DISPATCH.starte_umzug.requires_confirmation === true,
);
check(
  'preview_umzug → previewUmzug, NOT confirm-gated',
  TOOL_DISPATCH.preview_umzug.api_method === 'previewUmzug' &&
    TOOL_DISPATCH.preview_umzug.requires_confirmation === false,
);
check(
  'hole_ersparnis → getValueReceipt, NOT confirm-gated',
  TOOL_DISPATCH.hole_ersparnis.api_method === 'getValueReceipt' &&
    TOOL_DISPATCH.hole_ersparnis.requires_confirmation === false,
);
check(
  'hole_autopilot_katalog → getAutopilotKatalog, NOT confirm-gated',
  TOOL_DISPATCH.hole_autopilot_katalog.api_method === 'getAutopilotKatalog' &&
    TOOL_DISPATCH.hole_autopilot_katalog.requires_confirmation === false,
);
check(
  'requiresConfirmation true ONLY for starte_umzug',
  requiresConfirmation('starte_umzug') === true &&
    TOOL_NAMES.filter((n) => n !== 'starte_umzug').every(
      (n) => requiresConfirmation(n) === false,
    ),
);
check(
  'requiresConfirmation false for unknown tool name',
  requiresConfirmation('definitely_not_a_tool') === false,
);

/* ── Umzug input validators ────────────────────────────────────────────── */

const okPreview = validateUmzugToolInput('preview_umzug', {
  neue_adresse: { strasse: 'Müllerstr.', hausnummer: '142a', plz: '13353', ort: 'Berlin', land: 'DE' },
  stichtag_iso: '2026-06-01',
});
check('preview_umzug accepts valid address + stichtag', okPreview.ok);

const okStart = validateUmzugToolInput('starte_umzug', {
  neue_adresse: { strasse: 'Müllerstr.', hausnummer: '142a', plz: '13353', ort: 'Berlin', land: 'DE' },
  stichtag_iso: '2026-06-01',
  block_b_consent: ['aok-nordost', 'sparkasse-berlin'],
});
check('starte_umzug accepts valid input with consents', okStart.ok);

const okStartEmptyConsent = validateUmzugToolInput('starte_umzug', {
  neue_adresse: { strasse: 'Müllerstr.', hausnummer: '142a', plz: '13353', ort: 'Berlin', land: 'DE' },
  stichtag_iso: '2026-06-01',
  block_b_consent: [],
});
check('starte_umzug accepts empty block_b_consent (skips Block B)', okStartEmptyConsent.ok);

const badPlz = validateUmzugToolInput('preview_umzug', {
  neue_adresse: { strasse: 'Müllerstr.', hausnummer: '142a', plz: '1335', ort: 'Berlin', land: 'DE' },
  stichtag_iso: '2026-06-01',
});
check('preview_umzug rejects 4-digit PLZ', !badPlz.ok);

const badLand = validateUmzugToolInput('starte_umzug', {
  neue_adresse: { strasse: 'Rue X', hausnummer: '1', plz: '75001', ort: 'Paris', land: 'FR' },
  stichtag_iso: '2026-06-01',
  block_b_consent: [],
});
check('starte_umzug rejects non-DE land (Auslandsumzug out)', !badLand.ok);

const badStichtag = validateUmzugToolInput('preview_umzug', {
  neue_adresse: { strasse: 'Müllerstr.', hausnummer: '142a', plz: '13353', ort: 'Berlin', land: 'DE' },
  stichtag_iso: '01.06.2026',
});
check('preview_umzug rejects non-ISO stichtag', !badStichtag.ok);

const startMissingConsent = validateUmzugToolInput('starte_umzug', {
  neue_adresse: { strasse: 'Müllerstr.', hausnummer: '142a', plz: '13353', ort: 'Berlin', land: 'DE' },
  stichtag_iso: '2026-06-01',
});
check('starte_umzug rejects missing block_b_consent', !startMissingConsent.ok);

/* ── Result ─────────────────────────────────────────────────────────────── */

if (failures > 0) {
   
  console.error(`\n${failures} smoke check(s) failed.`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll smoke checks passed.');
}
