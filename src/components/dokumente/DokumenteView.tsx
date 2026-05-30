'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookUser,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Download,
  Eye,
  File,
  FileText,
  FolderPlus,
  Home,
  IdCard,
  Landmark,
  Mail,
  MoreVertical,
  Search,
  ShieldCheck,
  SquareArrowRight,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { useTranslations } from 'next-intl';

import { EudiExportDialog } from '@/components/dokumente/EudiExportDialog';
import { api } from '@/lib/mock-backend';
import type { Document, DocumentKategorie, DocumentTyp } from '@/types';

interface DocAvatar {
  cls: string; // empty string = default brand av (no extra class)
  Icon: LucideIcon;
}

function avatarFor(typ: DocumentTyp): DocAvatar {
  switch (typ) {
    case 'reisepass':
      return { cls: 'pink', Icon: BookUser };
    case 'aufenthaltstitel':
      return { cls: 'violet', Icon: IdCard };
    case 'meldebestaetigung':
      return { cls: 'teal', Icon: Home };
    case 'steuerbescheid':
      return { cls: 'eagle', Icon: Landmark };
    case 'geburtsurkunde':
      return { cls: 'pink', Icon: Users };
    case 'mietvertrag':
      return { cls: '', Icon: FileText };
    default:
      return { cls: '', Icon: FileText };
  }
}

interface KategorieBadge {
  cls: string;
  label: string;
}

function kategorieBadge(k: DocumentKategorie | undefined): KategorieBadge {
  switch (k) {
    case 'ausweise':
      return { cls: 'violet', label: 'Ausweise' };
    case 'familie':
      return { cls: 'pink', label: 'Familie' };
    case 'vertraege':
      return { cls: 'amber', label: 'Verträge' };
    case 'bescheide':
    default:
      return { cls: 'brand', label: 'Bescheide' };
  }
}

type DocStatusKind = 'verifiziert' | 'neu' | 'ablauf_bald' | 'abgelaufen';

function deriveStatus(doc: Document, now: Date): DocStatusKind {
  if (doc.gueltig_bis) {
    const bis = new Date(doc.gueltig_bis);
    const diffDays = Math.floor((bis.getTime() - now.getTime()) / 86400000);
    if (diffDays < 0) return 'abgelaufen';
    if (diffDays <= 90) return 'ablauf_bald';
  }
  const ausgestellt = new Date(doc.ausgestellt_am);
  const alterTage = Math.floor((now.getTime() - ausgestellt.getTime()) / 86400000);
  if (alterTage >= 0 && alterTage <= 30) return 'neu';
  return 'verifiziert';
}

function formatDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

type TabId = 'alle' | DocumentKategorie;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'ausweise', label: 'Ausweise' },
  { id: 'bescheide', label: 'Bescheide' },
  { id: 'familie', label: 'Familie' },
  { id: 'vertraege', label: 'Verträge' },
];

const PAGE_SIZE = 10;

export function DokumenteView({ nowIso }: { nowIso: string }) {
  const tEudi = useTranslations('dokumente.eudi');
  const tShared = useTranslations('shared');
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<TabId>('alle');
  const [page, setPage] = React.useState(1);
  const [eudiDoc, setEudiDoc] = React.useState<Document | null>(null);
  const [newDocIds, setNewDocIds] = React.useState<Set<string>>(() => new Set());

  const now = React.useMemo(() => new Date(nowIso), [nowIso]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.getDocuments();
        if (!cancelled) setDocs(data);
      } catch {
        if (!cancelled) setDocs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* C1/§1.2: react live when the autopilot mints a Document. */
  React.useEffect(() => {
    const unsubscribe = api.subscribe((event) => {
      if (event.type === 'document_added') {
        setDocs((prev) =>
          prev.some((d) => d.id === event.document.id)
            ? prev
            : [event.document, ...prev],
        );
        setNewDocIds((prev) => new Set(prev).add(event.document.id));
      }
    });
    return () => unsubscribe();
  }, []);

  const kategorieOf = (d: Document): DocumentKategorie =>
    d.kategorie ?? 'bescheide';

  const counts = React.useMemo(() => {
    const c: Record<TabId, number> = {
      alle: docs.length,
      ausweise: 0,
      bescheide: 0,
      familie: 0,
      vertraege: 0,
    };
    for (const d of docs) c[kategorieOf(d)] += 1;
    return c;
  }, [docs]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (activeTab !== 'alle' && kategorieOf(d) !== activeTab) return false;
      if (!q) return true;
      const hay = `${d.titel} ${d.dokument_nr ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [docs, search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const recentlyAdded = React.useMemo(
    () =>
      [...docs]
        .sort((a, b) => b.ausgestellt_am.localeCompare(a.ausgestellt_am))
        .slice(0, 3),
    [docs],
  );

  return (
    <>
      <div className="gt-page-head">
        <h1>Dokumente</h1>
        <div className="sub">
          Ihr persönlicher Dokumentenordner mit Nachweisen und Bescheiden.
        </div>
      </div>

      <div className="dk-layout">
        <div>
          <div className="dk-search">
            <div className="input-icon">
              <Search />
              <input
                className="input"
                placeholder="Suche nach Dokumenten"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Suche nach Dokumenten"
              />
            </div>
            <div className="tab-chips">
              {TABS.map((t) => {
                const isActive = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setActiveTab(t.id);
                      setPage(1);
                    }}
                  >
                    {t.label} <span className="count">{counts[t.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dk-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <span className="sort">
                      Dokument{' '}
                      <ChevronsUpDown style={{ width: 12, height: 12 }} aria-hidden="true" />
                    </span>
                  </th>
                  <th>
                    <span className="sort">
                      Kategorie{' '}
                      <ChevronsUpDown style={{ width: 12, height: 12 }} aria-hidden="true" />
                    </span>
                  </th>
                  <th>
                    <span className="sort">
                      Status{' '}
                      <ChevronsUpDown style={{ width: 12, height: 12 }} aria-hidden="true" />
                    </span>
                  </th>
                  <th>
                    <span className="sort">
                      Ausgestellt / Gültig bis{' '}
                      <ChevronsUpDown style={{ width: 12, height: 12 }} aria-hidden="true" />
                    </span>
                  </th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--ink-3)', textAlign: 'center' }}>
                      Keine Dokumente gefunden.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((doc) => {
                    const av = avatarFor(doc.typ);
                    const kat = kategorieBadge(doc.kategorie);
                    const status = deriveStatus(doc, now);
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div className="dk-doc">
                            <span className={`av${av.cls ? ` ${av.cls}` : ''}`}>
                              <av.Icon />
                            </span>
                            <div>
                              <div className="t">
                                {doc.titel}{' '}
                                {newDocIds.has(doc.id) ? (
                                  <span className="nav-neu-dot" aria-hidden="true" />
                                ) : null}
                              </div>
                              <div className="s" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {doc.dokument_nr ? <span>{doc.dokument_nr}</span> : null}
                                <span className="badge" style={{ fontFamily: 'var(--mono, monospace)' }}>
                                  {doc.watermark}
                                </span>
                                {doc.vorgang_id ? (
                                  <Link
                                    href={`/vorgaenge/umzug/${doc.vorgang_id}`}
                                    className="gehoert-zu-chip"
                                  >
                                    {tShared('gehoert_zu', { vorgang: 'Umzug' })}
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${kat.cls}`}>{kat.label}</span>
                        </td>
                        <td>
                          {status === 'verifiziert' ? (
                            <span className="badge green">
                              <ShieldCheck style={{ width: 12, height: 12 }} />
                              Verifiziert
                            </span>
                          ) : status === 'neu' ? (
                            <span className="badge brand">
                              <span
                                className="dot"
                                style={{ background: 'var(--brand-500)' }}
                              />
                              Neu
                            </span>
                          ) : status === 'ablauf_bald' ? (
                            <span className="badge amber">
                              <Clock style={{ width: 12, height: 12 }} />
                              Ablauf bald
                            </span>
                          ) : (
                            <span className="badge red">
                              <Clock style={{ width: 12, height: 12 }} />
                              Abgelaufen
                            </span>
                          )}
                        </td>
                        <td>
                          <div>Ausgestellt &nbsp;&nbsp; {formatDe(doc.ausgestellt_am)}</div>
                          {doc.gueltig_bis ? (
                            <div>Gültig bis &nbsp;&nbsp;&nbsp;&nbsp; {formatDe(doc.gueltig_bis)}</div>
                          ) : null}
                        </td>
                        <td>
                          <div className="dk-actions">
                            <button type="button" aria-label="Ansehen">
                              <Eye />
                            </button>
                            <button type="button" aria-label="Herunterladen">
                              <Download />
                            </button>
                            {doc.eudi_compatible ? (
                              <button
                                type="button"
                                aria-label={tEudi('button')}
                                title={tEudi('button')}
                                onClick={() => setEudiDoc(doc)}
                              >
                                <Wallet />
                              </button>
                            ) : (
                              <button type="button" aria-label="Mehr">
                                <MoreVertical />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="pagination">
              <div className="muted text-sm">
                {filtered.length === 0
                  ? '0 Dokumente'
                  : `${pageStart + 1}–${Math.min(
                      pageStart + PAGE_SIZE,
                      filtered.length,
                    )} von ${filtered.length} Dokumenten`}
              </div>
              <div className="pgs">
                <button
                  type="button"
                  className="pg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Vorherige Seite"
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`pg${n === safePage ? ' active' : ''}`}
                    onClick={() => setPage(n)}
                    aria-current={n === safePage ? 'page' : undefined}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="pg"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Nächste Seite"
                >
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <div className="per-page">
                10 pro Seite <ChevronDown />
              </div>
            </div>
          </div>
        </div>

        <div className="rail">
          <div className="card">
            <h4>Schnellzugriff</h4>
            <div className="qa-row">
              <span className="icon-circle">
                <Upload />
              </span>
              <div>
                <div className="t">Dokument hochladen</div>
                <div className="s">Aus Datei oder Scan hinzufügen</div>
              </div>
            </div>
            <div className="qa-row">
              <span className="icon-circle">
                <FolderPlus />
              </span>
              <div>
                <div className="t">Neuer Ordner</div>
                <div className="s">Dokumente organisieren</div>
              </div>
            </div>
            <div className="qa-row">
              <span className="icon-circle">
                <File />
              </span>
              <div>
                <div className="t">Vorlagen &amp; Formulare</div>
                <div className="s">Offizielle Formulare nutzen</div>
              </div>
            </div>
            <div className="qa-row">
              <span className="icon-circle">
                <Mail />
              </span>
              <div>
                <div className="t">Papierdokument einreichen</div>
                <div className="s">Per Post an Behörde senden</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4>Zuletzt hinzugefügt</h4>
            {recentlyAdded.map((doc) => {
              const av = avatarFor(doc.typ);
              const recCls =
                doc.typ === 'steuerbescheid'
                  ? 'eagle'
                  : doc.typ === 'meldebestaetigung'
                    ? 'home'
                    : doc.typ === 'aufenthaltstitel'
                      ? 'id'
                      : '';
              return (
                <div key={doc.id} className="rec-row">
                  <span className={`av${recCls ? ` ${recCls}` : ''}`}>
                    <av.Icon />
                  </span>
                  <span className="t">{doc.titel}</span>
                  <span className="d">{formatDe(doc.ausgestellt_am)}</span>
                </div>
              );
            })}
            <Link
              className="link"
              href="/dokumente"
              style={{
                color: 'var(--brand-600)',
                fontWeight: 500,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 10,
              }}
            >
              Alle anzeigen <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          <div className="card">
            <h4>Teilen &amp; verwenden</h4>
            <div className="muted text-sm" style={{ marginBottom: 14 }}>
              Sie können ausgewählte Dokumente sicher mit Behörden teilen oder
              als Anlage in Vorgängen verwenden.
            </div>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }}>
              <SquareArrowRight />
              Dokument verwenden
            </button>
          </div>
        </div>
      </div>

      <EudiExportDialog
        open={!!eudiDoc}
        doc={eudiDoc}
        onOpenChange={(next) => {
          if (!next) setEudiDoc(null);
        }}
      />
    </>
  );
}
