import { getTranslations } from 'next-intl/server';
import { HelpCircle, LogOut } from 'lucide-react';

import { navItems } from './nav-items';
import { ParthenonCrest } from './ParthenonCrest';
import { SidebarNavItem } from './SidebarNavItem';

export type { NavItem } from './nav-items';
export { navItems } from './nav-items';

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
            href="/assistent"
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
