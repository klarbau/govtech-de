'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type { Letter } from '@/types';

interface AktenzeichenSearchProps {
  /** Aktueller Such-Query (kontrolliert vom Eltern-State). */
  value: string;
  onChange: (next: string) => void;
  /** Optionaler Map zum Auflösen des Behörden-Namens für Trefferzeilen. */
  behoerdenNameById?: Record<string, string>;
  className?: string;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;

/**
 * Aktenzeichen-Combobox (WAI-ARIA APG 1.2 „Combobox with Listbox Popup").
 *
 * Spec §4.1:
 * - `<input role="combobox" aria-expanded aria-controls aria-activedescendant>`
 * - Treffer-Liste als `role="listbox"`, jede Zeile `role="option"`.
 * - Tastatur: ArrowDown/ArrowUp navigiert, Enter wählt, Esc schließt.
 * - Debounced 250 ms, ruft `api.searchLettersByAktenzeichen(query)` ab
 *   3 Zeichen.
 *
 * Klick/Enter auf einen Treffer navigiert zu `/posteingang/{id}`.
 */
export function AktenzeichenSearch({
  value,
  onChange,
  behoerdenNameById,
  className,
}: AktenzeichenSearchProps) {
  const t = useTranslations('posteingang');
  const tArche = useTranslations('posteingang.archetype.label');
  const router = useRouter();

  const [results, setResults] = React.useState<Letter[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listboxId = React.useId();
  const listboxDomId = `aktenzeichen-listbox-${listboxId}`;

  // Debounced search.
  React.useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void api
        .searchLettersByAktenzeichen(trimmed)
        .then((hits) => {
          if (cancelled) return;
          setResults(hits);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value]);

  // Keep activeIndex in range when result list changes.
  React.useEffect(() => {
    setActiveIndex((prev) => {
      if (results.length === 0) return -1;
      if (prev < 0) return -1;
      return Math.min(prev, results.length - 1);
    });
  }, [results.length]);

  function selectLetter(letter: Letter) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/posteingang/${encodeURIComponent(letter.id)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length === 0) return;
      setOpen(true);
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      setOpen(true);
      setActiveIndex((prev) =>
        prev <= 0 ? results.length - 1 : prev - 1,
      );
      return;
    }
    if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && activeIndex < results.length) {
        event.preventDefault();
        selectLetter(results[activeIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  function onBlur(event: React.FocusEvent<HTMLDivElement>) {
    // Close the listbox when focus leaves the whole combobox subtree.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setOpen(false);
  }

  const hasMinChars = value.trim().length >= MIN_CHARS;
  const showListbox = open && hasMinChars && results.length > 0;
  const activeOptionId =
    showListbox && activeIndex >= 0
      ? `${listboxDomId}-option-${activeIndex}`
      : undefined;

  return (
    <div
      className={cn('relative flex flex-col', className)}
      onBlur={onBlur}
    >
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={showListbox}
        aria-controls={listboxDomId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-label={t('search.aria_label')}
        placeholder={t('search.placeholder')}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="flex min-h-[48px] w-full rounded-md border border-border-strong bg-surface px-3 py-2 ps-9 text-base text-text-primary transition-colors placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <ul
        id={listboxDomId}
        role="listbox"
        aria-label={t('search.aria_label')}
        className={cn(
          'absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md',
          showListbox ? 'block' : 'hidden',
        )}
      >
        {results.map((letter, idx) => {
          const isActive = idx === activeIndex;
          const optionId = `${listboxDomId}-option-${idx}`;
          const behoerdeName =
            behoerdenNameById?.[letter.absender_behoerde_id] ??
            letter.absender_behoerde_id;
          const archetype = letter.archetype ?? 'sonstiges';
          const earliest = (letter.fristen ?? [])
            .map((f) => f.datum)
            .sort((a, b) => a.localeCompare(b))[0];
          return (
            <li
              key={letter.id}
              id={optionId}
              role="option"
              aria-selected={isActive}
              onMouseDown={(event) => {
                event.preventDefault();
                selectLetter(letter);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-sm px-2 py-1.5',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground',
              )}
            >
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">{behoerdeName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {tArche(archetype)}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">{letter.aktenzeichen}</span>
                {earliest && (
                  <>
                    <span>·</span>
                    <span>
                      {t('card.frist_pre_open_template', {
                        datum: earliest.split('-').reverse().join('.'),
                      })}
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {hasMinChars && open && results.length === 0 && (
        <p
          role="status"
          aria-live="polite"
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
        >
          {t('search.hits_count_template', { count: 0 })}
        </p>
      )}
    </div>
  );
}
