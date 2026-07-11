import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { A11yMenu } from './A11yMenu';
import { AutopilotPulse } from './AutopilotPulse';
import { GlobalSearch } from './GlobalSearch';
import { GlobalSearchMobileButton } from './GlobalSearchMobileButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import { ParthenonCrest } from './ParthenonCrest';
import { ThemeToggle } from './ThemeToggle';
import { TopNavLink } from './TopNavLink';
import { TopNavResourcesMenu } from './TopNavResourcesMenu';
import { UserMenu } from './UserMenu';

/**
 * Authenticated app header — a sticky top navigation bar styled identically to
 * the landing header (`.landing-header`/`.landing-nav`). The 10 app routes live
 * in the persistent left `SideNav` (≥1024px) so they are one click away at all
 * times; below 1024px the MobileNav burger + drawer carries them. The center
 * nav keeps only the cross-cutting links (Ressourcen, Über uns) to avoid
 * duplicating the sidebar routes.
 *
 * Layout: brand (→ /dashboard) · center nav (≥1024px) · right actions
 * (A11yMenu, LanguageSwitcher, ThemeToggle, UserMenu).
 */
export async function TopNav() {
  const t = await getTranslations('topnav');

  return (
    <header className="app-topnav">
      <Link href="/dashboard" className="gt-brand" aria-label={t('brand_label')}>
        <span className="gt-brand-logo">
          <ParthenonCrest />
          <span>GovTech-DE</span>
        </span>
      </Link>

      <nav
        className="landing-nav app-topnav-center"
        aria-label={t('meta_nav_label')}
      >
        <TopNavResourcesMenu />
        <TopNavLink href="/" label={t('about_us')} />
      </nav>

      <div className="app-topnav-spacer" />

      {/* App-wide „Suchen ⌘K" combobox (≥1024px): the pill IS the input; on
          focus it expands and an anchored dropdown drops down below it. Holds
          the global ⌘K listener and the mobile search bar. Trailing spacer
          centres the pill in the header. */}
      <GlobalSearch />

      <div className="landing-header-actions app-topnav-actions">
        <GlobalSearchMobileButton />
        {/* ≤767px this cluster is hidden (mobile-nav.css); every entry stays
            reachable in the burger sheet. `display:contents` ≥768 keeps the
            items as direct flex children so desktop spacing is unchanged. */}
        <div className="app-topnav-util-extra">
          <AutopilotPulse />
          <A11yMenu />
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
