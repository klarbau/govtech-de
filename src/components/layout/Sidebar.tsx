import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  CalendarClock,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  Landmark,
  MessageSquareText,
  ReceiptText,
  Shield,
  UserRound,
  Users,
} from 'lucide-react';

import type { ComponentType, SVGProps } from 'react';

interface NavItem {
  href: string;
  i18nKey: 'dashboard' | 'posteingang' | 'stammdaten' | 'vorgaenge' | 'dokumente' | 'termine' | 'steuer' | 'familie' | 'assistent' | 'datenschutz';
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { href: '/dashboard', i18nKey: 'dashboard', icon: Home },
  { href: '/posteingang', i18nKey: 'posteingang', icon: Inbox },
  { href: '/stammdaten', i18nKey: 'stammdaten', icon: UserRound },
  { href: '/vorgaenge', i18nKey: 'vorgaenge', icon: FolderKanban },
  { href: '/dokumente', i18nKey: 'dokumente', icon: FileText },
  { href: '/termine', i18nKey: 'termine', icon: CalendarClock },
  { href: '/steuer', i18nKey: 'steuer', icon: ReceiptText },
  { href: '/familie', i18nKey: 'familie', icon: Users },
  { href: '/assistent', i18nKey: 'assistent', icon: MessageSquareText },
  { href: '/datenschutz', i18nKey: 'datenschutz', icon: Shield },
];

export async function Sidebar() {
  const t = await getTranslations('nav');
  const tApp = await getTranslations('app');

  return (
    <aside
      className="hidden w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground md:flex md:flex-col"
      aria-label={tApp('name')}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Landmark className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight">{tApp('name')}</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={tApp('name')}>
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, i18nKey, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-sidebar-accent-foreground" aria-hidden="true" />
                <span>{t(i18nKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
