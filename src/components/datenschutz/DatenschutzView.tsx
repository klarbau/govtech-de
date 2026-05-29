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
          <a
            href="#"
            className="all-link"
            style={{
              color: 'var(--brand-600)',
              fontWeight: 500,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 14,
            }}
          >
            Alle Aktivitäten anzeigen{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </a>
        </div>

        <div className="ds-card">
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
                    <a
                      href="#"
                      className="state on"
                      style={{ color: 'var(--brand-600)' }}
                    >
                      Verwalten
                    </a>
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
          <a
            href="#"
            style={{
              color: 'var(--brand-600)',
              fontWeight: 500,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 12,
            }}
          >
            Einwilligungshistorie anzeigen{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </a>
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
            <button type="button" className="btn btn-secondary">
              <FileText />
              Zugriffsprotokoll
            </button>
            <button type="button" className="btn btn-secondary">
              <Download />
              Datenexport
            </button>
            <button type="button" className="btn btn-secondary">
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
          <a
            href="#"
            style={{
              color: 'var(--brand-600)',
              fontWeight: 500,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 12,
            }}
          >
            Alle Datenquellen anzeigen{' '}
            <ChevronRight style={{ width: 12, height: 12 }} />
          </a>
        </div>
      </div>
    </>
  );
}
