'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { api } from '@/lib/mock-backend';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { DashboardGreeting } from './DashboardGreeting';
import { DiffStatCard } from './DiffStatCard';
import { HeuteZuTunCard } from './HeuteZuTunCard';
import { NavTileGrid } from './NavTileGrid';
import { DashboardSkeleton } from './DashboardSkeleton';
import type {
  DashboardSnapshot,
  DashboardSortMode,
  TopActionItem,
} from '@/types';

interface DashboardViewProps {
  nowIso: string;
}

/**
 * Demo-Anker für den „Seit letztem Login"-Diff. Das Mock-Backend exponiert
 * (Stand redesign-dashboard) keinen Lese-Accessor für den persistierten
 * `dashboard:last-seen`-Bucket; für die Demo verankern wir den vorherigen
 * Login 14 Tage vor „jetzt", damit der Diff aussagekräftig ist. `setLastSeen`
 * wird nach dem ersten Render auf „jetzt" gesetzt (Spec § 4.1).
 */
const DEMO_PRIOR_LOGIN_DAYS = 14;

/** Deterministische client-seitige Umsortierung der Top-Aktionen. */
function sortItems(
  items: TopActionItem[],
  mode: DashboardSortMode,
): TopActionItem[] {
  const copy = [...items];
  switch (mode) {
    case 'ki':
      // KI-Reihenfolge = der vom Snapshot gelieferte Rang.
      return copy.sort((a, b) => a.rank - b.rank);
    case 'frist':
      return copy.sort((a, b) => {
        if (!a.frist_datum) return 1;
        if (!b.frist_datum) return -1;
        return a.frist_datum.localeCompare(b.frist_datum);
      });
    case 'behoerde':
      return copy.sort((a, b) => a.behoerde_id.localeCompare(b.behoerde_id));
    case 'vorgang':
      // Vorgangs-bezogene Aktionen zuerst, dann nach Rang.
      return copy.sort((a, b) => {
        const av = a.source_typ === 'vorgang' ? 0 : 1;
        const bv = b.source_typ === 'vorgang' ? 0 : 1;
        if (av !== bv) return av - bv;
        return a.rank - b.rank;
      });
    default:
      return copy;
  }
}

/**
 * Client-Wrapper für `/dashboard`. Lädt den Snapshot über `api.getDashboard`
 * (Persona via `api.getProfile`), hält den Sort-Mode-State und ruft
 * `api.setLastSeen` nach dem ersten erfolgreichen Render auf. RSC-first bleibt
 * gewahrt: die Page ist eine RSC, dieser View kapselt nur die Interaktivität.
 */
export function DashboardView({ nowIso }: DashboardViewProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(
    null,
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [sortMode, setSortMode] = React.useState<DashboardSortMode>('ki');
  const lastSeenWrittenRef = React.useRef(false);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const persona = await api.getProfile();
      const priorLogin = new Date(
        new Date(nowIso).getTime() -
          DEMO_PRIOR_LOGIN_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      const snap = await api.getDashboard(persona.id, {
        last_seen_at: priorLogin,
      });
      setSnapshot(snap);

      if (!lastSeenWrittenRef.current) {
        lastSeenWrittenRef.current = true;
        await api.setLastSeen(persona.id, nowIso);
      }
    } catch {
      setLoadError(t('error.load'));
    }
  }, [nowIso, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-danger">{loadError}</p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            {tCommon('cta.erneut_versuchen')}
          </Button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <DashboardSkeleton />
      </div>
    );
  }

  const sortedItems = sortItems(snapshot.top_actions, sortMode);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardGreeting greeting={snapshot.greeting} />
        <DiffStatCard diff={snapshot.diff_block} />
      </div>

      <HeuteZuTunCard
        items={sortedItems}
        sortMode={sortMode}
        onSortChange={setSortMode}
        nowIso={nowIso}
        abgeschlosseneVorgaengeJahr={snapshot.vorgaenge_abgeschlossen_jahr}
      />

      <NavTileGrid snapshot={snapshot} />
    </div>
  );
}
