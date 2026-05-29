import Link from 'next/link';
import { ChevronDown, Landmark, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
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

      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-surface px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Landmark className="size-5 text-text-secondary" aria-hidden="true" />
          <span className="text-sm font-semibold text-text-primary">
            {tApp('name')}
          </span>
          <span
            aria-hidden="true"
            className="hidden text-text-muted md:inline"
          >
            ·
          </span>
          <span className="hidden text-xs text-text-muted md:inline">
            {tApp('tagline')}
          </span>
        </Link>

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="#main-content"
            aria-label={tOnboarding('topbar.login_label')}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {tOnboarding('topbar.login_label')}
            <ChevronDown className="size-4 rtl:-scale-x-100" aria-hidden="true" />
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
