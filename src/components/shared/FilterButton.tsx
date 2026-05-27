'use client';

import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FilterButtonProps {
  onClick?: () => void;
  activeCount?: number;
  label?: string;
  className?: string;
  /** Forwarded to support popover triggers that clone the element. */
  'aria-expanded'?: boolean;
}

export function FilterButton({
  onClick,
  activeCount = 0,
  label,
  className,
  ...rest
}: FilterButtonProps) {
  const t = useTranslations('common');
  const resolvedLabel = label ?? t('filter');
  const hasActive = activeCount > 0;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={
        hasActive
          ? `${resolvedLabel} — ${t('filter_active', { count: activeCount })}`
          : resolvedLabel
      }
      className={cn('min-h-[44px] gap-2', className)}
      {...rest}
    >
      <SlidersHorizontal aria-hidden="true" />
      <span>{resolvedLabel}</span>
      {hasActive ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
}
