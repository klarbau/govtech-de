'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Compass } from 'lucide-react';

import { navItems } from './nav-items';
import { PosteingangUnreadBadge } from './PosteingangUnreadBadge';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Persistent left sidebar for ≥1024px viewports: the 10 authenticated app
 * routes are one click away at all times (replaces the top-bar „Lösungen ▾"
 * dropdown). Below 1024px it is hidden — the MobileNav burger + drawer carry
 * the routes. Reuses the `.gt-nav` link styling shared with the mobile drawer.
 */
export function SideNav() {
  const t = useTranslations('nav');
  const tShell = useTranslations('shell');
  const tNav = useTranslations('topnav');
  const pathname = usePathname();

  return (
    <div className="app-sidenav">
      <nav className="gt-nav" aria-label={tShell('sidebar.nav_label')}>
        {navItems.map(({ href, i18nKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{t(i18nKey)}</span>
              {i18nKey === 'posteingang' ? <PosteingangUnreadBadge /> : null}
            </Link>
          );
        })}
        <div className="gt-nav-divider" />
        <Link
          href="/lebenslagen"
          className={isActive(pathname, '/lebenslagen') ? 'active' : ''}
          aria-current={isActive(pathname, '/lebenslagen') ? 'page' : undefined}
        >
          <Compass aria-hidden="true" />
          <span>{tNav('lebenslagen')}</span>
        </Link>
      </nav>
    </div>
  );
}
