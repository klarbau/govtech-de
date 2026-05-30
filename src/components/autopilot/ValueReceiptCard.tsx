'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ValueReceipt } from '@/types';

interface ValueReceiptCardProps {
  receipt: ValueReceipt;
  /**
   * `live` → the card just arrived as the result of an in-session run → it gets
   * an `aria-live` announcement + count-up. `static` (default) → seeded
   * cold-open / historic Vorgang detail → final values render immediately, no
   * live announce (§14).
   */
  variant?: 'live' | 'static';
  className?: string;
}

/**
 * `<ValueReceiptCard>` (§B1) — "Ihre Ersparnis" beim Autopilot-Abschluss.
 * Rahmt GESPARTEN Aufwand, nicht erledigten. Alle Zahlen `ca.`/konservativ,
 * stammen aus `getValueReceipt` (Quelle: domain note). Count-up respektiert
 * `prefers-reduced-motion` (§14).
 */
export function ValueReceiptCard({
  receipt,
  variant = 'static',
  className,
}: ValueReceiptCardProps) {
  const t = useTranslations('convenience.value_receipt');
  const animate = variant === 'live';

  return (
    <section
      className={cn('vr-card', className)}
      aria-label={t('title')}
      {...(variant === 'live' ? { 'aria-live': 'polite' as const } : {})}
    >
      <div className="vr-head">
        <span className="vr-icon" aria-hidden="true">
          <Sparkles />
        </span>
        <h2 className="vr-title">{t('title')}</h2>
      </div>

      <div className="vr-stats">
        <Stat
          value={receipt.behoerden_count}
          animate={animate}
          label={t('behoerden')}
        />
        <Stat
          value={receipt.geschaetzte_zeitersparnis_min}
          animate={animate}
          prefix={`${t('ca_prefix')} `}
          suffix={` ${t('minuten_suffix')}`}
          label={t('zeitersparnis')}
        />
        <Stat
          value={receipt.klassische_schritte}
          animate={animate}
          prefix={`${t('ca_prefix')} `}
          label={t('klassische_schritte')}
        />
        <div className="vr-stat">
          <div className="vr-num">{t('ein_satz')}</div>
          <div className="vr-label">{t('ihr_aufwand')}</div>
        </div>
      </div>

      <p className="vr-disclaimer">{t('disclaimer_conservative')}</p>
    </section>
  );
}

interface StatProps {
  value: number;
  animate: boolean;
  label: string;
  prefix?: string;
  suffix?: string;
}

function Stat({ value, animate, label, prefix = '', suffix = '' }: StatProps) {
  const display = useCountUp(value, animate);
  return (
    <div className="vr-stat">
      <div className="vr-num tabular-nums">
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="vr-label">{label}</div>
    </div>
  );
}

/**
 * Count-up von 0 → `target`. Bei `prefers-reduced-motion: reduce` ODER
 * `animate === false` wird `target` sofort gerendert (kein Tween, §14).
 */
function useCountUp(target: number, animate: boolean): number {
  const [value, setValue] = React.useState(animate ? 0 : target);

  React.useEffect(() => {
    if (!animate) {
      setValue(target);
      return;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    const durationMs = 900;
    const start = performance.now();
    let frame = 0;
    const tick = (nowTs: number) => {
      const progress = Math.min(1, (nowTs - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);

  return value;
}
