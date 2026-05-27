'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Landmark, LifeBuoy, LogOut, Menu } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { navItems } from './Sidebar';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const t = useTranslations('nav');
  const tShell = useTranslations('shell');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer when the route changes (post-navigation) and when the
  // viewport crosses the md breakpoint (desktop sidebar takes over).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handle = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={tShell('sidebar.open')}
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="inline-start"
        width="nav"
        closeAriaLabel={tShell('sidebar.close')}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Landmark
              className="size-5 text-text-secondary"
              aria-hidden="true"
            />
            {tShell('sidebar.authority')}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="gap-2">
          <nav aria-label={tShell('sidebar.nav_label')}>
            <ul className="flex flex-col gap-1">
              {navItems.map(({ href, i18nKey, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-accent-soft font-medium text-primary'
                          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          active
                            ? 'text-primary'
                            : 'text-text-secondary group-hover:text-text-primary',
                        )}
                        aria-hidden="true"
                      />
                      <span>{t(i18nKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto border-t border-border pt-3">
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="#"
                  className="group flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
                >
                  <LifeBuoy
                    className="size-4 shrink-0 text-text-secondary group-hover:text-text-primary"
                    aria-hidden="true"
                  />
                  <span>{tShell('sidebar.help')}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="group flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
                >
                  <LogOut
                    className="size-4 shrink-0 text-text-secondary group-hover:text-text-primary"
                    aria-hidden="true"
                  />
                  <span>{tShell('sidebar.logout')}</span>
                </Link>
              </li>
            </ul>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
