import { getTranslations } from 'next-intl/server';
import {
  Calendar,
  Euro,
  FileText,
  Folder,
  HelpCircle,
  Home,
  LogOut,
  Mail,
  MessageCircle,
  Shield,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { ParthenonCrest } from './ParthenonCrest';
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
  icon: LucideIcon;
}

// Ordered + iconed to match NAV_MAIN in `docs/design-prototype-v2/assets/govtech.js`.
export const navItems: NavItem[] = [
  { href: '/dashboard', i18nKey: 'dashboard', icon: Home },
  { href: '/posteingang', i18nKey: 'posteingang', icon: Mail },
  { href: '/stammdaten', i18nKey: 'stammdaten', icon: User },
  { href: '/vorgaenge', i18nKey: 'vorgaenge', icon: Folder },
  { href: '/dokumente', i18nKey: 'dokumente', icon: FileText },
  { href: '/termine', i18nKey: 'termine', icon: Calendar },
  { href: '/steuer', i18nKey: 'steuer', icon: Euro },
  { href: '/familie', i18nKey: 'familie', icon: Users },
  { href: '/assistent', i18nKey: 'assistent', icon: MessageCircle },
  { href: '/datenschutz', i18nKey: 'datenschutz', icon: Shield },
];

/**
 * Literal port of SIDEBAR_HTML in `docs/design-prototype-v2/assets/govtech.js`.
 * Renders the `<aside class="gt-sidebar">` with brand crest, primary `.gt-nav`,
 * a `.gt-nav-divider` and the bottom `.gt-nav` (Hilfe & Kontakt + Abmelden).
 *
 * Active state on a `.gt-nav a` is set per-route via `usePathname()` inside
 * the client child `SidebarNavItem`.
 */
export async function Sidebar() {
  const t = await getTranslations('nav');
  const tShell = await getTranslations('shell');

  return (
    <aside className="gt-sidebar" aria-label={tShell('sidebar.authority')}>
      <div className="gt-sidebar-brand">
        <div className="crest">
          <ParthenonCrest />
        </div>
        <div className="label">
          Bundesrepublik
          <br />
          Deutschland
        </div>
      </div>
      <nav className="gt-nav" aria-label={tShell('sidebar.nav_label')}>
        {navItems.map(({ href, i18nKey, icon: Icon }) => (
          <SidebarNavItem
            key={href}
            href={href}
            label={t(i18nKey)}
            icon={<Icon aria-hidden="true" />}
          />
        ))}
      </nav>
      <div className="gt-sidebar-bottom">
        <div className="gt-nav-divider" />
        <nav className="gt-nav">
          <SidebarNavItem
            href="#"
            label={tShell('sidebar.help')}
            icon={<HelpCircle aria-hidden="true" />}
          />
          <SidebarNavItem
            href="/"
            label={tShell('sidebar.logout')}
            icon={<LogOut aria-hidden="true" />}
          />
        </nav>
      </div>
    </aside>
  );
}
