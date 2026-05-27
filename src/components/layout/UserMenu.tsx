'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronDown, LogOut, UserRound, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/Avatar';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';

interface UserMenuProps {
  /**
   * Active persona name. Foundation default sourced from i18n
   * (`shell.user.demo_name`) when no persona context supplies a name.
   */
  personaName?: string;
}

export function UserMenu({ personaName }: UserMenuProps) {
  const t = useTranslations('shell.user');
  const name = personaName ?? t('demo_name');

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          'flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm transition-colors',
          'text-text-primary hover:bg-surface-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
        aria-label={t('menu_label')}
      >
        <Avatar name={name} size="sm" tone="primary" />
        <span className="hidden max-w-[10rem] truncate font-medium md:inline-block">
          {name}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-text-muted rtl:-scale-x-100"
          aria-hidden="true"
        />
      </MenuPrimitive.Trigger>
      <MenuContent />
    </MenuPrimitive.Root>
  );
}

function MenuContent() {
  const t = useTranslations('shell.user');
  useStripBaseUiFocusGuardAriaHidden(true);

  const itemClass = cn(
    'flex min-h-[44px] cursor-default items-center gap-2 rounded-md px-3 text-sm text-text-primary outline-none',
    'data-highlighted:bg-surface-muted',
  );

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={6} align="end">
        <MenuPrimitive.Popup
          className={cn(
            'z-50 min-w-52 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-popover)] outline-none',
            'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
          )}
        >
          <MenuPrimitive.Item className={itemClass}>
            <UserRound
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{t('profile')}</span>
          </MenuPrimitive.Item>
          <MenuPrimitive.Item
            className={itemClass}
            render={<Link href="/" />}
          >
            <Users
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{t('switch_persona')}</span>
          </MenuPrimitive.Item>
          <MenuPrimitive.Separator className="my-1 h-px bg-border" />
          <MenuPrimitive.Item
            className={itemClass}
            render={<Link href="/" />}
          >
            <LogOut
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{t('logout')}</span>
          </MenuPrimitive.Item>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}
