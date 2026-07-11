'use client';

import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { lgEnabled } from '@/lib/liquid-glass';
import { useGlobalSearch } from './global-search-store';

/**
 * Icon-only search trigger for the header actions cluster, shown below 1024px
 * (`lg:hidden`) where the „Suchen ⌘K" pill is hidden. Tapping it sets
 * `useGlobalSearch.open`, which drops the full-width mobile search bar in
 * `GlobalSearch` (disclosure — `aria-expanded` + `aria-controls`). Focus returns
 * here when that bar closes via Escape / its close button. `lgEnabled`-gated.
 */
export function GlobalSearchMobileButton() {
  const t = useTranslations('search');
  const open = useGlobalSearch((s) => s.open);
  const setOpen = useGlobalSearch((s) => s.setOpen);

  if (!lgEnabled) return null;

  return (
    <button
      type="button"
      id="global-search-mobile-trigger"
      className="gt-header-btn icon lg:hidden"
      aria-label={t('mobile_open')}
      aria-expanded={open}
      aria-controls="global-search-region"
      onClick={() => setOpen(true)}
    >
      <Search aria-hidden="true" />
    </button>
  );
}
