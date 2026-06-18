'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface TopNavLinkProps {
  href: string;
  label: string;
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/' || href === '#') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A plain (non-dropdown) center-nav link with active-route highlighting.
 * Used for „Lebenslagen", „Sicherheit & Datenschutz" and „Über uns".
 */
export function TopNavLink({ href, label }: TopNavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={cn('topnav-link', active && 'active')}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}
