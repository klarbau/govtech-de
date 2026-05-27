import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/shared/IconCircle';
import type { ReactNode } from 'react';

interface NavTileProps {
  /** Stable id for the heading association. */
  id: string;
  icon: ReactNode;
  title: string;
  /** One-line live value/Einzeiler. Numeric parts should be tabular-nums. */
  value: ReactNode;
  ctaLabel: string;
  href: string;
}

/**
 * Eine der sechs Navigations-Kacheln: führendes `IconCircle`, Titel (`<h3>`),
 * Wert-Einzeiler, Footer-CTA mit Chevron. Die ganze Kachel ist ein Link;
 * Hover hebt sie leicht an (`shadow-card`). Touch-Target ≥ 44px.
 */
export function NavTile({
  id,
  icon,
  title,
  value,
  ctaLabel,
  href,
}: NavTileProps) {
  return (
    <Link
      href={href}
      aria-labelledby={`tile-${id}-title`}
      className={cn(
        'group/tile block rounded-lg',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      )}
    >
      <Card
        size="sm"
        className="h-full gap-3 py-0 p-5 transition-shadow group-hover/tile:shadow-card"
      >
        <article className="flex h-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <IconCircle icon={icon} tone="primary" size="md" />
            <div className="min-w-0 flex-1">
              <h3
                id={`tile-${id}-title`}
                className="text-base font-semibold text-text-primary"
              >
                {title}
              </h3>
              <p className="mt-0.5 text-sm text-text-secondary">{value}</p>
            </div>
          </div>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
            {ctaLabel}
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </article>
      </Card>
    </Link>
  );
}
