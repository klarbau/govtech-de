import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface DataTableColumn {
  id: string;
  header: ReactNode;
  align?: 'start' | 'end';
  sortable?: boolean;
}

export interface DataTableRow {
  id: string;
  cells: Record<string, ReactNode>;
  href?: string;
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** Optional summary row (e.g. totals) with the same cell keys. */
  summaryRow?: Record<string, ReactNode>;
  /** Current sort state per column id, for `aria-sort`. */
  sort?: { columnId: string; direction: 'asc' | 'desc' };
  onSort?: (columnId: string) => void;
  caption?: ReactNode;
  className?: string;
}

export function DataTable({
  columns,
  rows,
  summaryRow,
  sort,
  onSort,
  caption,
  className,
}: DataTableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => {
              const isSorted = sort?.columnId === col.id;
              const ariaSort = col.sortable
                ? isSorted
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
                : undefined;
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'px-3 py-2.5 text-sm font-medium text-text-secondary',
                    col.align === 'end' ? 'text-end' : 'text-start',
                  )}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.id)}
                      className="inline-flex items-center gap-1 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {col.header}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border last:border-b-0 hover:bg-surface-muted"
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    'px-3 py-3 align-middle',
                    col.align === 'end'
                      ? 'text-end tabular-nums'
                      : 'text-start text-text-primary',
                  )}
                >
                  {row.cells[col.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {summaryRow ? (
          <tfoot>
            <tr className="border-t-2 border-border-strong font-semibold">
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    'px-3 py-3',
                    col.align === 'end'
                      ? 'text-end tabular-nums'
                      : 'text-start text-text-primary',
                  )}
                >
                  {summaryRow[col.id]}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
