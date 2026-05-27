'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import {
  Baby,
  HandCoins,
  HeartPulse,
  Link2,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { Behoerde, HaushaltView } from '@/types';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { RightRailCard } from '@/components/shared/RightRailCard';
import { ListRow } from '@/components/shared/ListRow';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';

import { MemberCard } from './MemberCard';
import { MemberChips } from './MemberChips';
import { PersonCountList } from './PersonCountList';
import { HaushaltVerwaltenDialog } from './HaushaltVerwaltenDialog';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

/** Map a derived Vorgangs-status to a shared `StatusBadge` variant. */
const VORGANG_STATUS: Record<string, StatusVariant> = {
  laufend: 'laufend',
  genehmigt: 'bestaetigt',
  warten: 'warten',
  abgeschlossen: 'abgeschlossen',
};

/** Map a derived Nachweis-status to a shared `StatusBadge` variant. */
const NACHWEIS_STATUS: Record<string, StatusVariant> = {
  verifiziert: 'verifiziert',
  vorhanden: 'aktiv',
  speculative: 'vorlage',
  fehlt: 'manuell',
};

const VORGANG_ICON: Record<string, ReactNode> = {
  kindergeld: <HandCoins />,
  krankenkasse: <HeartPulse />,
  kita: <School />,
};

const NACHWEIS_ICON: Record<string, ReactNode> = {
  geburtsurkunde: <Baby />,
  sorge_vollmacht: <ShieldCheck />,
  vertretungsrechte: <Users />,
  verknuepfungen: <Link2 />,
};

function formatIsoDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}

export function FamilieView() {
  const t = useTranslations('familie');
  const tRoot = useTranslations();

  const [data, setData] = React.useState<HaushaltView | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [loadState, setLoadState] = React.useState<LoadState>('loading');
  const [verwaltenOpen, setVerwaltenOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadState('loading');
    try {
      const profile = await api.getProfile();
      const [view, behoerden] = await Promise.all([
        api.getFamilie(profile.id),
        api.getBehoerden(),
      ]);
      setData(view);
      setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
      setLoadState(view.mitglieder.length === 0 ? 'empty' : 'ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rolleLabel = React.useCallback(
    (rolle: string) => {
      const known = ['mutter', 'vater', 'partner', 'kind', 'hauptperson'];
      return known.includes(rolle) ? t(`rolle.${rolle}`) : rolle;
    },
    [t],
  );

  const memberName = React.useCallback(
    (id: string): string => {
      const m = data?.mitglieder.find((x) => x.persona_ref_id === id);
      return m ? `${m.vorname} ${m.nachname}`.trim() : id;
    },
    [data],
  );

  const header = (
    <PageHeader
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      contextChip={{
        label: tRoot('common.context_chip.speculative'),
        tone: 'speculative',
      }}
      actions={
        <Button variant="outline" onClick={() => setVerwaltenOpen(true)}>
          {t('cta.haushalt_verwalten')}
        </Button>
      }
    />
  );

  if (loadState === 'loading') {
    return (
      <div className="space-y-6">
        {header}
        <div
          aria-busy="true"
          className="h-64 animate-pulse rounded-lg border border-border bg-surface-muted/40 motion-reduce:animate-none"
        />
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<Users />}
          title={tRoot('common.empty.default_title')}
          action={
            <Button variant="outline" onClick={() => void load()}>
              {tRoot('common.cta.erneut_versuchen')}
            </Button>
          }
        />
      </div>
    );
  }

  if (loadState === 'empty' || !data) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<Users />}
          title={t('empty.title')}
          description={t('empty.body')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Hauptspalte */}
        <div className="space-y-6">
          {/* Mein Haushalt */}
          <SectionCard
            title={t('haushalt.title')}
            titleAction={
              <span className="text-sm text-text-muted tabular-nums">
                {t('haushalt.count', { count: data.mitglieder.length })}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.mitglieder.map((m) => (
                <MemberCard
                  key={m.persona_ref_id}
                  name={`${m.vorname} ${m.nachname}`.trim()}
                  rolle={rolleLabel(m.rolle)}
                  geburtsdatum={formatIsoDe(m.geburtsdatum)}
                  meta={
                    m.ist_hauptperson ? t('rolle.hauptperson') : undefined
                  }
                />
              ))}
            </div>

            {data.vertretung_speculative ? (
              <aside
                role="note"
                aria-label={t('vertretung_banner.title')}
                className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-accent-soft p-4"
              >
                <IconCircle icon={<Sparkles />} tone="primary" size="sm" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-primary">
                    {t('vertretung_banner.title')}
                    <StatusBadge variant="vorlage">
                      {tRoot('common.context_chip.speculative')}
                    </StatusBadge>
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {t('vertretung_banner.body')}
                  </p>
                </div>
              </aside>
            ) : null}
          </SectionCard>

          {/* Gemeinsame Vorgänge */}
          <SectionCard title={t('vorgaenge.title')}>
            {data.gemeinsame_vorgaenge.length === 0 ? (
              <EmptyState
                icon={<HandCoins />}
                title={t('empty.title')}
                description={t('empty.body')}
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.gemeinsame_vorgaenge.map((v) => {
                  const titel = t(
                    `vorgaenge.${v.thema}` as 'vorgaenge.kindergeld',
                  );
                  const behoerdeName = v.behoerde_id
                    ? behoerdenById[v.behoerde_id]?.name_de
                    : undefined;
                  const names = v.betroffene_member_ids.map(memberName);
                  return (
                    <li key={v.id}>
                      <ListRow
                        leading={
                          <IconCircle
                            icon={VORGANG_ICON[v.thema] ?? <HandCoins />}
                            tone="neutral"
                          />
                        }
                        title={titel}
                        subtitle={
                          behoerdeName ?? t('vorgaenge.kita_traeger')
                        }
                        meta={
                          <MemberChips
                            members={names.map((name) => ({ name }))}
                            aria-label={t('vorgaenge.betrifft', {
                              names: names.join(', '),
                            })}
                          />
                        }
                        status={
                          <StatusBadge
                            variant={VORGANG_STATUS[v.status] ?? 'laufend'}
                          >
                            {tRoot(`common.status.${VORGANG_STATUS[v.status] ?? 'laufend'}`)}
                          </StatusBadge>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-2">
              <Link
                href="/vorgaenge"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:text-primary-hover"
              >
                {t('vorgaenge.show_all')}
              </Link>
            </div>
          </SectionCard>

          {/* Nachweise & Berechtigungen */}
          <SectionCard title={t('nachweise.title')}>
            <ul className="divide-y divide-border">
              {data.nachweise.map((n) => (
                <li key={n.typ}>
                  <ListRow
                    leading={
                      <IconCircle
                        icon={NACHWEIS_ICON[n.typ] ?? <Link2 />}
                        tone="neutral"
                      />
                    }
                    title={t(
                      `nachweise.${n.typ}` as 'nachweise.geburtsurkunde',
                    )}
                    subtitle={
                      n.speculative
                        ? tRoot('common.context_chip.speculative')
                        : undefined
                    }
                    status={
                      <StatusBadge
                        variant={NACHWEIS_STATUS[n.status] ?? 'vorlage'}
                      >
                        {n.status === 'speculative'
                          ? tRoot('common.status.vorlage')
                          : tRoot(
                              `common.status.${NACHWEIS_STATUS[n.status] ?? 'vorlage'}`,
                            )}
                      </StatusBadge>
                    }
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* Rechte Rail — „Was betrifft wen?" */}
        <aside className="space-y-4" aria-label={t('was_betrifft_wen.title')}>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-primary">
              {t('was_betrifft_wen.title')}
            </h2>
            <p className="text-sm text-text-secondary">
              {t('was_betrifft_wen.subtitle')}
            </p>
          </div>
          {data.mitglieder.map((m) => (
            <RightRailCard
              key={m.persona_ref_id}
              title={`${m.vorname} ${m.nachname}`.trim()}
              icon={
                <span className="inline-flex">
                  <IconCircle icon={<Users />} tone="primary" size="sm" />
                </span>
              }
              as="h3"
            >
              <PersonCountList
                counts={m.counts}
                labels={{
                  vorgaenge: t('was_betrifft_wen.vorgaenge'),
                  dokumente: t('was_betrifft_wen.dokumente'),
                  nachweise: t('was_betrifft_wen.nachweise'),
                  vertretungen: t('was_betrifft_wen.vertretungen'),
                }}
              />
            </RightRailCard>
          ))}
        </aside>
      </div>

      {/* Sicher & geschützt */}
      <SectionCard variant="soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <IconCircle icon={<ShieldCheck />} tone="primary" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-text-primary">
                {t('sicher.title')}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t('sicher.body')}
              </p>
            </div>
          </div>
          <Link
            href="/datenschutz"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-muted"
          >
            {t('sicher.more')}
          </Link>
        </div>
      </SectionCard>

      <HaushaltVerwaltenDialog
        open={verwaltenOpen}
        onOpenChange={setVerwaltenOpen}
      />
    </div>
  );
}
