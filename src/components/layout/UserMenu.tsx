'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronDown, LogOut, Shield, User, UserRound, Users } from 'lucide-react';

import { api } from '@/lib/mock-backend/api';
import { cn } from '@/lib/utils';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';

interface UserMenuProps {
  /** Active persona name. Falls back to the aktive Persona / i18n demo name. */
  personaName?: string;
}

/**
 * Literal `.gt-user-pill` from the HTML prototype: an outlined pill holding
 * the avatar circle (`.av`), the persona name, and a chevron. Opens the
 * existing profile / switch-persona / logout menu on click.
 *
 * Ohne `personaName`-Prop lädt die Pille den Namen der AKTIVEN Persona aus dem
 * Mock-Backend (der Server-TopNav kennt die localStorage-Persona nicht) — der
 * frühere statische i18n-Fallback zeigte für Markus/Mehmet fälschlich „Anna
 * Petrov" an. Bis zur Hydration bleibt der i18n-Demo-Name als Platzhalter.
 */
export function UserMenu({ personaName }: UserMenuProps) {
  const t = useTranslations('shell.user');
  const [profileName, setProfileName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (personaName) return;
    let cancelled = false;
    void api
      .getProfile()
      .then((p) => {
        if (!cancelled) setProfileName(`${p.vorname} ${p.nachname}`);
      })
      .catch(() => {
        // Mock-Backend nicht gebootet (z. B. Landing) — i18n-Fallback bleibt.
      });
    return () => {
      cancelled = true;
    };
  }, [personaName]);

  const name = personaName ?? profileName ?? t('demo_name');

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className="gt-user-pill"
        aria-label={t('menu_label')}
      >
        <span className="av">
          <User aria-hidden="true" />
        </span>
        <span className="name">{name}</span>
        <ChevronDown aria-hidden="true" />
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
          <MenuPrimitive.Item
            className={itemClass}
            render={<Link href="/stammdaten" />}
          >
            <UserRound
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{t('stammdaten')}</span>
          </MenuPrimitive.Item>
          <MenuPrimitive.Item
            className={itemClass}
            render={<Link href="/datenschutz" />}
          >
            <Shield
              className="size-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <span>{t('datenschutz')}</span>
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
