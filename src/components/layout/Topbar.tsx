import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Landmark } from 'lucide-react';

import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export async function Topbar() {
  const tApp = await getTranslations('app');

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-4 md:px-6"
      data-print="hide"
    >
      <MobileNav />
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-text-primary"
      >
        <Landmark
          className="size-5 text-text-secondary md:hidden"
          aria-hidden="true"
        />
        <span className="truncate">{tApp('name')}</span>
        <span className="hidden truncate text-xs font-normal text-text-muted md:inline-block">
          · {tApp('tagline')}
        </span>
      </Link>
      <div className="ms-auto flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
