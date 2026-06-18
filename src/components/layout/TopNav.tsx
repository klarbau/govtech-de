import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { A11yMenu } from './A11yMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import { ParthenonCrest } from './ParthenonCrest';
import { ThemeToggle } from './ThemeToggle';
import { TopNavLink } from './TopNavLink';
import { TopNavResourcesMenu } from './TopNavResourcesMenu';
import { TopNavSolutionsMenu } from './TopNavSolutionsMenu';
import { UserMenu } from './UserMenu';

/**
 * Authenticated app header — a sticky top navigation bar styled identically to
 * the landing header (`.landing-header`/`.landing-nav`). Replaces the former
 * `.gt-sidebar` shell: the 10 app routes now live in the „Lösungen ▾"
 * dropdown so everything stays reachable without a sidebar.
 *
 * Layout: brand (→ /dashboard) · center nav (≥1024px) · right actions
 * (A11yMenu, LanguageSwitcher, ThemeToggle, UserMenu). Below 1024px the
 * center nav is hidden and the MobileNav burger + drawer carries the routes.
 */
export async function TopNav() {
  const t = await getTranslations('topnav');

  return (
    <header className="app-topnav">
      <Link href="/dashboard" className="gt-brand">
        <span className="gt-brand-logo">
          <ParthenonCrest />
          <span>GovTech-DE</span>
        </span>
      </Link>

      <nav className="landing-nav app-topnav-center" aria-label={t('nav_label')}>
        <TopNavSolutionsMenu />
        {/* TODO Phase 2b: → /lebenslagen (route lands in Phase 2b). */}
        <TopNavLink href="/vorgaenge" label={t('lebenslagen')} />
        <TopNavLink href="/datenschutz" label={t('security_privacy')} />
        <TopNavResourcesMenu />
        <TopNavLink href="/" label={t('about_us')} />
      </nav>

      <div className="app-topnav-spacer" />

      <div className="landing-header-actions app-topnav-actions">
        <A11yMenu />
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
        <MobileNav />
      </div>
    </header>
  );
}
