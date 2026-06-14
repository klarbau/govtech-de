import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { A11yMenu } from './A11yMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import { ParthenonCrest } from './ParthenonCrest';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/**
 * Literal port of HEADER_HTML in `docs/design-prototype-v2/assets/govtech.js`.
 * Class names (.gt-header / .gt-brand / .gt-brand-logo / .gt-tagline /
 * .gt-header-spacer / .gt-header-actions) come from `prototype-v2.css`.
 *
 * The HTML embeds three interactive controls inside `.gt-header-actions`
 * (language pill, theme button, user pill). We keep the existing client
 * widgets — they wear the prototype classes by injecting them via the
 * shadcn primitives' `className` prop.
 */
export async function Topbar() {
  const tApp = await getTranslations('app');

  return (
    <header className="gt-header">
      <MobileNav />
      <Link href="/" className="gt-brand">
        <div className="gt-brand-logo">
          <ParthenonCrest />
          <span>{tApp('name')}</span>
        </div>
        <span className="gt-tagline">{tApp('tagline')}</span>
      </Link>
      <div className="gt-header-spacer" />
      <div className="gt-header-actions">
        <A11yMenu />
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
