'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface WizardProgressProps {
  /** 0 = Adresse, 1 = Vorschau, 2 = Autopilot läuft */
  currentStep: 0 | 1 | 2;
}

const STEP_KEYS = ['adresse', 'vorschau', 'autopilot'] as const;
type StepKey = (typeof STEP_KEYS)[number];

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const t = useTranslations('umzug.wizard');
  const total = STEP_KEYS.length;

  return (
    <nav
      aria-label={t('aria_label')}
      className="flex flex-col gap-3"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ds-color-text-tertiary,var(--color-muted-foreground))]">
        {t('step_label_template', { current: currentStep + 1, total })}
      </p>
      <ol className="flex w-full items-center gap-2 sm:gap-3" role="list">
        {STEP_KEYS.map((key, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isLast = idx === total - 1;
          return (
            <Step
              key={key}
              labelKey={key}
              isDone={isDone}
              isCurrent={isCurrent}
              isLast={isLast}
              index={idx}
            />
          );
        })}
      </ol>
    </nav>
  );
}

interface StepProps {
  labelKey: StepKey;
  isDone: boolean;
  isCurrent: boolean;
  isLast: boolean;
  index: number;
}

function Step({ labelKey, isDone, isCurrent, isLast, index }: StepProps) {
  const t = useTranslations('umzug.wizard');
  const status = isDone
    ? t('step_status_done')
    : isCurrent
      ? t('step_status_current')
      : t('step_status_upcoming');

  return (
    <li className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <div
        className={cn(
          'flex shrink-0 items-center gap-2',
          isCurrent ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground',
        )}
        aria-current={isCurrent ? 'step' : undefined}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
            isDone &&
              'border-[var(--ds-color-success,oklch(45%_0.12_152))] bg-[var(--ds-color-success,oklch(45%_0.12_152))] text-white',
            isCurrent &&
              'border-[var(--ds-color-accent)] bg-[var(--ds-color-accent)] text-[var(--ds-color-accent-foreground)]',
            !isDone &&
              !isCurrent &&
              'border-border bg-background text-muted-foreground',
          )}
        >
          {isDone ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
        </span>
        <span className="flex flex-col">
          <span
            className={cn(
              'text-sm font-medium',
              isCurrent ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {labelKey === 'adresse' ? <StepLabel keyName="adresse" /> : null}
            {labelKey === 'vorschau' ? <StepLabel keyName="vorschau" /> : null}
            {labelKey === 'autopilot' ? <StepLabel keyName="autopilot" /> : null}
          </span>
          <span className="sr-only">{status}</span>
        </span>
      </div>
      {!isLast ? (
        <span
          aria-hidden="true"
          className={cn(
            'mx-1 h-px flex-1',
            isDone
              ? 'bg-[var(--ds-color-success,oklch(45%_0.12_152))]'
              : 'bg-border',
          )}
        />
      ) : null}
    </li>
  );
}

function StepLabel({ keyName }: { keyName: StepKey }) {
  const t = useTranslations('umzug.wizard.steps');
  return <>{t(keyName)}</>;
}
