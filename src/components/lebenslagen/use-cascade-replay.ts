'use client';

import * as React from 'react';

import type { AutopilotStepStatus } from '@/types';
import {
  isEidWaiting,
  isSkippedStep,
  type CascadeRowData,
} from './lebenslagen-shared';

export interface CascadeReplay {
  /** Anzuzeigende Status (real abgeschlossen oder Replay-Projektion). */
  effectiveStatuses: AutopilotStepStatus[];
  /** Läuft gerade ein Replay (≙ `demoStatuses !== null`)? */
  inDemo: boolean;
  demoRunning: boolean;
  play: () => void;
  /** Lokaler Replay-Tap — bestätigt NIE das Backend (Vorgang ist abgeschlossen). */
  confirmEid: () => void;
}

/**
 * Live-Demo-Replay — REIN LOKALER Anzeige-Zustand. Berührt nie das Backend.
 * `demoStatuses === null` → zeige die realen (abgeschlossenen) Status. Während
 * ein Replay läuft, hält dies ein paralleles Status-Array, das Timeline,
 * Fortschritt, Rail-Karte, Checkliste und Aktivitätslog speist. Spiegelt den
 * autopilot_step-Eventstream des Mock-Backends (pending → in_progress →
 * confirmed; eID-gegatete Schritte pausieren bei needs_eid bis zum lokalen Tap).
 *
 * LOAD-BEARING (gegen veraltete Closures, nicht zufällig): der demoStatusesRef-
 * Spiegel-Effekt, die tickRef-Indirektion (Timer rufen tickRef.current()), das
 * Unmount-Cleanup und die realStatuses-Abhängigkeit von setStatusAt.
 */
export function useCascadeReplay(orderedRows: CascadeRowData[]): CascadeReplay {
  const realStatuses = React.useMemo(
    () => orderedRows.map((r) => r.step.status),
    [orderedRows],
  );
  const [demoStatuses, setDemoStatuses] = React.useState<AutopilotStepStatus[] | null>(
    null,
  );
  const [demoRunning, setDemoRunning] = React.useState(false);

  const cursorRef = React.useRef(0);
  const timersRef = React.useRef<number[]>([]);
  const demoStatusesRef = React.useRef<AutopilotStepStatus[] | null>(null);
  const tickRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    demoStatusesRef.current = demoStatuses;
  }, [demoStatuses]);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  const setStatusAt = React.useCallback(
    (i: number, s: AutopilotStepStatus) => {
      setDemoStatuses((prev) => {
        const base = prev ?? realStatuses;
        const next = base.slice();
        next[i] = s;
        return next;
      });
    },
    [realStatuses],
  );

  const runStep = React.useCallback(
    (i: number) => {
      setStatusAt(i, 'in_progress');
      timersRef.current.push(
        window.setTimeout(() => {
          setStatusAt(i, 'confirmed');
          cursorRef.current = i + 1;
          timersRef.current.push(
            window.setTimeout(() => tickRef.current(), 450),
          );
        }, 1200),
      );
    },
    [setStatusAt],
  );

  const tick = React.useCallback(() => {
    const i = cursorRef.current;
    if (i >= orderedRows.length) {
      setDemoRunning(false);
      setDemoStatuses(null); // restore the real completed state
      return;
    }
    // Steps that were genuinely skipped stay skipped — the replay never invents
    // a confirmation for them; the cursor walks past.
    if (isSkippedStep(orderedRows[i].step.status)) {
      cursorRef.current = i + 1;
      tickRef.current();
      return;
    }
    if (orderedRows[i].cfg?.gate === 'eid') {
      setStatusAt(i, 'needs_eid'); // wait for the local eID tap
      return;
    }
    runStep(i);
  }, [orderedRows, runStep, setStatusAt]);

  React.useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const play = React.useCallback(() => {
    if (demoRunning || orderedRows.length === 0) return;
    clearTimers();
    cursorRef.current = 0;
    setDemoStatuses(
      orderedRows.map((r) =>
        isSkippedStep(r.step.status) ? r.step.status : 'pending',
      ),
    );
    setDemoRunning(true);
    timersRef.current.push(window.setTimeout(() => tickRef.current(), 420));
  }, [demoRunning, clearTimers, orderedRows]);

  const confirmEid = React.useCallback(() => {
    const i = cursorRef.current;
    const cur = demoStatusesRef.current;
    if (!cur || i >= orderedRows.length || !isEidWaiting(cur[i])) return;
    runStep(i);
  }, [orderedRows, runStep]);

  const effectiveStatuses = demoStatuses ?? realStatuses;
  const inDemo = demoStatuses !== null;

  return { effectiveStatuses, inDemo, demoRunning, play, confirmEid };
}
