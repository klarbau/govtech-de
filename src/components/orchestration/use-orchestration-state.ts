'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/mock-backend';
import type {
  AuditLogEntry,
  CircuitBreakerState,
  DeadLetterEntry,
  MockBackendEvent,
  SagaInstance,
  SagaStatus,
} from '@/types';

interface OrchestrationState {
  saga: SagaInstance | null;
  status: SagaStatus | null;
  audit: AuditLogEntry[];
  dlq: DeadLetterEntry[];
  breakers: CircuitBreakerState[];
  /** Count of RECOVERY_REPLAYED audit entries for this saga (drives the DR banner). */
  recoveredCount: number;
}

const EMPTY: OrchestrationState = {
  saga: null,
  status: null,
  audit: [],
  dlq: [],
  breakers: [],
  recoveredCount: 0,
};

function countRecovery(audit: AuditLogEntry[]): number {
  return audit.filter((e) => e.type === 'RECOVERY_REPLAYED').length;
}

/**
 * Subscribes to the resilient-orchestration engine for one saga and keeps the
 * Laufzettel / DLQ / breaker / saga-status projections live. Mirrors the
 * real-time subscription pattern in `InlineCascade`/`run/page.tsx`: an initial
 * read seeds state, then the additive engine events (`audit_appended`,
 * `dlq_changed`, `breaker_changed`, `saga_status_changed`) patch it in place.
 *
 * The append-only audit is the source of truth for the recovery banner too:
 * `RECOVERY_REPLAYED` entries persist, so counting them survives the
 * auto-recovery-on-boot that already drained the saga before any panel mounted.
 */
export function useOrchestrationState(sagaId: string): OrchestrationState {
  const [state, setState] = useState<OrchestrationState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [saga, audit, dlq, breakers] = await Promise.all([
          api.getSaga(sagaId),
          api.getOrchestrationAuditLog(sagaId),
          api.getDlq(),
          api.getBreakers(),
        ]);
        if (cancelled) return;
        setState({
          saga,
          status: saga?.status ?? null,
          audit,
          dlq: dlq.filter((d) => d.sagaId === sagaId),
          breakers,
          recoveredCount: countRecovery(audit),
        });
      } catch {
        // engine reads are nice-to-have; live events still patch state below.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sagaId]);

  useEffect(() => {
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (event.type === 'audit_appended' && event.entry.sagaId === sagaId) {
        setState((prev) => {
          const audit = [...prev.audit, event.entry];
          return { ...prev, audit, recoveredCount: countRecovery(audit) };
        });
      }
      if (event.type === 'dlq_changed' && event.sagaId === sagaId) {
        setState((prev) => ({
          ...prev,
          dlq: event.dlq.filter((d) => d.sagaId === sagaId),
        }));
      }
      if (event.type === 'breaker_changed') {
        setState((prev) => {
          const idx = prev.breakers.findIndex(
            (b) => b.behoerdeId === event.behoerdeId,
          );
          const breakers =
            idx === -1
              ? [...prev.breakers, event.state]
              : prev.breakers.map((b, i) => (i === idx ? event.state : b));
          return { ...prev, breakers };
        });
      }
      if (event.type === 'saga_status_changed' && event.sagaId === sagaId) {
        setState((prev) => ({
          ...prev,
          status: event.status,
          saga: prev.saga ? { ...prev.saga, status: event.status } : prev.saga,
        }));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [sagaId]);

  return state;
}
