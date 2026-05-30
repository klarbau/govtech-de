'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookUser,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
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
import { toast } from 'sonner';

import { EudiExportDialog } from '@/components/dokumente/EudiExportDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const STATUS_LABEL: Record<DocStatusKind, string> = {
  verifiziert: 'Verifiziert',
  neu: 'Neu',
  ablauf_bald: 'Ablauf bald',
  abgelaufen: 'Abgelaufen',
};

type SortKey = 'dokument' | 'kategorie' | 'status' | 'ausgestellt';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<DocStatusKind, number> = {
  neu: 0,
  ablauf_bald: 1,
  verifiziert: 2,
  abgelaufen: 3,
};

type TabId = 'alle' | DocumentKategorie;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'ausweise', label: 'Ausweise' },
  { id: 'bescheide', label: 'Bescheide' },
  { id: 'familie', label: 'Familie' },
  { id: 'vertraege', label: 'Verträge' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function DokumenteView({ nowIso }: { nowIso: string }) {
  const tEudi = useTranslations('dokumente.eudi');
  const tShared = useTranslations('shared');
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<TabId>('alle');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [sortKey, setSortKey] = React.useState<SortKey>('ausgestellt');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');
  const [eudiDoc, setEudiDoc] = React.useState<Document | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);
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
    const matched = docs.filter((d) => {
      if (activeTab !== 'alle' && kategorieOf(d) !== activeTab) return false;
      if (!q) return true;
      const hay = `${d.titel} ${d.dokument_nr ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...matched].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'dokument':
          cmp = a.titel.localeCompare(b.titel, 'de');
          break;
        case 'kategorie':
          cmp = kategorieBadge(a.kategorie).label.localeCompare(
            kategorieBadge(b.kategorie).label,
            'de',
          );
          break;
        case 'status':
          cmp =
            STATUS_ORDER[deriveStatus(a, now)] - STATUS_ORDER[deriveStatus(b, now)];
          break;
        case 'ausgestellt':
          cmp = a.ausgestellt_am.localeCompare(b.ausgestellt_am);
          break;
      }
      if (cmp === 0) cmp = a.id.localeCompare(b.id);
      return cmp * dir;
    });
    return sorted;
  }, [docs, search, activeTab, sortKey, sortDir, now]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  function toggleSort(key: SortKey) {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const ariaSortFor = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  function handleDownloadDoc(doc: Document) {
    const lines = [
      '[MOCK] Dieses Dokument ist Teil einer Demo. Keine echte Behörden-Urkunde.',
      '',
      `Dokument:      ${doc.titel}`,
      `Typ:           ${doc.typ}`,
      doc.dokument_nr ? `Dokumentnummer: ${doc.dokument_nr}` : null,
      `Ausstellende Behörde: ${doc.ausstellende_behoerde_id}`,
      `Ausgestellt am: ${formatDe(doc.ausgestellt_am)}`,
      doc.gueltig_bis ? `Gültig bis:     ${formatDe(doc.gueltig_bis)}` : null,
      `Watermark:      ${doc.watermark}`,
    ].filter((l): l is string => l !== null);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOCK-${doc.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('[MOCK] Download gestartet', {
      description: `${doc.titel} wurde als Demo-Datei heruntergeladen.`,
    });
  }

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
                  <th aria-sort={ariaSortFor('dokument')}>
                    <SortHeader
                      label="Dokument"
                      active={sortKey === 'dokument'}
                      dir={sortDir}
                      onClick={() => toggleSort('dokument')}
                    />
                  </th>
                  <th aria-sort={ariaSortFor('kategorie')}>
                    <SortHeader
                      label="Kategorie"
                      active={sortKey === 'kategorie'}
                      dir={sortDir}
                      onClick={() => toggleSort('kategorie')}
                    />
                  </th>
                  <th aria-sort={ariaSortFor('status')}>
                    <SortHeader
                      label="Status"
                      active={sortKey === 'status'}
                      dir={sortDir}
                      onClick={() => toggleSort('status')}
                    />
                  </th>
                  <th aria-sort={ariaSortFor('ausgestellt')}>
                    <SortHeader
                      label="Ausgestellt / Gültig bis"
                      active={sortKey === 'ausgestellt'}
                      dir={sortDir}
                      onClick={() => toggleSort('ausgestellt')}
                    />
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
                            <button
                              type="button"
                              aria-label={`Ansehen: ${doc.titel}`}
                              title="Ansehen"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye />
                            </button>
                            <button
                              type="button"
                              aria-label={`Herunterladen: ${doc.titel}`}
                              title="Herunterladen"
                              onClick={() => handleDownloadDoc(doc)}
                            >
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
                              <button
                                type="button"
                                aria-label="Mehr"
                                title="Weitere Aktionen (in Planung)"
                                disabled
                                aria-disabled="true"
                              >
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
                      pageStart + pageSize,
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
                <label htmlFor="dk-page-size" className="sr-only">
                  Dokumente pro Seite
                </label>
                <select
                  id="dk-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    background: 'none',
                    border: 0,
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} pro Seite
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="rail">
          <div className="card">
            <h4>Schnellzugriff</h4>
            <QuickAction
              Icon={Upload}
              title="Dokument hochladen"
              subtitle="Aus Datei oder Scan hinzufügen"
              onClick={() =>
                toast('[MOCK] Dokument hochladen', {
                  description:
                    'In der Demo nicht verfügbar — neue Dokumente entstehen über Vorgänge wie den Umzug.',
                })
              }
            />
            <QuickAction
              Icon={FolderPlus}
              title="Neuer Ordner"
              subtitle="Dokumente organisieren"
              onClick={() =>
                toast('[MOCK] Neuer Ordner', {
                  description: 'Ordnerverwaltung ist in dieser Demo in Planung.',
                })
              }
            />
            <QuickAction
              Icon={File}
              title="Vorlagen & Formulare"
              subtitle="Offizielle Formulare nutzen"
              onClick={() =>
                toast('[MOCK] Vorlagen & Formulare', {
                  description: 'Die Formular-Bibliothek ist in dieser Demo in Planung.',
                })
              }
            />
            <QuickAction
              Icon={Mail}
              title="Papierdokument einreichen"
              subtitle="Per Post an Behörde senden"
              onClick={() =>
                toast('[MOCK] Papierdokument einreichen', {
                  description: 'Der Postversand an Behörden ist in dieser Demo in Planung.',
                })
              }
            />
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
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() =>
                toast('[MOCK] Dokument verwenden', {
                  description:
                    'Dokumente werden in dieser Demo direkt in einem Vorgang als Anlage ausgewählt.',
                })
              }
            >
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

      <DocumentPreviewDialog
        doc={previewDoc}
        now={now}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownloadDoc}
      />
    </>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Indicator = !active ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      className="sort"
      onClick={onClick}
      style={{
        background: 'none',
        border: 0,
        padding: 0,
        font: 'inherit',
        color: active ? 'var(--ink)' : 'inherit',
        cursor: 'pointer',
      }}
    >
      {label}{' '}
      <Indicator style={{ width: 12, height: 12 }} aria-hidden="true" />
    </button>
  );
}

function QuickAction({
  Icon,
  title,
  subtitle,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="qa-row"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 0,
        padding: '10px 0',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      <span className="icon-circle">
        <Icon />
      </span>
      <span>
        <span className="t" style={{ display: 'block' }}>
          {title}
        </span>
        <span className="s" style={{ display: 'block' }}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function DocumentPreviewDialog({
  doc,
  now,
  onClose,
  onDownload,
}: {
  doc: Document | null;
  now: Date;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}) {
  const status = doc ? deriveStatus(doc, now) : null;
  return (
    <Dialog
      open={!!doc}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {doc ? (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{doc.titel}</DialogTitle>
            <DialogDescription>
              Vorschau der hinterlegten Dokument-Metadaten. Diese Demo zeigt keine
              echte Urkunde.
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              border: '1px dashed var(--border)',
              borderRadius: 'var(--r-lg, 12px)',
              background: 'var(--surface-2)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <span
              className="badge"
              style={{
                alignSelf: 'flex-start',
                fontFamily: 'var(--mono, monospace)',
              }}
            >
              {doc.watermark}
            </span>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content 1fr',
                gap: '8px 16px',
                margin: 0,
                fontSize: 13.5,
              }}
            >
              <dt style={{ color: 'var(--ink-3)' }}>Kategorie</dt>
              <dd style={{ margin: 0 }}>{kategorieBadge(doc.kategorie).label}</dd>

              {doc.dokument_nr ? (
                <>
                  <dt style={{ color: 'var(--ink-3)' }}>Dokumentnummer</dt>
                  <dd style={{ margin: 0 }}>{doc.dokument_nr}</dd>
                </>
              ) : null}

              <dt style={{ color: 'var(--ink-3)' }}>Ausstellende Behörde</dt>
              <dd style={{ margin: 0 }}>{doc.ausstellende_behoerde_id}</dd>

              <dt style={{ color: 'var(--ink-3)' }}>Ausgestellt am</dt>
              <dd style={{ margin: 0 }}>{formatDe(doc.ausgestellt_am)}</dd>

              {doc.gueltig_bis ? (
                <>
                  <dt style={{ color: 'var(--ink-3)' }}>Gültig bis</dt>
                  <dd style={{ margin: 0 }}>{formatDe(doc.gueltig_bis)}</dd>
                </>
              ) : null}

              {status ? (
                <>
                  <dt style={{ color: 'var(--ink-3)' }}>Status</dt>
                  <dd style={{ margin: 0 }}>{STATUS_LABEL[status]}</dd>
                </>
              ) : null}
            </dl>
          </div>

          <DialogFooter showCloseButton>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onDownload(doc)}
            >
              <Download />
              Herunterladen
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
