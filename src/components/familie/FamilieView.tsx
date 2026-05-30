'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderClosed,
  Info,
  Link as LinkIcon,
  Shield,
  User,
  Users,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  Behoerde,
  FamilieNachweis,
  GemeinsamerVorgang,
  HaushaltView,
} from '@/types';

const NACHWEIS_ICON: Record<string, React.ComponentType> = {
  geburtsurkunde: FileText,
  sorge_vollmacht: FileText,
  vertretungsrechte: User,
  verknuepfungen: LinkIcon,
};

function initialsOf(vorname: string, nachname: string): string {
  return `${vorname?.[0] ?? ''}${nachname?.[0] ?? ''}`.toUpperCase();
}

function formatDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

export function FamilieView() {
  const t = useTranslations('familie');
  const tRoot = useTranslations();
  const [view, setView] = React.useState<HaushaltView | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [haushaltDialogOpen, setHaushaltDialogOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api.getProfile();
        const [data, behoerden] = await Promise.all([
          api.getFamilie(profile.id),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        setView(data);
        setBehoerdenById(
          Object.fromEntries(behoerden.map((b) => [b.id, b])),
        );
      } catch {
        if (!cancelled) setView(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const memberNameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of view?.mitglieder ?? []) {
      map[m.persona_ref_id] = `${m.vorname} ${m.nachname}`.trim();
    }
    return map;
  }, [view]);

  const betrifftNames = React.useCallback(
    (ids: string[]) =>
      ids.map((id) => memberNameById[id] ?? id).join(', '),
    [memberNameById],
  );

  const hauptperson = view?.mitglieder.find((m) => m.ist_hauptperson);
  const kind = view?.mitglieder.find((m) => m.rolle === 'kind');

  const hauptInitials = hauptperson
    ? initialsOf(hauptperson.vorname, hauptperson.nachname)
    : '';
  const kindInitials = kind ? initialsOf(kind.vorname, kind.nachname) : '';
  const kindName = kind ? `${kind.vorname} ${kind.nachname}`.trim() : '';
  const hauptName = hauptperson
    ? `${hauptperson.vorname} ${hauptperson.nachname}`.trim()
    : '';

  return (
    <>
      <div className="gt-page-head">
        <h1>Familie</h1>
        <div className="sub">
          Haushalt, Bezugspersonen und gemeinsame Vorgänge verwalten.
        </div>
      </div>

      <div className="fm-layout">
        <div>
          <div className="fm-card">
            <div className="hh-head">
              <div>
                <div className="ttl">Mein Haushalt</div>
                <div className="sub">{view?.mitglieder.length ?? 0} Personen</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHaushaltDialogOpen(true)}
              >
                <Users />
                Haushalt verwalten
              </button>
            </div>
            <div className="hh-people">
              <div className="person">
                <span className="avatar lg">{hauptInitials}</span>
                <div className="grow">
                  <div className="name">{hauptName} (Sie)</div>
                  <div className="dob">
                    Geb. {hauptperson ? formatDe(hauptperson.geburtsdatum) : '—'}
                  </div>
                  <span className="badge violet">Mutter</span>
                </div>
              </div>
              <div className="person">
                <span className="avatar lg green">{kindInitials}</span>
                <div className="grow">
                  <div className="name">{kindName}</div>
                  <div className="dob">
                    Geb. {kind ? formatDe(kind.geburtsdatum) : '—'}
                  </div>
                  <span className="badge green">Kind</span>
                </div>
              </div>
            </div>
            <div className="hh-banner gt-banner">
              <Info />
              <div>
                <div style={{ fontWeight: 600 }}>
                  Sie sind berechtigte Vertretung für {kindName}.
                </div>
                <div className="text-sm muted">
                  Sie können Vorgänge für {kind?.vorname ?? ''} einsehen und verwalten.
                </div>
              </div>
            </div>
          </div>

          <div className="row-pair" style={{ marginTop: 18 }}>
            <div className="fm-card fm-list">
              <div style={{ marginBottom: 16 }}>
                <div className="text-md fw-600">{t('vorgaenge.title')}</div>
                <div className="muted text-xs">{t('vorgaenge.subtitle')}</div>
              </div>
              {(view?.gemeinsame_vorgaenge ?? []).length === 0 ? (
                <div className="muted text-sm">{t('vorgaenge.empty')}</div>
              ) : (
                (view?.gemeinsame_vorgaenge ?? []).map(
                  (v: GemeinsamerVorgang) => {
                    const behoerdeName = v.behoerde_id
                      ? behoerdenById[v.behoerde_id]?.name_de
                      : undefined;
                    return (
                      <div key={v.id} className="item">
                        <span className="icon-circle green">
                          <Users />
                        </span>
                        <div>
                          <div className="t">{tRoot(v.titel_i18n_key)}</div>
                          <div className="s">
                            {behoerdeName
                              ? behoerdeName + ' · '
                              : ''}
                            {t('vorgaenge.betrifft', {
                              names: betrifftNames(v.betroffene_member_ids),
                            })}
                          </div>
                        </div>
                        <span className="badge brand">
                          {t(`vorgaenge.status.${v.status}`)}
                        </span>
                        <ChevronRight
                          style={{ width: 14, height: 14, color: 'var(--ink-4)' }}
                        />
                      </div>
                    );
                  },
                )
              )}
              <Link className="all-link" href="/vorgaenge">
                {t('vorgaenge.show_all')}{' '}
                <ChevronRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>

            <div className="fm-card nb-list">
              <div style={{ marginBottom: 16 }}>
                <div className="text-md fw-600">{t('nachweise.title')}</div>
                <div className="muted text-xs">{t('nachweise.subtitle')}</div>
              </div>
              {(view?.nachweise ?? []).length === 0 ? (
                <div className="muted text-sm">{t('nachweise.empty')}</div>
              ) : (
                (view?.nachweise ?? []).map((n: FamilieNachweis) => {
                  const Icon = NACHWEIS_ICON[n.typ] ?? FileText;
                  return (
                    <div key={n.typ} className="item">
                      <span className="icon-circle">
                        <Icon />
                      </span>
                      <div>
                        <div className="t">
                          {tRoot(n.titel_i18n_key)}
                          {n.status === 'verifiziert' ? (
                            <CheckCircle2 />
                          ) : null}
                        </div>
                        <div className="s">
                          {t(`nachweise.status.${n.status}`)}
                        </div>
                      </div>
                      <ChevronRight style={{ color: 'var(--ink-4)' }} />
                    </div>
                  );
                })
              )}
              <Link className="all-link" href="/dokumente">
                {t('nachweise.show_all')}{' '}
                <ChevronRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>

          <div
            className="fm-card"
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 26px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="icon-circle">
                <Shield />
              </span>
              <div>
                <div className="text-md fw-600">Sicher &amp; geschützt</div>
                <div className="muted text-sm">
                  Ihre Daten und Nachweise werden sicher verwaltet. Nur Personen
                  mit entsprechenden Berechtigungen können Einsicht nehmen.
                </div>
              </div>
            </div>
            <Link href="/datenschutz" className="btn btn-secondary">
              Mehr zum Datenschutz
            </Link>
          </div>
        </div>

        <div className="fm-card rail">
          <h3>Was betrifft wen?</h3>
          <div className="sub">Übersicht der Zuständigkeiten.</div>

          <div className="person-head">
            <span className="avatar lg">{hauptInitials}</span>
            <div>
              <div className="name">{hauptName}</div>
              <span className="badge brand">Sie</span>
            </div>
          </div>
          <div className="kvs">
            <div className="kv">
              <FolderClosed />
              Vorgänge<span className="n">{hauptperson?.counts.vorgaenge ?? 0}</span>
            </div>
            <div className="kv">
              <FileText />
              Dokumente<span className="n">{hauptperson?.counts.dokumente ?? 0}</span>
            </div>
            <div className="kv">
              <Calendar />
              Nachweise<span className="n">{hauptperson?.counts.nachweise ?? 0}</span>
            </div>
            <div className="kv">
              <Users />
              Vertretungen<span className="n">{hauptperson?.counts.vertretungen ?? 0}</span>
            </div>
          </div>

          <div
            className="person-head"
            style={{
              marginTop: 16,
              borderTop: '1px solid var(--border)',
              paddingTop: 14,
            }}
          >
            <span className="avatar lg green">{kindInitials}</span>
            <div>
              <div className="name">{kindName}</div>
              <span className="badge green">Kind</span>
            </div>
          </div>
          <div className="kvs">
            <div className="kv">
              <FolderClosed />
              Vorgänge<span className="n">{kind?.counts.vorgaenge ?? 0}</span>
            </div>
            <div className="kv">
              <FileText />
              Dokumente<span className="n">{kind?.counts.dokumente ?? 0}</span>
            </div>
            <div className="kv">
              <Calendar />
              Nachweise<span className="n">{kind?.counts.nachweise ?? 0}</span>
            </div>
            <div className="kv">
              <Users />
              Vertretungen<span className="n">{kind?.counts.vertretungen ?? 0}</span>
            </div>
          </div>

          <div className="rail-foot">
            <span className="icon-circle">
              <Info />
            </span>
            <div>
              <div className="t">Änderungen im Haushalt oder bei Berechtigungen?</div>
              <div className="s">
                <button
                  type="button"
                  onClick={() => setHaushaltDialogOpen(true)}
                  style={{
                    background: 'none',
                    border: 0,
                    padding: 0,
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Haushaltseinstellungen öffnen{' '}
                  <ChevronRight style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={haushaltDialogOpen} onOpenChange={setHaushaltDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Haushalt verwalten</DialogTitle>
            <DialogDescription>
              Übersicht der Personen in Ihrem Haushalt. Das Bearbeiten von
              Mitgliedern und Berechtigungen folgt in einer späteren Version.
            </DialogDescription>
          </DialogHeader>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(view?.mitglieder ?? []).map((m) => (
              <li
                key={m.persona_ref_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
              >
                <span className={`avatar${m.rolle === 'kind' ? ' green' : ''}`}>
                  {initialsOf(m.vorname, m.nachname)}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="fw-600 text-sm">
                    {`${m.vorname} ${m.nachname}`.trim()}
                    {m.ist_hauptperson ? ' (Sie)' : ''}
                  </div>
                  <div className="muted text-xs">
                    Geb. {formatDe(m.geburtsdatum)}
                  </div>
                </div>
                <span className={`badge ${m.rolle === 'kind' ? 'green' : 'violet'}`}>
                  {m.rolle === 'kind' ? 'Kind' : 'Erwachsen'}
                </span>
              </li>
            ))}
          </ul>

          <div className="gt-banner" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info style={{ flexShrink: 0 }} />
            <div className="text-xs muted">
              [MOCK] Demo-Daten. Hinzufügen, Entfernen und Anpassen von
              Berechtigungen ist in dieser Vorschau noch nicht aktiv.
            </div>
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
