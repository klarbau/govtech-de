import Link from 'next/link';
import { Lock, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ParthenonCrest } from '@/components/layout/ParthenonCrest';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// The onboarding flow hydrates and reseeds from localStorage at request time,
// so static prerendering yields nothing and trips the next-intl@3 + Next 15.5
// IntlProvider prerender bug. Render dynamically — matching (app)/layout.tsx.
export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tApp = await getTranslations('app');
  const tFooter = await getTranslations('footer');
  const tShell = await getTranslations('shell');
  const tOnboarding = await getTranslations('onboarding');

  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-foreground focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-background"
      >
        {tApp('skip_to_content')}
      </a>

      {/* Same chrome as the landing header (`landing-header` + `gt-brand`),
          so / → /onboarding reads as one product. Sticky is kept from the
          previous auth header — the transparency step scrolls. */}
      <header className="landing-header sticky top-0 z-30">
        <Link href="/" className="gt-brand">
          <div className="gt-brand-logo">
            <ParthenonCrest />
            <span>{tApp('name')}</span>
          </div>
          <span className="gt-tagline">{tApp('tagline')}</span>
        </Link>

        <div className="gt-header-spacer" />
        <div className="gt-header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="#main-content"
            className="gt-user-pill"
            aria-label={tOnboarding('topbar.login_label')}
          >
            <User aria-hidden="true" />
            {tOnboarding('topbar.login_label')}
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-surface px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            {tOnboarding('footer.bsi')}
          </span>
          <nav className="flex gap-x-5" aria-label={tShell('footer.landmark')}>
            <Link href="#" className="hover:text-text-primary">
              {tFooter('privacy')}
            </Link>
            <Link href="#" className="hover:text-text-primary">
              {tFooter('imprint')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
