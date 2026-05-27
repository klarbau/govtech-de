'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function pageList(current: number, totalPages: number): number[] {
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  return [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
}: PaginationProps) {
  const t = useTranslations('common.pagination');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageList(page, totalPages);

  return (
    <nav
      aria-label={t('label')}
      className={cn(
        'flex flex-col items-center justify-between gap-3 sm:flex-row',
        className,
      )}
    >
      <p
        className="text-sm text-text-muted tabular-nums"
        aria-live="polite"
      >
        {t('range', { from, to, total })}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('prev')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
        </Button>
        {pages.map((p, index) => {
          const prev = pages[index - 1];
          const gap = prev !== undefined && p - prev > 1;
          return (
            <span key={p} className="flex items-center">
              {gap ? (
                <span className="px-1 text-text-muted" aria-hidden="true">
                  …
                </span>
              ) : null}
              <Button
                type="button"
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                aria-label={t('page', { page: p })}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPageChange(p)}
                className="tabular-nums"
              >
                {p}
              </Button>
            </span>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('next')}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
        </Button>
      </div>

      {onPageSizeChange ? (
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value) onPageSizeChange(Number(value));
          }}
        >
          <SelectTrigger size="sm" aria-label={t('per_page', { count: pageSize })}>
            <SelectValue>
              {(value) => t('per_page', { count: Number(value) })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {t('per_page', { count: option })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </nav>
  );
}
