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
import { validatePosteingangToolInput } from './tool-schemas';

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
  'TOOL_NAMES has 8 entries (5 legacy + 3 new)',
  TOOL_NAMES.length === 8,
  TOOL_NAMES,
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

/* ── Result ─────────────────────────────────────────────────────────────── */

if (failures > 0) {
   
  console.error(`\n${failures} smoke check(s) failed.`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll smoke checks passed.');
}
