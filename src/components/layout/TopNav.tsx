import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { A11yMenu } from './A11yMenu';
import { AutopilotPulse } from './AutopilotPulse';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import { ParthenonCrest } from './ParthenonCrest';
import { PosteingangTopSearch } from '@/components/posteingang/PosteingangTopSearch';
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

      {/* Route-scoped: renders the Liquid-Glass „Suchen ⌘K" pill only on
          /posteingang (null elsewhere), plus its trailing centring spacer. */}
      <PosteingangTopSearch />

      <div className="landing-header-actions app-topnav-actions">
        <AutopilotPulse />
        <A11yMenu />
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
        <MobileNav />
      </div>
    </header>
  );
}
