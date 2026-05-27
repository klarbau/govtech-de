'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import {
  FileSignature,
  FileText,
  FolderOpen,
  FolderPlus,
  IdCard,
  Inbox,
  LayoutTemplate,
  Upload,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDateDe } from '@/lib/utils';
import { api } from '@/lib/mock-backend';
import type { Behoerde, Document, DocumentKategorie } from '@/types';

import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { FilterButton } from '@/components/shared/FilterButton';
import { DataTable, type DataTableRow } from '@/components/shared/DataTable';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';
import { RightRailCard } from '@/components/shared/RightRailCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import type { LucideIcon } from 'lucide-react';

import { deriveDocumentStatus, type DocumentStatus } from './deriveDocumentStatus';
import { DokumentRowActions } from './DokumentRowActions';
import { DokumentPreviewDialog } from './DokumentPreviewDialog';

interface DokumenteViewProps {
  /** SSR-stable demo "now" for deterministic status derivation. */
  nowIso: string;
}

type TabId = 'alle' | DocumentKategorie;
type SortKey = 'name' | 'ausgestellt' | 'gueltig';
type StatusFilter = DocumentStatus;

const PAGE_SIZE_DEFAULT = 10;

const KATEGORIE_ICON: Record<DocumentKategorie, LucideIcon> = {
  ausweise: IdCard,
  bescheide: FileText,
  familie: Users,
  vertraege: FileSignature,
};

const STATUS_ORDER: Record<DocumentStatus, number> = {
  abgelaufen: 0,
  ablauf_bald: 1,
  neu: 2,
  verifiziert: 3,
};

export function DokumenteView({ nowIso }: DokumenteViewProps) {
  const t = useTranslations('dokumente');
  const tStatus = useTranslations('common.status');
  const tCommon = useTranslations('common');

  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<TabId>('alle');
  const [sort, setSort] = React.useState<SortKey>('ausgestellt');
  const [statusFilters, setStatusFilters] = React.useState<StatusFilter[]>([]);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE_DEFAULT);

  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadState('loading');
    try {
      const [docs, behoerden] = await Promise.all([
        api.getDocuments(),
        api.getBehoerden(),
      ]);
      setDocuments(docs);
      setBehoerdenById(
        Object.fromEntries(behoerden.map((b) => [b.id, b])),
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const behoerdeName = React.useCallback(
    (id: string) => behoerdenById[id]?.name_de ?? id,
    [behoerdenById],
  );

  const statusOf = React.useCallback(
    (doc: Document): DocumentStatus => deriveDocumentStatus(doc, nowIso),
    [nowIso],
  );

  const kategorieOf = React.useCallback(
    (doc: Document): DocumentKategorie => doc.kategorie ?? 'bescheide',
    [],
  );

  // Category counts over the full (search-and-status-unfiltered) set, so the
  // tab counts stay stable as the prototype shows.
  const counts = React.useMemo(() => {
    const map: Record<TabId, number> = {
      alle: documents.length,
      ausweise: 0,
      bescheide: 0,
      familie: 0,
      vertraege: 0,
    };
    for (const doc of documents) map[kategorieOf(doc)] += 1;
    return map;
  }, [documents, kategorieOf]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = documents.filter((doc) => {
      if (activeTab !== 'alle' && kategorieOf(doc) !== activeTab) return false;
      if (
        statusFilters.length > 0 &&
        !statusFilters.includes(statusOf(doc))
      ) {
        return false;
      }
      if (query) {
        const haystack = [
          doc.titel,
          doc.dokument_nr ?? '',
          behoerdeName(doc.ausstellende_behoerde_id),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const sorted = [...result].sort((a, b) => {
      if (sort === 'name') return a.titel.localeCompare(b.titel, 'de');
      if (sort === 'gueltig') {
        const av = a.gueltig_bis ?? '9999-12-31';
        const bv = b.gueltig_bis ?? '9999-12-31';
        return av.localeCompare(bv);
      }
      return b.ausgestellt_am.localeCompare(a.ausgestellt_am);
    });
    return sorted;
  }, [
    documents,
    activeTab,
    statusFilters,
    search,
    sort,
    kategorieOf,
    statusOf,
    behoerdeName,
  ]);

  // Reset to page 1 whenever the result set shrinks below the current page.
  React.useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) setPage(1);
  }, [filtered.length, pageSize, page]);

  const pageItems = React.useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const recentlyAdded = React.useMemo(
    () =>
      [...documents]
        .sort((a, b) => b.ausgestellt_am.localeCompare(a.ausgestellt_am))
        .slice(0, 3),
    [documents],
  );

  function openPreview(doc: Document) {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  }

  function demoToast() {
    toast(t('demo_action_toast'));
  }

  const tabs = [
    { id: 'alle' as const, label: tCommon('all'), count: counts.alle },
    {
      id: 'ausweise' as const,
      label: t('kategorie.ausweise'),
      count: counts.ausweise,
    },
    {
      id: 'bescheide' as const,
      label: t('kategorie.bescheide'),
      count: counts.bescheide,
    },
    {
      id: 'familie' as const,
      label: t('kategorie.familie'),
      count: counts.familie,
    },
    {
      id: 'vertraege' as const,
      label: t('kategorie.vertraege'),
      count: counts.vertraege,
    },
  ];

  const columns = [
    { id: 'dokument', header: t('col.dokument'), align: 'start' as const, sortable: true },
    { id: 'kategorie', header: t('col.kategorie'), align: 'start' as const },
    { id: 'status', header: t('col.status'), align: 'start' as const, sortable: true },
    { id: 'daten', header: t('col.daten'), align: 'start' as const, sortable: true },
    { id: 'aktionen', header: t('col.aktionen'), align: 'end' as const },
  ];

  const tableSort: { columnId: string; direction: 'asc' | 'desc' } | undefined =
    sort === 'name'
      ? { columnId: 'dokument', direction: 'asc' }
      : sort === 'gueltig'
        ? { columnId: 'daten', direction: 'asc' }
        : { columnId: 'daten', direction: 'desc' };

  function onSort(columnId: string) {
    if (columnId === 'dokument') setSort('name');
    else if (columnId === 'daten') {
      setSort((prev) => (prev === 'ausgestellt' ? 'gueltig' : 'ausgestellt'));
    } else if (columnId === 'status') {
      setSort('ausgestellt');
    }
  }

  const rows: DataTableRow[] = pageItems.map((doc) => {
    const kategorie = kategorieOf(doc);
    const Icon = KATEGORIE_ICON[kategorie];
    const status = statusOf(doc);
    return {
      id: doc.id,
      cells: {
        dokument: (
          <div className="flex items-center gap-3">
            <IconCircle icon={<Icon aria-hidden="true" />} tone="primary" size="md" />
            <div className="min-w-0">
              <div className="truncate font-medium text-text-primary" title={doc.titel}>
                {doc.titel}
              </div>
              {doc.dokument_nr ? (
                <div className="truncate text-xs text-text-muted tabular-nums" dir="ltr">
                  {t('col.nr_prefix')}
                  {doc.dokument_nr}
                </div>
              ) : null}
            </div>
          </div>
        ),
        kategorie: (
          <span className="text-sm text-text-secondary">
            {t(`kategorie.${kategorie}`)}
          </span>
        ),
        status: (
          <StatusBadge variant={status}>{tStatus(status)}</StatusBadge>
        ),
        daten: (
          <div className="text-sm text-text-secondary tabular-nums" dir="ltr">
            <div>{t('daten.ausgestellt', { datum: formatDateDe(doc.ausgestellt_am) })}</div>
            <div>
              {doc.gueltig_bis
                ? t('daten.gueltig_bis', { datum: formatDateDe(doc.gueltig_bis) })
                : t('daten.unbefristet')}
            </div>
          </div>
        ),
        aktionen: (
          <DokumentRowActions
            documentName={doc.titel}
            onView={() => openPreview(doc)}
            onDownload={demoToast}
            onShare={() => openPreview(doc)}
          />
        ),
      },
    };
  });

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: t('filter.sort_name') },
    { key: 'ausgestellt', label: t('filter.sort_ausgestellt') },
    { key: 'gueltig', label: t('filter.sort_gueltig') },
  ];
  const statusOptions: { key: StatusFilter; label: string }[] = (
    ['verifiziert', 'neu', 'ablauf_bald', 'abgelaufen'] as StatusFilter[]
  )
    .sort((a, b) => STATUS_ORDER[a] - STATUS_ORDER[b])
    .map((key) => ({ key, label: tStatus(key) }));

  const activeFilterCount =
    statusFilters.length + (sort !== 'ausgestellt' ? 1 : 0);

  function toggleStatus(key: StatusFilter) {
    setStatusFilters((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
    setPage(1);
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        contextChip={{ label: tCommon('context_chip.prototype'), tone: 'prototype' }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2" aria-label={t('title')}>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('search.placeholder')}
            ariaLabel={t('search.aria_label')}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterTabs
              tabs={tabs}
              activeId={activeTab}
              onChange={(id) => {
                setActiveTab(id as TabId);
                setPage(1);
              }}
              ariaLabel={t('col.kategorie')}
            />
            <SortFilterPopover
              open={filterOpen}
              onOpenChange={setFilterOpen}
              activeCount={activeFilterCount}
              sort={sort}
              sortOptions={sortOptions}
              onSortChange={(key) => {
                setSort(key);
                setPage(1);
              }}
              statusOptions={statusOptions}
              statusFilters={statusFilters}
              onToggleStatus={toggleStatus}
            />
          </div>

          {loadState === 'loading' ? (
            <DokumenteSkeleton />
          ) : loadState === 'error' ? (
            <EmptyState
              icon={<FolderOpen aria-hidden="true" />}
              title={t('error')}
              action={
                <Button type="button" variant="outline" onClick={() => void load()}>
                  {tCommon('cta.erneut_versuchen')}
                </Button>
              }
            />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FolderOpen aria-hidden="true" />}
              title={t('empty.title')}
              action={
                <Button type="button" onClick={demoToast}>
                  {t('schnellzugriff.upload')}
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen aria-hidden="true" />}
              title={t('empty.filter_title')}
              description={t('empty.filter_description')}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                sort={tableSort}
                onSort={onSort}
                caption={t('title')}
              />
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}
        </section>

        <aside className="space-y-4" aria-label={t('schnellzugriff.title')}>
          <SectionCard title={t('schnellzugriff.title')} padding="md">
            <div className="flex flex-col gap-1">
              <QuickAction icon={Upload} label={t('schnellzugriff.upload')} onClick={demoToast} />
              <QuickAction icon={FolderPlus} label={t('schnellzugriff.ordner')} onClick={demoToast} />
              <QuickAction icon={LayoutTemplate} label={t('schnellzugriff.vorlagen')} onClick={demoToast} />
              <QuickAction icon={Inbox} label={t('schnellzugriff.papier')} onClick={demoToast} />
            </div>
          </SectionCard>

          <SectionCard title={t('zuletzt.title')} padding="md">
            <ul className="space-y-1">
              {recentlyAdded.map((doc) => {
                const Icon = KATEGORIE_ICON[kategorieOf(doc)];
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => openPreview(doc)}
                      className="flex w-full min-h-[44px] items-center gap-3 rounded-md px-2 text-start transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <IconCircle icon={<Icon aria-hidden="true" />} size="sm" tone="primary" />
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {doc.titel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <RightRailCard title={t('teilen.title')} variant="soft">
            <p className="mb-3">{t('teilen.hint')}</p>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (recentlyAdded[0]) openPreview(recentlyAdded[0]);
              }}
            >
              {t('teilen.cta')}
            </Button>
          </RightRailCard>
        </aside>
      </div>

      <DokumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        behoerdeName={previewDoc ? behoerdeName(previewDoc.ausstellende_behoerde_id) : ''}
        status={previewDoc ? statusOf(previewDoc) : 'verifiziert'}
        statusLabel={previewDoc ? tStatus(statusOf(previewDoc)) : ''}
      />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] items-center gap-3 rounded-md px-2 text-start text-sm text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <IconCircle icon={<Icon aria-hidden="true" />} size="sm" tone="primary" />
      <span>{label}</span>
    </button>
  );
}

function DokumenteSkeleton() {
  return (
    <div className="space-y-px" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-3 py-3"
        >
          <span className="size-9 shrink-0 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none" />
          <span className="h-4 flex-1 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

interface SortFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  sort: SortKey;
  sortOptions: { key: SortKey; label: string }[];
  onSortChange: (key: SortKey) => void;
  statusOptions: { key: StatusFilter; label: string }[];
  statusFilters: StatusFilter[];
  onToggleStatus: (key: StatusFilter) => void;
}

function SortFilterPopover({
  open,
  onOpenChange,
  activeCount,
  sort,
  sortOptions,
  onSortChange,
  statusOptions,
  statusFilters,
  onToggleStatus,
}: SortFilterPopoverProps) {
  const t = useTranslations('dokumente.filter');
  useStripBaseUiFocusGuardAriaHidden(open);
  const sortGroupId = React.useId();

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger
        render={<FilterButton activeCount={activeCount} />}
      />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} align="end">
          <PopoverPrimitive.Popup
            className={cn(
              'z-50 w-72 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-[var(--shadow-popover)] outline-none',
              'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
            )}
          >
            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                {t('sort_label')}
              </legend>
              <div className="flex flex-col gap-1" role="radiogroup" aria-label={t('sort_label')}>
                {sortOptions.map((opt) => {
                  const id = `${sortGroupId}-${opt.key}`;
                  return (
                    <label
                      key={opt.key}
                      htmlFor={id}
                      className="flex min-h-[36px] cursor-pointer items-center gap-2"
                    >
                      <input
                        id={id}
                        type="radio"
                        name={`${sortGroupId}-sort`}
                        checked={sort === opt.key}
                        onChange={() => onSortChange(opt.key)}
                        className="size-4 accent-primary"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                {t('status_label')}
              </legend>
              <div className="flex flex-col gap-2">
                {statusOptions.map((opt) => {
                  const id = `${sortGroupId}-status-${opt.key}`;
                  return (
                    <label
                      key={opt.key}
                      htmlFor={id}
                      className="flex min-h-[36px] cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        id={id}
                        checked={statusFilters.includes(opt.key)}
                        onCheckedChange={() => onToggleStatus(opt.key)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
