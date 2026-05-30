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
import type { Behoerde, Document, DocumentKategorie, DocumentTyp } from '@/types';

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
  labelKey: DocumentKategorie;
}

function kategorieBadge(k: DocumentKategorie | undefined): KategorieBadge {
  switch (k) {
    case 'ausweise':
      return { cls: 'violet', labelKey: 'ausweise' };
    case 'familie':
      return { cls: 'pink', labelKey: 'familie' };
    case 'vertraege':
      return { cls: 'amber', labelKey: 'vertraege' };
    case 'bescheide':
    default:
      return { cls: 'brand', labelKey: 'bescheide' };
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

type SortKey = 'dokument' | 'kategorie' | 'status' | 'ausgestellt';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<DocStatusKind, number> = {
  neu: 0,
  ablauf_bald: 1,
  verifiziert: 2,
  abgelaufen: 3,
};

type TabId = 'alle' | DocumentKategorie;

const TAB_IDS: TabId[] = ['alle', 'ausweise', 'bescheide', 'familie', 'vertraege'];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function DokumenteView({ nowIso }: { nowIso: string }) {
  const t = useTranslations('dokumente');
  const tEudi = useTranslations('dokumente.eudi');
  const tShared = useTranslations('shared');
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
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
        const [data, behoerden] = await Promise.all([
          api.getDocuments(),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        setDocs(data);
        setBehoerdenById(
          Object.fromEntries(behoerden.map((b) => [b.id, b])),
        );
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
          cmp = t(`kategorie.${kategorieBadge(a.kategorie).labelKey}`).localeCompare(
            t(`kategorie.${kategorieBadge(b.kategorie).labelKey}`),
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
  }, [docs, search, activeTab, sortKey, sortDir, now, t]);

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
    const behoerdeName =
      behoerdenById[doc.ausstellende_behoerde_id]?.name_de ??
      doc.ausstellende_behoerde_id;
    const lines = [
      t('download.mock_header'),
      '',
      `${t('download.dokument')} ${doc.titel}`,
      `${t('download.typ')} ${doc.typ}`,
      doc.dokument_nr ? `${t('download.nr')} ${doc.dokument_nr}` : null,
      `${t('download.aussteller')} ${behoerdeName}`,
      `${t('download.ausgestellt')} ${formatDe(doc.ausgestellt_am)}`,
      doc.gueltig_bis
        ? `${t('download.gueltig_bis')} ${formatDe(doc.gueltig_bis)}`
        : null,
      `${t('download.watermark')} ${doc.watermark}`,
    ].filter((l): l is string => l !== null);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOCK-${doc.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('download.toast_title'), {
      description: t('download.toast_description', { titel: doc.titel }),
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
        <h1>{t('title')}</h1>
        <div className="sub">{t('subtitle')}</div>
      </div>

      <div className="dk-layout">
        <div>
          <div className="dk-search">
            <div className="input-icon">
              <Search />
              <input
                className="input"
                placeholder={t('search.placeholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label={t('search.aria_label')}
              />
            </div>
            <div className="tab-chips">
              {TAB_IDS.map((tabId) => {
                const isActive = tabId === activeTab;
                return (
                  <button
                    key={tabId}
                    type="button"
                    className={`chip${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setActiveTab(tabId);
                      setPage(1);
                    }}
                  >
                    {t(`tab.${tabId}`)} <span className="count">{counts[tabId]}</span>
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
                      label={t('col.dokument')}
                      active={sortKey === 'dokument'}
                      dir={sortDir}
                      onClick={() => toggleSort('dokument')}
                    />
                  </th>
                  <th aria-sort={ariaSortFor('kategorie')}>
                    <SortHeader
                      label={t('col.kategorie')}
                      active={sortKey === 'kategorie'}
                      dir={sortDir}
                      onClick={() => toggleSort('kategorie')}
                    />
                  </th>
                  <th aria-sort={ariaSortFor('status')}>
                    <SortHeader
                      label={t('col.status')}
                      active={sortKey === 'status'}
                      dir={sortDir}
                      onClick={() => toggleSort('status')}
                    />
                  </th>
                  <th aria-sort={ariaSortFor('ausgestellt')}>
                    <SortHeader
                      label={t('col.daten')}
                      active={sortKey === 'ausgestellt'}
                      dir={sortDir}
                      onClick={() => toggleSort('ausgestellt')}
                    />
                  </th>
                  <th>{t('col.aktionen')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--ink-3)', textAlign: 'center' }}>
                      {t('empty.filter_title')}
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
                          <span className={`badge ${kat.cls}`}>
                            {t(`kategorie.${kat.labelKey}`)}
                          </span>
                        </td>
                        <td>
                          {status === 'verifiziert' ? (
                            <span className="badge green">
                              <ShieldCheck style={{ width: 12, height: 12 }} />
                              {t('status.verifiziert')}
                            </span>
                          ) : status === 'neu' ? (
                            <span className="badge brand">
                              <span
                                className="dot"
                                style={{ background: 'var(--brand-500)' }}
                              />
                              {t('status.neu')}
                            </span>
                          ) : status === 'ablauf_bald' ? (
                            <span className="badge amber">
                              <Clock style={{ width: 12, height: 12 }} />
                              {t('status.ablauf_bald')}
                            </span>
                          ) : (
                            <span className="badge red">
                              <Clock style={{ width: 12, height: 12 }} />
                              {t('status.abgelaufen')}
                            </span>
                          )}
                        </td>
                        <td>
                          <div>
                            {t('daten.ausgestellt_label')} &nbsp;&nbsp;{' '}
                            {formatDe(doc.ausgestellt_am)}
                          </div>
                          {doc.gueltig_bis ? (
                            <div>
                              {t('daten.gueltig_bis_label')} &nbsp;&nbsp;&nbsp;&nbsp;{' '}
                              {formatDe(doc.gueltig_bis)}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div className="dk-actions">
                            <button
                              type="button"
                              aria-label={t('action.ansehen', { name: doc.titel })}
                              title={t('action.ansehen_title')}
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye />
                            </button>
                            <button
                              type="button"
                              aria-label={t('action.herunterladen', {
                                name: doc.titel,
                              })}
                              title={t('action.herunterladen_title')}
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
                            ) : null}
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
                  ? t('pagination.empty')
                  : t('pagination.range', {
                      von: pageStart + 1,
                      bis: Math.min(pageStart + pageSize, filtered.length),
                      total: filtered.length,
                    })}
              </div>
              <div className="pgs">
                <button
                  type="button"
                  className="pg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label={t('pagination.prev')}
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
                  aria-label={t('pagination.next')}
                >
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <div className="per-page">
                <label htmlFor="dk-page-size" className="sr-only">
                  {t('pagination.per_page_label')}
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
                      {t('pagination.per_page_option', { count: n })}
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
            <h4>{t('schnellzugriff.title')}</h4>
            <QuickAction
              Icon={Upload}
              title={t('schnellzugriff.upload')}
              subtitle={t('schnellzugriff.upload_sub')}
              onClick={() =>
                toast(t('schnellzugriff.upload'), {
                  description: t('schnellzugriff.upload_toast'),
                })
              }
            />
            <QuickAction
              Icon={FolderPlus}
              title={t('schnellzugriff.ordner')}
              subtitle={t('schnellzugriff.ordner_sub')}
              onClick={() =>
                toast(t('schnellzugriff.ordner'), {
                  description: t('schnellzugriff.ordner_toast'),
                })
              }
            />
            <QuickAction
              Icon={File}
              title={t('schnellzugriff.vorlagen')}
              subtitle={t('schnellzugriff.vorlagen_sub')}
              onClick={() =>
                toast(t('schnellzugriff.vorlagen'), {
                  description: t('schnellzugriff.vorlagen_toast'),
                })
              }
            />
            <QuickAction
              Icon={Mail}
              title={t('schnellzugriff.papier')}
              subtitle={t('schnellzugriff.papier_sub')}
              onClick={() =>
                toast(t('schnellzugriff.papier'), {
                  description: t('schnellzugriff.papier_toast'),
                })
              }
            />
          </div>

          <div className="card">
            <h4>{t('zuletzt.title')}</h4>
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
              {t('zuletzt.show_all')}{' '}
              <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          <div className="card">
            <h4>{t('teilen.title')}</h4>
            <div className="muted text-sm" style={{ marginBottom: 14 }}>
              {t('teilen.hint')}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() =>
                toast(t('teilen.cta'), {
                  description: t('teilen.cta_toast'),
                })
              }
            >
              <SquareArrowRight />
              {t('teilen.cta')}
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
        behoerdenById={behoerdenById}
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
  behoerdenById,
  onClose,
  onDownload,
}: {
  doc: Document | null;
  now: Date;
  behoerdenById: Record<string, Behoerde>;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}) {
  const t = useTranslations('dokumente');
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
            <DialogDescription>{t('preview.description')}</DialogDescription>
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
              <dt style={{ color: 'var(--ink-3)' }}>{t('col.kategorie')}</dt>
              <dd style={{ margin: 0 }}>
                {t(`kategorie.${kategorieBadge(doc.kategorie).labelKey}`)}
              </dd>

              {doc.dokument_nr ? (
                <>
                  <dt style={{ color: 'var(--ink-3)' }}>{t('preview.nr_label')}</dt>
                  <dd style={{ margin: 0 }}>{doc.dokument_nr}</dd>
                </>
              ) : null}

              <dt style={{ color: 'var(--ink-3)' }}>{t('preview.aussteller')}</dt>
              <dd style={{ margin: 0 }}>
                {behoerdenById[doc.ausstellende_behoerde_id]?.name_de ??
                  doc.ausstellende_behoerde_id}
              </dd>

              <dt style={{ color: 'var(--ink-3)' }}>
                {t('preview.ausgestellt_label')}
              </dt>
              <dd style={{ margin: 0 }}>{formatDe(doc.ausgestellt_am)}</dd>

              {doc.gueltig_bis ? (
                <>
                  <dt style={{ color: 'var(--ink-3)' }}>
                    {t('preview.gueltig_bis_label')}
                  </dt>
                  <dd style={{ margin: 0 }}>{formatDe(doc.gueltig_bis)}</dd>
                </>
              ) : null}

              {status ? (
                <>
                  <dt style={{ color: 'var(--ink-3)' }}>{t('col.status')}</dt>
                  <dd style={{ margin: 0 }}>{t(`status.${status}`)}</dd>
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
              {t('action.herunterladen_title')}
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
