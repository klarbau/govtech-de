'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface SidebarNavItemProps {
  href: string;
  label: string;
  /**
   * Icon is rendered in the parent server component and passed as a ReactNode.
   * Server components cannot pass function references (lucide-react icons are
   * forwardRef components) into a client component. The parent renders the
   * Icon JSX so we receive it as a serialized element.
   */
  icon: ReactNode;
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      className={cn(
        'group relative flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent-soft font-medium text-primary'
          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:bg-surface-muted focus-visible:text-text-primary',
      )}
    >
      <span
        className={cn(
          'inline-flex shrink-0',
          active
            ? '[&_svg]:text-primary'
            : '[&_svg]:text-text-secondary group-hover:[&_svg]:text-text-primary',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
