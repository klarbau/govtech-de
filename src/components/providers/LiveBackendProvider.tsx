'use client';

import * as React from 'react';

import { api } from '@/lib/mock-backend';
import type {
  MockBackendEvent,
  MockBackendEventListener,
} from '@/types/mock-event';
import type { Vorgang } from '@/types';

/**
 * Ambient-Liveness-Welle — der EINE Live-Backend-Hub der App.
 *
 * Öffnet GENAU EINE `api.subscribe`-Verbindung (im Browser eine `EventSource`
 * auf `/api/mock/events`) und fächert jedes Event an alle registrierten
 * `useMockEvents`-Listener auf. Jede Ambient-Komponente (Nav-Puls, Unread-Badge,
 * Posteingang-Liste, Dashboard) hängt sich über diesen Hub ein — es entsteht
 * KEINE zweite SSE-Verbindung pro Konsument. (`InlineCascade` behält bewusst
 * seine eigene Subscription; das ist die einzige zweite Verbindung, und nur auf
 * `/assistent`.)
 *
 * Zusätzlich pflegt der Hub die app-weiten, in der persistenten Navigation
 * sichtbaren Live-Signale — abgeleitet AUSSCHLIESSLICH aus echten Bus-Events:
 *  - `runningCount`  — Anzahl gerade laufender Vorgänge (Autopilot arbeitet).
 *  - `unreadCount`   — ungelesene Posteingang-Nachrichten.
 *  - `confirmNonce`  — zählt hoch bei jedem frisch bestätigten Autopilot-Schritt
 *                      (Trigger für den einmaligen „Tick" am Nav-Puls).
 *
 * Perf: Die Signale liegen in eigenem Context. Ändert sich ein Signal,
 * re-rendert nur der Hub selbst — `{children}` ist eine stabile Referenz aus dem
 * Layout, daher re-rendert der Seitenbaum NICHT mit; es re-rendern nur die
 * Komponenten, die `useLiveSignals()` konsumieren (Puls + Badge).
 */

interface LiveSignals {
  runningCount: number;
  unreadCount: number;
  confirmNonce: number;
}

const DEFAULT_SIGNALS: LiveSignals = {
  runningCount: 0,
  unreadCount: 0,
  confirmNonce: 0,
};

const LiveSignalsContext = React.createContext<LiveSignals>(DEFAULT_SIGNALS);

type RegisterFn = (listener: MockBackendEventListener) => () => void;
const MockEventsContext = React.createContext<RegisterFn | null>(null);

/** Schritt-Status, die einen Vorgang als „läuft gerade" markieren. */
const RUNNING_STEP_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'in_progress',
  'needs_eid',
  'pending_eid_confirmation',
  'self_assigned',
]);

/** Terminale Vorgangs-Status → Vorgang ist nicht mehr „am Arbeiten". */
const TERMINAL_VORGANG_STATUSES: ReadonlySet<string> = new Set([
  'abgeschlossen',
  'abgelehnt',
  'genehmigt',
]);

function isSeededRunning(v: Vorgang): boolean {
  return (
    v.status === 'in_pruefung' &&
    (v.schritte.length === 0 ||
      v.schritte.some((s) => s.status !== 'confirmed'))
  );
}

export function LiveBackendProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const listenersRef = React.useRef<Set<MockBackendEventListener>>(new Set());
  const runningRef = React.useRef<Set<string>>(new Set());
  const [signals, setSignals] = React.useState<LiveSignals>(DEFAULT_SIGNALS);

  // Seed once so die Signale einen Reload überleben (Puls + Badge erscheinen
  // sofort für bereits laufende Vorgänge / ungelesene Post).
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const vorgaenge = (await api.getVorgaenge()) as Vorgang[];
        if (cancelled) return;
        const running = runningRef.current;
        for (const v of vorgaenge) if (isSeededRunning(v)) running.add(v.id);
        setSignals((prev) => ({ ...prev, runningCount: running.size }));
      } catch {
        // nice-to-have — Live-Events pflegen den Zustand danach weiter.
      }
    })();
    void (async () => {
      try {
        const letters = await api.getLetters();
        if (cancelled) return;
        const unread = letters.filter((l) => l.status === 'ungelesen').length;
        setSignals((prev) => ({ ...prev, unreadCount: unread }));
      } catch {
        // nice-to-have.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Die EINE Subscription: erst Roh-Fan-out, dann abgeleitete Nav-Signale.
  React.useEffect(() => {
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      for (const listener of listenersRef.current) {
        try {
          listener(event);
        } catch {
          // Ein defekter Listener darf die anderen nicht abreißen.
        }
      }

      if (event.type === 'autopilot_step') {
        const running = runningRef.current;
        const sizeBefore = running.size;
        if (RUNNING_STEP_STATUSES.has(event.step.status)) {
          running.add(event.vorgangId);
        }
        const confirmed = event.step.status === 'confirmed';
        if (running.size !== sizeBefore || confirmed) {
          setSignals((prev) => ({
            ...prev,
            runningCount: running.size,
            confirmNonce: confirmed ? prev.confirmNonce + 1 : prev.confirmNonce,
          }));
        }
        return;
      }

      if (event.type === 'vorgang_status_changed') {
        if (TERMINAL_VORGANG_STATUSES.has(event.status)) {
          const running = runningRef.current;
          if (running.delete(event.vorgangId)) {
            setSignals((prev) => ({ ...prev, runningCount: running.size }));
          }
        }
        return;
      }

      if (event.type === 'letter_received') {
        if (event.letter.status === 'ungelesen') {
          setSignals((prev) => ({ ...prev, unreadCount: prev.unreadCount + 1 }));
        }
        return;
      }

      if (event.type === 'letter_status_changed') {
        // Gelesen/ungelesen kann in beide Richtungen kippen → exakt neu ableiten.
        void (async () => {
          try {
            const letters = await api.getLetters();
            const unread = letters.filter(
              (l) => l.status === 'ungelesen',
            ).length;
            setSignals((prev) => ({ ...prev, unreadCount: unread }));
          } catch {
            // letzten bekannten Stand behalten.
          }
        })();
      }
    });
    return unsubscribe;
  }, []);

  const register = React.useCallback<RegisterFn>((listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <MockEventsContext.Provider value={register}>
      <LiveSignalsContext.Provider value={signals}>
        {children}
      </LiveSignalsContext.Provider>
    </MockEventsContext.Provider>
  );
}

/** App-weite Live-Signale (Puls + Badge). Ausserhalb des Providers → Nullwerte. */
export function useLiveSignals(): LiveSignals {
  return React.useContext(LiveSignalsContext);
}

/**
 * Registriert `handler` am gebündelten Event-Stream. Öffnet KEINE eigene
 * `EventSource`, solange ein `LiveBackendProvider` darüber sitzt. Fällt der
 * Provider (z. B. im isolierten Unit-Test) weg, delegiert der Hook defensiv auf
 * eine direkte `api.subscribe`, damit der Konsument trotzdem korrekt bleibt.
 */
export function useMockEvents(handler: MockBackendEventListener): void {
  const register = React.useContext(MockEventsContext);
  const handlerRef = React.useRef(handler);
  React.useEffect(() => {
    handlerRef.current = handler;
  });
  React.useEffect(() => {
    const stable: MockBackendEventListener = (event) =>
      handlerRef.current(event);
    if (register) return register(stable);
    return api.subscribe(stable);
  }, [register]);
}

/**
 * Einmaliger, selbst-zurücksetzender Zustand für kurze, event-getriebene
 * Mikro-Feedbacks (Nav-Tick, Badge-Pop, Karten-Puls). `trigger()` setzt das Flag
 * für `durationMs` auf `true` und startet die CSS-Animation auch dann neu, wenn
 * sie noch läuft (doppeltes rAF erzwingt den Repaint). Reduced-Motion wird
 * global in `globals.css` neutralisiert — das Flag bleibt harmlos.
 */
export function useTransientFlag(
  durationMs: number,
): [boolean, () => void] {
  const [active, setActive] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActive(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActive(true);
        timerRef.current = setTimeout(() => setActive(false), durationMs);
      });
    });
  }, [durationMs]);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return [active, trigger];
}
