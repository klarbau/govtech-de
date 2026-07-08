'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';

import { microBeatStages } from '@/components/autopilot/protokoll-haube';
import { cn } from '@/lib/utils';
import type { FitConnectReceipt } from '@/types/fit-connect';

interface ProtokollMicroBeatProps {
  receipt: FitConnectReceipt;
  className?: string;
}

const STAGE_BEAT_MS = 350;

/**
 * `<ProtokollMicroBeat>` (`unter-der-haube.md` § 5.A) — the staged micro-line
 * under a Block-D FIT-Connect row. A short, motion-safe timed reveal of facts
 * that are ALREADY settled in the receipt (same honesty as the reveal-pacer: we
 * only sequence the disclosure). Reduced-motion → all applicable stages static
 * immediately, dot static, no pulse.
 *
 * `aria-hidden` visual amplifier only: the authoritative announcement stays the
 * `FitConnectReceiptPanel`'s own polite region (no new aria-live region here).
 */
export function ProtokollMicroBeat({ receipt, className }: ProtokollMicroBeatProps) {
  const t = useTranslations('protokoll.haube');
  const reduceMotion = useReducedMotion();

  const stages = microBeatStages(receipt);
  const [revealed, setRevealed] = useState(() =>
    reduceMotion ? stages.length : 0,
  );

  const terminalKey = stages[stages.length - 1]?.key;
  const stageCount = stages.length;

  useEffect(() => {
    if (reduceMotion) {
      setRevealed(stageCount);
      return;
    }
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= stageCount; i += 1) {
      timers.push(setTimeout(() => setRevealed(i), i * STAGE_BEAT_MS));
    }
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [reduceMotion, stageCount, terminalKey]);

  if (stageCount === 0) return null;

  const revealing = !reduceMotion && revealed < stageCount;

  return (
    <p
      data-testid="protokoll-microbeat"
      aria-hidden="true"
      className={cn(
        'ml-9 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-xs text-text-secondary',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block size-1.5 shrink-0 rounded-full bg-primary',
          revealing && 'haube-dot-pulse',
        )}
      />
      {stages.slice(0, revealed).map((stage, index) => (
        <span
          key={stage.key}
          data-testid="protokoll-microbeat-stage"
          data-stage={stage.key}
          className={cn(
            'inline-flex items-center gap-x-1.5',
            !reduceMotion && 'motion-safe:animate-in motion-safe:fade-in',
          )}
        >
          {index > 0 ? (
            <span aria-hidden="true" className="text-text-muted">
              →
            </span>
          ) : null}
          {stage.key === 'beat_submitted' ? (
            <span>
              {t.rich('beat_submitted', {
                id: stage.sid,
                ltr: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
              })}
            </span>
          ) : (
            <span>{t(stage.key)}</span>
          )}
        </span>
      ))}
    </p>
  );
}
