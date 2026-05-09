'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  AutopilotStep,
  AutopilotStepStatus,
  Behoerde,
  Letter,
} from '@/types';

interface AutopilotStepRowProps {
  step: AutopilotStep;
  behoerde?: Pick<Behoerde, 'name_de' | 'kategorie'>;
  letter?: Pick<Letter, 'aktenzeichen'>;
  onConfirmEid?: () => void;
  onRetry?: () => void;
  trailing?: ReactNode;
}

interface StatusViz {
  Icon: typeof CheckCircle2;
  tone: string;
  spin?: boolean;
}

const statusViz: Record<AutopilotStepStatus, StatusViz> = {
  pending: { Icon: Clock, tone: 'text-muted-foreground' },
  in_progress: { Icon: Loader2, tone: 'text-sky-600', spin: true },
  needs_eid: { Icon: Fingerprint, tone: 'text-sky-600' },
  pending_eid_confirmation: { Icon: Fingerprint, tone: 'text-sky-600' },
  self_assigned: { Icon: Clock, tone: 'text-muted-foreground' },
  confirmed: { Icon: CheckCircle2, tone: 'text-emerald-600' },
  failed: { Icon: AlertCircle, tone: 'text-destructive' },
};

export function AutopilotStepRow({
  step,
  behoerde,
  letter,
  onConfirmEid,
  onRetry,
  trailing,
}: AutopilotStepRowProps) {
  const t = useTranslations('umzug.run');
  const reducedMotion = useReducedMotion();
  const viz = statusViz[step.status];
  const statusKeyMap: Record<AutopilotStepStatus, string> = {
    pending: 'pending',
    in_progress: 'in_progress',
    needs_eid: 'needs_eid',
    pending_eid_confirmation: 'in_progress',
    self_assigned: 'pending',
    confirmed: 'confirmed',
    failed: 'failed',
  };
  const statusKey = statusKeyMap[step.status];

  const showEidCta =
    (step.status === 'needs_eid' || step.status === 'pending_eid_confirmation') &&
    onConfirmEid;

  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      className="grid grid-cols-[24px_1fr_auto] items-start gap-3 border-b border-border/60 py-3 last:border-b-0"
    >
      <span
        className={cn('mt-0.5 flex size-6 items-center justify-center', viz.tone)}
        aria-hidden="true"
      >
        <viz.Icon className={cn('size-4', viz.spin && 'animate-spin')} />
      </span>
      <div className="flex flex-col gap-1">
        <BehoerdenBadge
          name={behoerde?.name_de ?? step.behoerde_id}
          kategorie={behoerde?.kategorie}
        />
        <p className="ml-9 text-xs text-muted-foreground">{step.aktion}</p>
        {letter?.aktenzeichen ? (
          <p className="ml-9 font-mono text-[11px] text-muted-foreground">
            {t('aktenzeichen_label')}: {letter.aktenzeichen}
          </p>
        ) : null}
        {step.failure_reason ? (
          <p className="ml-9 text-xs text-destructive" role="alert">
            {step.failure_reason}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span
          className={cn('text-xs font-medium', viz.tone)}
          aria-live="polite"
        >
          <span className="sr-only">Status: </span>
          {t(`status.${statusKey}`)}
        </span>
        {showEidCta ? (
          <Button size="sm" variant="default" onClick={onConfirmEid}>
            <Fingerprint aria-hidden="true" />
            <span>{t('status.needs_eid')}</span>
          </Button>
        ) : null}
        {step.status === 'failed' && onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t('status.failed')}
          </Button>
        ) : null}
        {trailing}
      </div>
    </motion.li>
  );
}
