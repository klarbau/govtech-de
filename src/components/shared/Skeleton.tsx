import * as React from 'react';
import { cn } from '@/lib/utils';

type SkeletonShape = 'block' | 'text' | 'circle' | 'pill';

const SHAPE_CLASS: Record<SkeletonShape, string> = {
  block: 'rounded-xl',
  text: 'h-4 rounded',
  circle: 'rounded-full',
  pill: 'rounded-full',
};

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
}

/**
 * `<Skeleton>` — dekorativer Lade-Platzhalter mit Shimmer (`.gt-skeleton`).
 * Immer `aria-hidden`; gehoert in eine `role="status" aria-busy="true"`-Region
 * mit sr-only-Label, damit Screenreader „Wird geladen" hoeren.
 */
export function Skeleton({ shape = 'block', className, ...rest }: SkeletonProps) {
  return (
    <div className={cn('gt-skeleton', SHAPE_CLASS[shape], className)} {...rest} aria-hidden />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex w-full flex-col gap-2.5', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} shape="text" className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}
