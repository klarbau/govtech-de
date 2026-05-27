'use client';

import { differenceInCalendarDays, parseISO } from 'date-fns';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Clock, FileQuestion, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';

import { IconCircle } from '@/components/shared/IconCircle';
import { RightRailCard } from '@/components/shared/RightRailCard';
import type { VorgangUebersicht } from './vorgang-uebersicht';

interface WasIstWichtigRailProps {
  uebersichten: VorgangUebersicht[];
  nowIso: string;
}

interface RailItem {
  id: string;
  icon: ReactNode;
  tone: 'primary' | 'warning' | 'danger';
  title: string;
  detail: string;
  href: string;
}

function vorgangHref(u: VorgangUebersicht): string {
  if (u.typ === 'umzug') {
    return `/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(u.vorgang_id)}`;
  }
  return `/vorgaenge/${encodeURIComponent(u.vorgang_id)}`;
}

export function WasIstWichtigRail({
  uebersichten,
  nowIso,
}: WasIstWichtigRailProps) {
  const t = useTranslations('vorgaenge.rail');

  const offene = uebersichten.filter(
    (u) => u.status !== 'abgeschlossen' && u.status !== 'abgelehnt',
  );

  const items: RailItem[] = [];

  if (offene.length > 0) {
    items.push({
      id: 'offen',
      icon: <ListChecks aria-hidden="true" />,
      tone: 'primary',
      title: t('offene_vorgaenge'),
      detail: t('offene_vorgaenge_count', { count: offene.length }),
      href: '#vorgaenge-liste',
    });
  }

  // Soonest upcoming deadline across open Vorgänge.
  const mitFrist = offene
    .filter((u) => u.naechste_frist_iso)
    .map((u) => ({
      u,
      tage: differenceInCalendarDays(
        parseISO(u.naechste_frist_iso as string),
        parseISO(nowIso),
      ),
    }))
    .filter((x) => x.tage >= 0)
    .sort((a, b) => a.tage - b.tage);

  if (mitFrist[0]) {
    const { u, tage } = mitFrist[0];
    items.push({
      id: 'frist',
      icon: <Clock aria-hidden="true" />,
      tone: tage <= 7 ? 'warning' : 'primary',
      title: t('frist_naht'),
      detail: t('frist_naht_days', { tage }),
      href: vorgangHref(u),
    });
  }

  const warten = offene.filter((u) => u.wartet_auf_buerger);
  if (warten[0]) {
    const offen = warten.reduce(
      (sum, u) => sum + (u.schritte_gesamt - u.schritte_erledigt),
      0,
    );
    items.push({
      id: 'warten',
      icon: <FileQuestion aria-hidden="true" />,
      tone: 'warning',
      title: t('warten_bestaetigung'),
      detail: t('warten_bestaetigung_count', { count: offen }),
      href: vorgangHref(warten[0]),
    });
  }

  return (
    <RightRailCard
      title={t('title')}
      footerLink={{ label: t('alle_ansehen'), href: '#vorgaenge-liste' }}
    >
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('empty')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <IconCircle icon={item.icon} tone={item.tone} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-primary">
                    {item.title}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {item.detail}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t('cta_ansehen')}
                  <ArrowRight
                    className="size-4 rtl:-scale-x-100"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </RightRailCard>
  );
}
