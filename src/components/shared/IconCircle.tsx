import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type IconCircleTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';
type IconCircleSize = 'sm' | 'md' | 'lg';

interface IconCircleProps {
  icon: ReactNode;
  tone?: IconCircleTone;
  size?: IconCircleSize;
  className?: string;
  /** Defaults to decorative; pass a label to expose it to assistive tech. */
  'aria-label'?: string;
}

const sizeClasses: Record<IconCircleSize, string> = {
  sm: 'size-7 [&_svg]:size-3.5',
  md: 'size-9 [&_svg]:size-4',
  lg: 'size-11 [&_svg]:size-5',
};

const toneClasses: Record<IconCircleTone, string> = {
  neutral: 'bg-surface-muted text-text-secondary',
  primary: 'bg-accent-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function IconCircle({
  icon,
  tone = 'primary',
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: IconCircleProps) {
  const labelled = Boolean(ariaLabel);
  return (
    <span
      role={labelled ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={labelled ? undefined : true}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    >
      {icon}
    </span>
  );
}
