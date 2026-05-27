import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
  CalendarDays,
  FileText,
  FolderKanban,
  IdCard,
  Inbox,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';

import type { ComponentType, SVGProps } from 'react';

import { SidebarNavItem } from './SidebarNavItem';

export interface NavItem {
  href: string;
  i18nKey:
    | 'dashboard'
    | 'posteingang'
    | 'stammdaten'
    | 'vorgaenge'
    | 'dokumente'
    | 'termine'
    | 'steuer'
    | 'familie'
    | 'assistent'
    | 'datenschutz';
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', i18nKey: 'dashboard', icon: LayoutDashboard },
  { href: '/posteingang', i18nKey: 'posteingang', icon: Inbox },
  { href: '/stammdaten', i18nKey: 'stammdaten', icon: IdCard },
  { href: '/vorgaenge', i18nKey: 'vorgaenge', icon: FolderKanban },
  { href: '/dokumente', i18nKey: 'dokumente', icon: FileText },
  { href: '/termine', i18nKey: 'termine', icon: CalendarDays },
  { href: '/steuer', i18nKey: 'steuer', icon: Receipt },
  { href: '/familie', i18nKey: 'familie', icon: Users },
  { href: '/assistent', i18nKey: 'assistent', icon: MessageCircle },
  { href: '/datenschutz', i18nKey: 'datenschutz', icon: ShieldCheck },
];

export async function Sidebar() {
  const t = await getTranslations('nav');
  const tShell = await getTranslations('shell');

  return (
    <aside
      className="hidden w-60 shrink-0 flex-col border-e border-border bg-sidebar text-sidebar-foreground md:flex"
      aria-label={tShell('sidebar.authority')}
      data-print="hide"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Landmark className="size-5 text-text-secondary" aria-hidden="true" />
        <span className="text-sm font-semibold text-text-primary">
          {tShell('sidebar.authority')}
        </span>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label={tShell('sidebar.nav_label')}
      >
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, i18nKey, icon: Icon }) => (
            <li key={href}>
              <SidebarNavItem
                href={href}
                label={t(i18nKey)}
                icon={<Icon className="size-4" aria-hidden="true" />}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto border-t border-border px-3 py-3">
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="#"
              className="group flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:bg-surface-muted focus-visible:text-text-primary"
            >
              <LifeBuoy
                className="size-4 shrink-0 text-text-secondary group-hover:text-text-primary"
                aria-hidden="true"
              />
              <span>{tShell('sidebar.help')}</span>
            </Link>
          </li>
          <li>
            <Link
              href="/"
              className="group flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:bg-surface-muted focus-visible:text-text-primary"
            >
              <LogOut
                className="size-4 shrink-0 text-text-secondary group-hover:text-text-primary"
                aria-hidden="true"
              />
              <span>{tShell('sidebar.logout')}</span>
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
