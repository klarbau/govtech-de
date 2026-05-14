'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Inbox, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { api } from '@/lib/mock-backend';
import type { Behoerde, Letter, Vorgang } from '@/types';

import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterButton } from './FilterButton';
import {
  FilterPopover,
  filterKategorieToInternal,
  type FilterKategorie,
} from './FilterPopover';
import { FilterSheet } from './FilterSheet';
import { LetterCard } from './LetterCard';
import { LetterListGroup } from './LetterListGroup';
import { LetterListHeader } from './LetterListHeader';
import { NeuerVorgangAusBriefModal } from './NeuerVorgangAusBriefModal';
import { RechtlicheHinweiseDetails } from './RechtlicheHinweiseDetails';
import { VorgangsGruppe, SonstigeGruppe } from './VorgangsGruppe';

interface InitialData {
  letters: Letter[];
  behoerdenById: Record<string, Behoerde>;
  vorgaengeById: Record<string, Vorgang>;
  nowIso: string;
}

interface PosteingangInboxProps {
  initial: InitialData;
}

type View = 'chronologisch' | 'nach-vorgang';

const KATEGORIEN_PARAM = 'kategorien';
const TAB_PARAM = 'tab';

type StatusGroupKey =
  | 'neu'
  | 'frist_unter_7d'
  | 'frist_ueber_7d'
  | 'erledigt'
  | 'archiv';

function parseListParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function fristBucket(letter: Letter, nowIso: string): StatusGroupKey | null {
  if (!letter.fristen || letter.fristen.length === 0) return null;
  const earliest = letter.fristen
    .map((f) => f.datum)
    .sort((a, b) => a.localeCompare(b))[0];
  if (!earliest) return null;
  const days = differenceInCalendarDays(parseISO(earliest), parseISO(nowIso));
  if (days < 0) return null;
  return days <= 7 ? 'frist_unter_7d' : 'frist_ueber_7d';
}

function statusBucket(letter: Letter, nowIso: string): StatusGroupKey[] {
  const out: StatusGroupKey[] = [];
  if (letter.status === 'ungelesen') out.push('neu');
  if (letter.status === 'erledigt') out.push('erledigt');
  const fb = fristBucket(letter, nowIso);
  if (fb) out.push(fb);
  return out;
}

function applyKategorienFilter(
  letters: Letter[],
  kategorien: FilterKategorie[],
  behoerdenById: Record<string, Behoerde>,
): Letter[] {
  if (kategorien.length === 0) return letters;
  const allowed = new Set(kategorien.flatMap(filterKategorieToInternal));
  return letters.filter((l) => {
    const kat = behoerdenById[l.absender_behoerde_id]?.kategorie;
    return kat ? allowed.has(kat) : false;
  });
}

export function PosteingangInbox({ initial }: PosteingangInboxProps) {
  const t = useTranslations('posteingang');
  const tInbox = useTranslations('posteingang.inbox');
  const tCommon = useTranslations('common.cta');
  const searchParams = useSearchParams();

  const [letters, setLetters] = React.useState<Letter[]>(initial.letters);
  const [behoerdenById, setBehoerdenById] = React.useState(initial.behoerdenById);
  const [vorgaengeById] = React.useState(initial.vorgaengeById);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(
    initial.letters.length > 0,
  );
  const nowIso = initial.nowIso;

  const initialKategorien = React.useMemo(
    () =>
      (parseListParam(searchParams.get(KATEGORIEN_PARAM)) as FilterKategorie[])
        .map<FilterKategorie | null>((k) => {
          if (k === 'bund' || k === 'land' || k === 'kommunal' || k === 'sonstige') {
            return k;
          }
          // Legacy V1-URLs: selbstverwaltung + privatrechtl-behoerdenartig → sonstige.
          if (k === 'selbstverwaltung' || k === 'privatrechtl-behoerdenartig') {
            return 'sonstige';
          }
          return null;
        })
        .filter((k): k is FilterKategorie => k !== null),
    [searchParams],
  );

  const initialTab = (searchParams.get(TAB_PARAM) as View) ?? 'chronologisch';

  const [kategorien, setKategorien] =
    React.useState<FilterKategorie[]>(initialKategorien);
  const [view, setView] = React.useState<View>(initialTab);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);

  const [vorgangModalLetter, setVorgangModalLetter] =
    React.useState<Letter | null>(null);

  // URL-Sync (kategorien, tab) — pushState ohne Scroll-Reset.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (kategorien.length > 0) {
      params.set(KATEGORIEN_PARAM, [...new Set(kategorien)].join(','));
    } else {
      params.delete(KATEGORIEN_PARAM);
    }
    if (view !== 'chronologisch') params.set(TAB_PARAM, view);
    else params.delete(TAB_PARAM);
    // Clean V1.5: status-param is gelöscht.
    params.delete('status');
    const qs = params.toString();
    const next = qs ? `?${qs}` : '';
    window.history.replaceState(null, '', `${window.location.pathname}${next}`);
  }, [kategorien, view]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const [nextLetters, behoerden] = await Promise.all([
        api.getLetters(),
        api.getBehoerden(),
      ]);
      const map: Record<string, Behoerde> = {};
      for (const b of behoerden) map[b.id] = b;
      setLetters(nextLetters);
      setBehoerdenById(map);
      setHasLoadedOnce(true);
    } catch {
      setError(t('list.error_load'));
    } finally {
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    if (hasLoadedOnce) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Letters with the search-query applied but BEFORE the kategorie-filter.
  // Used to compute „n_gesamt" pro Vorgangs-Gruppe (Spec §A4).
  const searchedLetters = React.useMemo(() => {
    let out = [...letters];
    if (searchQuery.trim().length >= 3) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter(
        (l) =>
          l.aktenzeichen.toLowerCase().includes(q) ||
          (l.aktenzeichen_weitere ?? []).some((a) =>
            a.toLowerCase().includes(q),
          ) ||
          (behoerdenById[l.absender_behoerde_id]?.name_de ?? '')
            .toLowerCase()
            .includes(q),
      );
    }
    return out.sort((a, b) => b.empfangen_am.localeCompare(a.empfangen_am));
  }, [letters, searchQuery, behoerdenById]);

  // Visible letters (search + kategorie).
  const visibleLetters = React.useMemo(
    () => applyKategorienFilter(searchedLetters, kategorien, behoerdenById),
    [searchedLetters, kategorien, behoerdenById],
  );

  // Status-Gruppierung für „chronologisch".
  const grouped = React.useMemo(() => {
    const groups: Record<StatusGroupKey | 'andere', Letter[]> = {
      neu: [],
      frist_unter_7d: [],
      frist_ueber_7d: [],
      erledigt: [],
      archiv: [],
      andere: [],
    };
    for (const l of visibleLetters) {
      const buckets = statusBucket(l, nowIso);
      if (buckets.length === 0) groups.andere.push(l);
      else groups[buckets[0]!].push(l);
    }
    return groups;
  }, [visibleLetters, nowIso]);

  // Vorgangs-Gruppierung für „nach-vorgang"-Tab.
  // Wir berechnen sowohl die ungefilterten (vor Kategorie-Filter, inkl. Suche)
  // als auch die gefilterten Mengen, damit die „(n gefiltert von m)"-Anzeige
  // korrekt rendert und nicht auto-clearend ist.
  const byVorgang = React.useMemo(() => {
    const totalMap = new Map<string, Letter[]>();
    const filteredMap = new Map<string, Letter[]>();
    const sonstigeTotal: Letter[] = [];
    const sonstigeFiltered: Letter[] = [];
    const filteredSet = new Set(visibleLetters.map((l) => l.id));
    for (const l of searchedLetters) {
      if (!l.vorgang_id) {
        sonstigeTotal.push(l);
        if (filteredSet.has(l.id)) sonstigeFiltered.push(l);
      } else {
        const arr = totalMap.get(l.vorgang_id) ?? [];
        arr.push(l);
        totalMap.set(l.vorgang_id, arr);
        if (filteredSet.has(l.id)) {
          const farr = filteredMap.get(l.vorgang_id) ?? [];
          farr.push(l);
          filteredMap.set(l.vorgang_id, farr);
        }
      }
    }
    return { totalMap, filteredMap, sonstigeTotal, sonstigeFiltered };
  }, [searchedLetters, visibleLetters]);

  function resetFilter() {
    setKategorien([]);
  }

  const behoerdenNameMap = React.useMemo(() => {
    const out: Record<string, string> = {};
    for (const [id, b] of Object.entries(behoerdenById)) {
      out[id] = b.name_de;
    }
    return out;
  }, [behoerdenById]);

  const filterActive = kategorien.length > 0;

  return (
    <section
      aria-labelledby="posteingang-hero-title"
      className="flex flex-col gap-6"
    >
      <a
        href="#letter-list"
        className="sr-only rounded-md bg-foreground px-3 py-2 text-sm text-background focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50"
      >
        {t('skip_link.zur_brief_liste')}
      </a>
      <header className="flex flex-col gap-2">
        <h1
          id="posteingang-hero-title"
          className="text-3xl font-semibold tracking-tight text-foreground"
        >
          {t('hero.title')}
        </h1>
        <p className="text-muted-foreground">{t('hero.subtitle')}</p>
        <RechtlicheHinweiseDetails />
      </header>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="hidden md:block">
              <FilterPopover
                open={filterPopoverOpen}
                onOpenChange={setFilterPopoverOpen}
                selected={kategorien}
                onChange={setKategorien}
                trigger={
                  <FilterButton
                    count={kategorien.length}
                    onClick={() => setFilterPopoverOpen((o) => !o)}
                    expanded={filterPopoverOpen}
                  />
                }
              />
            </div>
            <FilterButton
              count={kategorien.length}
              onClick={() => setFilterSheetOpen(true)}
              hasPopup="dialog"
              className="md:hidden"
            />
            <FilterSheet
              open={filterSheetOpen}
              onOpenChange={setFilterSheetOpen}
              selected={kategorien}
              onChange={setKategorien}
            />
            <LetterListHeader
              view={view}
              onViewChange={setView}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              behoerdenNameById={behoerdenNameMap}
              filterCount={kategorien.length}
              className="flex-1"
            />
          </div>

          {/* Phase 6b (Audit #4) — ActiveFilterChips visuell prominenter:
              eigene Surface mit Border, Padding und ausgeschriebenem Label. */}
          {kategorien.length > 0 && (
            <div className="rounded-md border border-[var(--ds-color-border)] bg-[var(--ds-color-surface-muted)] px-3 py-2">
              <ActiveFilterChips
                selected={kategorien}
                onRemove={(k) =>
                  setKategorien((prev) => prev.filter((x) => x !== k))
                }
                onClearAll={resetFilter}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="self-start"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {tCommon('erneut_versuchen')}
            </Button>
          </div>
        )}

        <div
          id="letter-list"
          role="region"
          aria-labelledby="letter-list-heading"
          aria-live="polite"
          aria-relevant="additions removals"
          aria-busy={!hasLoadedOnce && refreshing}
          className="flex flex-col gap-6"
        >
          <h2 id="letter-list-heading" className="sr-only">
            {t('list.region_label')}
          </h2>
          {!hasLoadedOnce && refreshing && !error && (
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={`sk-${i}`}
                  className="h-24 animate-pulse rounded-xl border border-border bg-muted/30"
                />
              ))}
            </ul>
          )}

          {hasLoadedOnce && visibleLetters.length === 0 && !error && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground">
              <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
              <p>
                {filterActive || searchQuery.length > 0
                  ? t('list.empty_filter')
                  : t('list.empty_inbox')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={refreshing ? 'size-4 animate-spin' : 'size-4'}
                  aria-hidden="true"
                />
                {t('list.cta_refresh')}
              </Button>
            </div>
          )}

          {hasLoadedOnce && visibleLetters.length > 0 && view === 'chronologisch' && (
            <div className="flex flex-col gap-6">
              {(['neu', 'frist_unter_7d', 'frist_ueber_7d', 'erledigt', 'archiv'] as StatusGroupKey[]).map(
                (key) => {
                  const arr = grouped[key];
                  if (!arr || arr.length === 0) return null;
                  return (
                    <LetterListGroup
                      key={key}
                      title={t(`list.group.${key}`)}
                      count={arr.length}
                    >
                      {arr.map((l) => (
                        <LetterCard
                          key={l.id}
                          letter={l}
                          absender={behoerdenById[l.absender_behoerde_id]}
                          vorgangTitle={
                            l.vorgang_id
                              ? vorgaengeById[l.vorgang_id]?.titel
                              : undefined
                          }
                          nowIso={nowIso}
                          onCreateVorgang={(letter) =>
                            setVorgangModalLetter(letter)
                          }
                        />
                      ))}
                    </LetterListGroup>
                  );
                },
              )}
              {grouped.andere.length > 0 && (
                <LetterListGroup
                  title={t('list.group.andere')}
                  count={grouped.andere.length}
                >
                  {grouped.andere.map((l) => (
                    <LetterCard
                      key={l.id}
                      letter={l}
                      absender={behoerdenById[l.absender_behoerde_id]}
                      vorgangTitle={
                        l.vorgang_id
                          ? vorgaengeById[l.vorgang_id]?.titel
                          : undefined
                      }
                      nowIso={nowIso}
                      onCreateVorgang={(letter) =>
                        setVorgangModalLetter(letter)
                      }
                    />
                  ))}
                </LetterListGroup>
              )}
            </div>
          )}

          {hasLoadedOnce && view === 'nach-vorgang' && (
            <div className="flex flex-col gap-4">
              {[...byVorgang.totalMap.entries()].map(([vorgangId, totalArr]) => {
                const filteredArr = byVorgang.filteredMap.get(vorgangId) ?? [];
                if (filterActive && filteredArr.length === 0) return null;
                const titel = vorgaengeById[vorgangId]?.titel ?? vorgangId;
                const titleSuffix = filterActive
                  ? ' ' +
                    tInbox('vorgang_gruppe_filtered_template', {
                      gefiltert: filteredArr.length,
                      gesamt: totalArr.length,
                    })
                  : '';
                return (
                  <VorgangsGruppe
                    key={vorgangId}
                    vorgangId={vorgangId}
                    vorgangTitle={titel + titleSuffix}
                    letters={filterActive ? filteredArr : totalArr}
                    behoerdenById={behoerdenById}
                    nowIso={nowIso}
                    onCreateVorgang={setVorgangModalLetter}
                    vorgaengeById={vorgaengeById}
                  />
                );
              })}
              {byVorgang.sonstigeTotal.length > 0 && (
                <SonstigeGruppe
                  letters={
                    filterActive
                      ? byVorgang.sonstigeFiltered
                      : byVorgang.sonstigeTotal
                  }
                  behoerdenById={behoerdenById}
                  nowIso={nowIso}
                  onCreateVorgang={setVorgangModalLetter}
                />
              )}
            </div>
          )}
        </div>

        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {t('hero.speculative_footer')}
        </p>

        <PrototypeDisclaimer
          messageKey="posteingang.disclaimer.mock_data"
          titleKey="posteingang.disclaimer.mock_data_title"
          defaultOpen={false}
        />
      </div>

      <NeuerVorgangAusBriefModal
        letter={vorgangModalLetter}
        open={vorgangModalLetter !== null}
        onOpenChange={(o) => {
          if (!o) setVorgangModalLetter(null);
        }}
        onCreated={() => {
          toast.success(t('toast.refresh_after_vorgang_created'));
          void refresh();
        }}
      />
    </section>
  );
}

export type { InitialData };
