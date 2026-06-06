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
import { Skeleton } from '@/components/shared/Skeleton';
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

  const datenschutz = uebersicht?.datenschutz;
  const watermark = uebersicht?.watermark ?? '[MOCK]';

  if (!loaded) {
    return <SteuerSkeleton />;
  }

  return (
    <>
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
                  <span className="badge brand">{t('steuer.hero.entwurf_badge')}</span>{' '}
                  <span
                    className="badge outline"
                    role="note"
                    style={{ fontFamily: 'var(--mono, monospace)' }}
                  >
                    {watermark}
                  </span>
                </h2>
                <div className="stand">{t('steuer.hero.stand', { datum: formatStand(nowIso) })}</div>
                <div className="vor">{t('steuer.hero.erstattung_label')}</div>
                <div
                  className="erstattung"
                  style={{ whiteSpace: 'nowrap' }}
                  aria-label={t('steuer.hero.erstattung_aria', { betrag: erstattung })}
                >
                  {erstattung}
                </div>
                <div
                  className="st-basis-hint"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                >
                  <CheckCircle2 style={{ width: 16, height: 16 }} aria-hidden="true" />
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
              <h3>{t('steuer.fortschritt.title')}</h3>
              <ol className="pr-steps">
                <li
                  className={`pr-step${activeStep > 0 ? '' : ' current'}`}
                  aria-current={activeStep === 0 ? 'step' : undefined}
                >
                  <span className="dot">
                    {activeStep > 0 ? (
                      <Check style={{ width: 14, height: 14 }} aria-hidden="true" />
                    ) : (
                      '1'
                    )}
                  </span>
                  <div>
                    <div className="t">
                      {t('steuer.fortschritt.geprueft')}
                      <span className="sr-only">
                        {' '}
                        {t(
                          activeStep > 0
                            ? 'steuer.fortschritt.status_done'
                            : 'steuer.fortschritt.status_active',
                        )}
                      </span>
                    </div>
                    <div className="s">
                      {t('steuer.fortschritt.geprueft_desc')}
                      <br />
                      {formatStand(nowIso)}
                    </div>
                  </div>
                </li>
                <li
                  className={`pr-step${activeStep === 1 ? ' current' : activeStep > 1 ? '' : ' pending'}`}
                  aria-current={activeStep === 1 ? 'step' : undefined}
                >
                  <span className="dot">
                    {activeStep > 1 ? (
                      <Check style={{ width: 14, height: 14 }} aria-hidden="true" />
                    ) : (
                      '2'
                    )}
                  </span>
                  <div>
                    <div className="t">
                      {t('steuer.fortschritt.ergaenzen')}
                      <span className="sr-only">
                        {' '}
                        {t(
                          activeStep > 1
                            ? 'steuer.fortschritt.status_done'
                            : activeStep === 1
                              ? 'steuer.fortschritt.status_active'
                              : 'steuer.fortschritt.status_pending',
                        )}
                      </span>
                    </div>
                    <div className="s">
                      {t('steuer.fortschritt.ergaenzen_desc')}
                      <br />
                      <a className="link" href="#nachweise">
                        {t('steuer.fortschritt.anzeigen')}
                      </a>
                    </div>
                  </div>
                </li>
                <li
                  className={`pr-step${activeStep === 2 ? ' current' : activeStep < 2 ? ' pending' : ''}`}
                  aria-current={activeStep === 2 ? 'step' : undefined}
                >
                  <span className="dot">3</span>
                  <div>
                    <div className="t">
                      {t('steuer.fortschritt.abgabe')}
                      <span className="sr-only">
                        {' '}
                        {t(
                          activeStep === 2
                            ? 'steuer.fortschritt.status_active'
                            : 'steuer.fortschritt.status_pending',
                        )}
                      </span>
                    </div>
                    <div className="s">{t('steuer.fortschritt.abgabe_desc')}</div>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <div className="st-card uberblick" id="steuerbereiche">
            <h3>{t('steuer.bereiche.title')}</h3>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('steuer.col.bereich')}</th>
                  <th scope="col" style={{ textAlign: 'right' }}>{t('steuer.col.betrag')}</th>
                  <th scope="col">{t('steuer.col.status')}</th>
                  <th scope="col" style={{ textAlign: 'right' }}>{t('steuer.col.aktion')}</th>
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
                      <td style={{ textAlign: 'right' }} className="mono text-end">
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

          <div className="st-card st-privacy">
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield style={{ width: 16, height: 16 }} aria-hidden="true" />
              {t('steuer.datenschutz.title')}
            </h3>
            <dl className="st-privacy-dl">
              <dt>{t('steuer.datenschutz.verarbeitet_label')}</dt>
              <dd>
                {(datenschutz?.verarbeitete_daten_i18n_keys ?? []).map((k) => t(k)).join(', ') || '—'}
              </dd>
              <dt>{t('steuer.datenschutz.rechtsgrundlage_label')}</dt>
              <dd>{datenschutz?.rechtsgrundlage ?? '—'}</dd>
              <dt>{t('steuer.datenschutz.empfaenger_label')}</dt>
              <dd>
                {datenschutz
                  ? behoerdenNameById[datenschutz.empfaenger_behoerde_id] ??
                    datenschutz.empfaenger_behoerde_id
                  : '—'}
              </dd>
            </dl>
            <p className="st-privacy-hint">{t('steuer.datenschutz.minimierung_hint')}</p>
            <Link className="right-link" href="/datenschutz" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              {t('steuer.datenschutz.mehr')} <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Suppress unused warnings for icons we keep import-pinned to the design palette. */}
      <span hidden>
        <Bell />
      </span>
    </>
  );
}

function SteuerSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-80" />
      </div>
      <div className="st-layout">
        <div className="flex flex-col gap-[18px]">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-[18px]">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
