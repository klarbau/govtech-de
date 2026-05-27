'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { FristCountdown } from '@/components/shared/FristCountdown';
import { IconCircle } from '@/components/shared/IconCircle';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import type { VorgangUebersicht } from './vorgang-uebersicht';

interface ProcessCardSmallProps {
  uebersicht: VorgangUebersicht;
  icon?: LucideIcon;
  href: string;
  nowIso?: string;
}

function statusVariant(u: VorgangUebersicht): StatusVariant {
  if (u.status === 'abgeschlossen') return 'abgeschlossen';
  if (u.wartet_auf_buerger) return 'warten';
  return 'laufend';
}

export function ProcessCardSmall({
  uebersicht,
  icon: Icon = FolderKanban,
  href,
  nowIso,
}: ProcessCardSmallProps) {
  const t = useTranslations('vorgaenge');
  const tCommon = useTranslations('common.status');
  const variant = statusVariant(uebersicht);
  const headingId = `process-sm-${uebersicht.vorgang_id}`;

  const ctaLabel = uebersicht.unterlagen_fehlen
    ? t('card.cta_unterlagen')
    : uebersicht.status === 'abgeschlossen'
      ? t('card.cta_ansehen')
      : t('card.cta_weiter');

  return (
    <SectionCard padding="md" className="gap-0 h-full">
      <article
        aria-labelledby={headingId}
        className="flex h-full flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconCircle
              icon={
                uebersicht.unterlagen_fehlen ? (
                  <AlertTriangle aria-hidden="true" />
                ) : (
                  <Icon aria-hidden="true" />
                )
              }
              tone={uebersicht.unterlagen_fehlen ? 'warning' : 'primary'}
              size="md"
            />
            <h3
              id={headingId}
              className="text-base font-semibold text-text-primary"
            >
              {uebersicht.titel}
            </h3>
          </div>
          <StatusBadge variant={variant}>{tCommon(variant)}</StatusBadge>
        </div>

        <div className="flex-1">
          {uebersicht.unterlagen_fehlen ? (
            <StatusBadge variant="warten">
              {t('card.unterlagen_fehlen')}
            </StatusBadge>
          ) : uebersicht.naechste_frist_iso ? (
            <FristCountdown
              deadlineIso={uebersicht.naechste_frist_iso}
              fromIso={nowIso}
            />
          ) : null}
        </div>

        <div>
          <Link
            href={href}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {ctaLabel}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </SectionCard>
  );
}
