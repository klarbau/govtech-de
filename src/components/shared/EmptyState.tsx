import { cn } from '@/lib/utils';
import { IconCircle } from '@/components/shared/IconCircle';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'speculative';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <IconCircle
          icon={icon}
          size="lg"
          tone={tone === 'speculative' ? 'primary' : 'neutral'}
        />
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-text-primary">{title}</p>
        {description ? (
          <p className="text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
