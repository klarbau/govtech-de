'use client';

import * as React from 'react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ProtokollInspector } from '@/components/autopilot/ProtokollInspector';
import { HerkunftBadge } from '@/components/autopilot/HerkunftBadge';
import { UnterDerHaubeLeiste } from '@/components/autopilot/UnterDerHaubeLeiste';
import { VorgangAbgeschlossen } from '@/components/lebenslagen/VorgangAbgeschlossen';
import { VorgangInBearbeitung } from '@/components/lebenslagen/VorgangInBearbeitung';
import { FristDetailModal } from '@/components/shared/FristDetailModal';
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
import { api, MockBackendError } from '@/lib/mock-backend';
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';
import type {
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

/* Fresh-Run-Reveal-Marker (sessionStorage): die inszenierte Enthüllung ist die
 * Live-Ansicht des Start-Übergangs und läuft pro Vorgang GENAU EINMAL. Ein
 * Reload danach zeigt den autoritativen Snapshot 1:1. Das ist reiner
 * Präsentations-Zustand — KEINE Mock-Backend-Daten —, deshalb sessionStorage
 * statt der localStorage-Persistenzschicht. */
function revealMarkerKey(vorgangId: string): string {
  return `gt-umzug-reveal:${vorgangId}`;
}
function hasRevealPlayed(vorgangId: string): boolean {
  try {
    return sessionStorage.getItem(revealMarkerKey(vorgangId)) !== null;
  } catch {
    return false;
  }
}
function markRevealPlayed(vorgangId: string): void {
  try {
    sessionStorage.setItem(revealMarkerKey(vorgangId), '1');
  } catch {
    /* sessionStorage unavailable — the reveal may simply replay on reload */
  }
}

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

  /* Ohne ?vorgangId gibt es keinen Vorgang zu zeigen. Ein Umzug-Vorgang wird per
   * Nutzeraktion im Wizard angelegt — dorthin leiten wir zurück (kein stiller
   * Demo-Start mehr). */
  useEffect(() => {
    if (!vorgangId) router.replace('/vorgaenge/umzug/start');
  }, [vorgangId, router]);

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

  /* Initial fetch. With a vorgangId we load that live autopilot session. Without
   * one the redirect effect above sends the user to the wizard, so this effect
   * simply no-ops. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (vorgangId) {
          // Transiente Mock-Fehler (simulierte 5%-Rate) überbrücken — nur ein
          // echtes VORGANG_NOT_FOUND bricht sofort ab (Muster wie im
          // VorgangDetailLoader). Ohne Retry bliebe die Seite bannernd stehen.
          let v: Vorgang | undefined;
          for (let attempt = 0; attempt < 3 && !v; attempt++) {
            try {
              v = await api.getVorgang(vorgangId);
            } catch (e) {
              const fatal =
                e instanceof MockBackendError && e.code === 'VORGANG_NOT_FOUND';
              if (fatal || attempt === 2) throw e;
            }
          }
          if (cancelled || !v) return;

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
            revealable.length > 0 &&
            !hasRevealPlayed(vorgangId);

          if (isFreshRun) {
            // Der inszenierte Reveal läuft pro Vorgang genau einmal.
            markRevealPlayed(vorgangId);
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

  const isDone = vorgang?.status === 'abgeschlossen';

  // Ohne ?vorgangId leitet der Effekt oben in den Wizard um; bis dahin nichts
  // rendern.
  if (!vorgangId) return null;

  return (
    // Kein eigenes <main className="app-content"> — das (app)-Layout stellt
    // bereits main#main-content.app-content; doppelt = doppeltes Padding +
    // doppelte main-Landmark.
    <div>
      {/* When done, the dossier renders its own <h1> — suppress the page head
          so the completed Umzug view keeps exactly one <h1>. */}
      {!isDone ? (
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
          {/* Quiet §-17-BMG-Fristerklärer — die Bußgeld-Copy lebt AUSSCHLIESSLICH
              in <FristDetailModal> (Spec §8/§11). Bewusst hier im ruhigen
              Datenschutz-/Protokoll-Footer, NICHT in Hero/Übersicht/Preview,
              der Run-Hauptansicht oder dem Loom-Primärpfad. */}
          <FristDetailModal />
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
