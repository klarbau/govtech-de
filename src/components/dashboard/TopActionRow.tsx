import Link from 'next/link';
import { ChevronRight, FileText, FolderKanban, CalendarDays } from 'lucide-react';

import { cn } from '@/lib/utils';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FristCountdown } from '@/components/shared/FristCountdown';
import type {
  TopActionItem,
  TopActionReasonToken,
} from '@/types';
import type { ReactNode } from 'react';

interface PriorityDescriptor {
  variant: 'laufend' | 'manuell' | 'ablauf_bald';
  labelKey:
    | 'fristnaehe'
    | 'folgevorgang'
    | 'manuell'
    | 'termin';
}

const reasonToPriority: Record<TopActionReasonToken, PriorityDescriptor> = {
  frist_naehe: { variant: 'ablauf_bald', labelKey: 'fristnaehe' },
  folgevorgang: { variant: 'laufend', labelKey: 'folgevorgang' },
  manuell_priorisiert: { variant: 'manuell', labelKey: 'manuell' },
  termin_steht: { variant: 'laufend', labelKey: 'termin' },
};

function sourceIcon(source: TopActionItem['source_typ']): ReactNode {
  switch (source) {
    case 'letter':
      return <FileText />;
    case 'vorgang':
      return <FolderKanban />;
    case 'termin':
      return <CalendarDays />;
    default:
      return <FileText />;
  }
}

interface TopActionRowProps {
  item: TopActionItem;
  /** Display rank (1-based position in the current sort order). */
  position: number;
  /** Localized priority label resolved by the parent (`dashboard.priority.*`). */
  priorityLabel: string;
  /** ISO „now" for SSR-stable FristCountdown. */
  nowIso: string;
  className?: string;
}

/**
 * Eine „Heute zu tun"-Listenzeile: Rang-Zahl + Source-IconCircle + Titel +
 * Frist-Countdown darunter + Prioritäts-Badge + Chevron. Die ganze Zeile ist
 * ein Link auf `item.target_route`; der accessible Name umfasst Titel,
 * Frist und Priorität (über den sichtbaren Text).
 */
export function TopActionRow({
  item,
  position,
  priorityLabel,
  nowIso,
  className,
}: TopActionRowProps) {
  const descriptor = reasonToPriority[item.reason_token];
  // Akute Fristnähe (< 7 Tage) wird im Badge rot statt amber dargestellt.
  const days = item.frist_datum
    ? Math.ceil(
        (new Date(item.frist_datum).getTime() - new Date(nowIso).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : undefined;
  const urgency =
    item.reason_token === 'frist_naehe' &&
    typeof days === 'number' &&
    days < 7
      ? 'danger'
      : undefined;

  return (
    <Link
      href={item.target_route}
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-md px-2 py-3 transition-colors',
        'hover:bg-surface-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-text-muted"
      >
        {position}
      </span>
      <IconCircle icon={sourceIcon(item.source_typ)} tone="primary" size="md" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-text-primary">
          {item.titel}
        </span>
        {item.frist_datum ? (
          <FristCountdown deadlineIso={item.frist_datum} fromIso={nowIso} />
        ) : null}
      </span>
      <StatusBadge variant={descriptor.variant} urgency={urgency}>
        {priorityLabel}
      </StatusBadge>
      <ChevronRight
        className="size-4 shrink-0 text-text-muted"
        aria-hidden="true"
      />
    </Link>
  );
}

export { reasonToPriority };
