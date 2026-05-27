import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface KeyValueRowProps {
  label: ReactNode;
  value: ReactNode;
  /** Small status badge slot (e.g. „Bestätigt"). */
  status?: ReactNode;
  /** Trailing action (edit / reveal). */
  action?: ReactNode;
  className?: string;
}

/**
 * Label-left / value-right data row. Renders its own `<dl>` so the `<dt>`/`<dd>`
 * pair is always valid markup, independent of the consuming screen.
 */
export function KeyValueRow({
  label,
  value,
  status,
  action,
  className,
}: KeyValueRowProps) {
  return (
    <dl
      className={cn(
        'flex items-start justify-between gap-4 py-2',
        className,
      )}
    >
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-end text-sm font-medium text-text-primary">
        <span className="min-w-0 break-words">{value}</span>
        {status}
        {action}
      </dd>
    </dl>
  );
}
