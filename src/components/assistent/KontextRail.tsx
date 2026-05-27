'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  CalendarDays,
  FileText,
  IdCard,
  Inbox,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { IconCircle } from '@/components/shared/IconCircle';
import { RightRailCard } from '@/components/shared/RightRailCard';

export interface KontextCounts {
  ungeleseneBriefe: number;
  dokumente: number;
  termine: number;
}

interface KontextRailProps {
  counts: KontextCounts | null;
}

interface RailLink {
  key: 'posteingang' | 'dokumente' | 'termine' | 'stammdaten';
  href: string;
  icon: LucideIcon;
}

const LINKS: RailLink[] = [
  { key: 'posteingang', href: '/posteingang', icon: Inbox },
  { key: 'dokumente', href: '/dokumente', icon: FileText },
  { key: 'termine', href: '/termine', icon: CalendarDays },
  { key: 'stammdaten', href: '/stammdaten', icon: IdCard },
];

export function KontextRail({ counts }: KontextRailProps) {
  const t = useTranslations('assistent.kontext');

  const valueFor = (key: RailLink['key']): string => {
    if (!counts) return '';
    switch (key) {
      case 'posteingang':
        return t('posteingang_value', { ungelesen: counts.ungeleseneBriefe });
      case 'dokumente':
        return t('dokumente_value', { count: counts.dokumente });
      case 'termine':
        return t('termine_value', { count: counts.termine });
      case 'stammdaten':
        return t('stammdaten_value');
    }
  };

  return (
    <aside aria-label={t('title')} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {t('title')}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <ul className="space-y-2">
        {LINKS.map(({ key, href, icon: Icon }) => (
          <li key={key}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <IconCircle icon={<Icon aria-hidden="true" />} tone="primary" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">
                  {t(key)}
                </span>
                <span className="block text-xs text-text-muted tabular-nums">
                  {valueFor(key)}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-text-muted rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      <RightRailCard
        as="h2"
        variant="soft"
        title={t('datenschutz_title')}
        icon={<ShieldCheck aria-hidden="true" />}
        footerLink={{ label: t('datenschutz_link'), href: '/datenschutz' }}
      >
        {t('datenschutz_body')}
      </RightRailCard>
    </aside>
  );
}
