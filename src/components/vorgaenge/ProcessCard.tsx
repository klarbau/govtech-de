'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Truck, type LucideIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { HorizontalStepper } from './HorizontalStepper';
import type { VorgangUebersicht } from './vorgang-uebersicht';

interface ProcessCardProps {
  uebersicht: VorgangUebersicht;
  icon?: LucideIcon;
  /** Optional explicit subtitle (e.g. the Umzug auto-info line). */
  subtitle?: string;
  /** Where the primary CTA navigates. */
  href: string;
}

function statusVariant(u: VorgangUebersicht): StatusVariant {
  if (u.status === 'abgeschlossen') return 'abgeschlossen';
  if (u.wartet_auf_buerger) return 'warten';
  return 'laufend';
}

export function ProcessCard({
  uebersicht,
  icon: Icon = Truck,
  subtitle,
  href,
}: ProcessCardProps) {
  const t = useTranslations('vorgaenge');
  const tCommon = useTranslations('common.status');
  const variant = statusVariant(uebersicht);
  const headingId = `process-${uebersicht.vorgang_id}`;

  const ctaLabel =
    uebersicht.status === 'abgeschlossen'
      ? t('card.cta_ansehen')
      : uebersicht.typ === 'umzug'
        ? t('card.cta_kaskade')
        : t('card.cta_weiter');

  return (
    <SectionCard padding="lg" className="gap-0">
      <article aria-labelledby={headingId} className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconCircle icon={<Icon aria-hidden="true" />} tone="primary" size="lg" />
            <div className="min-w-0">
              <h2
                id={headingId}
                className="text-lg font-semibold text-text-primary"
              >
                {uebersicht.titel}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <StatusBadge variant={variant}>{tCommon(variant)}</StatusBadge>
        </div>

        {uebersicht.stepper_nodes.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text-secondary">
                {t('card.progress_label')}
              </span>
              <span className="text-text-muted tabular-nums">
                {t('card.progress', {
                  erledigt: uebersicht.schritte_erledigt,
                  gesamt: uebersicht.schritte_gesamt,
                })}
              </span>
            </div>
            <HorizontalStepper
              nodes={uebersicht.stepper_nodes}
              vorgangTitel={uebersicht.titel}
            />
          </div>
        ) : null}

        <div className="flex justify-end">
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
