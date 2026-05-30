import { getTranslations } from 'next-intl/server';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
} from 'lucide-react';

import { UebermittlungsReceipt } from '@/components/autopilot/UebermittlungsReceipt';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type {
  AutopilotStep,
  AutopilotStepStatus,
  Behoerde,
  Letter,
} from '@/types';

interface BehoerdenStatusRowProps {
  step: AutopilotStep;
  behoerde?: Pick<Behoerde, 'name_de' | 'kategorie'>;
  letter?: Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>;
}

const statusViz: Record<AutopilotStepStatus, { Icon: typeof CheckCircle2; tone: string }> = {
  pending: { Icon: Clock, tone: 'text-muted-foreground' },
  in_progress: { Icon: Loader2, tone: 'text-sky-600' },
  needs_eid: { Icon: Fingerprint, tone: 'text-sky-600' },
  pending_eid_confirmation: { Icon: Fingerprint, tone: 'text-sky-600' },
  self_assigned: { Icon: Clock, tone: 'text-muted-foreground' },
  confirmed: { Icon: CheckCircle2, tone: 'text-emerald-600' },
  failed: { Icon: AlertCircle, tone: 'text-destructive' },
};

export async function BehoerdenStatusRow({
  step,
  behoerde,
  letter,
}: BehoerdenStatusRowProps) {
  const t = await getTranslations('umzug');
  const tStep = await getTranslations('convenience.step');
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

  // B3: delegated agent voice is the PRIMARY line; the dry aktion + § are the
  // quieter trust subline. Fall back to aktion if agent_label is absent.
  const primary = step.agent_label ?? step.aktion;
  const hasDatenkategorien =
    Array.isArray(step.datenkategorien) && step.datenkategorien.length > 0;

  return (
    <li className="grid grid-cols-[24px_1fr_auto] items-start gap-3 px-4 py-3">
      <span
        className={cn('mt-0.5 flex size-5 items-center justify-center', viz.tone)}
        aria-hidden="true"
      >
        <viz.Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <BehoerdenBadge
          name={behoerde?.name_de ?? step.behoerde_id}
          kategorie={behoerde?.kategorie}
        />
        <p className="ml-9 text-sm font-medium text-foreground">{primary}</p>
        <p className="ml-9 text-xs text-muted-foreground">
          {step.aktion}
          {step.rechtsgrundlage ? (
            <>
              {' · '}
              <span className="font-medium">{tStep('basis_label')}:</span>{' '}
              {step.rechtsgrundlage}
            </>
          ) : null}
        </p>
        {letter?.aktenzeichen ? (
          <p className="ml-9 font-mono text-[11px] text-muted-foreground">
            {t('detail.aktz_label')}: {letter.aktenzeichen}
          </p>
        ) : null}
        {letter?.betreff ? (
          <p className="ml-9 text-xs text-muted-foreground">
            {t('detail.brief_label')}: {letter.betreff}
          </p>
        ) : null}
        {hasDatenkategorien ? (
          <div className="ml-9">
            <UebermittlungsReceipt
              id={step.id}
              datenkategorien={step.datenkategorien ?? []}
              rechtsgrundlage={step.rechtsgrundlage}
              consentGivenAt={step.consent_given_at}
            />
          </div>
        ) : null}
      </div>
      <span className={cn('text-xs font-medium', viz.tone)}>
        <span className="sr-only">Status: </span>
        {t(`run.status.${statusKeyMap[step.status]}`)}
      </span>
    </li>
  );
}
