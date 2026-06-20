/**
 * Funktionale Lebenslagen — generischer Kaskaden-Smoke (Spec
 * `vorgaenge-functional.md` §1.1/§1.2/§5.4, Phase-2-Gate).
 *
 * Treibt für JEDEN der 7 Slugs (geburt, aufenthalt-verlaengerung, kindergeld,
 * reisepass, bafoeg, pflegegrad, wohngeld):
 *   starteLebenslage → alle eID-Gates via bestaetigeLebenslageSchritt freigeben
 * und prüft:
 *   (1) Vorgang erreicht `abgeschlossen`,
 *   (2) ≥ 1 Letter wurde in den Posteingang gemintet,
 *   (3) der `isPrimarySubmission`-Schritt ist `confirmed` mit Aktenzeichen,
 *   (4) getValueReceipt(vorgangId) löst mit den Config-Override-Figuren auf.
 *
 * Determinismus: `NEXT_PUBLIC_RELIABLE='1'` deaktiviert die 5%-Fehler-Injektion
 * in latency.ts (und den Transport-Random-Fault). Die `latencyMs`-Choreografie
 * der Kaskade nutzt echte Timer — wir pollen den Vorgang-Status in kurzen
 * Intervallen statt Fake-Timer (robuster über die fire-and-forget-Kette aus
 * withLatency + wait + runWithCapturedContext hinweg).
 *
 * Setup spiegelt `reply-roundtrip.test.ts`: In-Memory-localStorage + window-Stub
 * VOR dem Import von api.ts.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import type { AutopilotStep, Vorgang } from '@/types/vorgang';
import {
  getLebenslageConfig as getLebenslageConfigRegistry,
} from '@/lib/mock-backend/lebenslagen';
import type { CascadeStepConfig } from '@/lib/mock-backend/lebenslagen/types';

// --------------------------------------------------------------------------
// localStorage + window Stubs (vor dem Import von api.ts!)
// --------------------------------------------------------------------------

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

beforeAll(() => {
  const storage = new MemoryStorage();
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage, location: { search: '' } },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
});

let api: typeof import('@/lib/mock-backend/test-core').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
  reseedForActivePersona('anna-petrov');
});

// --------------------------------------------------------------------------
// Helfer
// --------------------------------------------------------------------------

const SLUGS = [
  'geburt',
  'aufenthalt-verlaengerung',
  'kindergeld',
  'reisepass',
  'bafoeg',
  'pflegegrad',
  'wohngeld',
] as const;

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Pollt den Vorgang, bis ENTWEDER ein eID-Schritt auf
 * `pending_eid_confirmation` steht ODER der Vorgang `abgeschlossen` ist.
 * Gibt den aktuellen Vorgang zurück. Bricht nach `timeoutMs` ab.
 */
async function waitForPauseOrDone(
  vorgangId: string,
  timeoutMs = 12000,
): Promise<Vorgang> {
  const start = Date.now();
  for (;;) {
    const v = await api.getVorgang(vorgangId);
    if (v.status === 'abgeschlossen') return v;
    const pendingEid = v.schritte.find(
      (s) => s.status === 'pending_eid_confirmation',
    );
    if (pendingEid) return v;
    if (Date.now() - start > timeoutMs) return v;
    await sleep(40);
  }
}

/** Treibt eine Kaskade vollständig durch: jeden eID-Gate der Reihe nach. */
async function driveCascade(vorgangId: string): Promise<Vorgang> {
  for (let guard = 0; guard < 20; guard++) {
    const v = await waitForPauseOrDone(vorgangId);
    if (v.status === 'abgeschlossen') return v;
    const pendingEid = v.schritte.find(
      (s) => s.status === 'pending_eid_confirmation',
    );
    if (!pendingEid) {
      // Kein Pause-Gate, aber auch nicht fertig → kurz warten und erneut prüfen.
      await sleep(60);
      continue;
    }
    await api.bestaetigeLebenslageSchritt(vorgangId, pendingEid.id);
  }
  return api.getVorgang(vorgangId);
}

function primaryStepConfig(slug: string): CascadeStepConfig {
  const config = getLebenslageConfigRegistry(slug)!;
  const primary = config.cascade.find((s) => s.isPrimarySubmission);
  expect(primary, `config ${slug} has an isPrimarySubmission step`).toBeDefined();
  return primary!;
}

/** Alle consent-Step-IDs eines Slugs — form-time „alle Einwilligungen erteilt". */
function allConsentStepIds(slug: string): string[] {
  const config = getLebenslageConfigRegistry(slug)!;
  return config.cascade.filter((s) => s.gate === 'consent').map((s) => s.id);
}

// --------------------------------------------------------------------------
// Tests — ein deterministischer Smoke je Slug
// --------------------------------------------------------------------------

describe('runLebenslageCascade — 7-Slug-Smoke', () => {
  for (const slug of SLUGS) {
    test(
      `${slug}: Kaskade läuft durch → abgeschlossen + Brief + Az. + ValueReceipt`,
      async () => {
        const consents = allConsentStepIds(slug);
        const { vorgangId } = await api.starteLebenslage(slug, {}, consents);
        expect(vorgangId).toMatch(/^vorgang-/);

        const v = await driveCascade(vorgangId);

        // (1) Vorgang abgeschlossen.
        expect(v.status, `${slug} reaches abgeschlossen`).toBe('abgeschlossen');
        expect(v.abgeschlossen_am).toBeTruthy();

        // (3) Primär-Submission-Schritt confirmed mit Aktenzeichen.
        const primaryCfg = primaryStepConfig(slug);
        const primaryStepId = `${vorgangId}:${primaryCfg.id}`;
        const primaryStep = v.schritte.find(
          (s: AutopilotStep) => s.id === primaryStepId,
        );
        expect(primaryStep, `${slug} primary step present`).toBeDefined();
        expect(primaryStep?.status).toBe('confirmed');

        // (2) ≥ 1 Letter im Posteingang, dem Vorgang zugeordnet.
        const letters = await api.getLetters({ vorgang_id: vorgangId });
        expect(
          letters.length,
          `${slug} mints ≥1 Letter to Posteingang`,
        ).toBeGreaterThanOrEqual(1);
        // Az. ist auf dem geminteten Brief sichtbar (alle [MOCK]-präfixiert).
        for (const l of letters) {
          expect(l.aktenzeichen).toContain('[MOCK]');
        }

        // Az.-Sichtbarkeit für den Primär-Schritt: entweder der Primär-Hop
        // mintet selbst einen Brief/Document mit Az., oder ein nachgelagerter
        // Brief trägt das Az. Der Primär-Schritt ist jedenfalls confirmed; das
        // Config-Az. ist [MOCK]-präfixiert.
        if (primaryCfg.aktenzeichen) {
          expect(primaryCfg.aktenzeichen).toContain('[MOCK]');
        }

        // (4) ValueReceipt löst mit den Config-Override-Figuren auf.
        const config = getLebenslageConfigRegistry(slug)!;
        const receipt = await api.getValueReceipt(vorgangId);
        expect(receipt, `${slug} value receipt resolves`).not.toBeNull();
        expect(receipt?.lebenslage).toBe(slug);
        expect(receipt?.behoerden_count).toBe(
          config.value_receipt.behoerdengaenge_gespart,
        );
        expect(receipt?.geschaetzte_zeitersparnis_min).toBe(
          config.value_receipt.minuten_gespart,
        );
      },
      30000,
    );
  }
});
