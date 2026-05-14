import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Landmark } from 'lucide-react';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export async function Topbar() {
  const tApp = await getTranslations('app');

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-6"
      data-print="hide"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:text-foreground"
      >
        <Landmark
          className="size-5 text-primary md:hidden"
          aria-hidden="true"
        />
        <span>{tApp('name')}</span>
        <span className="hidden text-xs font-medium text-muted-foreground md:inline-block">
          · {tApp('tagline')}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
