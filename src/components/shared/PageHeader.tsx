import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  contextChip?: { label: ReactNode; tone?: 'prototype' | 'speculative' };
  /** Right-aligned header actions, e.g. a „Haushalt verwalten" button. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  contextChip,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {(contextChip || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {contextChip ? (
            <Badge
              variant={contextChip.tone === 'speculative' ? 'info' : 'neutral'}
              size="md"
            >
              {contextChip.label}
            </Badge>
          ) : null}
          {actions}
        </div>
      )}
    </header>
  );
}
