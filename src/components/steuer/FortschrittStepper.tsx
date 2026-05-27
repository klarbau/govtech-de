import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface FortschrittStepperProps {
  /** Welcher Schritt aktiv ist (0–2). Schritte davor gelten als erledigt. */
  aktiverSchritt: 0 | 1 | 2;
}

type StepState = 'done' | 'active' | 'pending';

/**
 * 3-Schritt-Fortschritt (Spec § 4.1). Semantisch ein `<ol>`; der aktive Schritt
 * trägt `aria-current="step"`; der Zustand steht NICHT nur in der Farbe, sondern
 * in einem sr-only-Text (abgeschlossen / aktiv / offen). HL-DS-4: keine
 * langlaufenden Animationen.
 */
export function FortschrittStepper({ aktiverSchritt }: FortschrittStepperProps) {
  const t = useTranslations('steuer.fortschritt');

  const steps: { id: string; label: string }[] = [
    { id: 'geprueft', label: t('geprueft') },
    { id: 'ergaenzen', label: t('ergaenzen') },
    { id: 'abgabe', label: t('abgabe') },
  ];

  const stateOf = (index: number): StepState =>
    index < aktiverSchritt ? 'done' : index === aktiverSchritt ? 'active' : 'pending';

  const stateLabel: Record<StepState, string> = {
    done: t('status_done'),
    active: t('status_active'),
    pending: t('status_pending'),
  };

  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {steps.map((step, index) => {
        const state = stateOf(index);
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.id}
            aria-current={state === 'active' ? 'step' : undefined}
            className="flex flex-1 items-center gap-3 sm:flex-col sm:items-center sm:text-center"
          >
            <span className="flex items-center gap-3 sm:w-full sm:justify-center">
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                  state === 'done' && 'bg-success text-white',
                  state === 'active' && 'bg-primary text-primary-foreground',
                  state === 'pending' &&
                    'border border-border-strong bg-surface text-text-muted',
                )}
              >
                {state === 'done' ? <Check className="size-4" /> : index + 1}
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px flex-1 sm:hidden',
                    state === 'done' ? 'bg-success' : 'bg-border',
                  )}
                />
              ) : null}
            </span>
            <span className="flex flex-col">
              <span
                className={cn(
                  'text-sm font-medium',
                  state === 'pending' ? 'text-text-muted' : 'text-text-primary',
                )}
              >
                {step.label}
              </span>
              <span className="sr-only">
                {t('schritt_aria', { n: index + 1, label: step.label })} —{' '}
                {stateLabel[state]}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
