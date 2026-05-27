'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FileText, Receipt, ShieldCheck } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type {
  Behoerde,
  Document as VaultDocument,
  SteuerBereich,
  SteuerUebersicht,
} from '@/types';

import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { RightRailCard } from '@/components/shared/RightRailCard';
import { DataTable, type DataTableRow } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconCircle } from '@/components/shared/IconCircle';
import { ListRow } from '@/components/shared/ListRow';
import { KeyValueRow } from '@/components/shared/KeyValueRow';
import { EmptyState } from '@/components/shared/EmptyState';
import { FristCountdown } from '@/components/shared/FristCountdown';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';

import { SteuerHeroCard } from './SteuerHeroCard';
import { FortschrittStepper } from './FortschrittStepper';

interface SteuerViewProps {
  /** SSR-stable demo "now" für deterministische Frist-Anzeige. */
  nowIso: string;
  steuerjahr: number;
}

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

/** Erste N Bereiche initial sichtbar; „Alle Bereiche anzeigen" deckt den Rest auf. */
const INITIAL_BEREICHE = 4;

const STATUS_VARIANT: Record<SteuerBereich['status'], 'geprueft' | 'warten' | 'vorlage'> = {
  geprueft: 'geprueft',
  ergaenzen: 'warten',
  nicht_vorhanden: 'vorlage',
};

export function SteuerView({ nowIso, steuerjahr }: SteuerViewProps) {
  const t = useTranslations('steuer');
  const tRoot = useTranslations();

  const [uebersicht, setUebersicht] = React.useState<SteuerUebersicht | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});
  const [documentsById, setDocumentsById] = React.useState<Record<string, VaultDocument>>({});
  const [loadState, setLoadState] = React.useState<
    'loading' | 'ready' | 'empty' | 'error'
  >('loading');
  const [showAllBereiche, setShowAllBereiche] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadState('loading');
    try {
      const profile = await api.getProfile();
      const [u, behoerden, docs] = await Promise.all([
        api.getSteuerUebersicht(profile.id, steuerjahr),
        api.getBehoerden(),
        api.getDocuments(),
      ]);
      setUebersicht(u);
      setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
      setDocumentsById(Object.fromEntries(docs.map((d) => [d.id, d])));
      setLoadState('ready');
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code?: string }).code
          : undefined;
      setLoadState(code === 'STEUER_JAHR_NOT_FOUND' ? 'empty' : 'error');
    }
  }, [steuerjahr]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const behoerdeName = React.useCallback(
    (id: string) => behoerdenById[id]?.name_de ?? id,
    [behoerdenById],
  );

  const onDemoAction = React.useCallback(() => {
    toast(t('demo_action_toast'));
  }, [t]);

  const header = (
    <PageHeader
      title={t('title')}
      subtitle={t('subtitle')}
      contextChip={{ label: tRoot('common.context_chip.prototype'), tone: 'prototype' }}
    />
  );

  if (loadState === 'loading') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
        {header}
        <div
          aria-busy="true"
          className="h-48 animate-pulse rounded-lg border border-border bg-surface-muted/40 motion-reduce:animate-none"
        />
      </div>
    );
  }

  if (loadState === 'empty') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
        {header}
        <EmptyState
          icon={<Receipt />}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      </div>
    );
  }

  if (loadState === 'error' || !uebersicht) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
        {header}
        <EmptyState
          icon={<Receipt />}
          title={t('error')}
          action={
            <Button variant="outline" size="sm" onClick={() => void load()}>
              {t('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const bereicheVisible = showAllBereiche
    ? uebersicht.bereiche
    : uebersicht.bereiche.slice(0, INITIAL_BEREICHE);
  const hasMoreBereiche = uebersicht.bereiche.length > INITIAL_BEREICHE;

  const rows: DataTableRow[] = bereicheVisible.map((bereich) => {
    const name = tRoot(bereich.name_i18n_key);
    const betrag =
      bereich.betrag_cent === undefined
        ? '—'
        : euroFormatter.format(bereich.betrag_cent / 100);
    const aktion =
      bereich.status === 'geprueft'
        ? { label: t('aktion.ansehen'), aria: t('aktion.ansehen_aria', { bereich: name }) }
        : bereich.status === 'ergaenzen'
          ? { label: t('aktion.ergaenzen'), aria: t('aktion.ergaenzen_aria', { bereich: name }) }
          : { label: t('aktion.hinzufuegen'), aria: t('aktion.hinzufuegen_aria', { bereich: name }) };
    return {
      id: bereich.id,
      cells: {
        bereich: (
          <span className="flex items-center gap-3">
            <IconCircle icon={<Receipt />} tone="neutral" size="sm" />
            <span className="font-medium text-text-primary">{name}</span>
          </span>
        ),
        betrag,
        status: (
          <StatusBadge variant={STATUS_VARIANT[bereich.status]}>
            {t(`status.${bereich.status}`)}
          </StatusBadge>
        ),
        aktion: (
          <Button
            variant="link"
            size="sm"
            className="h-auto min-h-0 px-0"
            aria-label={aktion.aria}
            onClick={onDemoAction}
          >
            {aktion.label}
          </Button>
        ),
      },
    };
  });

  const empfaengerName = behoerdeName(uebersicht.datenschutz.empfaenger_behoerde_id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
      {header}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Hauptspalte */}
        <div className="space-y-6">
          <SteuerHeroCard uebersicht={uebersicht} behoerdeName={behoerdeName} />

          <SectionCard title={t('fortschritt.title')}>
            <FortschrittStepper aktiverSchritt={uebersicht.fortschritt_aktiver_schritt} />
          </SectionCard>

          <SectionCard title={t('bereiche.title')}>
            <DataTable
              caption={t('bereiche.title')}
              columns={[
                { id: 'bereich', header: t('col.bereich'), align: 'start' },
                { id: 'betrag', header: t('col.betrag'), align: 'end' },
                { id: 'status', header: t('col.status'), align: 'start' },
                { id: 'aktion', header: t('col.aktion'), align: 'end' },
              ]}
              rows={rows}
            />
            {hasMoreBereiche ? (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllBereiche((v) => !v)}
                  aria-expanded={showAllBereiche}
                >
                  {showAllBereiche ? t('weniger_bereiche') : t('alle_bereiche')}
                </Button>
              </div>
            ) : null}
          </SectionCard>
        </div>

        {/* Rechte Rail */}
        <aside className="space-y-6" aria-label={t('fristen.title')}>
          <RightRailCard title={t('fristen.title')} as="h2">
            <ul className="space-y-3">
              {uebersicht.fristen.map((frist) => (
                <li key={frist.label_i18n_key} className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text-primary">
                    {tRoot(frist.label_i18n_key, { jahr: uebersicht.steuerjahr })}
                  </span>
                  <FristCountdown deadlineIso={frist.datum} fromIso={nowIso} />
                </li>
              ))}
            </ul>
          </RightRailCard>

          <RightRailCard title={t('nachweise.title')} as="h2">
            <ul className="space-y-1">
              {uebersicht.verwendete_nachweise_document_ids.map((docId) => {
                const doc = documentsById[docId];
                return (
                  <li key={docId}>
                    <ListRow
                      leading={<IconCircle icon={<FileText />} tone="neutral" size="sm" />}
                      title={doc?.titel ?? docId}
                      href={doc ? `/dokumente` : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </RightRailCard>

          <RightRailCard
            title={t('datenschutz.title')}
            icon={<ShieldCheck aria-hidden="true" />}
            as="h2"
            footerLink={{ label: t('datenschutz.mehr'), href: '/datenschutz' }}
          >
            <div className="space-y-1">
              <KeyValueRow
                label={t('datenschutz.verarbeitet_label')}
                value={
                  <span className="text-end">
                    {uebersicht.datenschutz.verarbeitete_daten_i18n_keys
                      .map((k) => tRoot(k))
                      .join(', ')}
                  </span>
                }
              />
              <KeyValueRow
                label={t('datenschutz.rechtsgrundlage_label')}
                value={
                  <span className="tabular-nums">
                    {wrapNormZitate(uebersicht.datenschutz.rechtsgrundlage)}
                  </span>
                }
              />
              <KeyValueRow
                label={t('datenschutz.empfaenger_label')}
                value={empfaengerName}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {t('datenschutz.minimierung_hint')}
            </p>
          </RightRailCard>
        </aside>
      </div>
    </div>
  );
}
