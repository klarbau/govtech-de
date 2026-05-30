'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Shield,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/lib/mock-backend';
import type { Document, SteuerBereich, SteuerUebersicht } from '@/types';

/* Literal port of docs/design-prototype-v2/steuer.html. */

interface SteuerViewProps {
  nowIso: string;
  steuerjahr: number;
}

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

function formatStand(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function daysUntil(iso: string, nowIso: string): number {
  return Math.ceil((new Date(iso).getTime() - new Date(nowIso).getTime()) / (1000 * 60 * 60 * 24));
}

const BEREICH_ICONS: Array<{ Icon: React.ComponentType<{ className?: string }>; iconClass: string }> = [
  { Icon: Briefcase, iconClass: '' },
  { Icon: Briefcase, iconClass: 'green' },
  { Icon: Shield, iconClass: 'teal' },
  { Icon: Users, iconClass: 'pink' },
  { Icon: User, iconClass: '' },
];

function bereichVisual(idx: number): { Icon: React.ComponentType<{ className?: string }>; iconClass: string } {
  return BEREICH_ICONS[idx % BEREICH_ICONS.length];
}

const QUELLE_ICONS: Array<{ Icon: React.ComponentType<{ className?: string }>; iconClass: string }> = [
  { Icon: Wallet, iconClass: '' },
  { Icon: User, iconClass: 'pink' },
  { Icon: Shield, iconClass: 'green' },
  { Icon: Database, iconClass: '' },
];

function quelleVisual(
  idx: number,
  total: number,
): { Icon: React.ComponentType<{ className?: string }>; iconClass: string; full: boolean } {
  const base = QUELLE_ICONS[idx % QUELLE_ICONS.length];
  return { ...base, full: idx === total - 1 };
}

export function SteuerView({ nowIso, steuerjahr }: SteuerViewProps) {
  const t = useTranslations();
  const [uebersicht, setUebersicht] = React.useState<SteuerUebersicht | null>(null);
  const [documentsById, setDocumentsById] = React.useState<Record<string, Document>>({});
  const [behoerdenNameById, setBehoerdenNameById] = React.useState<Record<string, string>>({});
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api.getProfile();
        const [u, docs, behoerden] = await Promise.all([
          api.getSteuerUebersicht(profile.id, steuerjahr),
          api.getDocuments(),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        setUebersicht(u);
        setDocumentsById(Object.fromEntries(docs.map((d) => [d.id, d])));
        setBehoerdenNameById(Object.fromEntries(behoerden.map((b) => [b.id, b.name_de])));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [steuerjahr]);

  /* Use a NBSP between number and € so the value never wraps to two lines. */
  const erstattung = (
    uebersicht
      ? euroFormatter.format(uebersicht.voraussichtliche_erstattung_cent / 100)
      : '—'
  ).replace(/\s/g, ' ');

  const activeStep = uebersicht?.fortschritt_aktiver_schritt ?? 0;

  const bereiche: SteuerBereich[] = uebersicht?.bereiche ?? [];
  const fristen = uebersicht?.fristen ?? [];
  const datenquellen = uebersicht?.datenquellen ?? [];

  const verwendeteNachweise = (uebersicht?.verwendete_nachweise_document_ids ?? [])
    .map((id) => documentsById[id])
    .filter((d): d is Document => Boolean(d));

  return (
    <main className="gt-content">
      <div className="gt-page-head">
        <h1>{t('steuer.title')}</h1>
        <div className="sub">{t('steuer.subtitle')}</div>
      </div>

      <div className="st-layout">
        <div>
          <div className="st-card">
            <div className="st-year-row">
              <div>
                <h2>
                  {t('steuer.hero.steuerjahr', {
                    jahr: uebersicht?.steuerjahr ?? steuerjahr,
                  })}{' '}
                  <span className="badge brand">{t('steuer.hero.entwurf_badge')}</span>
                </h2>
                <div className="stand">{t('steuer.hero.stand', { datum: formatStand(nowIso) })}</div>
                <div className="vor">{t('steuer.hero.erstattung_label')}</div>
                <div className="erstattung" style={{ whiteSpace: 'nowrap' }}>
                  {erstattung}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-700)', fontSize: 13 }}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--green-600)' }} />
                  {t('steuer.hero.basis_hint')}
                </div>
              </div>
              <div className="quellen-grid">
                <div className="lbl">{t('steuer.hero.datenquellen_label')}</div>
                {datenquellen.map((q, i) => {
                  const visual = quelleVisual(i, datenquellen.length);
                  return (
                    <div key={q.id} className={`qcard${visual.full ? ' full' : ''}`}>
                      <span className={`icon-circle${visual.iconClass ? ` ${visual.iconClass}` : ''}`}>
                        <visual.Icon />
                      </span>
                      <div>
                        <div className="t">{t(q.label_i18n_key)}</div>
                        <div className="s">{q.herkunft}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="progress-row">
              <h4>{t('steuer.fortschritt.title')}</h4>
              <div className="pr-steps">
                <div className={`pr-step${activeStep > 0 ? '' : ' current'}`}>
                  <span className="dot">
                    {activeStep > 0 ? <Check style={{ width: 14, height: 14 }} /> : '1'}
                  </span>
                  <div>
                    <div className="t">{t('steuer.fortschritt.geprueft')}</div>
                    <div className="s">
                      {t('steuer.fortschritt.geprueft_desc')}
                      <br />
                      {formatStand(nowIso)}
                    </div>
                  </div>
                </div>
                <div className={`pr-step${activeStep === 1 ? ' current' : activeStep > 1 ? '' : ' pending'}`}>
                  <span className="dot">
                    {activeStep > 1 ? <Check style={{ width: 14, height: 14 }} /> : '2'}
                  </span>
                  <div>
                    <div className="t">{t('steuer.fortschritt.ergaenzen')}</div>
                    <div className="s">
                      {t('steuer.fortschritt.ergaenzen_desc')}
                      <br />
                      <a className="link" href="#nachweise">
                        {t('steuer.fortschritt.anzeigen')}
                      </a>
                    </div>
                  </div>
                </div>
                <div className={`pr-step${activeStep === 2 ? ' current' : activeStep < 2 ? ' pending' : ''}`}>
                  <span className="dot">3</span>
                  <div>
                    <div className="t">{t('steuer.fortschritt.abgabe')}</div>
                    <div className="s">{t('steuer.fortschritt.abgabe_desc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="st-card uberblick" id="steuerbereiche">
            <h3>{t('steuer.bereiche.title')}</h3>
            <table>
              <thead>
                <tr>
                  <th>{t('steuer.col.bereich')}</th>
                  <th style={{ textAlign: 'right' }}>{t('steuer.col.betrag')}</th>
                  <th>{t('steuer.col.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('steuer.col.aktion')}</th>
                </tr>
              </thead>
              <tbody>
                {bereiche.map((b, idx) => {
                  const visual = bereichVisual(idx);
                  const badgeClass =
                    b.status === 'geprueft' ? 'green' : b.status === 'ergaenzen' ? 'amber' : 'outline';
                  const badgeLabel = t(`steuer.status.${b.status}`);
                  const actionKey =
                    b.status === 'ergaenzen'
                      ? 'ergaenzen'
                      : b.status === 'nicht_vorhanden'
                        ? 'hinzufuegen'
                        : 'ansehen';
                  const bereichName = t(b.name_i18n_key);
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="bereich">
                          <span className={`icon-square${visual.iconClass ? ` ${visual.iconClass}` : ''}`}>
                            <visual.Icon />
                          </span>
                          <div>
                            <div className="t">{bereichName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        {b.betrag_cent !== undefined
                          ? euroFormatter.format(b.betrag_cent / 100)
                          : '—'}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="right-link"
                          aria-label={t(`steuer.aktion.${actionKey}_aria`, {
                            bereich: bereichName,
                          })}
                          onClick={() =>
                            toast(bereichName, {
                              description: t('steuer.demo_action_toast'),
                            })
                          }
                          style={{ background: 'none', border: 0, cursor: 'pointer' }}
                        >
                          {t(`steuer.aktion.${actionKey}`)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <a
              className="right-link"
              href="#steuerbereiche"
              style={{ marginTop: 12, display: 'inline-flex' }}
            >
              {t('steuer.alle_bereiche')} <ChevronRight style={{ width: 12, height: 12 }} />
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="st-card frist-card">
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>{t('steuer.fristen.title')}</h3>
            {fristen.map((f) => {
              const days = daysUntil(f.datum, nowIso);
              const label = t(f.label_i18n_key, {
                jahr: uebersicht?.steuerjahr ?? steuerjahr,
              });
              return (
                <div key={f.label_i18n_key + f.datum} className="item">
                  <Calendar className="icon" />
                  <div>
                    <div className="t">{label}</div>
                    <div className="d">{formatStand(f.datum)}</div>
                  </div>
                  <span className="badge brand">
                    {days >= 0
                      ? t('steuer.frist.in_tagen', { count: days })
                      : t('steuer.frist.ueberfaellig')}
                  </span>
                </div>
              );
            })}
            <Link
              className="right-link"
              href="/termine"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}
            >
              {t('steuer.fristen.show_all')} <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          <div className="st-card nachweise" id="nachweise">
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>{t('steuer.nachweise.title')}</h3>
            {verwendeteNachweise.map((n) => (
              <div key={n.id} className="item">
                <span className="av">
                  <FileText />
                </span>
                <div>
                  <div className="t">{n.titel}</div>
                  <div className="s">
                    {behoerdenNameById[n.ausstellende_behoerde_id] ?? n.ausstellende_behoerde_id}
                    <br />
                    {t('steuer.nachweise.ausgestellt_am', { datum: formatStand(n.ausgestellt_am) })}
                  </div>
                </div>
                <span className="badge green">{t('steuer.nachweise.verwendet')}</span>
              </div>
            ))}
            <Link
              className="right-link"
              href="/dokumente"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}
            >
              {t('steuer.nachweise.show_all')} <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t('steuer.loading')}
        </div>
      ) : null}

      {/* Suppress unused warnings for icons we keep import-pinned to the design palette. */}
      <span hidden>
        <Bell />
      </span>
    </main>
  );
}
