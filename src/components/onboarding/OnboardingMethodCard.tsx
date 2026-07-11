'use client';

import { ChevronRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';

interface OnboardingMethodCardProps {
  icon: ReactNode;
  title: string;
  helper: string;
  onClick: () => void;
}

/**
 * Sign-in method as an editorial row (Screen A): icon inline next to the
 * title, helper underneath, one chevron with a real hover slide. Hairlines
 * between rows are drawn by the parent list — no uniform card grid
 * (docs/research/ai-design-tells.md §1). A real `<button>` whose accessible
 * name is the title; the helper text is linked via `aria-describedby`.
 */
export function OnboardingMethodCard({
  icon,
  title,
  helper,
  onClick,
}: OnboardingMethodCardProps) {
  const helperId = useId();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-describedby={helperId}
      className="group/method flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-4 text-start transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="shrink-0 text-primary [&_svg]:size-[18px]"
          >
            {icon}
          </span>
          <span className="text-base font-semibold text-text-primary underline-offset-4 group-hover/method:underline">
            {title}
          </span>
        </span>
        <span id={helperId} className="ps-[26px] text-sm text-text-secondary">
          {helper}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-text-muted transition-transform group-hover/method:translate-x-1 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-hover/method:-translate-x-1"
        aria-hidden="true"
      />
    </button>
  );
}
