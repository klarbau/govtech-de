/**
 * Move-A-Followup (a) — Drift-Fang für die antragslose-Kaskade-Whitelist.
 *
 * `STARTE_LEBENSLAGE_SLUGS` (src/lib/ai/tools.ts) ist eine HAND-gepflegte
 * Whitelist der Lebenslage-Slugs, die der Assistent als antragslose
 * Auto-Kaskade (`starte_lebenslage`) feuern darf. Sie MUSS exakt der aus der
 * Config-Registry abgeleiteten Menge entsprechen, deren
 * `assistant_trigger === 'antragslos-cascade'` ist. Dieser Test fängt Drift
 * mechanisch: fügt jemand eine antragslose Lebenslage hinzu (oder klassifiziert
 * eine bestehende um), ohne die Whitelist mitzuziehen — oder umgekehrt —,
 * schlägt er fehl. Ersetzt die bisherige rein-menschliche Lockstep-Pflege
 * (Spec §11 F2 / code-review-Checkliste).
 */
import { describe, expect, test } from 'vitest';
import { STARTE_LEBENSLAGE_SLUGS } from '@/lib/ai/tools';
import { LEBENSLAGE_CONFIGS } from '@/lib/mock-backend/lebenslagen';

const derivedAntragslosSlugs = Object.values(LEBENSLAGE_CONFIGS)
  .filter((c) => c.assistant_trigger === 'antragslos-cascade')
  .map((c) => c.slug)
  .sort();

describe('starte_lebenslage-Whitelist ↔ antragslos-cascade-Configs (Drift-Fang)', () => {
  test('STARTE_LEBENSLAGE_SLUGS === abgeleitete antragslos-cascade-Menge', () => {
    expect([...STARTE_LEBENSLAGE_SLUGS].sort()).toEqual(derivedAntragslosSlugs);
  });

  test('mindestens „kindergeld" ist antragslos-cascade (Sanity, keine leere Gleichheit)', () => {
    expect(derivedAntragslosSlugs).toContain('kindergeld');
  });
});
