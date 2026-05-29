'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { ReactNode } from 'react';

interface SidebarNavItemProps {
  href: string;
  label: string;
  /**
   * Icon is rendered in the parent server component and passed as a ReactNode.
   * (lucide-react icons are forwardRef components that cannot cross the
   * server→client boundary as function references.)
   */
  icon: ReactNode;
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/' || href === '#') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * One `<a class="gt-nav a">…</a>` row inside `.gt-nav`. Toggles the literal
 * `active` class from the prototype's CSS via `usePathname()`.
 */
export function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={active ? 'active' : ''}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
