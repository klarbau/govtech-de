import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Status pill — the central, screen-wide status indicator (appears on all 10
 * screens). Each variant = a soft background + matching text colour. A status
 * is NEVER conveyed by colour alone: the label text (and optional dot/icon)
 * carry the meaning, so it remains accessible to colour-blind users.
 * Non-interactive → no touch-target floor.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-muted text-text-secondary',
        info: 'bg-info-soft text-info',
        success: 'bg-success-soft text-success',
        'success-muted': 'bg-surface-muted text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
    },
  },
);

const dotColor: Record<NonNullable<VariantProps<typeof badgeVariants>['variant']>, string> = {
  neutral: 'bg-text-muted',
  info: 'bg-info',
  success: 'bg-success',
  'success-muted': 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  leadingDot?: boolean;
  leadingIcon?: React.ReactNode;
}

function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  leadingDot = false,
  leadingIcon,
  children,
  ...props
}: BadgeProps) {
  const resolvedVariant = variant ?? 'neutral';
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {leadingDot ? (
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-1.5 shrink-0 rounded-full',
            dotColor[resolvedVariant],
          )}
        />
      ) : null}
      {leadingIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-3">
          {leadingIcon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants }
