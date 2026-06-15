'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookUser,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  File,
  FileBadge,
  FileText,
  FolderPlus,
  Home,
  IdCard,
  Info,
  Landmark,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
  MockQr,
  OfficialStamp,
  WappenEmblem,
} from '@/components/dokumente/credential-art';
import { Skeleton } from '@/components/shared/Skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { verifyMeldebestaetigungCredential } from '@/app/actions/eudi';
import type { MeldebestaetigungVerificationResult } from '@/lib/eudi/types';
import { api } from '@/lib/mock-backend';
import type {
  Behoerde,
  Document,
  DocumentKategorie,
  DocumentTyp,
  Persona,
} from '@/types';

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
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<Set<DocStatusKind>>(
    () => new Set(),
  );
  const [eudiDoc, setEudiDoc] = React.useState<Document | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);
  const [profile, setProfile] = React.useState<Persona | null>(null);
  const [newDocIds, setNewDocIds] = React.useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = React.useState(false);

  const now = React.useMemo(() => new Date(nowIso), [nowIso]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [data, behoerden, prof] = await Promise.all([
          api.getDocuments(),
          api.getBehoerden(),
          api.getProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setDocs(data);
        setProfile(prof);
        setBehoerdenById(
          Object.fromEntries(behoerden.map((b) => [b.id, b])),
        );
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setLoaded(true);
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
      if (statusFilter.size > 0 && !statusFilter.has(deriveStatus(d, now))) {
        return false;
      }
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
  }, [docs, search, activeTab, sortKey, sortDir, statusFilter, now, t]);

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

  type SortChoice = 'name' | 'ausgestellt' | 'gueltig';
  const sortChoice: SortChoice =
    sortKey === 'dokument'
      ? 'name'
      : sortKey === 'status'
        ? 'gueltig'
        : 'ausgestellt';

  function applySortChoice(choice: SortChoice) {
    setPage(1);
    if (choice === 'name') {
      setSortKey('dokument');
      setSortDir('asc');
    } else if (choice === 'gueltig') {
      setSortKey('status');
      setSortDir('asc');
    } else {
      setSortKey('ausgestellt');
      setSortDir('desc');
    }
  }

  function toggleStatusFilter(status: DocStatusKind) {
    setPage(1);
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const STATUS_FILTER_IDS: DocStatusKind[] = [
    'verifiziert',
    'neu',
    'ablauf_bald',
    'abgelaufen',
  ];

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

  if (!loaded) {
    return <DokumenteSkeleton />;
  }

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
            <div className="dk-filterbar">
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
              <div className="dk-filter">
                <button
                  type="button"
                  className="chip"
                  aria-expanded={filterOpen}
                  aria-controls="dk-filter-panel"
                  onClick={() => setFilterOpen((v) => !v)}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  {t('filter.button')}
                </button>
                {filterOpen ? (
                  <div
                    id="dk-filter-panel"
                    className="dk-filter-panel"
                    role="group"
                    aria-label={t('filter.button')}
                  >
                    <fieldset
                      className="dk-filter-group"
                      role="radiogroup"
                      aria-label={t('filter.sort_label')}
                    >
                      <legend className="dk-filter-legend">
                        {t('filter.sort_label')}
                      </legend>
                      {(['name', 'ausgestellt', 'gueltig'] as const).map((choice) => {
                        const id = `dk-sort-${choice}`;
                        return (
                          <div key={choice} className="dk-filter-row">
                            <input
                              type="radio"
                              id={id}
                              name="dk-sort"
                              checked={sortChoice === choice}
                              onChange={() => applySortChoice(choice)}
                            />
                            <label htmlFor={id}>{t(`filter.sort_${choice}`)}</label>
                          </div>
                        );
                      })}
                    </fieldset>
                    <fieldset className="dk-filter-group">
                      <legend className="dk-filter-legend">
                        {t('filter.status_label')}
                      </legend>
                      {STATUS_FILTER_IDS.map((status) => {
                        const id = `dk-status-${status}`;
                        return (
                          <div key={status} className="dk-filter-row">
                            <input
                              type="checkbox"
                              id={id}
                              checked={statusFilter.has(status)}
                              onChange={() => toggleStatusFilter(status)}
                            />
                            <label htmlFor={id}>{t(`status.${status}`)}</label>
                          </div>
                        );
                      })}
                    </fieldset>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="dk-table">
            <table>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSortFor('dokument')}>
                    <SortHeader
                      label={t('col.dokument')}
                      active={sortKey === 'dokument'}
                      dir={sortDir}
                      onClick={() => toggleSort('dokument')}
                    />
                  </th>
                  <th scope="col" aria-sort={ariaSortFor('kategorie')}>
                    <SortHeader
                      label={t('col.kategorie')}
                      active={sortKey === 'kategorie'}
                      dir={sortDir}
                      onClick={() => toggleSort('kategorie')}
                    />
                  </th>
                  <th scope="col" aria-sort={ariaSortFor('status')}>
                    <SortHeader
                      label={t('col.status')}
                      active={sortKey === 'status'}
                      dir={sortDir}
                      onClick={() => toggleSort('status')}
                    />
                  </th>
                  <th scope="col" aria-sort={ariaSortFor('ausgestellt')}>
                    <SortHeader
                      label={t('col.daten')}
                      active={sortKey === 'ausgestellt'}
                      dir={sortDir}
                      onClick={() => toggleSort('ausgestellt')}
                    />
                  </th>
                  <th scope="col">{t('col.aktionen')}</th>
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

            <nav className="pagination" aria-label={t('pagination.nav_label')}>
              <div className="muted text-sm" aria-live="polite">
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
            </nav>
          </div>
        </div>

        <aside className="rail" aria-label={t('rail.aside_label')}>
          <div className="card">
            <h2>{t('schnellzugriff.title')}</h2>
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
            <h2>{t('zuletzt.title')}</h2>
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
            <h2>{t('teilen.title')}</h2>
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
        </aside>
      </div>

      <EudiExportDialog
        open={!!eudiDoc}
        doc={eudiDoc}
        onOpenChange={(next) => {
          if (!next) setEudiDoc(null);
        }}
      />

      <DocumentDetailDialog
        doc={previewDoc}
        now={now}
        behoerdenById={behoerdenById}
        geschlecht={profile?.geschlecht}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownloadDoc}
      />
    </>
  );
}

function DokumenteSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <Skeleton className="h-10 rounded-xl" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
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

/* ─────────────────────────── Document detail dialog ───────────────────────────
 * The right-anchored detail panel that opens on the eye-icon. For an
 * EUDI-compatible Meldebestätigung it re-verifies the SD-JWT VC credential
 * (server action) and renders the verification readout + a faux „Urkunde"
 * preview; for any other document it degrades to the metadata + a generic card.
 */

const DETAIL_TABS = ['uebersicht', 'vorschau', 'verlauf'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

/** Strip the `[MOCK]` prefix for inline display (the watermark is shown separately). */
function stripMock(s: string): string {
  return s.replace(/^\[MOCK\]\s*/, '').trim();
}

/** Split a „Behörde — Amt" name into its two display lines. */
function splitBehoerde(name: string): [string, string | null] {
  const parts = name.split(/\s+—\s+/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' — ')];
  return [name, null];
}

/** Split a single-line address into „Straße Nr." + „PLZ Ort". */
function splitAnschrift(anschrift: string): [string, string | null] {
  const idx = anschrift.lastIndexOf(',');
  if (idx === -1) return [anschrift, null];
  return [anschrift.slice(0, idx).trim(), anschrift.slice(idx + 1).trim()];
}

function DocumentDetailDialog({
  doc,
  now,
  behoerdenById,
  geschlecht,
  onClose,
  onDownload,
}: {
  doc: Document | null;
  now: Date;
  behoerdenById: Record<string, Behoerde>;
  geschlecht?: string;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}) {
  return (
    <Dialog
      open={!!doc}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {doc ? (
        <DocumentDetailContent
          doc={doc}
          now={now}
          behoerdenById={behoerdenById}
          geschlecht={geschlecht}
          onClose={onClose}
          onDownload={onDownload}
        />
      ) : null}
    </Dialog>
  );
}

function DocumentDetailContent({
  doc,
  now,
  behoerdenById,
  geschlecht,
  onClose,
  onDownload,
}: {
  doc: Document;
  now: Date;
  behoerdenById: Record<string, Behoerde>;
  geschlecht?: string;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}) {
  const t = useTranslations('dokumente');
  const td = useTranslations('dokumente.detail');
  const titleId = React.useId();
  const baseId = React.useId();
  const [tab, setTab] = React.useState<DetailTab>('uebersicht');
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const isMelde = doc.typ === 'meldebestaetigung' && doc.eudi_compatible;
  const [result, setResult] =
    React.useState<MeldebestaetigungVerificationResult | null>(null);
  const [vState, setVState] = React.useState<'loading' | 'ready' | 'error'>(
    isMelde ? 'loading' : 'ready',
  );

  React.useEffect(() => {
    if (!isMelde) {
      setVState('ready');
      return;
    }
    let cancelled = false;
    setVState('loading');
    void verifyMeldebestaetigungCredential(doc.owner_persona_id, doc.vorgang_id)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setVState('ready');
      })
      .catch(() => {
        if (!cancelled) setVState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [isMelde, doc.owner_persona_id, doc.vorgang_id]);

  const status = deriveStatus(doc, now);
  const cryptoVerified =
    isMelde && result !== null && result.verified && result.chainValid;
  const showVerified = isMelde ? cryptoVerified : status === 'verifiziert';

  const behoerdeName =
    behoerdenById[doc.ausstellende_behoerde_id]?.name_de ??
    doc.ausstellende_behoerde_id;
  const docId = stripMock(doc.dokument_nr ?? '');
  const kat = kategorieBadge(doc.kategorie);

  function onTabKeyDown(e: React.KeyboardEvent, idx: number) {
    const last = DETAIL_TABS.length - 1;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = idx === last ? 0 : idx + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = idx === 0 ? last : idx - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    setTab(DETAIL_TABS[next]);
    tabRefs.current[next]?.focus();
  }

  return (
    <DialogContent data-doc-detail-panel className="dd-panel" aria-labelledby={titleId}>
      <header className="dd-head">
        <div className="dd-head-top">
          <h2 id={titleId} className="dd-title">
            {doc.titel}
          </h2>
          {showVerified ? (
            <span className="dd-verified">
              <ShieldCheck aria-hidden="true" />
              {t('status.verifiziert')}
            </span>
          ) : null}
        </div>

        <dl className="dd-meta">
          <div>
            <dt>{td('meta.dokument_id')}</dt>
            <dd className="mono">{docId || '—'}</dd>
          </div>
          <div>
            <dt>{td('meta.ausgestellt')}</dt>
            <dd>{formatDe(doc.ausgestellt_am)}</dd>
          </div>
          <div>
            <dt>{td('meta.kategorie')}</dt>
            <dd>{t(`kategorie.${kat.labelKey}`)}</dd>
          </div>
          {doc.vorgang_id ? (
            <div>
              <dt>{td('meta.vorgang')}</dt>
              <dd>
                <Link
                  className="dd-vorgang-link"
                  href={`/vorgaenge/umzug/${doc.vorgang_id}`}
                >
                  {td('meta.vorgang_umzug')}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        <dl className="dd-aussteller">
          <dt>{td('meta.aussteller')}</dt>
          <dd>{behoerdeName}</dd>
        </dl>

        <div role="tablist" aria-label={td('tablist_label')} className="dd-tabs">
          {DETAIL_TABS.map((id, idx) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${id}`}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              aria-selected={tab === id}
              aria-controls={`${baseId}-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              className={`dd-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
              onKeyDown={(e) => onTabKeyDown(e, idx)}
            >
              {td(`tab.${id}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="dd-body">
        <section
          role="tabpanel"
          id={`${baseId}-panel-uebersicht`}
          aria-labelledby={`${baseId}-tab-uebersicht`}
          tabIndex={0}
          hidden={tab !== 'uebersicht'}
        >
          {tab === 'uebersicht' ? (
            <UebersichtPanel
              doc={doc}
              now={now}
              behoerdeName={behoerdeName}
              isMelde={isMelde}
              vState={vState}
              result={result}
              showVerified={showVerified}
              geschlecht={geschlecht}
              docId={docId}
            />
          ) : null}
        </section>

        <section
          role="tabpanel"
          id={`${baseId}-panel-vorschau`}
          aria-labelledby={`${baseId}-tab-vorschau`}
          tabIndex={0}
          hidden={tab !== 'vorschau'}
        >
          {tab === 'vorschau' ? (
            <div className="dd-vorschau">
              <DocumentRender
                doc={doc}
                behoerdeName={behoerdeName}
                isMelde={isMelde}
                result={result}
                geschlecht={geschlecht}
                docId={docId}
              />
            </div>
          ) : null}
        </section>

        <section
          role="tabpanel"
          id={`${baseId}-panel-verlauf`}
          aria-labelledby={`${baseId}-tab-verlauf`}
          tabIndex={0}
          hidden={tab !== 'verlauf'}
        >
          {tab === 'verlauf' ? (
            <VerlaufPanel
              doc={doc}
              behoerdeName={behoerdeName}
              isMelde={isMelde}
              showVerified={showVerified}
            />
          ) : null}
        </section>
      </div>

      <footer className="dd-foot">
        <p className="dd-demo-note">{td('demo_note')}</p>
        <div className="dd-foot-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onDownload(doc)}
          >
            <Download />
            {td('download')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {td('close')}
          </button>
        </div>
      </footer>
    </DialogContent>
  );
}

/** Format a Meldebestätigung field value (dates → German, wohnungsstatus → label). */
function meldeFieldValue(
  td: ReturnType<typeof useTranslations>,
  field: string,
  value: string | undefined,
): string {
  if (!value) return '—';
  if (field === 'geburtsdatum' || field === 'einzugsdatum' || field === 'datum_anmeldung') {
    return formatDe(value);
  }
  if (field === 'wohnungsstatus') {
    const key = value.toLowerCase();
    if (key === 'hauptwohnung') return td('wohnungsstatus.hauptwohnung');
    if (key === 'nebenwohnung') return td('wohnungsstatus.nebenwohnung');
    if (key === 'alleinige' || key === 'alleinige_wohnung') return td('wohnungsstatus.alleinige');
    return value;
  }
  return value;
}

/** The six confirmation fields shown in the readout grid (screenshot order). */
const DETAIL_FIELD_ROWS: Array<{ field: string; labelKey: string }> = [
  { field: 'familienname', labelKey: 'field.familienname' },
  { field: 'vornamen', labelKey: 'field.vorname' },
  { field: 'geburtsdatum', labelKey: 'field.geburtsdatum' },
  { field: 'anschrift', labelKey: 'field.anschrift' },
  { field: 'wohnungsstatus', labelKey: 'field.wohnungsstatus' },
  { field: 'einzugsdatum', labelKey: 'field.einzugsdatum' },
];

function UebersichtPanel({
  doc,
  now,
  behoerdeName,
  isMelde,
  vState,
  result,
  showVerified,
  geschlecht,
  docId,
}: {
  doc: Document;
  now: Date;
  behoerdeName: string;
  isMelde: boolean;
  vState: 'loading' | 'ready' | 'error';
  result: MeldebestaetigungVerificationResult | null;
  showVerified: boolean;
  geschlecht?: string;
  docId: string;
}) {
  const t = useTranslations('dokumente');
  const td = useTranslations('dokumente.detail');
  const loading = isMelde && vState === 'loading';

  return (
    <div className="dd-uebersicht">
      <div className="dd-uber-left">
        {showVerified || loading ? (
          <div className="dd-echtheit">
            <span className="dd-echtheit-icon" aria-hidden="true">
              {loading ? (
                <Loader2 className="dd-spin" />
              ) : (
                <ShieldCheck />
              )}
            </span>
            <div>
              <div className="dd-echtheit-title">{td('echtheit.title')}</div>
              <p className="dd-echtheit-body">
                {loading ? td('echtheit.checking') : td('echtheit.body')}
              </p>
            </div>
          </div>
        ) : null}

        {isMelde && result && vState === 'ready' ? (
          <dl className="dd-fields" aria-label={td('echtheit.fields_label')}>
            {DETAIL_FIELD_ROWS.map(({ field, labelKey }) => {
              const value = result.fields[field as keyof typeof result.fields];
              if (!value) return null;
              return (
                <div key={field} className="dd-field">
                  <dt>{td(labelKey)}</dt>
                  <dd>{meldeFieldValue(td, field, value)}</dd>
                </div>
              );
            })}
          </dl>
        ) : !isMelde ? (
          <dl className="dd-fields">
            <div className="dd-field">
              <dt>{td('meta.kategorie')}</dt>
              <dd>{t(`kategorie.${kategorieBadge(doc.kategorie).labelKey}`)}</dd>
            </div>
            {docId ? (
              <div className="dd-field">
                <dt>{td('meta.dokument_id')}</dt>
                <dd>{docId}</dd>
              </div>
            ) : null}
            <div className="dd-field">
              <dt>{td('meta.aussteller')}</dt>
              <dd>{behoerdeName}</dd>
            </div>
            <div className="dd-field">
              <dt>{td('meta.ausgestellt')}</dt>
              <dd>{formatDe(doc.ausgestellt_am)}</dd>
            </div>
            {doc.gueltig_bis ? (
              <div className="dd-field">
                <dt>{td('meta.gueltig_bis')}</dt>
                <dd>{formatDe(doc.gueltig_bis)}</dd>
              </div>
            ) : null}
            <div className="dd-field">
              <dt>{t('col.status')}</dt>
              <dd>{t(`status.${deriveStatus(doc, now)}`)}</dd>
            </div>
          </dl>
        ) : null}

        <div className="dd-hinweis">
          <Info aria-hidden="true" />
          <div>
            <div className="dd-hinweis-title">{td('hinweis.title')}</div>
            <p className="dd-hinweis-body">{td('hinweis.body')}</p>
          </div>
        </div>
      </div>

      <div className="dd-uber-right">
        <DocumentRender
          doc={doc}
          behoerdeName={behoerdeName}
          isMelde={isMelde}
          result={result}
          geschlecht={geschlecht}
          docId={docId}
        />
      </div>
    </div>
  );
}

function DocumentRender({
  doc,
  behoerdeName,
  isMelde,
  result,
  geschlecht,
  docId,
}: {
  doc: Document;
  behoerdeName: string;
  isMelde: boolean;
  result: MeldebestaetigungVerificationResult | null;
  geschlecht?: string;
  docId: string;
}) {
  const td = useTranslations('dokumente.detail');
  const [behoerdeLine1, behoerdeLine2] = splitBehoerde(behoerdeName);

  const anrede =
    geschlecht === 'w'
      ? td('render.anrede_w')
      : geschlecht === 'm'
        ? td('render.anrede_m')
        : '';

  const f = result?.fields;
  const fullName = f
    ? [f.vornamen, f.familienname].filter(Boolean).join(' ')
    : '';
  const [strasse, plzOrt] = f?.anschrift
    ? splitAnschrift(f.anschrift)
    : ['', null];
  const wohnstatus = meldeFieldValue(td, 'wohnungsstatus', f?.wohnungsstatus);

  return (
    <article className="dd-render" aria-label={td('render.preview_label')}>
      <span className="dd-render-mock" role="note">
        {doc.watermark}
      </span>
      <header className="dd-render-head">
        <WappenEmblem className="dd-wappen" />
        <div className="dd-render-issuer">
          <strong>{behoerdeLine1}</strong>
          {behoerdeLine2 ? <span>{behoerdeLine2}</span> : null}
        </div>
      </header>

      <h3 className="dd-render-title">
        {isMelde ? td('render.title') : doc.titel}
      </h3>
      {isMelde ? <p className="dd-render-legal">{td('render.legal')}</p> : null}

      {isMelde && f ? (
        <div className="dd-render-body">
          <p>{td('render.intro')}</p>
          <p className="dd-render-name">
            {[anrede, fullName].filter(Boolean).join(' ')}
          </p>
          <p>{td('render.geboren', { datum: meldeFieldValue(td, 'geburtsdatum', f.geburtsdatum) })}</p>
          <p>{td('render.zum', { datum: meldeFieldValue(td, 'einzugsdatum', f.einzugsdatum) })}</p>
          <p>{td('render.anmeldung', { status: wohnstatus })}</p>
          <p className="dd-render-address">
            <strong>{strasse}</strong>
            {plzOrt ? (
              <>
                <br />
                <strong>{plzOrt}</strong>
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <div className="dd-render-body">
          <p>{td('hinweis.body')}</p>
        </div>
      )}

      <div className="dd-render-meta">
        <div>
          <span className="dd-render-meta-label">{td('render.ausgestellt_label')}</span>
          <span>{formatDe(doc.ausgestellt_am)}</span>
        </div>
        {docId ? (
          <div>
            <span className="dd-render-meta-label">{td('render.id_label')}</span>
            <span className="mono">{docId}</span>
          </div>
        ) : null}
      </div>

      <p className="dd-render-disclaimer">{td('render.disclaimer')}</p>

      <div className="dd-render-foot">
        <MockQr
          value={doc.qr_payload || doc.id}
          className="dd-qr"
          title={td('render.qr_alt')}
        />
        <OfficialStamp
          topText={td('render.stamp_top')}
          bottomText={td('render.stamp_bottom')}
          className="dd-stamp"
        />
      </div>
    </article>
  );
}

function VerlaufPanel({
  doc,
  behoerdeName,
  isMelde,
  showVerified,
}: {
  doc: Document;
  behoerdeName: string;
  isMelde: boolean;
  showVerified: boolean;
}) {
  const td = useTranslations('dokumente.detail');
  const events: Array<{ Icon: LucideIcon; title: string; sub: string; date?: string }> = [
    {
      Icon: FileBadge,
      title: td('verlauf.issued'),
      sub: td('verlauf.issued_by', { behoerde: behoerdeName }),
      date: formatDe(doc.ausgestellt_am),
    },
  ];
  if (isMelde && showVerified) {
    events.push({
      Icon: ShieldCheck,
      title: td('verlauf.verified'),
      sub: td('verlauf.verified_by'),
    });
  }
  events.push({
    Icon: CheckCircle2,
    title: td('verlauf.stored'),
    sub: td('verlauf.stored_sub'),
  });

  return (
    <ol className="dd-timeline" aria-label={td('verlauf.title')}>
      {events.map((ev, i) => (
        <li key={i} className="dd-timeline-item">
          <span className="dd-timeline-icon" aria-hidden="true">
            <ev.Icon />
          </span>
          <div className="dd-timeline-body">
            <div className="dd-timeline-title">
              {ev.title}
              {ev.date ? <span className="dd-timeline-date">{ev.date}</span> : null}
            </div>
            <p className="dd-timeline-sub">{ev.sub}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
