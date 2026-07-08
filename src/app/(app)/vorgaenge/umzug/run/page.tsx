'use client';

import * as React from 'react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { ProtokollInspector } from '@/components/autopilot/ProtokollInspector';
import { HerkunftBadge } from '@/components/autopilot/HerkunftBadge';
import { UnterDerHaubeLeiste } from '@/components/autopilot/UnterDerHaubeLeiste';
import { VorgangAbgeschlossen } from '@/components/lebenslagen/VorgangAbgeschlossen';
import { VorgangInBearbeitung } from '@/components/lebenslagen/VorgangInBearbeitung';
import {
  buildCascadeRows,
  filledPctOf,
  heroBadgeOf,
} from '@/components/lebenslagen/lebenslagen-shared';
import { useEidGate } from '@/components/lebenslagen/use-eid-gate';
import {
  LaufzettelPanel,
  OrchestrationTestBridge,
  RecoveryBanner,
} from '@/components/orchestration';
import { api } from '@/lib/mock-backend';
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';
import type {
  Adresse,
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  Document,
  Letter,
  MockBackendEvent,
  ValueReceipt,
  Vorgang,
} from '@/types';

/* Umzug-Autopilot-Run-Seite. Rendert dieselben geteilten Dossier-Komponenten
 * wie die sieben Lebenslagen (`VorgangInBearbeitung` / `VorgangAbgeschlossen`),
 * gespeist aus der live Autopilot-Tick-Subscription — DO NOT BREAK. */

/* Demo-Beispiel-Umzug (ohne ?vorgangId): realistisch-synthetische Berliner
 * Adresse mit echter PLZ. Nur Mock-Daten. */
const DEMO_ADRESSE: Adresse = {
  strasse: 'Bergmannstraße',
  hausnummer: '42',
  plz: '10961',
  ort: 'Berlin',
  land: 'DE',
};

/* Reveal-Pacer-Beats (ms). Der Mock-Backend-State ist längst real — wir
 * sequenzieren nur die Enthüllung, damit die Kaskade als Animation erlebbar
 * wird. Confirm-Beat bleibt ≤ 750 ms; bei Rückstau (> 4 Events in der Queue)
 * werden die generischen Beats halbiert, damit die Summe klein bleibt
 * (Playwright-Budgets). Der Fresh-Run-Snapshot-Replay setzt eigene, feste
 * Beats (kein Halbieren), damit der „current"-Dot sichtbar durchwandert. */
const CONFIRM_BEAT_MS = 750;
const STEP_BEAT_MS = 200;
const DONE_BEAT_MS = 1000;
const QUEUE_BACKPRESSURE = 4;
/* Fresh-Run-Replay: pro confirmed/failed-Step erst „in Arbeit" (Dot wandert),
 * dann der Finalstatus (Haken landet), mit ruhigem Gap dazwischen. */
const REVEAL_INPROGRESS_BEAT_MS = 350;
const REVEAL_FINAL_BEAT_MS = 400;
/* Nur Läufe, die gerade erst gestartet wurden (< 60 s), werden neu inszeniert. */
const FRESH_RUN_WINDOW_MS = 60_000;

const TERMINAL_STATUSES: ReadonlySet<AutopilotStepStatus> = new Set([
  'confirmed',
  'failed',
  'self_assigned',
]);

function isTerminal(status: AutopilotStepStatus | undefined): boolean {
  return status !== undefined && TERMINAL_STATUSES.has(status);
}

/* Ein Nicht-C-Step gilt als „fortgeschritten" (und damit inszenierbar), sobald
 * er über `pending` hinaus ist. `self_assigned` (Block C) bleibt außen vor. */
function isAdvancedStatus(status: AutopilotStepStatus): boolean {
  return (
    status === 'in_progress' ||
    status === 'confirmed' ||
    status === 'failed' ||
    status === 'needs_eid' ||
    status === 'pending_eid_confirmation'
  );
}

/* Queue-Eintrag: das Event + ein optionaler fester Beat. Live-Events tragen
 * keinen Beat (generisch/adaptiv gepaced); Fresh-Run-Replay-Einträge tragen
 * feste Beats. */
type QueueEntry = { event: MockBackendEvent; beat?: number };

function UmzugRunInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tRun = useTranslations('umzug.run');
  const td = useTranslations('lebenslagen.detail');
  const tHero = useTranslations('lebenslagen.detail.cascade.heroStatus');

  const vorgangId = searchParams?.get('vorgangId') ?? null;
  // e2e-Determinismus-Flag: im reliable-Modus KEIN Fresh-Run-Replay (die
  // Resilienz-/Spine-Direktnavigationen sollen den Snapshot 1:1 sehen).
  const reliableParam = searchParams?.get('reliable') ?? null;

  const [config, setConfig] = useState<LebenslageConfig | null>(null);
  const [vorgang, setVorgang] = useState<Vorgang | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [behoerdenById, setBehoerdenById] = useState<Record<BehoerdeId, Behoerde>>({});
  const [receipt, setReceipt] = useState<ValueReceipt | null>(null);
  const [related, setRelated] = useState<{
    letters: Letter[];
    documents: Document[];
  }>({ letters: [], documents: [] });

  const receiptFetchedRef = React.useRef(false);
  const relatedFetchedRef = React.useRef(false);

  /* Reveal-Pacer state — alle Live-Events laufen erst durch diese Queue, ein
   * Drainer wendet sie mit sichtbaren Beats der Reihe nach an (siehe Kommentar
   * am Drainer). Alles in Refs, damit Re-Renders die Sequenz nicht stören. */
  const queueRef = useRef<QueueEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drainingRef = useRef(false);
  const baseReadyRef = useRef(false);
  const appliedStatusRef = useRef<Map<string, AutopilotStepStatus>>(new Map());
  const reducedMotionRef = useRef<boolean | null>(null);

  const readReducedMotion = useCallback((): boolean => {
    if (reducedMotionRef.current === null) {
      reducedMotionRef.current =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return reducedMotionRef.current;
  }, []);

  const applyEvent = useCallback((event: MockBackendEvent) => {
    if (event.type === 'autopilot_step') {
      appliedStatusRef.current.set(event.step.id, event.step.status);
      const step = event.step;
      setVorgang((prev) => {
        if (!prev) return prev;
        const idx = prev.schritte.findIndex((s) => s.id === step.id);
        const nextSteps =
          idx === -1
            ? [...prev.schritte, step]
            : prev.schritte.map((s, i) => (i === idx ? step : s));
        return { ...prev, schritte: nextSteps };
      });
    } else if (event.type === 'vorgang_status_changed') {
      const status = event.status;
      setVorgang((prev) => (prev ? { ...prev, status } : prev));
    }
  }, []);

  /* Reveal-Drainer. Enthüllt den (längst realen) Kaskaden-Fortschritt als
   * erlebbare Sequenz:
   *  - Step-Event, das auf `confirmed`/`failed` kippt → ~750 ms Beat danach
   *    (der sichtbare „Station erledigt"-Moment).
   *  - Alle anderen Step-Events (pending→in_progress …) → kurzer ~200 ms Beat.
   *  - `vorgang_status_changed` → `abgeschlossen` → erst ~1000 ms warten, DANN
   *    anwenden, damit der letzte Haken landet, bevor die View auf das
   *    abgeschlossene Dossier umschaltet. FIFO garantiert, dass alle Step-Events
   *    davor schon gedrained sind (Emit-Reihenfolge des Engines).
   *  - Reduced-Motion / Rückstau: sofort bzw. halbierte Beats. */
  const drain = useCallback(() => {
    if (drainingRef.current || !baseReadyRef.current) return;
    const reduced = readReducedMotion();
    drainingRef.current = true;

    const step = () => {
      // No-op- und Regressions-Events überspringen (kein Beat): ein Event, das
      // denselben Status wie zuletzt trägt oder einen bereits terminalen Schritt
      // zurückdrehen würde (Snapshot lief voraus), enthüllt nichts.
      while (queueRef.current.length > 0) {
        const head = queueRef.current[0].event;
        if (head.type === 'autopilot_step') {
          const prev = appliedStatusRef.current.get(head.step.id);
          const incoming = head.step.status;
          if (prev === incoming || (isTerminal(prev) && !isTerminal(incoming))) {
            queueRef.current.shift();
            continue;
          }
        }
        break;
      }

      if (queueRef.current.length === 0) {
        drainingRef.current = false;
        return;
      }

      const entry = queueRef.current[0];
      const event = entry.event;

      if (
        !reduced &&
        event.type === 'vorgang_status_changed' &&
        event.status === 'abgeschlossen'
      ) {
        queueRef.current.shift();
        timerRef.current = setTimeout(() => {
          applyEvent(event);
          step();
        }, DONE_BEAT_MS);
        return;
      }

      queueRef.current.shift();
      applyEvent(event);

      if (reduced) {
        step();
        return;
      }

      // Fester Beat (Fresh-Run-Replay) hat Vorrang; sonst generisch/adaptiv.
      let beat: number;
      if (entry.beat !== undefined) {
        beat = entry.beat;
      } else {
        const backpressure = queueRef.current.length > QUEUE_BACKPRESSURE;
        beat = STEP_BEAT_MS;
        if (
          event.type === 'autopilot_step' &&
          (event.step.status === 'confirmed' || event.step.status === 'failed')
        ) {
          beat = CONFIRM_BEAT_MS;
        }
        if (backpressure) beat = Math.round(beat / 2);
      }
      timerRef.current = setTimeout(step, beat);
    };

    step();
  }, [applyEvent, readReducedMotion]);

  /* Config laden — der Umzug-Stub (leere Cascade, kein Ergebnis). Beide Dossier-
   * Komponenten gehen damit anstandslos um; nichts wird synthetisiert. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await api.getLebenslageConfig('umzug');
        if (!cancelled) setConfig(c);
      } catch {
        // Config ist Routing-Metadaten — ohne sie rendert die Seite nur nicht.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Initial fetch. With a vorgangId we load that live autopilot session.
   * Without one (the demo entry point) we load the seeded Umzug-Vorgang from
   * the backend so the cascade view is sourced from real mock data and never
   * empty — the same derivation path handles both cases. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (vorgangId) {
          const v = await api.getVorgang(vorgangId);
          if (cancelled) return;

          // Fresh-Run-Snapshot-Reveal: bei einem gerade gestarteten Lauf ist die
          // Saga oft schneller fertig als dieser Fetch — der Snapshot trägt
          // Block A bereits als `confirmed`, der Pacer bekäme nie Events und die
          // Kaskade spielte für den Kernmoment nicht. Deshalb inszenieren wir den
          // (bereits realen) Fortschritt neu: fortgeschrittene Nicht-C-Schritte
          // werden initial als `pending` präsentiert und dann über synthetische
          // Reveal-Events durch dieselbe Pacer-Queue enthüllt. Reiner
          // Präsentations-Layer — der Backend-State bleibt unberührt.
          const revealable = v.schritte.filter(
            (s) => s.block !== 'C' && isAdvancedStatus(s.status),
          );
          const angelegtMs = new Date(v.angelegt_am).getTime();
          const isFreshRun =
            !reliableParam &&
            !readReducedMotion() &&
            v.status !== 'abgeschlossen' &&
            Number.isFinite(angelegtMs) &&
            Date.now() - angelegtMs < FRESH_RUN_WINDOW_MS &&
            revealable.length > 0;

          if (isFreshRun) {
            const downgraded: Vorgang = {
              ...v,
              schritte: v.schritte.map((s) =>
                s.block !== 'C' && isAdvancedStatus(s.status)
                  ? { ...s, status: 'pending', started_at: undefined, completed_at: undefined }
                  : s,
              ),
            };
            // appliedStatus vom HERUNTERGESTUFTEN State seeden, damit später
            // eintreffende echte Events korrekt als Progression/No-op gelten.
            for (const s of downgraded.schritte) {
              appliedStatusRef.current.set(s.id, s.status);
            }
            // Etwaige vor dem Snapshot gequeuete echte Events sind in `v` bereits
            // enthalten (emit schreibt State vor der Benachrichtigung) → verwerfen
            // und rein aus dem Snapshot re-inszenieren.
            queueRef.current.length = 0;
            for (const s of v.schritte) {
              if (s.block === 'C' || !isAdvancedStatus(s.status)) continue;
              if (s.status === 'confirmed' || s.status === 'failed') {
                queueRef.current.push({
                  event: {
                    type: 'autopilot_step',
                    vorgangId,
                    step: { ...s, status: 'in_progress', completed_at: undefined },
                  },
                  beat: REVEAL_INPROGRESS_BEAT_MS,
                });
                queueRef.current.push({
                  event: { type: 'autopilot_step', vorgangId, step: s },
                  beat: REVEAL_FINAL_BEAT_MS,
                });
              } else {
                // eID-Wartestatus → Direkt-Reveal (ein Beat): die eID-Gate-Card
                // erscheint dramaturgisch NACH den Block-A-Haken.
                queueRef.current.push({
                  event: { type: 'autopilot_step', vorgangId, step: s },
                  beat: REVEAL_FINAL_BEAT_MS,
                });
              }
            }
            baseReadyRef.current = true;
            setVorgang(downgraded);
            drain();
          } else {
            // Snapshot ist autoritativ: seed die Status-Map, damit gequeuete
            // Vor-Snapshot-Events als No-op/Regression übersprungen werden.
            for (const s of v.schritte) appliedStatusRef.current.set(s.id, s.status);
            baseReadyRef.current = true;
            setVorgang(v);
            drain();
          }
        } else {
          const umzuege = await api.getVorgaenge({ typ: 'umzug' });
          if (!cancelled && umzuege.length > 0) setVorgang(umzuege[0]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : td('load_error'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId, reliableParam, drain, readReducedMotion]);

  /* Autopilot tick subscription — DO NOT BREAK. Events fließen NICHT direkt in
   * `setVorgang`, sondern in die Reveal-Queue; der Drainer enthüllt sie gepaced. */
  useEffect(() => {
    if (!vorgangId) return;
    // Stable-identity refs captured once so the teardown resets exactly the
    // queue + status map the drainer reads (no reassignment, no stale-ref lint).
    const queue = queueRef.current;
    const appliedStatus = appliedStatusRef.current;
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (
        (event.type === 'autopilot_step' ||
          event.type === 'vorgang_status_changed') &&
        event.vorgangId === vorgangId
      ) {
        queue.push({ event });
        drain();
      }
    });
    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      drainingRef.current = false;
      baseReadyRef.current = false;
      queue.length = 0;
      appliedStatus.clear();
    };
  }, [vorgangId, drain]);

  /* Behörden lookup. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, Behoerde> = {};
        for (const b of list) map[b.id] = b;
        setBehoerdenById(map);
      } catch {
        // names fall back to behoerde_id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* B1: bei Abschluss Value-Receipt + verknüpfte Artefakte je einmal laden. Die
   * id löst sich auf, egal ob wir mit einer live vorgangId kamen oder auf den
   * seeded Umzug zurückgefallen sind. */
  useEffect(() => {
    if (!vorgang || vorgang.status !== 'abgeschlossen') return;
    const id = vorgang.id;
    if (!receiptFetchedRef.current) {
      receiptFetchedRef.current = true;
      void (async () => {
        try {
          const r = await api.getValueReceipt(id);
          setReceipt(r);
        } catch {
          // receipt is nice-to-have
        }
      })();
    }
    if (!relatedFetchedRef.current) {
      relatedFetchedRef.current = true;
      void (async () => {
        try {
          const rel = await api.getVorgangRelated(id);
          setRelated({ letters: rel.letters, documents: rel.documents });
        } catch {
          // nice-to-have
        }
      })();
    }
  }, [vorgang]);

  /* Zeilen: alle Nicht-C-Schritte, sortiert A → D → B (keine Begrenzung —
   * volle Transparenz ist die Design-Absicht). */
  const rows = useMemo(
    () => (vorgang ? buildCascadeRows(vorgang, config, vorgangId, behoerdenById) : []),
    [vorgang, config, vorgangId, behoerdenById],
  );

  const filledPct = useMemo(() => filledPctOf(rows), [rows]);

  const heroBadge = useMemo(
    () =>
      heroBadgeOf(vorgang, rows, {
        confirmed: tHero('confirmed'),
        failed: tHero('failed'),
        in_progress: tHero('in_progress'),
      }),
    [vorgang, rows, tHero],
  );

  const { requestEid, eidDialog } = useEidGate({
    rows,
    vorgangId,
    confirmStep: api.bestaetigeAutopilotSchritt,
  });

  /* Demo-Start (kein ?vorgangId): explizit klick-gated. Löst einen echten
   * (Mock-)Umzug aus — Preview → Start mit dynamischen Block-B-Consents — und
   * navigiert auf dieselbe Route mit ?vorgangId; die bestehenden Effekte
   * übernehmen dann Fetch + gepacte Tick-Subscription. HARD-RULE: Write nur auf
   * Klick, nie beim Seitenaufruf. */
  const startDemo = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    const stichtag = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    try {
      const preview = await api.previewUmzug({
        neue_adresse: DEMO_ADRESSE,
        stichtag,
      });
      const { vorgangId: newId } = await api.startUmzug({
        neue_adresse: DEMO_ADRESSE,
        stichtag,
        betroffene_personen: [],
        consents: preview.block_b.map((s) => s.behoerde_id),
        source: 'ui',
      });
      router.replace(
        `/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(newId)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tRun('demo.error'));
      setIsStarting(false);
    }
  }, [router, tRun]);

  const isDone = vorgang?.status === 'abgeschlossen';

  return (
    // Kein eigenes <main className="app-content"> — das (app)-Layout stellt
    // bereits main#main-content.app-content; doppelt = doppeltes Padding +
    // doppelte main-Landmark.
    <div>
      {/* When done, the dossier renders its own <h1> — suppress the page head
          so the completed Umzug view keeps exactly one <h1>. On the demo entry
          (no ?vorgangId) always keep the page <h1> so the demo card's <h2>
          never precedes the seeded fallback dossier's <h1> (heading order). */}
      {!isDone || !vorgangId ? (
        <div className="gt-page-head">
          <h1>{tRun('headline')}</h1>
          <div className="sub">{tRun('headline_sub')}</div>
        </div>
      ) : null}

      {error ? (
        <div className="gt-banner amber" role="alert">
          {error}
        </div>
      ) : null}

      {!vorgangId ? (
        <section
          className="gt-card umzug-demo-card"
          aria-labelledby="umzug-demo-title"
          style={{ marginBottom: 20 }}
        >
          <div className="gt-card-head">
            <h2 id="umzug-demo-title" className="gt-card-title">
              {tRun('demo.title')}
            </h2>
            <span className="badge outline">{tRun('demo.mock_badge')}</span>
          </div>
          <p
            style={{
              margin: '0 0 12px',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
              fontSize: 14,
            }}
          >
            {tRun('demo.body')}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--ink-3)' }}>
            <span style={{ fontWeight: 600 }}>{tRun('demo.address_label')}:</span>{' '}
            {DEMO_ADRESSE.strasse} {DEMO_ADRESSE.hausnummer}, {DEMO_ADRESSE.plz}{' '}
            {DEMO_ADRESSE.ort}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={startDemo}
            disabled={isStarting}
          >
            {isStarting ? (
              <Loader2 className="vlf-spin" aria-hidden="true" />
            ) : null}
            {isStarting ? tRun('demo.starting') : tRun('demo.cta_start')}
          </button>
        </section>
      ) : null}

      {vorgangId ? (
        <>
          <OrchestrationTestBridge />
          <div style={{ marginBottom: 16 }}>
            <RecoveryBanner sagaId={vorgangId} />
          </div>
        </>
      ) : null}

      {isDone ? (
        config && vorgang ? (
          <VorgangAbgeschlossen
            config={config}
            vorgang={vorgang}
            rows={rows}
            receipt={receipt}
            related={related}
            title={tRun('headline')}
            subtitle={tRun('headline_sub')}
          />
        ) : null
      ) : config && vorgang ? (
        <VorgangInBearbeitung
          vorgang={vorgang}
          rows={rows}
          receipt={receipt}
          filledPct={filledPct}
          heroBadge={heroBadge}
          onConfirmEid={requestEid}
        />
      ) : null}

      {eidDialog}

      {vorgangId ? (
        <div style={{ marginTop: 20 }}>
          <LaufzettelPanel
            sagaId={vorgangId}
            variant="inspector"
            behoerdenById={behoerdenById}
          />
        </div>
      ) : null}

      {/* „Unter der Haube" (unter-der-haube.md § 4.2): the origin chip + the quiet
          Protokoll-Leiste. Sim-only here (no receipts passed); at live capability it
          points to the full inspector below via `inspectorPointer` instead of
          duplicating it. Additive — the frozen reveal-pacer stays untouched. */}
      {vorgangId ? (
        <div style={{ marginTop: 20 }} className="flex flex-col gap-2">
          <HerkunftBadge />
          <UnterDerHaubeLeiste vorgangId={vorgangId} inspectorPointer />
        </div>
      ) : null}

      {/* Protokoll-Modus (FIT-Connect) — capability-gated; renders nothing in
          Demo-Modus (flag off), so the dossier above stays byte-identical. */}
      {vorgangId ? (
        <div style={{ marginTop: 20 }}>
          <ProtokollInspector
            behoerdeName={behoerdenById['kfz-berlin-labo']?.name_de ?? ''}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function UmzugRunPage() {
  return (
    <Suspense fallback={null}>
      <UmzugRunInner />
    </Suspense>
  );
}
