'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Euro,
  FileText,
  Folder,
  HelpCircle,
  Home,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Shield,
  User,
  Users,
} from 'lucide-react';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { ParthenonCrest } from './ParthenonCrest';

const NAV_MAIN = [
  { href: '/dashboard', i18nKey: 'dashboard', icon: Home },
  { href: '/posteingang', i18nKey: 'posteingang', icon: Mail },
  { href: '/stammdaten', i18nKey: 'stammdaten', icon: User },
  { href: '/vorgaenge', i18nKey: 'vorgaenge', icon: Folder },
  { href: '/dokumente', i18nKey: 'dokumente', icon: FileText },
  { href: '/termine', i18nKey: 'termine', icon: Calendar },
  { href: '/steuer', i18nKey: 'steuer', icon: Euro },
  { href: '/familie', i18nKey: 'familie', icon: Users },
  { href: '/assistent', i18nKey: 'assistent', icon: MessageCircle },
  { href: '/datenschutz', i18nKey: 'datenschutz', icon: Shield },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Drawer variant of the sidebar for < md viewports. The prototype HTML
 * targets desktop only (viewport width=1440) — to stay usable on mobile we
 * mirror the same `.gt-nav` markup inside a shadcn Sheet, swapping the
 * trigger for an icon-only `.gt-header-btn`.
 */
export function MobileNav() {
  const t = useTranslations('nav');
  const tShell = useTranslations('shell');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
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
          <button
            type="button"
            className="gt-header-btn icon lg:hidden"
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
          <SheetTitle className="gt-sidebar-brand" style={{ padding: 0 }}>
            <div className="crest">
              <ParthenonCrest />
            </div>
            <div className="label">
              Bundesrepublik
              <br />
              Deutschland
            </div>
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <nav className="gt-nav" aria-label={tShell('sidebar.nav_label')}>
            {NAV_MAIN.map(({ href, i18nKey, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? 'active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" />
                  <span>{t(i18nKey)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="gt-sidebar-bottom">
            <div className="gt-nav-divider" />
            <nav className="gt-nav">
              <Link href="/assistent">
                <HelpCircle aria-hidden="true" />
                <span>{tShell('sidebar.help')}</span>
              </Link>
              <Link href="/">
                <LogOut aria-hidden="true" />
                <span>{tShell('sidebar.logout')}</span>
              </Link>
            </nav>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
