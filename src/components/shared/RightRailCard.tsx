import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';

interface RightRailCardProps {
  title: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  footerLink?: { label: ReactNode; href: string };
  variant?: 'default' | 'soft';
  className?: string;
  as?: 'h2' | 'h3';
}

export function RightRailCard({
  title,
  children,
  icon,
  footerLink,
  variant = 'default',
  className,
  as: Heading = 'h3',
}: RightRailCardProps) {
  return (
    <Card
      className={cn(
        'gap-3 p-5 shadow-[var(--shadow-card)]',
        variant === 'soft' && 'bg-accent-soft border-transparent',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-flex shrink-0 text-text-secondary [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <Heading className="text-base font-semibold text-text-primary">
          {title}
        </Heading>
      </div>
      {children ? <div className="text-sm text-text-secondary">{children}</div> : null}
      {footerLink ? (
        <Link
          href={footerLink.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
        >
          {footerLink.label}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      ) : null}
    </Card>
  );
}
