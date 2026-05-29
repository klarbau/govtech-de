interface OnboardingStep {
  num: number;
  title: string;
  desc: string;
}

interface OnboardingStepListProps {
  steps: OnboardingStep[];
}

/**
 * Numbered „So einfach geht's"-steps with a vertical connector (Screen A).
 */
export function OnboardingStepList({ steps }: OnboardingStepListProps) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.num} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
              >
                {step.num}
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="mt-1 w-px flex-1 bg-border"
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 pb-1">
              <span className="text-sm font-semibold text-text-primary">
                {step.title}
              </span>
              <span className="text-sm text-text-secondary">{step.desc}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
