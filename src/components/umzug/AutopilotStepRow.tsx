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
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
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

type IconCircleTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface StatusViz {
  Icon: typeof CheckCircle2;
  tone: IconCircleTone;
  badge: StatusVariant;
  spin?: boolean;
}

const statusViz: Record<AutopilotStepStatus, StatusViz> = {
  pending: { Icon: Clock, tone: 'neutral', badge: 'in_bearbeitung' },
  in_progress: { Icon: Loader2, tone: 'primary', badge: 'laufend', spin: true },
  needs_eid: { Icon: Fingerprint, tone: 'primary', badge: 'warten' },
  pending_eid_confirmation: {
    Icon: Fingerprint,
    tone: 'primary',
    badge: 'warten',
  },
  self_assigned: { Icon: Clock, tone: 'neutral', badge: 'in_bearbeitung' },
  confirmed: { Icon: CheckCircle2, tone: 'success', badge: 'abgeschlossen' },
  failed: { Icon: AlertCircle, tone: 'danger', badge: 'abgelaufen' },
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
      className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-border py-3 last:border-b-0"
    >
      <IconCircle
        icon={
          <viz.Icon className={cn('size-4', viz.spin && 'animate-spin motion-reduce:animate-none')} />
        }
        tone={viz.tone}
        size="md"
        className="mt-0.5"
      />
      <div className="flex flex-col gap-1">
        <BehoerdenBadge
          name={behoerde?.name_de ?? step.behoerde_id}
          kategorie={behoerde?.kategorie}
        />
        <p className="ml-9 text-xs text-text-secondary">{step.aktion}</p>
        {letter?.aktenzeichen ? (
          <p className="ml-9 font-mono text-[11px] text-text-muted tabular-nums">
            {t('aktenzeichen_label')}: {letter.aktenzeichen}
          </p>
        ) : null}
        {step.failure_reason ? (
          <p className="ml-9 text-xs text-danger" role="alert">
            {step.failure_reason}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span aria-live="polite">
          <span className="sr-only">Status: </span>
          <StatusBadge variant={viz.badge}>{t(`status.${statusKey}`)}</StatusBadge>
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
