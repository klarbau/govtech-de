'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

import { api } from '@/lib/mock-backend/api';
import { resolveBehoerdeName } from '@/lib/behoerde-name';
import { lgEnabled } from '@/lib/liquid-glass';
import { cn } from '@/lib/utils';
import type { Letter } from '@/types/letter';
import type { Vorgang } from '@/types/vorgang';
import type { Document } from '@/types/document';
import type { Termin } from '@/types/termin';

import { navItems } from './nav-items';
import { useGlobalSearch } from './global-search-store';
import {
  GlobalSearchDropdown,
  GLOBAL_SEARCH_LISTBOX_ID,
  optionDomId,
  type SearchGroup,
  type SearchResult,
} from './GlobalSearchDropdown';

const MIN_CHARS = 2;
const MAX_PER_GROUP = 6;
const DEBOUNCE_MS = 150;
const MOBILE_MEDIA = '(max-width: 1023px)';
const REGION_ID = 'global-search-region';
const MOBILE_TRIGGER_ID = 'global-search-mobile-trigger';
const ENTITY_GROUPS: SearchGroup[] = ['briefe', 'vorgaenge', 'dokumente', 'termine'];

interface Collections {
  letters: Letter[];
  vorgaenge: Vorgang[];
  documents: Document[];
  termine: Termin[];
  behoerdeNameById: Map<string, string>;
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((f) => !!f && f.toLowerCase().includes(query));
}

/**
 * `<GlobalSearch>` — app-wide quick search (spec `global-search.md` v1.1). The
 * „Suchen ⌘K" pill IS a real `role="combobox"` input in the TopNav: on focus it
 * animates wider (CSS `:focus-within` width transition) and an anchored,
 * NON-modal dropdown drops down below it. No dialog, no scrim, no focus trap —
 * focus stays in the input; the active result is tracked via
 * `aria-activedescendant`.
 *
 * The same element becomes the mobile search bar: below 1024px the inline pill
 * is hidden and the magnifier (`GlobalSearchMobileButton`) sets
 * `useGlobalSearch.open`, which drops a fixed full-width bar under `.app-topnav`
 * (class `is-mobile-open`) with identical combobox semantics. One input, one
 * listbox id — repositioned by CSS — so there is no duplicate-id hazard.
 *
 * Data (§6) loads once, on first focus, via `api.*` + `Promise.allSettled`; a
 * failing collection just drops its group while page targets (`nav-items`) stay
 * usable offline. `lgEnabled`-gated (`NEXT_PUBLIC_LG=0` → null).
 */
export function GlobalSearch() {
  const t = useTranslations('search');
  const tNav = useTranslations('nav');
  const tTop = useTranslations('topnav');
  const router = useRouter();

  const mobileOpen = useGlobalSearch((s) => s.open);
  const setMobileOpen = useGlobalSearch((s) => s.setOpen);

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const loadStartedRef = React.useRef(false);

  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [collections, setCollections] = React.useState<Collections | null>(null);
  const [failedGroups, setFailedGroups] = React.useState<Set<SearchGroup>>(
    () => new Set(),
  );

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  const loadData = React.useCallback(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    Promise.allSettled([
      api.getLetters(),
      api.getVorgaenge(),
      api.getDocuments(),
      api.getTermine(),
      api.getBehoerden(),
    ]).then(([lettersRes, vorgaengeRes, documentsRes, termineRes, behoerdenRes]) => {
      const failed = new Set<SearchGroup>();
      const take = <T,>(
        res: PromiseSettledResult<T[]>,
        group: SearchGroup,
      ): T[] => {
        if (res.status === 'fulfilled') return res.value;
        failed.add(group);
        return [];
      };
      const behoerdeNameById = new Map<string, string>();
      if (behoerdenRes.status === 'fulfilled') {
        for (const b of behoerdenRes.value) behoerdeNameById.set(b.id, b.name_de);
      }
      setCollections({
        letters: take(lettersRes, 'briefe'),
        vorgaenge: take(vorgaengeRes, 'vorgaenge'),
        documents: take(documentsRes, 'dokumente'),
        termine: take(termineRes, 'termine'),
        behoerdeNameById,
      });
      setFailedGroups(failed);
    });
  }, []);

  // Focus the input when the mobile bar opens.
  React.useEffect(() => {
    if (mobileOpen) {
      loadData();
      inputRef.current?.focus();
    }
  }, [mobileOpen, loadData]);

  // Global ⌘K / Ctrl-K: focus the search (desktop) or drop the mobile bar.
  React.useEffect(() => {
    if (!lgEnabled) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        loadData();
        if (window.matchMedia(MOBILE_MEDIA).matches) {
          setMobileOpen(true);
        } else {
          inputRef.current?.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loadData, setMobileOpen]);

  const pages = React.useMemo(
    () => [
      ...navItems.map((n) => ({ href: n.href, label: tNav(n.i18nKey) })),
      { href: '/lebenslagen', label: tTop('lebenslagen') },
    ],
    [tNav, tTop],
  );

  const grouped = React.useMemo<{ group: SearchGroup; items: SearchResult[] }[]>(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (q.length < MIN_CHARS) return [];

    const nameOf = (id: string): string =>
      collections?.behoerdeNameById.get(id) ?? resolveBehoerdeName(id);

    const out: { group: SearchGroup; items: SearchResult[] }[] = [];

    if (collections) {
      const briefe = collections.letters
        .filter((l) =>
          matches(
            q,
            l.betreff,
            l.aktenzeichen,
            ...(l.aktenzeichen_weitere ?? []),
            nameOf(l.absender_behoerde_id),
          ),
        )
        .slice(0, MAX_PER_GROUP)
        .map<SearchResult>((l) => ({
          id: `letter:${l.id}`,
          group: 'briefe',
          title: l.betreff,
          subtitle: nameOf(l.absender_behoerde_id),
          route: `/posteingang/${l.id}`,
        }));
      if (briefe.length) out.push({ group: 'briefe', items: briefe });

      const vorgaenge = collections.vorgaenge
        .filter((v) => matches(q, v.titel, ...v.beteiligte_behoerden_ids.map(nameOf)))
        .slice(0, MAX_PER_GROUP)
        .map<SearchResult>((v) => ({
          id: `vorgang:${v.id}`,
          group: 'vorgaenge',
          title: v.titel,
          subtitle: v.beteiligte_behoerden_ids.map(nameOf).join(', ') || undefined,
          route: `/vorgaenge/${v.id}`,
        }));
      if (vorgaenge.length) out.push({ group: 'vorgaenge', items: vorgaenge });

      const dokumente = collections.documents
        .filter((d) => matches(q, d.titel, d.typ, nameOf(d.ausstellende_behoerde_id)))
        .slice(0, MAX_PER_GROUP)
        .map<SearchResult>((d) => ({
          id: `document:${d.id}`,
          group: 'dokumente',
          title: d.titel,
          subtitle: nameOf(d.ausstellende_behoerde_id),
          route: '/dokumente',
        }));
      if (dokumente.length) out.push({ group: 'dokumente', items: dokumente });

      const termine = collections.termine
        .filter((tm) => matches(q, tm.betreff, nameOf(tm.behoerde_id), tm.ort.details))
        .slice(0, MAX_PER_GROUP)
        .map<SearchResult>((tm) => ({
          id: `termin:${tm.id}`,
          group: 'termine',
          title: tm.betreff,
          subtitle: nameOf(tm.behoerde_id),
          route: '/termine',
        }));
      if (termine.length) out.push({ group: 'termine', items: termine });
    }

    const seiten = pages
      .filter((p) => p.label.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map<SearchResult>((p) => ({
        id: `page:${p.href}`,
        group: 'seiten',
        title: p.label,
        route: p.href,
      }));
    if (seiten.length) out.push({ group: 'seiten', items: seiten });

    return out;
  }, [debouncedQuery, collections, pages]);

  const flatResults = React.useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );
  const activeResult = flatResults[activeIndex];
  const listboxVisible = dropdownOpen && flatResults.length > 0;
  const activeOptionId = listboxVisible && activeResult
    ? optionDomId(activeResult.id)
    : undefined;

  React.useEffect(() => {
    if (activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeOptionId]);

  const trimmed = debouncedQuery.trim();
  const belowMinChars = trimmed.length < MIN_CHARS;
  const showOffline = !belowMinChars && ENTITY_GROUPS.some((g) => failedGroups.has(g));
  const statusMessage = belowMinChars
    ? ''
    : flatResults.length === 0
      ? t('no_results', { query: trimmed })
      : t('results_status', { count: flatResults.length });

  const resetQuery = React.useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setActiveIndex(0);
  }, []);

  const closeSearch = React.useCallback(
    (returnFocusToTrigger: boolean) => {
      setDropdownOpen(false);
      resetQuery();
      if (mobileOpen) {
        setMobileOpen(false);
        if (returnFocusToTrigger) {
          document.getElementById(MOBILE_TRIGGER_ID)?.focus();
        }
      }
    },
    [mobileOpen, resetQuery, setMobileOpen],
  );

  function handleFocus() {
    setFocused(true);
    loadData();
    setDropdownOpen(true);
  }

  function handleWrapperBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
      setFocused(false);
      closeSearch(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (!dropdownOpen) setDropdownOpen(true);
  }

  function navigate(result: SearchResult) {
    router.push(result.route);
    setDropdownOpen(false);
    resetQuery();
    if (mobileOpen) setMobileOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (dropdownOpen) {
        setDropdownOpen(false);
      } else if (mobileOpen) {
        closeSearch(true);
      } else {
        resetQuery();
        inputRef.current?.blur();
      }
      return;
    }
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dropdownOpen) setDropdownOpen(true);
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!dropdownOpen) setDropdownOpen(true);
      setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      const result = flatResults[activeIndex];
      if (result && dropdownOpen) {
        e.preventDefault();
        navigate(result);
      }
    }
  }

  function handleHover(resultId: string) {
    const idx = flatResults.findIndex((x) => x.id === resultId);
    if (idx >= 0) setActiveIndex(idx);
  }

  if (!lgEnabled) return null;

  return (
    <>
      <div
        ref={wrapperRef}
        role="search"
        id={REGION_ID}
        aria-label={t('dialog_label')}
        className={cn('lg-top-search', mobileOpen && 'is-mobile-open')}
        onBlur={handleWrapperBlur}
      >
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          suppressHydrationWarning
          className="lg-top-search-input"
          aria-label={t('input_aria')}
          aria-expanded={listboxVisible}
          aria-controls={GLOBAL_SEARCH_LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder={
            /* The rest-state pill (~150–220px) can't fit the full field hint —
               it shows the short „Suchen" label and swaps to the long
               placeholder once the pill is expanded (focus / mobile bar). */
            focused || mobileOpen ? t('input_placeholder') : t('trigger_label')
          }
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="lg-top-search-kbd" aria-hidden="true">
          ⌘K
        </kbd>
        <button
          type="button"
          className="lg-top-search-close"
          aria-label={t('close')}
          onClick={() => closeSearch(true)}
        >
          <X aria-hidden="true" />
        </button>

        <div aria-live="polite" className="sr-only">
          {statusMessage}
        </div>

        {dropdownOpen ? (
          <GlobalSearchDropdown
            belowMinChars={belowMinChars}
            query={trimmed}
            grouped={grouped}
            activeResultId={activeResult?.id}
            showOffline={showOffline}
            onSelect={navigate}
            onHover={handleHover}
          />
        ) : null}
      </div>
      <div className="lg-top-search-spacer" />
    </>
  );
}
