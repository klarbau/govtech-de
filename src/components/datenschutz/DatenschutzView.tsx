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
): { cls: string; label: string } {
  switch (kategorie) {
    case 'behoerde_zu_behoerde':
      return { cls: 'green', label: 'Übermittlung' };
    case 'speculative_2027':
      return { cls: 'brand', label: 'Spekulativ 2027' };
    case 'behoerde_zu_buerger':
      return { cls: 'brand', label: 'Posteingang' };
    case 'app_aktivitaet':
    default:
      return { cls: 'brand', label: 'App-Aktivität' };
  }
}

const EMPFAENGER_ICONS: Record<
  EinwilligungEmpfaenger,
  { Icon: React.ComponentType<{ className?: string }>; iconCls: string; label: string; sub: string }
> = {
  krankenkasse: {
    Icon: Heart,
    iconCls: 'pink',
    label: 'Krankenkasse',
    sub: 'Datenübermittlung für Abrechnungen und Leistungen',
  },
  bank: {
    Icon: Landmark,
    iconCls: '',
    label: 'Bank',
    sub: 'Kontodatenprüfung für Erstattungen',
  },
  arbeitgeber: {
    Icon: Briefcase,
    iconCls: 'amber',
    label: 'Arbeitgeber',
    sub: 'Datenweitergabe für Lohnsteuer und Bescheinigungen',
  },
  weitere_dienste: {
    Icon: MoreHorizontal,
    iconCls: '',
    label: 'Weitere Dienste',
    sub: 'Weitere Behörden und Organisationen',
  },
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
  const [bannerOpen, setBannerOpen] = React.useState(true);
  const [activities, setActivities] = React.useState<UebermittlungsLogEntry[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});
  const [einwilligungen, setEinwilligungen] = React.useState<DatenschutzEinwilligung[]>([]);
  const [quellen, setQuellen] = React.useState<DatenquellenEintrag[]>([]);

  const [logDialogOpen, setLogDialogOpen] = React.useState(false);
  const [histDialogOpen, setHistDialogOpen] = React.useState(false);
  const [fullLog, setFullLog] = React.useState<UebermittlungsLogEntry[] | null>(null);
  const [exportState, setExportState] = React.useState<'idle' | 'busy' | 'done'>('idle');

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
      try {
        await api.setDatenschutzEinwilligung(personaId, empfaenger, next);
      } catch {
        // Revert silently — demo grade.
        setEinwilligungen((prev) =>
          prev.map((e) =>
            e.empfaenger === empfaenger ? { ...e, erteilt: !next } : e,
          ),
        );
      }
    },
    [personaId],
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
      hinweis: '[MOCK] Speculative-Design-Demo — keine echten personenbezogenen Daten.',
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
  }, [activities, behoerdenById, einwilligungen, personaId, quellen]);

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
        : entry.zweck_i18n_key.split('.').pop() ?? 'Aktivität';
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
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
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
        : entry.zweck_i18n_key.split('.').pop() ?? 'Aktivität',
      sub: senderName ?? entry.rechtsgrundlage,
      when: formatActivityWhen(entry.timestamp),
      badge: activityBadgeFor(entry.kategorie),
    };
  });

  return (
    <>
      <div className="gt-page-head">
        <h1>Datenschutz</h1>
        <div className="sub">
          Einblick in Datenzugriffe, Einwilligungen und Verwendungszwecke.
        </div>
        <span className="gt-page-tag">Spekulatives Demo-Feature</span>
      </div>

      {bannerOpen ? (
        <div className="ds-vision">
          <span className="icon-circle">
            <Info />
          </span>
          <div className="body">
            <div className="t">2027-Vision</div>
            <div className="s">
              Diese Funktionen sind Teil unserer Vision für mehr Transparenz und
              Selbstbestimmung über Ihre Daten.
              <br />
              Verfügbarkeit und Inhalte können sich bis zur Einführung ändern.
            </div>
          </div>
          <button
            type="button"
            className="close"
            aria-label="Hinweis schließen"
            onClick={() => setBannerOpen(false)}
          >
            <X />
          </button>
        </div>
      ) : null}

      <div className="ds-grid">
        <div className="ds-card act">
          <h3>
            <Clock />
            Letzte Aktivitäten
          </h3>
          {activityRows.map((row) => (
            <div key={row.id} className="item">
              <span className={`icon-circle${row.iconCls ? ` ${row.iconCls}` : ''}`}>
                {row.icon}
              </span>
              <div>
                <div className="t">{row.title}</div>
                <div className="s">{row.sub}</div>
              </div>
              <div className="meta">
                <div className="when">{row.when}</div>
                <span className={`badge ${row.badge.cls}`}>{row.badge.label}</span>
              </div>
            </div>
          ))}
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
            Alle Aktivitäten anzeigen{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        <div className="ds-card" ref={einwRef}>
          <h3>
            <Shield />
            Einwilligungen
          </h3>
          <div className="sub">
            Steuern Sie, welche Stellen und Dienste auf Ihre Daten zugreifen
            dürfen.
          </div>
          {sortedEinw.map((e) => {
            const meta = EMPFAENGER_ICONS[e.empfaenger];
            if (e.empfaenger === 'weitere_dienste') {
              return (
                <div key={e.empfaenger} className="ew-item">
                  <span className="icon-circle">
                    <meta.Icon />
                  </span>
                  <div>
                    <div className="t">{meta.label}</div>
                    <div className="s">{meta.sub}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="state on"
                      onClick={() => setHistDialogOpen(true)}
                      style={{
                        color: 'var(--brand-600)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      Verwalten
                    </button>
                  </div>
                  <ChevronRight className="chev" />
                </div>
              );
            }
            return (
              <div key={e.empfaenger} className="ew-item">
                <span className={`icon-circle${meta.iconCls ? ` ${meta.iconCls}` : ''}`}>
                  <meta.Icon />
                </span>
                <div>
                  <div className="t">{meta.label}</div>
                  <div className="s">{meta.sub}</div>
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
                    {e.erteilt ? 'Ein' : 'Aus'}
                  </span>
                  <button
                    type="button"
                    className={`toggle${e.erteilt ? ' on' : ''}`}
                    role="switch"
                    aria-checked={e.erteilt}
                    aria-label={`${meta.label} ${e.erteilt ? 'aus' : 'ein'}schalten`}
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
            Einwilligungshistorie anzeigen{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      <div className="ds-bottom">
        <div className="ds-card ds-control">
          <h3>
            <Shield />
            Ihre Datenschutz-Kontrolle
          </h3>
          <div className="sub">
            Sie entscheiden, wer Ihre Daten wie verwenden darf.
          </div>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={openLogDialog}>
              <FileText />
              Zugriffsprotokoll
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={!personaId || exportState === 'busy'}
              aria-disabled={!personaId || exportState === 'busy'}
            >
              <Download />
              {exportState === 'done' ? 'Export bereit' : 'Datenexport'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={scrollToEinwilligungen}
            >
              <Settings />
              Einstellungen
            </button>
          </div>
        </div>

        <div className="ds-card ds-quellen">
          <h3>Datenquellen &amp; Empfänger</h3>
          <div className="sub">
            Übersicht darüber, welche Stellen auf Ihre Daten zugreifen und wie.
          </div>
          <table>
            <thead>
              <tr>
                <th>Stelle / Dienst</th>
                <th>Zugriffsart</th>
                <th>Aktualität</th>
                <th />
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
                          Automatisch synchronisiert
                        </span>
                      ) : (
                        <span className="zugriff eink">
                          <ShieldCheck style={{ color: 'var(--brand-500)' }} />
                          Einwilligungsbasiert
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
          <p
            style={{
              color: 'var(--ink-3)',
              fontWeight: 400,
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {quellen.length} von {quellen.length} Datenquellen angezeigt.
          </p>
        </div>
      </div>

      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Zugriffsprotokoll</DialogTitle>
            <DialogDescription>
              Vollständiges Protokoll der Datenzugriffe und -übermittlungen.
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
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>Wird geladen …</p>
            ) : fullLog.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                Keine Aktivitäten vorhanden.
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
            <DialogTitle>Einwilligungshistorie</DialogTitle>
            <DialogDescription>
              Änderungen an Ihren erteilten und widerrufenen Einwilligungen.
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
                Noch keine Einwilligungsänderungen erfasst.
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
