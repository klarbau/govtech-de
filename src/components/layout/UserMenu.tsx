'use client';

import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function UserMenu() {
  const t = useTranslations('topbar');

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('user_menu')}
      title={t('user_menu')}
    >
      <UserRound aria-hidden="true" />
    </Button>
  );
}
