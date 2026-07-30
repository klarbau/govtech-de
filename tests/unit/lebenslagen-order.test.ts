/**
 * Lebenslage-Akte — Reihenfolge-, eID-Carry- und Gesamtplan-Kontrakt
 * (Spec `lebenslage-akte.md` §12 T1–T11; Domain `lebenslage-akte-sequenz.md`
 * Q1–Q4).
 *
 * Die drei fachlichen Zusagen, die hier festgenagelt werden:
 *  1. Die Engine führt die Kaskade in STRIKTER Config-Reihenfolge aus — kein
 *     Block-Sort mehr. Jeder Schritt ist Tatbestandsvoraussetzung des nächsten
 *     (Beurkundung → Melderegister → Steuer-ID → Festsetzung).
 *  2. Ein Identifikationsakt deckt genau EINE Erklärung: die Formular-eID trägt
 *     den `isPrimarySubmission`-Schritt (positionsunabhängig), alle anderen
 *     Gates bleiben eigene Taps. Ohne Formular-eID pausiert alles wie bisher.
 *  3. `getVorgangPlan` bildet geplant / wartend / nicht beauftragt / vollzogen
 *     als vier verschiedene Zustände ab und zählt nur Vollzogenes als erledigt.
 *
 * Determinismus wie im 7-Slug-Smoke: `NEXT_PUBLIC_RELIABLE='1'` schaltet die
 * 5 %-Fehlerinjektion ab; die `latencyMs`-Choreografie läuft auf echten Timern,
 * deshalb wird der Vorgang gepollt statt Fake-Timer zu stellen.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import type { Persona, Vorgang, VorgangPlan } from '@/types';
import { getLebenslageConfig as getLebenslageConfigRegistry } from '@/lib/mock-backend/lebenslagen';
import { orderCascadeSteps } from '@/lib/mock-backend/lebenslagen/engine';
import { buildUmzugSaga } from '@/lib/mock-backend/orchestration';

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
let persona: Persona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  mod.reseedForActivePersona('anna-petrov');
  persona = await api.getProfile();
});

// --------------------------------------------------------------------------
// Helfer
// --------------------------------------------------------------------------

const ALL_SLUGS = [
  'geburt',
  'kindergeld',
  'aufenthalt-verlaengerung',
  'reisepass',
  'bafoeg',
  'pflegegrad',
  'wohngeld',
  'kinderzuschlag',
] as const;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const cfg = (slug: string) => getLebenslageConfigRegistry(slug)!;

/** Pollt bis zur ersten eID-Pause ODER bis der Vorgang abgeschlossen ist. */
async function waitForPauseOrDone(vorgangId: string, timeoutMs = 20000): Promise<Vorgang> {
  const start = Date.now();
  for (;;) {
    const v = await api.getVorgang(vorgangId);
    if (v.status === 'abgeschlossen') return v;
    if (v.schritte.some((s) => s.status === 'pending_eid_confirmation')) return v;
    if (Date.now() - start > timeoutMs) return v;
    await sleep(40);
  }
}

/** Der aktuell pausierende eID-Schritt (oder `undefined`). */
function pausedStep(v: Vorgang) {
  return v.schritte.find((s) => s.status === 'pending_eid_confirmation');
}

function stepOf(v: Vorgang, vorgangId: string, configId: string) {
  return v.schritte.find((s) => s.id === `${vorgangId}:${configId}`);
}

/** Gibt jedes offene eID-Gate der Reihe nach frei, bis der Vorgang steht. */
async function driveToDone(vorgangId: string): Promise<Vorgang> {
  for (let guard = 0; guard < 20; guard++) {
    const v = await waitForPauseOrDone(vorgangId);
    if (v.status === 'abgeschlossen') return v;
    const gate = pausedStep(v);
    if (!gate) {
      await sleep(60);
      continue;
    }
    await api.bestaetigeLebenslageSchritt(vorgangId, gate.id);
  }
  return api.getVorgang(vorgangId);
}

// --------------------------------------------------------------------------
// T1 — orderCascadeSteps sortiert nicht mehr um
// --------------------------------------------------------------------------

describe('T1 — orderCascadeSteps gibt die Config-Reihenfolge unverändert zurück', () => {
  for (const slug of ALL_SLUGS) {
    test(`${slug}: Reihenfolge == visibleIf-gefilterte Config-Reihenfolge`, () => {
      const config = cfg(slug);
      const expected = config.cascade
        .filter((s) => !s.visibleIf || s.visibleIf(persona))
        .map((s) => s.id);
      expect(orderCascadeSteps(config, persona).map((s) => s.id)).toEqual(expected);
    });
  }
});

// --------------------------------------------------------------------------
// T2 / T3 — geburt: Beurkundung VOR Melderegister VOR Steuer-ID
// (§ 57 Abs. 1 Nr. 3 PStV, § 139b Abs. 7 AO — nicht umstellbar)
// --------------------------------------------------------------------------

describe('T2/T3 — geburt läuft streng seriell ab Position 1', () => {
  let vorgangId: string;
  let paused: Vorgang;
  let afterRelease: Vorgang;

  beforeAll(async () => {
    const started = await api.starteLebenslage('geburt', {}, []);
    vorgangId = started.vorgangId;
    paused = await waitForPauseOrDone(vorgangId);
    const gate = pausedStep(paused)!;
    await api.bestaetigeLebenslageSchritt(vorgangId, gate.id);
    afterRelease = await waitForPauseOrDone(vorgangId);
  }, 40000);

  test('T2: pausiert an Position 1 (standesamt-beurkundung); Folgeschritte sind noch nicht materialisiert', () => {
    expect(pausedStep(paused)?.id).toBe(`${vorgangId}:standesamt-beurkundung`);
    expect(stepOf(paused, vorgangId, 'buergeramt-melderegister')).toBeUndefined();
    expect(stepOf(paused, vorgangId, 'bzst-steuerid-kind')).toBeUndefined();
  });

  test('T3: nach Freigabe gilt Beurkundung < Melderegister < Steuer-ID', () => {
    const beurkundung = stepOf(afterRelease, vorgangId, 'standesamt-beurkundung');
    const melderegister = stepOf(afterRelease, vorgangId, 'buergeramt-melderegister');
    const steuerId = stepOf(afterRelease, vorgangId, 'bzst-steuerid-kind');
    expect(beurkundung?.status).toBe('confirmed');
    expect(melderegister?.status).toBe('confirmed');
    expect(steuerId?.status).toBe('confirmed');
    expect(melderegister!.completed_at! > beurkundung!.completed_at!).toBe(true);
    expect(steuerId!.completed_at! > melderegister!.completed_at!).toBe(true);
  });
});

// --------------------------------------------------------------------------
// T4 / T6 — kindergeld: Festsetzung + Bescheid NACH dem IBAN-Gate
// (der Bescheid nennt „die von Ihnen bestätigte Bankverbindung")
// --------------------------------------------------------------------------

describe('T4/T6 — kindergeld: IBAN-Bestätigung trägt Festsetzung und Bescheid', () => {
  let vorgangId: string;
  let paused: Vorgang;
  let done: Vorgang;

  beforeAll(async () => {
    // Bewusst OHNE Options: antragslos gestartet gab es keine vorgelagerte eID.
    const started = await api.starteLebenslage('kindergeld', {}, []);
    vorgangId = started.vorgangId;
    paused = await waitForPauseOrDone(vorgangId);
    done = await driveToDone(vorgangId);
  }, 60000);

  test('T6: das IBAN-Gate pausiert weiterhin (antragslos-Ausnahme, Domain Q3)', () => {
    expect(pausedStep(paused)?.id).toBe(`${vorgangId}:familienkasse-iban-bestaetigung`);
  });

  test('T4: solange das Gate pausiert, sind Festsetzung + Bescheid nicht confirmed', () => {
    expect(stepOf(paused, vorgangId, 'familienkasse-festsetzung')?.status).not.toBe('confirmed');
    expect(stepOf(paused, vorgangId, 'familienkasse-bescheid')?.status).not.toBe('confirmed');
  });

  test('T4: nach Freigabe liegen Festsetzung + Bescheid hinter der eID-Bestätigung', () => {
    const gate = stepOf(done, vorgangId, 'familienkasse-iban-bestaetigung')!;
    const festsetzung = stepOf(done, vorgangId, 'familienkasse-festsetzung')!;
    const bescheid = stepOf(done, vorgangId, 'familienkasse-bescheid')!;
    expect(gate.eid_confirmed_at).toBeTruthy();
    expect(festsetzung.completed_at! > gate.eid_confirmed_at!).toBe(true);
    expect(bescheid.completed_at! > festsetzung.completed_at!).toBe(true);
  });
});

// --------------------------------------------------------------------------
// T5 — Formular-eID trägt die Primär-Submission (geburt, Position 1)
// --------------------------------------------------------------------------

describe('T5 — geburt mit Formular-eID: Schritt 1 ohne zweites Gate', () => {
  const eidAuthorizedAt = '2026-07-28T09:15:00.000Z';
  let vorgangId: string;
  let paused: Vorgang;
  let plan: VorgangPlan | null;

  beforeAll(async () => {
    const started = await api.starteLebenslage('geburt', {}, [], { eidAuthorizedAt });
    vorgangId = started.vorgangId;
    paused = await waitForPauseOrDone(vorgangId);
    plan = await api.getVorgangPlan(vorgangId);
  }, 40000);

  test('Schritt 1 ist confirmed OHNE bestaetigeLebenslageSchritt, mit dem Formular-Timestamp', () => {
    const primary = stepOf(paused, vorgangId, 'standesamt-beurkundung');
    expect(primary?.status).toBe('confirmed');
    expect(primary?.eid_confirmed_at).toBe(eidAuthorizedAt);
  });

  test('die Kaskade pausiert am NÄCHSTEN eID-Gate (familienkasse-kindergeld)', () => {
    expect(pausedStep(paused)?.id).toBe(`${vorgangId}:familienkasse-kindergeld`);
  });

  test('der Plan macht die Freigabe sichtbar (pre_authorized + eid_authorized_at)', () => {
    expect(plan?.eid_authorized_at).toBe(eidAuthorizedAt);
    const row = plan!.rows.find((r) => r.config_id === 'standesamt-beurkundung')!;
    expect(row.pre_authorized).toBe(true);
    expect(row.zustand).toBe('erledigt');
    // Nachgelagerte Gates bleiben eigene Taps (Domain Q3, keine Blankoerklärung).
    expect(plan!.rows.find((r) => r.config_id === 'familienkasse-kindergeld')!.pre_authorized).toBe(
      false,
    );
  });
});

// --------------------------------------------------------------------------
// T7 / T11 — reisepass: Vorautorisierung auf Position 2, gate 'termin' auf #3
// --------------------------------------------------------------------------

describe('T7/T11 — reisepass: Primärschritt auf Position 2, Vorsprache nur persönlich', () => {
  const eidAuthorizedAt = '2026-07-28T10:00:00.000Z';
  let vorgangId: string;
  let done: Vorgang;
  let plan: VorgangPlan | null;

  beforeAll(async () => {
    const started = await api.starteLebenslage('reisepass', {}, [], { eidAuthorizedAt });
    vorgangId = started.vorgangId;
    // Kein einziger Confirm-Aufruf: das einzige eID-Gate ist vorautorisiert,
    // der Termin-Schritt blockiert nicht.
    done = await waitForPauseOrDone(vorgangId);
    plan = await api.getVorgangPlan(vorgangId);
  }, 40000);

  test('T7: vorautorisiert wird der isPrimarySubmission-Schritt auf Position 2', () => {
    const cascade = cfg('reisepass').cascade;
    expect(cascade[1].id).toBe('buergeramt-termin-vormerken');
    expect(cascade[1].isPrimarySubmission).toBe(true);
    const primary = stepOf(done, vorgangId, 'buergeramt-termin-vormerken');
    expect(primary?.status).toBe('confirmed');
    expect(primary?.eid_confirmed_at).toBe(eidAuthorizedAt);
    // Position 1 ist ein auto-Schritt und trägt keinen eID-Stempel.
    expect(stepOf(done, vorgangId, 'buergeramt-antrag-vorbereiten')?.eid_confirmed_at).toBeUndefined();
  });

  test('T11: die Vor-Ort-Vorsprache ist self_assigned + requires_termin und mintet nichts', async () => {
    const vorsprache = stepOf(done, vorgangId, 'buergeramt-vorsprache');
    expect(vorsprache?.status).toBe('self_assigned');
    expect(vorsprache?.requires_termin).toBe(true);
    expect(vorsprache?.letter_id).toBeUndefined();
    const documents = await api.getDocuments();
    expect(documents.some((d) => d.id === `doc-${vorgangId}-buergeramt-vorsprache`)).toBe(false);
  });

  test('T11: der Termin-Schritt blockiert den Abschluss nicht', () => {
    expect(done.status).toBe('abgeschlossen');
    expect(plan!.rows.find((r) => r.config_id === 'buergeramt-vorsprache')!.zustand).toBe(
      'persoenlich',
    );
  });
});

// --------------------------------------------------------------------------
// T8 — getVorgangPlan: vier Zustände, ehrliche Zählung
// --------------------------------------------------------------------------

describe('T8 — getVorgangPlan bildet den Gesamtplan ehrlich ab', () => {
  let vorgangId: string;
  let planPaused: VorgangPlan;
  let planAfterRelease: VorgangPlan;

  beforeAll(async () => {
    // Einwilligung für die Familienversicherung bewusst NICHT erteilt.
    const started = await api.starteLebenslage('geburt', {}, []);
    vorgangId = started.vorgangId;
    await waitForPauseOrDone(vorgangId);
    planPaused = (await api.getVorgangPlan(vorgangId))!;
    const gate = pausedStep(await api.getVorgang(vorgangId))!;
    await api.bestaetigeLebenslageSchritt(vorgangId, gate.id);
    await waitForPauseOrDone(vorgangId);
    planAfterRelease = (await api.getVorgangPlan(vorgangId))!;
  }, 40000);

  test('alle Zeilen in Config-Reihenfolge, 1-basiert positioniert', () => {
    expect(planPaused.rows.map((r) => r.config_id)).toEqual(
      cfg('geburt').cascade.map((s) => s.id),
    );
    expect(planPaused.rows.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(planPaused.titel_de).toBe('Geburt eines Kindes');
    expect(planPaused.slug).toBe('geburt');
  });

  test('abgewählter consent-Schritt ist nicht_beauftragt und zählt nicht in gesamt', () => {
    const aok = planPaused.rows.find((r) => r.config_id === 'aok-familienversicherung')!;
    expect(aok.zustand).toBe('nicht_beauftragt');
    expect(planPaused.gesamt).toBe(5);
    expect(planPaused.rows.length).toBe(6);
  });

  test('wartendes Gate, geplante Folgeschritte, erledigt zählt nur confirmed', () => {
    expect(planPaused.rows[0].zustand).toBe('wartet_eid');
    expect(planPaused.rows[1].zustand).toBe('geplant');
    expect(planPaused.rows[2].zustand).toBe('geplant');
    expect(planPaused.erledigt).toBe(0);

    expect(planAfterRelease.erledigt).toBe(3);
    expect(planAfterRelease.gesamt).toBe(5);
    expect(planAfterRelease.rows[0].zustand).toBe('erledigt');
    expect(planAfterRelease.rows[0].completed_at).toBeTruthy();
    expect(planAfterRelease.rows[3].zustand).toBe('wartet_eid');
  });

  test('jede Zeile trägt Empfänger, Rechtsgrundlage und Datenkategorien (Datenminimierungs-Nachweis)', () => {
    for (const row of planPaused.rows) {
      expect(row.behoerde_id.length).toBeGreaterThan(0);
      expect(row.rechtsgrundlage.length).toBeGreaterThan(0);
      expect(row.datenkategorien.length).toBeGreaterThan(0);
      expect(row.step_id).toBe(`${vorgangId}:${row.config_id}`);
    }
  });
});

// --------------------------------------------------------------------------
// T9 — kein Plan für Nicht-Lebenslagen (Fallback auf das heutige Dossier)
// --------------------------------------------------------------------------

describe('T9 — getVorgangPlan liefert null ohne Lebenslagen-Kontext', () => {
  test('Seed-Vorgang, Umzug-Vorgang und unbekannte ID ergeben null', async () => {
    expect(await api.getVorgangPlan('vorgang-anna-anmeldung-2024')).toBeNull();
    expect(await api.getVorgangPlan('vg-anna-umzug-2026-completed')).toBeNull();
    expect(await api.getVorgangPlan('vorgang-gibt-es-nicht')).toBeNull();
  }, 20000);
});

// --------------------------------------------------------------------------
// T10 — Umzug-Regressionsschutz: der Sortier-Entfall ist ein No-op
// --------------------------------------------------------------------------

describe('T10 — Umzug: Insertion-Order ist bereits A… → D… → B…', () => {
  test('buildUmzugSaga erzeugt die Schritte blockweise in dieser Reihenfolge', () => {
    const { saga } = buildUmzugSaga(
      persona,
      {
        neue_adresse: {
          strasse: 'Müllerstraße',
          hausnummer: '12',
          plz: '13353',
          ort: 'Berlin',
          land: 'DE',
        },
        stichtag: '2026-08-01',
        betroffene_personen: [persona.id],
        consents: ['aok-nordost'],
      },
      'vorgang-umzug-order-check',
    );
    const rank: Record<string, number> = { A: 0, D: 1, B: 2 };
    const ranks = saga.steps.map((s) => rank[s.block]);
    expect(ranks.length).toBeGreaterThan(0);
    expect(ranks.every((r) => r !== undefined)).toBe(true);
    // Nicht-absteigend ⇒ alle A vor allen D vor allen B: die bisherige
    // BLOCK_RANK-Sortierung der UI war für den Umzug wirkungslos.
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});
