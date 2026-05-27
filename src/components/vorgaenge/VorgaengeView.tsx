'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FolderKanban, IdCard, Truck, type LucideIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Behoerde, BehoerdeId, Vorgang } from '@/types';

import { ProcessCard } from './ProcessCard';
import { ProcessCardSmall } from './ProcessCardSmall';
import { WasIstWichtigRail } from './WasIstWichtigRail';
import {
  buildVorgangUebersicht,
  matchesFilter,
  type FilterTabId,
  type VorgangUebersicht,
} from './vorgang-uebersicht';

const typIcon: Record<string, LucideIcon> = {
  umzug: Truck,
  'aufenthaltstitel-verlaengerung': IdCard,
};

function detailHref(u: VorgangUebersicht): string {
  if (u.typ === 'umzug') {
    return `/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(u.vorgang_id)}`;
  }
  return `/vorgaenge/${encodeURIComponent(u.vorgang_id)}`;
}

export function VorgaengeView() {
  const t = useTranslations('vorgaenge');
  const tStart = useTranslations('umzug.start');
  const tChip = useTranslations('common.context_chip');

  const [uebersichten, setUebersichten] = React.useState<VorgangUebersicht[]>(
    [],
  );
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<FilterTabId>('alle');
  const [nowIso] = React.useState(() => new Date().toISOString());

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [vorgaenge, behoerden] = await Promise.all([
          api.getVorgaenge(),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        const map: Record<BehoerdeId, Pick<Behoerde, 'name_de'>> = {};
        for (const b of behoerden) map[b.id] = { name_de: b.name_de };
        setUebersichten(
          vorgaenge.map((v: Vorgang) => buildVorgangUebersicht(v, map)),
        );
        setLoaded(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = React.useMemo(() => {
    return {
      alle: uebersichten.filter((u) => matchesFilter(u, 'alle')).length,
      laufend: uebersichten.filter((u) => matchesFilter(u, 'laufend')).length,
      warten: uebersichten.filter((u) => matchesFilter(u, 'warten')).length,
      abgeschlossen: uebersichten.filter((u) =>
        matchesFilter(u, 'abgeschlossen'),
      ).length,
    };
  }, [uebersichten]);

  const visible = React.useMemo(
    () => uebersichten.filter((u) => matchesFilter(u, activeTab)),
    [uebersichten, activeTab],
  );

  // The "big" process card is the first Umzug (most steps), the rest are small.
  const bigCard = visible.find((u) => u.typ === 'umzug') ?? null;
  const smallCards = visible.filter((u) => u !== bigCard);

  const tabs = [
    { id: 'alle', label: t('filter.alle'), count: counts.alle },
    { id: 'laufend', label: t('filter.laufend'), count: counts.laufend },
    { id: 'warten', label: t('filter.warten'), count: counts.warten },
    {
      id: 'abgeschlossen',
      label: t('filter.abgeschlossen'),
      count: counts.abgeschlossen,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        contextChip={{ label: tChip('prototype') }}
      />

      <FilterTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as FilterTabId)}
        ariaLabel={t('filter_aria')}
      />

      {!loaded && !error ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4" aria-busy="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-border bg-surface-muted/40"
              />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-xl border border-border bg-surface-muted/40" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<FolderKanban aria-hidden="true" />}
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            activeTab === 'alle' ? (
              <Link
                href="/vorgaenge/umzug/start"
                className={cn(buttonVariants({ variant: 'default' }))}
              >
                {t('empty.cta_umzug')}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div
          id="vorgaenge-liste"
          className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start"
        >
          <div className="flex flex-col gap-4">
            {bigCard ? (
              <ProcessCard
                uebersicht={bigCard}
                icon={typIcon[bigCard.typ] ?? Truck}
                subtitle={
                  bigCard.typ === 'umzug'
                    ? t('card.umzug_subtitle')
                    : undefined
                }
                href={detailHref(bigCard)}
              />
            ) : null}
            {smallCards.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {smallCards.map((u) => (
                  <ProcessCardSmall
                    key={u.vorgang_id}
                    uebersicht={u}
                    icon={typIcon[u.typ] ?? FolderKanban}
                    href={detailHref(u)}
                    nowIso={nowIso}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <aside aria-label={t('rail.title')}>
            <WasIstWichtigRail uebersichten={uebersichten} nowIso={nowIso} />
          </aside>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-border bg-surface-muted/40 p-4 text-sm text-text-secondary">
          <Link
            href="/vorgaenge/umzug/start"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {tStart('title')}
          </Link>
        </div>
      ) : null}

      <PrototypeDisclaimer />
    </div>
  );
}
