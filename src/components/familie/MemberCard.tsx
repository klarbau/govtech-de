import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MemberCardProps {
  name: string;
  /** Localized role label (Mutter / Partner:in / Kind …) — neutral, no colour. */
  rolle: string;
  geburtsdatum?: string;
  /** Extra meta line, e.g. „Hauptperson". */
  meta?: ReactNode;
  className?: string;
}

/**
 * One household-member card: monogram `Avatar` + name + a neutral role pill.
 * The role is rendered as a colour-free neutral badge (HL-DS-3/10) — role is
 * not a status, so it carries no semantic colour.
 */
export function MemberCard({
  name,
  rolle,
  geburtsdatum,
  meta,
  className,
}: MemberCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-surface p-4',
        className,
      )}
    >
      <Avatar name={name} size="lg" tone="primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-text-primary">
          {name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{rolle}</Badge>
          {meta ? (
            <span className="text-xs text-text-muted">{meta}</span>
          ) : null}
        </div>
        {geburtsdatum ? (
          <p className="mt-1 text-xs tabular-nums text-text-muted">
            {geburtsdatum}
          </p>
        ) : null}
      </div>
    </div>
  );
}
