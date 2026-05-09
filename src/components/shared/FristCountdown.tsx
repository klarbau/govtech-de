import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock3 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface FristCountdownProps {
  /** ISO date string of the deadline. */
  deadlineIso: string;
  /** Date to compare against (defaults to "now" derived from `Date.now()`). Pass an ISO string for SSR-safe rendering. */
  fromIso?: string;
  className?: string;
}

export function FristCountdown({
  deadlineIso,
  fromIso,
  className,
}: FristCountdownProps) {
  const deadline = parseISO(deadlineIso);
  const from = fromIso ? parseISO(fromIso) : new Date();
  const days = differenceInCalendarDays(deadline, from);
  const formatted = format(deadline, 'd. MMMM yyyy', { locale: de });

  const tone =
    days < 0
      ? 'text-destructive'
      : days <= 3
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs', tone, className)}
    >
      <Clock3 className="size-3" aria-hidden="true" />
      <time dateTime={deadlineIso}>{formatted}</time>
    </span>
  );
}
