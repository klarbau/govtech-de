'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Briefcase,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Heart,
  Info,
  Landmark,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/shared/Skeleton';
import { api } from '@/lib/mock-backend';
import type {
  Behoerde,
  DatenquellenEintrag,
  DatenschutzEinwilligung,
  EinwilligungEmpfaenger,
  PersonaId,
  UebermittlungsLogEntry,
} from '@/types';

interface DatenschutzViewProps {
  nowIso: string;
}

function formatActivityWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}, ${hh}:${mm}`;
}

function activityBadgeFor(
  kategorie: UebermittlungsLogEntry['kategorie'],
): { cls: string; labelKey: string } {
  switch (kategorie) {
    case 'behoerde_zu_behoerde':
      return { cls: 'green', labelKey: 'uebermittlung' };
    case 'speculative_2027':
      return { cls: 'brand', labelKey: 'vision' };
    case 'behoerde_zu_buerger':
      return { cls: 'brand', labelKey: 'eingang' };
    case 'app_aktivitaet':
    default:
      return { cls: 'brand', labelKey: 'app' };
  }
}

const EMPFAENGER_ICONS: Record<
  EinwilligungEmpfaenger,
  { Icon: React.ComponentType<{ className?: string }>; iconCls: string }
> = {
  krankenkasse: { Icon: Heart, iconCls: 'pink' },
  bank: { Icon: Landmark, iconCls: '' },
  arbeitgeber: { Icon: Briefcase, iconCls: 'amber' },
  weitere_dienste: { Icon: MoreHorizontal, iconCls: '' },
};

const EMPFAENGER_ORDER: EinwilligungEmpfaenger[] = [
  'krankenkasse',
  'bank',
  'arbeitgeber',
  'weitere_dienste',
];

function quellenAvatar(behoerdeId: string, name: string): React.ReactNode {
  if (behoerdeId.includes('finanzamt')) {
    return (
      <span className="av eagle">
        <Landmark />
      </span>
    );
  }
  if (behoerdeId.includes('beitragsservice') || behoerdeId.includes('rundfunk')) {
    return (
      <span className="av ard">
        ARD
        <br />
        ZDF
      </span>
    );
  }
  if (behoerdeId.includes('aok') || behoerdeId.includes('krankenkasse')) {
    return <span className="av aok">AOK</span>;
  }
  return (
    <span className="av">
      <Landmark />
    </span>
  );
}

export function DatenschutzView({ nowIso }: DatenschutzViewProps) {
  const t = useTranslations();
  const [personaId, setPersonaId] = React.useState<PersonaId | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [bannerOpen, setBannerOpen] = React.useState(true);
  const [activities, setActivities] = React.useState<UebermittlungsLogEntry[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});
  const [einwilligungen, setEinwilligungen] = React.useState<DatenschutzEinwilligung[]>([]);
  const [quellen, setQuellen] = React.useState<DatenquellenEintrag[]>([]);

  const [logDialogOpen, setLogDialogOpen] = React.useState(false);
  const [histDialogOpen, setHistDialogOpen] = React.useState(false);
  const [fullLog, setFullLog] = React.useState<UebermittlungsLogEntry[] | null>(null);
  const [exportState, setExportState] = React.useState<'idle' | 'busy' | 'done'>('idle');
  const [liveAnnouncement, setLiveAnnouncement] = React.useState('');

  const einwRef = React.useRef<HTMLDivElement | null>(null);

  void nowIso;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api.getProfile();
        const [log, behoerden, einw, qs] = await Promise.all([
          api.getUebermittlungsLog(profile.id, { limit: 8 }),
          api.getBehoerden(),
          api.getDatenschutzEinwilligungen(profile.id),
          api.getDatenquellen(profile.id),
        ]);
        if (cancelled) return;
        setPersonaId(profile.id);
        setActivities(log);
        setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
        setEinwilligungen(einw);
        setQuellen(qs);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = React.useCallback(
    async (empfaenger: EinwilligungEmpfaenger, next: boolean) => {
      if (!personaId) return;
      setEinwilligungen((prev) =>
        prev.map((e) =>
          e.empfaenger === empfaenger ? { ...e, erteilt: next } : e,
        ),
      );
      const empfLabel = t(`datenschutz.einwilligungen.${empfaenger}`);
      try {
        await api.setDatenschutzEinwilligung(personaId, empfaenger, next);
        // Announce the new state and surface the freshly emitted
        // "Einwilligung geändert" activity at the top of the timeline.
        setLiveAnnouncement(
          t(
            next
              ? 'datenschutz.einwilligungen.announce_ein'
              : 'datenschutz.einwilligungen.announce_aus',
            { empfaenger: empfLabel },
          ),
        );
        try {
          const log = await api.getUebermittlungsLog(personaId, { limit: 8 });
          setActivities(log);
        } catch {
          /* the optimistic toggle already reflects the new state */
        }
      } catch {
        // Revert silently — demo grade.
        setEinwilligungen((prev) =>
          prev.map((e) =>
            e.empfaenger === empfaenger ? { ...e, erteilt: !next } : e,
          ),
        );
      }
    },
    [personaId, t],
  );

  const openLogDialog = React.useCallback(() => {
    setLogDialogOpen(true);
    if (fullLog !== null || !personaId) return;
    void (async () => {
      try {
        const log = await api.getUebermittlungsLog(personaId, { limit: 50 });
        setFullLog(log);
      } catch {
        setFullLog([]);
      }
    })();
  }, [fullLog, personaId]);

  const scrollToEinwilligungen = React.useCallback(() => {
    const node = einwRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstToggle = node.querySelector<HTMLElement>('[role="switch"]');
    firstToggle?.focus({ preventScroll: true });
  }, []);

  const handleExport = React.useCallback(() => {
    if (!personaId) return;
    setExportState('busy');
    const summary = {
      hinweis: t('datenschutz.export.hinweis'),
      erstellt_am: new Date().toISOString(),
      persona_id: personaId,
      einwilligungen: einwilligungen.map((e) => ({
        empfaenger: e.empfaenger,
        erteilt: e.erteilt,
        rechtsgrundlage: e.rechtsgrundlage,
        geaendert_am: e.geaendert_am ?? null,
      })),
      datenquellen: quellen.map((q) => ({
        stelle: behoerdenById[q.behoerde_id]?.name_de ?? q.behoerde_id,
        zugriffsart: q.zugriffsart,
        rechtsgrundlage: q.rechtsgrundlage,
        aktualitaet: q.aktualitaet,
      })),
      letzte_aktivitaeten: activities.map((a) => ({
        zeitpunkt: a.timestamp,
        kategorie: a.kategorie,
        zweck: a.zweck_i18n_key,
        rechtsgrundlage: a.rechtsgrundlage,
      })),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOCK-datenexport-${personaId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportState('done');
    window.setTimeout(() => setExportState('idle'), 2500);
  }, [activities, behoerdenById, einwilligungen, personaId, quellen, t]);

  const consentHistory = (fullLog ?? activities).filter(
    (e) => e.field_id === 'datenschutz_einwilligung',
  );

  const renderLogRow = React.useCallback(
    (entry: UebermittlungsLogEntry) => {
      const senderName = entry.absender_behoerde_id
        ? behoerdenById[entry.absender_behoerde_id]?.name_de ?? entry.absender_behoerde_id
        : undefined;
      const badge = activityBadgeFor(entry.kategorie);
      const title = t.has(entry.zweck_i18n_key)
        ? t(entry.zweck_i18n_key)
        : entry.zweck_i18n_key.split('.').pop() ?? t('datenschutz.activity.fallback');
      return (
        <div key={entry.id} className="item">
          <span className="icon-circle">
            <Shield />
          </span>
          <div>
            <div className="t">{title}</div>
            <div className="s">{senderName ?? entry.rechtsgrundlage}</div>
          </div>
          <div className="meta">
            <div className="when">{formatActivityWhen(entry.timestamp)}</div>
            <span className={`badge ${badge.cls}`}>
              {t(`datenschutz.activity.typ.${badge.labelKey}`)}
            </span>
          </div>
        </div>
      );
    },
    [behoerdenById, t],
  );

  const sortedEinw = EMPFAENGER_ORDER.map((emp) =>
    einwilligungen.find((e) => e.empfaenger === emp),
  ).filter((e): e is DatenschutzEinwilligung => Boolean(e));

  // Build activity rows purely from the backend uebermittlungs-log.
  const activityRows = activities.slice(0, 5).map((entry) => {
    const senderName = entry.absender_behoerde_id
      ? behoerdenById[entry.absender_behoerde_id]?.name_de ?? entry.absender_behoerde_id
      : undefined;
    return {
      id: entry.id,
      icon:
        entry.kategorie === 'behoerde_zu_behoerde' ? (
          <Users />
        ) : entry.kategorie === 'behoerde_zu_buerger' ? (
          <Mail />
        ) : (
          <Shield />
        ),
      iconCls:
        entry.kategorie === 'behoerde_zu_behoerde' ? 'teal' : undefined,
      title: t.has(entry.zweck_i18n_key)
        ? t(entry.zweck_i18n_key)
        : entry.zweck_i18n_key.split('.').pop() ?? t('datenschutz.activity.fallback'),
      sub: senderName ?? entry.rechtsgrundlage,
      when: formatActivityWhen(entry.timestamp),
      badge: activityBadgeFor(entry.kategorie),
    };
  });

  if (!loaded) {
    return <DatenschutzSkeleton />;
  }

  return (
    <>
      <div className="gt-page-head">
        <h1>{t('datenschutz.page.title')}</h1>
        <div className="sub">{t('datenschutz.page.subtitle')}</div>
        <span className="gt-page-tag">{t('datenschutz.page.tag')}</span>
      </div>

      <div aria-live="polite" role="status" className="sr-only">
        {liveAnnouncement}
      </div>

      {bannerOpen ? (
        <div className="ds-vision">
          <span className="icon-circle">
            <Info />
          </span>
          <div className="body">
            <div className="t">{t('datenschutz.vision_banner.heading')}</div>
            <div className="s">
              {t('datenschutz.vision_banner.body_1')}
              <br />
              {t('datenschutz.vision_banner.body_2')}
            </div>
          </div>
          <button
            type="button"
            className="close"
            aria-label={t('datenschutz.vision_banner.dismiss')}
            onClick={() => setBannerOpen(false)}
          >
            <X />
          </button>
        </div>
      ) : null}

      <div className="ds-grid">
        <div className="ds-card act">
          <h2>
            <Clock aria-hidden="true" />
            {t('datenschutz.aktivitaet.title')}
          </h2>
          <ul className="act-list">
            {activityRows.map((row) => (
              <li key={row.id} className="item">
                <span className={`icon-circle${row.iconCls ? ` ${row.iconCls}` : ''}`}>
                  {row.icon}
                </span>
                <div>
                  <div className="t">{row.title}</div>
                  <div className="s">{row.sub}</div>
                </div>
                <div className="meta">
                  <div className="when">{row.when}</div>
                  <span className={`badge ${row.badge.cls}`}>
                    {t(`datenschutz.activity.typ.${row.badge.labelKey}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="all-link"
            onClick={openLogDialog}
            style={{
              color: 'var(--brand-600)',
              fontWeight: 500,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 14,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {t('datenschutz.aktivitaet.show_all')}{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        <div className="ds-card" ref={einwRef}>
          <h2>
            <Shield aria-hidden="true" />
            {t('datenschutz.einwilligungen.title')}
          </h2>
          <div className="sub">{t('datenschutz.einwilligungen.subtitle')}</div>
          {sortedEinw.map((e) => {
            const meta = EMPFAENGER_ICONS[e.empfaenger];
            const empfLabel = t(`datenschutz.einwilligungen.${e.empfaenger}`);
            const empfSub = t(`datenschutz.einwilligungen.${e.empfaenger}_sub`);
            return (
              <div key={e.empfaenger} className="ew-item">
                <span className={`icon-circle${meta.iconCls ? ` ${meta.iconCls}` : ''}`}>
                  <meta.Icon />
                </span>
                <div>
                  <div className="t">{empfLabel}</div>
                  <div className="s">{empfSub}</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: 'flex-end',
                  }}
                >
                  <span className={`state${e.erteilt ? ' on' : ''}`}>
                    {e.erteilt
                      ? t('datenschutz.einwilligungen.ein')
                      : t('datenschutz.einwilligungen.aus')}
                  </span>
                  <button
                    type="button"
                    className={`toggle${e.erteilt ? ' on' : ''}`}
                    role="switch"
                    aria-checked={e.erteilt}
                    aria-label={t(
                      e.erteilt
                        ? 'datenschutz.einwilligungen.toggle_aus'
                        : 'datenschutz.einwilligungen.toggle_ein',
                      { empfaenger: empfLabel },
                    )}
                    onClick={() => void handleToggle(e.empfaenger, !e.erteilt)}
                  />
                </div>
                <ChevronRight className="chev" />
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setHistDialogOpen(true)}
            style={{
              color: 'var(--brand-600)',
              fontWeight: 500,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 12,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {t('datenschutz.einwilligungen.historie_anzeigen')}{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      <div className="ds-bottom">
        <div className="ds-card ds-control">
          <h2>
            <Shield aria-hidden="true" />
            {t('datenschutz.kontrolle.title')}
          </h2>
          <div className="sub">{t('datenschutz.kontrolle.subtitle')}</div>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={openLogDialog}>
              <FileText />
              {t('datenschutz.kontrolle.zugriffsprotokoll')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={!personaId || exportState === 'busy'}
              aria-disabled={!personaId || exportState === 'busy'}
            >
              <Download />
              {exportState === 'done'
                ? t('datenschutz.kontrolle.export_bereit')
                : t('datenschutz.kontrolle.datenexport')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={scrollToEinwilligungen}
            >
              <Settings />
              {t('datenschutz.kontrolle.einstellungen')}
            </button>
          </div>
        </div>

        <div className="ds-card ds-quellen">
          <h2>{t('datenschutz.quellen.title')}</h2>
          <div className="sub">{t('datenschutz.quellen.subtitle')}</div>
          {/* tabIndex 0: die Tabelle pannt unterhalb ~1240px horizontal und
              enthält selbst nichts Fokussierbares (WCAG 2.1.1 / axe
              scrollable-region-focusable). */}
          <div
            className="ds-quellen-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('datenschutz.quellen.title')}
          >
          <table>
            <thead>
              <tr>
                <th scope="col">{t('datenschutz.quellen.col_stelle')}</th>
                <th scope="col">{t('datenschutz.quellen.col_zugriffsart')}</th>
                <th scope="col">{t('datenschutz.quellen.col_aktualitaet')}</th>
                <th scope="col">
                  <span className="sr-only">{t('datenschutz.quellen.col_aktion')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {quellen.map((q, i) => {
                const name = behoerdenById[q.behoerde_id]?.name_de ?? q.behoerde_id;
                const auto = q.zugriffsart === 'automatisch_synchronisiert';
                return (
                  <tr key={`${q.behoerde_id}-${i}`}>
                    <td>
                      <div className="org">
                        {quellenAvatar(q.behoerde_id, name)}
                        {name}
                      </div>
                    </td>
                    <td>
                      {auto ? (
                        <span className="zugriff">
                          <RefreshCw style={{ color: 'var(--green-600)' }} />
                          {t('datenschutz.quellen.automatisch')}
                        </span>
                      ) : (
                        <span className="zugriff eink">
                          <ShieldCheck style={{ color: 'var(--brand-500)' }} />
                          {t('datenschutz.quellen.einwilligungsbasiert')}
                        </span>
                      )}
                    </td>
                    <td className="muted">{q.aktualitaet}</td>
                    <td>
                      <ChevronRight style={{ color: 'var(--ink-4)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <p
            style={{
              color: 'var(--ink-3)',
              fontWeight: 400,
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {t('datenschutz.quellen.angezeigt', {
              shown: quellen.length,
              total: quellen.length,
            })}
          </p>
        </div>
      </div>

      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('datenschutz.kontrolle.zugriffsprotokoll')}</DialogTitle>
            <DialogDescription>
              {t('datenschutz.log_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div
            className="ds-card act"
            style={{
              border: 'none',
              padding: 0,
              boxShadow: 'none',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {fullLog === null ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                {t('datenschutz.log_dialog.loading')}
              </p>
            ) : fullLog.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                {t('datenschutz.log_dialog.empty')}
              </p>
            ) : (
              fullLog.map(renderLogRow)
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={histDialogOpen} onOpenChange={setHistDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('datenschutz.hist_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('datenschutz.hist_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div
            className="ds-card act"
            style={{
              border: 'none',
              padding: 0,
              boxShadow: 'none',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {consentHistory.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                {t('datenschutz.hist_dialog.empty')}
              </p>
            ) : (
              consentHistory.map(renderLogRow)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DatenschutzSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-80" />
      </div>
      <Skeleton className="mb-6 h-20 rounded-2xl" />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}
