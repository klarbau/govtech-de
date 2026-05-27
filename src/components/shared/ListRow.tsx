import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ListRowProps {
  /** Leading visual — typically an IconCircle or Avatar. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Extra meta columns (Aktenzeichen, Datum, Kategorie …). */
  meta?: ReactNode;
  /** Status badge slot. */
  status?: ReactNode;
  /** Trailing action icon-buttons (each must carry its own aria-label). */
  actions?: ReactNode;
  href?: string;
  selected?: boolean;
  /** Render a bottom hairline (table-style stacks). */
  divider?: boolean;
  className?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  status,
  actions,
  href,
  selected,
  divider,
  className,
}: ListRowProps) {
  const inner = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-text-primary">
          {title}
        </div>
        {subtitle ? (
          <div className="truncate text-sm text-text-secondary">{subtitle}</div>
        ) : null}
      </div>
      {meta ? (
        <div className="hidden shrink-0 items-center gap-4 text-sm text-text-secondary sm:flex">
          {meta}
        </div>
      ) : null}
      {status ? <div className="shrink-0">{status}</div> : null}
    </>
  );

  const rowClass = cn(
    'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-3 transition-colors',
    selected && 'bg-accent-soft',
    className,
  );

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        divider && 'border-b border-border',
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-current={selected ? 'true' : undefined}
          className={cn(
            rowClass,
            'flex-1 hover:bg-surface-muted focus-visible:bg-surface-muted',
          )}
        >
          {inner}
        </Link>
      ) : (
        <div className={cn(rowClass, 'flex-1')}>{inner}</div>
      )}
      {actions ? (
        <div className="flex shrink-0 items-center gap-1 pe-1">{actions}</div>
      ) : null}
    </div>
  );
}
