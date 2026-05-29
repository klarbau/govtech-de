'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  MoreVertical,
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
        <h1>Steuer</h1>
        <div className="sub">Vorausgefüllte Steuerübersicht aus bereits vorhandenen Daten.</div>
      </div>

      <div className="st-layout">
        <div>
          <div className="st-card">
            <div className="st-year-row">
              <div>
                <h2>
                  Steuerjahr {uebersicht?.steuerjahr ?? steuerjahr} <span className="badge brand">Entwurf</span>
                </h2>
                <div className="stand">Stand: {formatStand(nowIso)}</div>
                <div className="vor">Voraussichtliche Erstattung</div>
                <div className="erstattung" style={{ whiteSpace: 'nowrap' }}>
                  {erstattung}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-700)', fontSize: 13 }}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--green-600)' }} />
                  Auf Basis Ihrer bereits bekannten Daten
                </div>
              </div>
              <div className="quellen-grid">
                <div className="lbl">Datenquellen</div>
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
              <h4>Ihr Fortschritt</h4>
              <div className="pr-steps">
                <div className={`pr-step${activeStep > 0 ? '' : ' current'}`}>
                  <span className="dot">
                    {activeStep > 0 ? <Check style={{ width: 14, height: 14 }} /> : '1'}
                  </span>
                  <div>
                    <div className="t">Daten geprüft</div>
                    <div className="s">
                      Daten vollständig geprüft
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
                    <div className="t">Belege ergänzt</div>
                    <div className="s">
                      3 Belege fehlen noch
                      <br />
                      <a className="link" href="#nachweise">
                        Anzeigen
                      </a>
                    </div>
                  </div>
                </div>
                <div className={`pr-step${activeStep === 2 ? ' current' : activeStep < 2 ? ' pending' : ''}`}>
                  <span className="dot">3</span>
                  <div>
                    <div className="t">Zur Abgabe bereit</div>
                    <div className="s">
                      Prüfung abschließen und
                      <br />
                      Erklärung abgeben
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="st-card uberblick">
            <h3>Übersicht der Steuerbereiche</h3>
            <table>
              <thead>
                <tr>
                  <th>Bereich</th>
                  <th style={{ textAlign: 'right' }}>Betrag</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {bereiche.map((b, idx) => {
                  const visual = bereichVisual(idx);
                  const badgeClass =
                    b.status === 'geprueft' ? 'green' : b.status === 'ergaenzen' ? 'amber' : 'outline';
                  const badgeLabel =
                    b.status === 'geprueft' ? 'Geprüft' : b.status === 'ergaenzen' ? 'Ergänzen' : 'Nicht vorhanden';
                  const action =
                    b.status === 'ergaenzen' ? 'Bearbeiten' : b.status === 'nicht_vorhanden' ? 'Hinzufügen' : 'Anzeigen';
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="bereich">
                          <span className={`icon-square${visual.iconClass ? ` ${visual.iconClass}` : ''}`}>
                            <visual.Icon />
                          </span>
                          <div>
                            <div className="t">{t(b.name_i18n_key)}</div>
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
                        <a className="right-link" href="#">
                          {action} <ChevronRight style={{ width: 12, height: 12 }} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <a className="right-link" href="#" style={{ marginTop: 12, display: 'inline-flex' }}>
              Alle Bereiche anzeigen <ChevronRight style={{ width: 12, height: 12 }} />
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="st-card frist-card">
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Wichtige Fristen</h3>
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
                  <span className="badge brand">{days >= 0 ? `In ${days} Tagen` : 'Überfällig'}</span>
                </div>
              );
            })}
            <Link
              className="right-link"
              href="/termine"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}
            >
              Alle Fristen anzeigen <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          <div className="st-card nachweise" id="nachweise">
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Verwendete Nachweise</h3>
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
                    Ausgestellt am {formatStand(n.ausgestellt_am)}
                  </div>
                </div>
                <span className="badge green">Verwendet</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ height: 28, width: 28, padding: 0 }}
                  aria-label="Mehr Aktionen"
                >
                  <MoreVertical />
                </button>
              </div>
            ))}
            <Link
              className="right-link"
              href="/dokumente"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}
            >
              Alle Nachweise anzeigen <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Lädt…
        </div>
      ) : null}

      {/* Suppress unused warnings for icons we keep import-pinned to the design palette. */}
      <span hidden>
        <Bell />
      </span>
    </main>
  );
}
