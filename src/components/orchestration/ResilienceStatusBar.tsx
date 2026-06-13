'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, RotateCw, ShieldX } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type {
  Behoerde,
  BehoerdeId,
  BreakerState,
  CircuitBreakerState,
  DeadLetterEntry,
} from '@/types';

interface ResilienceStatusBarProps {
  sagaId: string;
  variant: 'inline' | 'inspector';
  dlq: DeadLetterEntry[];
  breakers: CircuitBreakerState[];
  behoerdenById?: Record<BehoerdeId, Pick<Behoerde, 'name_de'>>;
}

const BREAKER_TONE: Record<BreakerState, string> = {
  closed:
    'border-success/40 bg-success-soft text-success',
  open: 'border-danger/40 bg-danger-soft text-danger',
  half_open: 'border-warning/40 bg-warning-soft text-warning',
};

const BREAKER_LABEL_KEY: Record<BreakerState, string> = {
  closed: 'breaker.closed',
  open: 'breaker.open',
  half_open: 'breaker.half_open',
};

/**
 * `<ResilienceStatusBar>` (Spec § 6.3) — the compact resilience strip:
 *  - per-authority circuit-breaker chips (geschlossen / offen / halb-offen),
 *  - the DLQ "Aktion erforderlich" list, each entry with its reason (i18n key)
 *    and a one-tap "Erneut senden" → `api.replayDeadLetter(dlqId)`.
 * DLQ + breaker data are subscribed by the parent (`useOrchestrationState`) and
 * passed down, so this stays presentational. Status changes announce polite.
 */
export function ResilienceStatusBar({
  sagaId,
  variant,
  dlq,
  breakers,
  behoerdenById = {},
}: ResilienceStatusBarProps) {
  const t = useTranslations('orchestration');
  const reduceMotion = useReducedMotion();
  const [replaying, setReplaying] = useState<Record<string, boolean>>({});

  const behoerdeName = useCallback(
    (id: string): string => behoerdenById[id]?.name_de ?? id,
    [behoerdenById],
  );

  const onReplay = useCallback((dlqId: string) => {
    setReplaying((s) => ({ ...s, [dlqId]: true }));
    void (async () => {
      try {
        await api.replayDeadLetter(dlqId);
      } finally {
        setReplaying((s) => {
          const next = { ...s };
          delete next[dlqId];
          return next;
        });
      }
    })();
  }, []);

  const hasBreakers = breakers.length > 0;
  const hasDlq = dlq.length > 0;

  if (!hasBreakers && !hasDlq) return null;

  return (
    <div
      data-testid="orchestration-resilience-bar"
      aria-live="polite"
      aria-label={t('aria.resilience_live')}
      className="flex flex-col gap-3"
    >
      {hasBreakers ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-text-secondary">
            {t('breaker.section_title')}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {breakers.map((b) => (
              <li key={b.behoerdeId} className="min-w-0 max-w-full">
                <span
                  data-testid="orchestration-breaker-chip"
                  data-breaker={b.behoerdeId}
                  data-state={b.state}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                    BREAKER_TONE[b.state],
                  )}
                >
                  <span className="min-w-0 max-w-[10rem] truncate">
                    {behoerdeName(b.behoerdeId)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{t(BREAKER_LABEL_KEY[b.state])}</span>
                  <span className="sr-only">
                    {t('breaker.chip_aria', {
                      behoerde: behoerdeName(b.behoerdeId),
                      state: t(BREAKER_LABEL_KEY[b.state]),
                    })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasDlq ? (
        <div
          data-testid="orchestration-dlq"
          className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
            <ShieldX className="size-4 shrink-0" aria-hidden="true" />
            {t('dlq.title')}
          </p>
          <ul className="flex flex-col gap-2">
            {dlq.map((entry) => {
              const busy = Boolean(replaying[entry.dlqId]);
              return (
                <li
                  key={entry.dlqId}
                  data-testid="orchestration-dlq-entry"
                  data-dlq-id={entry.dlqId}
                  data-status="dead_lettered"
                  className="flex flex-col gap-2 rounded-md bg-surface p-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-text-primary">
                      {behoerdeName(entry.behoerdeId)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {/* reason is an i18n key id resolved here, per § 2.4. */}
                      {t(
                        entry.reason.startsWith('orchestration.')
                          ? entry.reason.slice('orchestration.'.length)
                          : entry.reason,
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onReplay(entry.dlqId)}
                    disabled={busy}
                    aria-busy={busy}
                    data-testid="orchestration-dlq-replay"
                    data-dlq-id={entry.dlqId}
                    className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
                  >
                    {busy ? (
                      <>
                        <Loader2
                          className={cn(
                            'size-4',
                            !reduceMotion && 'animate-spin',
                          )}
                          aria-hidden="true"
                        />
                        {t('dlq.replaying')}
                      </>
                    ) : (
                      <>
                        <RotateCw className="size-4" aria-hidden="true" />
                        {t('dlq.replay_cta')}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* sagaId/variant retained for future per-saga scoping + condensed layout. */}
      <span hidden data-saga={sagaId} data-variant={variant} />
    </div>
  );
}
