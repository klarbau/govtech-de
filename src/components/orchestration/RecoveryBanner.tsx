'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw, X } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type { MockBackendEvent } from '@/types';

interface RecoveryBannerProps {
  /**
   * Optional saga scope. When set, only RECOVERY_REPLAYED entries for this saga
   * count toward the banner; omit to reflect all recovered sagas.
   */
  sagaId?: string;
  className?: string;
}

interface RecoveryState {
  recovered: number;
  degraded: boolean;
}

/**
 * `<RecoveryBanner>` (Spec § 6.5) — the disaster-recovery wow.
 *
 * The engine ALREADY runs `recoverOnBoot()` exactly once per page load, guarded
 * by a boot sentinel in `ensureBooted` — BEFORE any panel mounts. The banner
 * must therefore NOT re-invoke `recoverOnBoot()` (doing so mid-cascade would
 * re-arm the outbox and append a spurious RECOVERY_REPLAYED on a normal run).
 * Instead it reads the durable, side-effect-free signal: the persisted
 * append-only `RECOVERY_REPLAYED` audit entries the boot recovery wrote. If any
 * exist, an honest, dismissible `role="status"` banner appears.
 *
 * Honesty (§ 10): best-effort replay of a single-process localStorage store —
 * NOT a multi-node DR guarantee. The `[MOCK]` marker travels in the copy. The
 * `degraded` suffix surfaces when the boot recovery flagged an unverifiable
 * chain (a DEGRADED_RECOVERY payload marker on the entry).
 */
export function RecoveryBanner({ sagaId, className }: RecoveryBannerProps) {
  const t = useTranslations('orchestration');
  const [state, setState] = useState<RecoveryState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Durable signal only: count persisted RECOVERY_REPLAYED audit entries
        // written by the engine's boot recovery. No recoverOnBoot() side-effect.
        const audit = await api.getOrchestrationAuditLog(sagaId);
        if (cancelled) return;
        const replayed = audit.filter((e) => e.type === 'RECOVERY_REPLAYED');
        const degraded = replayed.some(
          (e) => e.payload?.degraded === true,
        );
        if (replayed.length > 0) {
          setState({ recovered: replayed.length, degraded });
        }
      } catch {
        // recovery banner is additive; absence is a safe default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sagaId]);

  // Live: a RECOVERY_REPLAYED appended after mount (e.g. a delayed boot path)
  // surfaces the banner without a reload.
  useEffect(() => {
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (
        event.type === 'audit_appended' &&
        event.entry.type === 'RECOVERY_REPLAYED' &&
        (!sagaId || event.entry.sagaId === sagaId)
      ) {
        setState((prev) => ({
          recovered: (prev?.recovered ?? 0) + 1,
          degraded: prev?.degraded ?? false,
        }));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [sagaId]);

  if (!state || dismissed) return null;

  return (
    <div
      role="status"
      data-recovery-banner
      data-recovered={state.recovered}
      data-degraded={state.degraded ? 'true' : 'false'}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-primary/30 bg-accent-soft px-4 py-3',
        className,
      )}
    >
      <RotateCcw
        className="mt-0.5 size-5 shrink-0 text-primary"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm text-text-primary">
        <span className="font-medium">
          {t('recovery.banner', { count: state.recovered })}
        </span>
        {state.degraded ? (
          <span className="ml-1 text-warning">
            {t('recovery.degraded_suffix')}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('recovery.dismiss')}
        className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
