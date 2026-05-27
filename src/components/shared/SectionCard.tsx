import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';

type SectionCardVariant = 'default' | 'soft' | 'muted';
type SectionCardPadding = 'sm' | 'md' | 'lg';

interface SectionCardProps {
  title?: ReactNode;
  /** Right-aligned action in the title row, e.g. an „Bearbeiten" link. */
  titleAction?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  variant?: SectionCardVariant;
  padding?: SectionCardPadding;
  className?: string;
  /** Heading level for the title (default h2 for screen hierarchy). */
  as?: 'h2' | 'h3';
}

const paddingClasses: Record<SectionCardPadding, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const variantClasses: Record<SectionCardVariant, string> = {
  default: '',
  soft: 'bg-accent-soft border-transparent',
  muted: 'bg-surface-muted border-transparent',
};

export function SectionCard({
  title,
  titleAction,
  icon,
  children,
  variant = 'default',
  padding = 'md',
  className,
  as: Heading = 'h2',
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 py-0',
        paddingClasses[padding],
        variantClasses[variant],
        className,
      )}
    >
      {(title || titleAction) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="inline-flex shrink-0 text-text-secondary [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            {title ? (
              <Heading className="text-base font-semibold text-text-primary">
                {title}
              </Heading>
            ) : null}
          </div>
          {titleAction ? (
            <div className="shrink-0">{titleAction}</div>
          ) : null}
        </div>
      )}
      {children}
    </Card>
  );
}
