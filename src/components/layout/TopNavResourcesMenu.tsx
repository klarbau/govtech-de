'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronDown, HelpCircle, Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';

/**
 * Center-nav „Ressourcen ▾" dropdown: Hilfe & Kontakt (→ /assistent) and
 * „Über das Projekt" (→ /, the landing). Same base-ui Menu keyboard pattern
 * as UserMenu / TopNavSolutionsMenu.
 */
export function TopNavResourcesMenu() {
  const t = useTranslations('topnav');

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger className="topnav-link topnav-menu">
        {t('resources')}
        <ChevronDown aria-hidden="true" />
      </MenuPrimitive.Trigger>
      <ResourcesContent
        helpLabel={t('help')}
        aboutProjectLabel={t('about_project')}
        ariaLabel={t('resources')}
      />
    </MenuPrimitive.Root>
  );
}

function ResourcesContent({
  helpLabel,
  aboutProjectLabel,
  ariaLabel,
}: {
  helpLabel: string;
  aboutProjectLabel: string;
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
            'z-50 min-w-56 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-popover)] outline-none',
            'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
          )}
        >
          <MenuPrimitive.Item className={itemClass} render={<Link href="/assistent" />}>
            <HelpCircle
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{helpLabel}</span>
          </MenuPrimitive.Item>
          <MenuPrimitive.Item className={itemClass} render={<Link href="/" />}>
            <Info
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{aboutProjectLabel}</span>
          </MenuPrimitive.Item>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}
