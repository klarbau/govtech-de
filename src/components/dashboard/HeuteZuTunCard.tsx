'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { HeuteZuTunSortTabs } from './HeuteZuTunSortTabs';
import { TopActionRow } from './TopActionRow';
import { reasonToPriority } from './TopActionRow';
import type { DashboardSortMode, TopActionItem } from '@/types';

interface HeuteZuTunCardProps {
  /** Already sorted by the active sort mode. */
  items: TopActionItem[];
  sortMode: DashboardSortMode;
  onSortChange: (mode: DashboardSortMode) => void;
  nowIso: string;
  /** For the empty-state achievement copy. */
  abgeschlosseneVorgaengeJahr: number;
}

/**
 * „Heute zu tun"-Card: Titelzeile mit Sort-Toggle rechts + `<ol>`-Liste der
 * Top-Aktionen. Bei 0 Aktionen wird der Achievement-EmptyState gezeigt und der
 * Sort-Toggle bleibt sichtbar, aber `aria-disabled`.
 */
export function HeuteZuTunCard({
  items,
  sortMode,
  onSortChange,
  nowIso,
  abgeschlosseneVorgaengeJahr,
}: HeuteZuTunCardProps) {
  const t = useTranslations('dashboard.heute_zu_tun');
  const tPriority = useTranslations('dashboard.priority');
  const isEmpty = items.length === 0;

  return (
    <section aria-labelledby="dashboard-heute-zu-tun" className="w-full">
      <SectionCard padding="md">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="dashboard-heute-zu-tun"
            className="text-lg font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
          <HeuteZuTunSortTabs
            value={sortMode}
            onChange={onSortChange}
            disabled={isEmpty}
          />
        </div>

        {isEmpty ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title={t('empty_title')}
            description={t('empty_description', {
              count: abgeschlosseneVorgaengeJahr,
              jahr: new Date(nowIso).getFullYear(),
            })}
          />
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {items.map((item, index) => (
              <li key={item.id}>
                <TopActionRow
                  item={item}
                  position={index + 1}
                  priorityLabel={tPriority(
                    reasonToPriority[item.reason_token].labelKey,
                  )}
                  nowIso={nowIso}
                />
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </section>
  );
}
