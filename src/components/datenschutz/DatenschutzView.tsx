'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Download, ScrollText, Settings, ShieldCheck } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type {
  Behoerde,
  DatenquellenEintrag,
  DatenschutzEinwilligung,
  EinwilligungEmpfaenger,
  PersonaId,
  UebermittlungsLogEntry,
} from '@/types';

import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { RightRailCard } from '@/components/shared/RightRailCard';
import { DataTable, type DataTableRow } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';

import { DatenschutzVisionBanner } from './VisionBanner';
import { ActivityTimelineRow } from './ActivityTimelineRow';
import { ConsentToggleRow } from './ConsentToggleRow';
import { KontrollAktionTile } from './KontrollAktionTile';

interface DatenschutzViewProps {
  /** SSR-stable demo "now" für deterministische Relativ-Zeit in der Timeline. */
  nowIso: string;
}

const TIMELINE_INITIAL = 5;
const EMPFAENGER_ORDER: EinwilligungEmpfaenger[] = [
  'krankenkasse',
  'bank',
  'arbeitgeber',
  'weitere_dienste',
];

export function DatenschutzView({ nowIso }: DatenschutzViewProps) {
  const t = useTranslations('datenschutz');
  const tEinw = useTranslations('datenschutz.einwilligungen');
  const tQuellen = useTranslations('datenschutz.quellen');
  const tKontrolle = useTranslations('datenschutz.kontrolle');
  const tRoot = useTranslations();

  const [personaId, setPersonaId] = React.useState<PersonaId | null>(null);
  const [log, setLog] = React.useState<UebermittlungsLogEntry[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});
  const [einwilligungen, setEinwilligungen] = React.useState<DatenschutzEinwilligung[]>([]);
  const [datenquellen, setDatenquellen] = React.useState<DatenquellenEintrag[]>([]);
  const [bannerDismissed, setBannerDismissed] = React.useState(true);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [showAllActivity, setShowAllActivity] = React.useState(false);
  const [pendingEmpfaenger, setPendingEmpfaenger] =
    React.useState<EinwilligungEmpfaenger | null>(null);
  const [announce, setAnnounce] = React.useState('');

  const dismissBtnRef = React.useRef<HTMLButtonElement>(null);
  const aktivitaetHeadingRef = React.useRef<HTMLHeadingElement>(null);

  const load = React.useCallback(async () => {
    setLoadState('loading');
    try {
      const profile = await api.getProfile();
      const [logEntries, behoerden, einw, quellen, dismissed] = await Promise.all([
        api.getUebermittlungsLog(profile.id, { limit: 20 }),
        api.getBehoerden(),
        api.getDatenschutzEinwilligungen(profile.id),
        api.getDatenquellen(profile.id),
        api.isVisionBannerDismissed(profile.id),
      ]);
      setPersonaId(profile.id);
      setLog(logEntries);
      setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
      setEinwilligungen(einw);
      setDatenquellen(quellen);
      setBannerDismissed(dismissed);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Live-Aktualisierung der Timeline, wenn ein Log-Eintrag emittiert wird
  // (z. B. durch einen Einwilligungs-Toggle). Re-fetch hält die Reihenfolge
  // konsistent mit dem Backend-Sort.
  React.useEffect(() => {
    if (!personaId) return;
    const unsubscribe = api.subscribe((event) => {
      if (
        event.type === 'stammdaten/log-entry-appended' &&
        event.persona_id === personaId
      ) {
        void api
          .getUebermittlungsLog(personaId, { limit: 20 })
          .then(setLog)
          .catch(() => {
            /* nicht blockierend — der nächste Load gleicht ab */
          });
      }
    });
    return unsubscribe;
  }, [personaId]);

  const handleToggle = React.useCallback(
    async (empfaenger: EinwilligungEmpfaenger, next: boolean) => {
      if (!personaId) return;
      const empfaengerLabel = tEinw(empfaenger);
      // Optimistic update.
      setEinwilligungen((prev) =>
        prev.map((e) => (e.empfaenger === empfaenger ? { ...e, erteilt: next } : e)),
      );
      setPendingEmpfaenger(empfaenger);
      try {
        await api.setDatenschutzEinwilligung(personaId, empfaenger, next);
        setAnnounce(
          next
            ? tEinw('announce_ein', { empfaenger: empfaengerLabel })
            : tEinw('announce_aus', { empfaenger: empfaengerLabel }),
        );
        // Datenquellen-Aktualität ist an die Krankenkasse-Einwilligung gekoppelt.
        const quellen = await api.getDatenquellen(personaId);
        setDatenquellen(quellen);
      } catch {
        // Revert + Fehler-Toast.
        setEinwilligungen((prev) =>
          prev.map((e) =>
            e.empfaenger === empfaenger ? { ...e, erteilt: !next } : e,
          ),
        );
        toast.error(t('toast.einwilligung_error'));
      } finally {
        setPendingEmpfaenger(null);
      }
    },
    [personaId, t, tEinw],
  );

  const handleDismissBanner = React.useCallback(async () => {
    if (!personaId) return;
    setBannerDismissed(true);
    // Fokus sinnvoll auf die nachfolgende Sektions-Überschrift setzen.
    aktivitaetHeadingRef.current?.focus();
    try {
      await api.dismissVisionBanner(personaId);
    } catch {
      /* Dismiss ist nicht kritisch — UI-State bleibt geschlossen. */
    }
  }, [personaId]);

  const handleVisionAction = React.useCallback(() => {
    toast(tKontrolle('vision_hint'));
  }, [tKontrolle]);

  const handleZugriffsprotokoll = React.useCallback(() => {
    aktivitaetHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    aktivitaetHeadingRef.current?.focus();
  }, []);

  const header = (
    <PageHeader
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      contextChip={{
        label: tRoot('common.context_chip.speculative'),
        tone: 'speculative',
      }}
    />
  );

  if (loadState === 'loading') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
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
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
        {header}
        <EmptyState
          icon={<ShieldCheck />}
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

  const sortedEinwilligungen = EMPFAENGER_ORDER.map((empf) =>
    einwilligungen.find((e) => e.empfaenger === empf),
  ).filter((e): e is DatenschutzEinwilligung => Boolean(e));

  const visibleLog = showAllActivity ? log : log.slice(0, TIMELINE_INITIAL);

  const quellenRows: DataTableRow[] = datenquellen.map((q, i) => {
    const behoerde = behoerdenById[q.behoerde_id];
    const zugriffsartLabel =
      q.zugriffsart === 'automatisch_synchronisiert'
        ? tQuellen('automatisch')
        : tQuellen('einwilligungsbasiert');
    const aktualitaet =
      q.aktualitaet === 'aktuell'
        ? tQuellen('aktuell')
        : q.aktualitaet === '—'
          ? '—'
          : q.aktualitaet;
    return {
      id: `${q.behoerde_id}-${i}`,
      cells: {
        stelle: (
          <BehoerdenBadge
            name={behoerde?.name_de ?? q.behoerde_id}
            kategorie={behoerde?.kategorie}
          />
        ),
        zugriffsart: (
          <StatusBadge
            variant={q.zugriffsart === 'automatisch_synchronisiert' ? 'laufend' : 'aktiv'}
          >
            {zugriffsartLabel}
          </StatusBadge>
        ),
        aktualitaet: <span className="tabular-nums">{aktualitaet}</span>,
      },
    };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
      {header}

      {/* Live-Region für Toggle-Zustands-Ansagen. */}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {!bannerDismissed ? (
        <div className="mb-6">
          <DatenschutzVisionBanner
            onDismiss={() => void handleDismissBanner()}
            dismissButtonRef={dismissBtnRef}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Hauptspalte */}
        <div className="space-y-6">
          <SectionCard title={undefined}>
            <h2
              ref={aktivitaetHeadingRef}
              tabIndex={-1}
              className="mb-3 text-base font-semibold text-text-primary outline-none"
            >
              {t('aktivitaet.title')}
            </h2>
            {log.length === 0 ? (
              <EmptyState
                icon={<ScrollText />}
                title={t('empty.title')}
                description={t('empty.description')}
              />
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {visibleLog.map((entry) => (
                    <ActivityTimelineRow
                      key={entry.id}
                      entry={entry}
                      behoerdenById={behoerdenById}
                      nowIso={nowIso}
                    />
                  ))}
                </ul>
                {log.length > TIMELINE_INITIAL ? (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={showAllActivity}
                      onClick={() => setShowAllActivity((v) => !v)}
                    >
                      {showAllActivity
                        ? t('aktivitaet.show_less')
                        : t('aktivitaet.show_all')}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </SectionCard>

          <SectionCard title={tQuellen('title')}>
            <DataTable
              caption={tQuellen('title')}
              columns={[
                { id: 'stelle', header: tQuellen('col_stelle'), align: 'start' },
                {
                  id: 'zugriffsart',
                  header: tQuellen('col_zugriffsart'),
                  align: 'start',
                },
                {
                  id: 'aktualitaet',
                  header: tQuellen('col_aktualitaet'),
                  align: 'end',
                },
              ]}
              rows={quellenRows}
            />
          </SectionCard>

          <SectionCard title={tKontrolle('title')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KontrollAktionTile
                icon={<ScrollText />}
                label={tKontrolle('zugriffsprotokoll')}
                description={tKontrolle('zugriffsprotokoll_desc')}
                onClick={handleZugriffsprotokoll}
              />
              <KontrollAktionTile
                icon={<Download />}
                label={tKontrolle('datenexport')}
                description={tKontrolle('datenexport_desc')}
                onClick={handleVisionAction}
              />
              <KontrollAktionTile
                icon={<Settings />}
                label={tKontrolle('einstellungen')}
                description={tKontrolle('einstellungen_desc')}
                onClick={handleVisionAction}
              />
            </div>
          </SectionCard>
        </div>

        {/* Rechte Rail — Einwilligungen */}
        <aside className="space-y-6" aria-label={tEinw('title')}>
          <RightRailCard title={tEinw('title')} as="h2">
            <p className="mb-1 text-sm text-text-secondary">{tEinw('subtitle')}</p>
            <div className="divide-y divide-border">
              {sortedEinwilligungen.map((e) => (
                <ConsentToggleRow
                  key={e.empfaenger}
                  label={tEinw(e.empfaenger)}
                  checked={e.erteilt}
                  rechtsgrundlage={e.rechtsgrundlage}
                  pending={pendingEmpfaenger === e.empfaenger}
                  onToggle={(next) => void handleToggle(e.empfaenger, next)}
                />
              ))}
            </div>
          </RightRailCard>
        </aside>
      </div>
    </div>
  );
}
