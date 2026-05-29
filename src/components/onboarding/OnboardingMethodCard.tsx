'use client';

import { ChevronRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { IconCircle } from '@/components/shared/IconCircle';
import { cn } from '@/lib/utils';

interface OnboardingMethodCardProps {
  icon: ReactNode;
  title: string;
  helper: string;
  variant: 'prominent' | 'row';
  tone?: 'default' | 'accent';
  onClick: () => void;
  trailingChevron?: boolean;
}

/**
 * Clickable method-selection card (Screen A). A real `<button>` whose accessible
 * name is the title; the helper text is linked via `aria-describedby`.
 */
export function OnboardingMethodCard({
  icon,
  title,
  helper,
  variant,
  tone = 'default',
  onClick,
  trailingChevron = false,
}: OnboardingMethodCardProps) {
  const helperId = useId();
  const isRow = variant === 'row';
  const isAccent = tone === 'accent';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-describedby={helperId}
      className={cn(
        'group/method flex w-full items-center gap-3 rounded-lg border text-start transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        isAccent
          ? 'border-transparent bg-accent-soft hover:bg-accent-soft/80'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-muted',
        isRow ? 'min-h-[44px] p-4' : 'min-h-[44px] flex-col items-start gap-3 p-5 sm:items-stretch',
      )}
    >
      <IconCircle icon={icon} tone="primary" size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-text-primary">
          {title}
        </span>
        <span id={helperId} className="text-sm text-text-secondary">
          {helper}
        </span>
      </span>
      {trailingChevron ? (
        <ChevronRight
          className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
