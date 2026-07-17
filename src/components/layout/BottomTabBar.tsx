'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { navItems, type NavItem } from './nav-items';
import { PosteingangUnreadBadge } from './PosteingangUnreadBadge';

// The five thumb-zone destinations, in fixed order. Resolved out of navItems
// (the single source of truth for href/icon/label) so labels + icons never
// drift from the sidebar/drawer.
const TAB_HREFS = [
  '/dashboard',
  '/posteingang',
  '/vorgaenge',
  '/termine',
  '/assistent',
] as const;

const tabItems: NavItem[] = TAB_HREFS.map((href) =>
  navItems.find((item) => item.href === href),
).filter((item): item is NavItem => Boolean(item));

if (process.env.NODE_ENV !== 'production' && tabItems.length !== TAB_HREFS.length) {
  const missing = TAB_HREFS.filter(
    (href) => !navItems.some((item) => item.href === href),
  );
  console.error(
    `[BottomTabBar] TAB_HREFS not found in navItems (silently dropped): ${missing.join(', ')}`,
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Fixed bottom navigation for phones (≤767px). Puts the five primary areas in
 * the thumb zone; hidden ≥768px where the SideNav/burger carry navigation.
 * Rendered inside `LiveBackendProvider` so the Posteingang unread badge can
 * read the live signal hub.
 */
export function BottomTabBar() {
  const t = useTranslations('nav');
  const tShell = useTranslations('shell');
  const pathname = usePathname();

  return (
    <nav className="mobile-tabbar" aria-label={tShell('bottomnav.nav_label')}>
      {tabItems.map(({ href, i18nKey, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="mobile-tabbar-item"
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : undefined}
          >
            <span className="mobile-tabbar-icon">
              <Icon aria-hidden="true" />
              {i18nKey === 'posteingang' ? <PosteingangUnreadBadge /> : null}
            </span>
            <span className="mobile-tabbar-label">{t(i18nKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
