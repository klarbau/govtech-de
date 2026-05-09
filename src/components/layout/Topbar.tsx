import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Landmark } from 'lucide-react';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export async function Topbar() {
  const tApp = await getTranslations('app');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Landmark className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight">{tApp('name')}</span>
      </div>
      <Link
        href="/dashboard"
        className="hidden text-xs font-medium text-muted-foreground hover:text-foreground md:inline-block"
      >
        {tApp('tagline')}
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
