/**
 * Unit-level smoke test for the dashboard `prioritize_top_actions` AI path.
 *
 * Framework-free (matches `__smoke__.ts`). Covers the offline-safe surfaces:
 *   - the deterministic Frist-sort fallback (no API key needed),
 *   - the no-key graceful-fallback outcome,
 *   - the empty-input outcome.
 * The actual Anthropic round-trip is NOT exercised here (no key in CI); the
 * route's `prioritizeTopActionsAi` is designed so the no-key branch returns
 * the deterministic ranking instead of throwing.
 *
 * Run via:   npx tsx src/lib/ai/__smoke_dashboard__.ts
 */

import type { TopActionCandidateInput } from '@/types';
import {
  deterministicRank,
  prioritizeTopActionsAi,
} from './dashboard-prioritize';

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
console.log('## smoke: dashboard prioritize_top_actions');

const candidates: TopActionCandidateInput[] = [
  {
    id: 'cand-a',
    source_typ: 'letter',
    source_id: 'letter-a',
    titel: 'Steuerbescheid',
    behoerde_id: 'finanzamt-berlin',
    absender_kategorie: 'land',
    absender_name: 'Finanzamt Berlin',
    frist_datum: '2026-06-20',
    termin_steht: false,
    target_route: '/posteingang/letter-a',
  },
  {
    id: 'cand-b',
    source_typ: 'vorgang',
    source_id: 'vorgang-b',
    titel: 'Folgevorgang Stromzähler',
    behoerde_id: 'stadtwerke',
    absender_kategorie: 'kommune',
    absender_name: 'Stadtwerke',
    frist_datum: '2026-06-05',
    termin_steht: false,
    folgevorgang_von: 'Umzug',
    target_route: '/vorgaenge/vorgang-b',
  },
  {
    id: 'cand-c',
    source_typ: 'vorgang',
    source_id: 'vorgang-c',
    titel: 'ABH-Termin',
    behoerde_id: 'abh-berlin',
    absender_kategorie: 'land',
    absender_name: 'ABH Berlin',
    termin_steht: true,
    target_route: '/vorgaenge/vorgang-c',
  },
];

/* ── deterministic fallback ─────────────────────────────────────────────── */

const det = deterministicRank(candidates);
check('deterministicRank returns ≤ 3', det.length <= 3 && det.length === 3);
check(
  'deterministicRank sorts Frist ASC (cand-b earliest → rank 1)',
  det[0]?.id === 'cand-b' && det[0]?.rank === 1,
);
check(
  'deterministicRank: Frist candidate → frist_naehe token',
  det.find((r) => r.id === 'cand-a')?.reason_token === 'frist_naehe',
);
check(
  'deterministicRank: folgevorgang candidate → folgevorgang token',
  det.find((r) => r.id === 'cand-b')?.reason_token === 'folgevorgang',
);
check(
  'deterministicRank: termin_steht candidate → termin_steht token',
  det.find((r) => r.id === 'cand-c')?.reason_token === 'termin_steht',
);
check(
  'deterministicRank ranks are 1..3 contiguous',
  new Set(det.map((r) => r.rank)).size === det.length &&
    det.every((r) => r.rank >= 1 && r.rank <= det.length),
);

/* ── AI path: no-key + empty graceful outcomes ──────────────────────────── */

// Ensure no key is present for this assertion (CI default). If a developer
// runs with a key set, the outcome is 'ai' — which is also a pass for "does
// not throw + returns a ranking".
const hadKey = Boolean(process.env.ANTHROPIC_API_KEY);

void (async () => {
  const empty = await prioritizeTopActionsAi([]);
  check('empty candidates → outcome fallback:empty', empty.outcome === 'fallback:empty');
  check('empty candidates → empty ranking', empty.ranking.length === 0);

  const result = await prioritizeTopActionsAi(candidates);
  check('prioritizeTopActionsAi never throws + returns ranking', result.ranking.length > 0);
  if (!hadKey) {
    check(
      'no API key → outcome fallback:no_api_key',
      result.outcome === 'fallback:no_api_key',
      result.outcome,
    );
    check(
      'no API key → ranking equals deterministic',
      result.ranking[0]?.id === det[0]?.id,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log('  ..  API key present — skipping no-key assertions (outcome:', result.outcome, ')');
  }

  if (failures > 0) {
    console.error(`\n${failures} smoke check(s) failed.`);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log('\nAll smoke checks passed.');
  }
})();
