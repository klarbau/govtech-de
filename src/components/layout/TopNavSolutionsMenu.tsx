'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';

import { navItems } from './nav-items';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Center-nav „Lösungen ▾" dropdown. Lists the 10 authenticated app routes so
 * everything stays reachable without a sidebar. The trigger wears the active
 * `.topnav-link` style whenever the current path matches one of those routes;
 * the matching item inside is marked `aria-current="page"`.
 *
 * Keyboard a11y (Enter/Space to open, Arrows to move, Escape to close, focus
 * return) comes from base-ui's Menu — same pattern as UserMenu.
 */
export function TopNavSolutionsMenu() {
  const t = useTranslations('nav');
  const tTop = useTranslations('topnav');
  const pathname = usePathname();
  const triggerActive = navItems.some((item) => isActive(pathname, item.href));

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn('topnav-link topnav-menu', triggerActive && 'active')}
        data-active={triggerActive ? 'true' : undefined}
      >
        {tTop('solutions')}
        <ChevronDown aria-hidden="true" />
      </MenuPrimitive.Trigger>
      <SolutionsContent
        pathname={pathname}
        routeLabel={(key) => t(key)}
        ariaLabel={tTop('solutions')}
      />
    </MenuPrimitive.Root>
  );
}

function SolutionsContent({
  pathname,
  routeLabel,
  ariaLabel,
}: {
  pathname: string | null;
  routeLabel: (key: NonNullable<(typeof navItems)[number]['i18nKey']>) => string;
  ariaLabel: string;
}) {
  useStripBaseUiFocusGuardAriaHidden(true);

  const itemClass = cn(
    'flex min-h-[44px] cursor-default items-center gap-3 rounded-md px-3 text-sm text-text-primary no-underline outline-none',
    'data-highlighted:bg-surface-muted',
  );

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={8} align="start">
        <MenuPrimitive.Popup
          aria-label={ariaLabel}
          className={cn(
            'z-50 grid min-w-64 grid-cols-1 gap-0.5 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-popover)] outline-none sm:min-w-[420px] sm:grid-cols-2',
            'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
          )}
        >
          {navItems.map(({ href, i18nKey, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <MenuPrimitive.Item
                key={href}
                className={cn(itemClass, active && 'topnav-solution-active')}
                render={
                  <Link href={href} aria-current={active ? 'page' : undefined} />
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{routeLabel(i18nKey)}</span>
              </MenuPrimitive.Item>
            );
          })}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}
