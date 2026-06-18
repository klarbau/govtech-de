import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Server-safe Brotkrümelnavigation. The last item is the current page
 * (aria-current="page"), never a link. Earlier items link via href.
 */
export async function Breadcrumb({ items, className }: BreadcrumbProps) {
  const t = await getTranslations('shell.breadcrumb');

  if (items.length === 0) return null;

  return (
    <nav aria-label={t('aria_label')} className={cn('breadcrumb', className)}>
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb-item">
              {isLast || !item.href ? (
                <span
                  className="breadcrumb-current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <span className="breadcrumb-sep" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
