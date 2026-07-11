'use client';

import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Calendar,
  FileText,
  Folder,
  Mail,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type SearchGroup =
  | 'briefe'
  | 'vorgaenge'
  | 'dokumente'
  | 'termine'
  | 'seiten';

export interface SearchResult {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  route: string;
}

export const GLOBAL_SEARCH_LISTBOX_ID = 'global-search-listbox';

export function optionDomId(resultId: string): string {
  return `gs-${resultId}`;
}

const GROUP_ICON: Record<SearchGroup, LucideIcon> = {
  briefe: Mail,
  vorgaenge: Folder,
  dokumente: FileText,
  termine: Calendar,
  seiten: ArrowUpRight,
};

interface GlobalSearchDropdownProps {
  belowMinChars: boolean;
  /** Trimmed query, for the no-results message. */
  query: string;
  grouped: { group: SearchGroup; items: SearchResult[] }[];
  activeResultId?: string;
  showOffline: boolean;
  onSelect: (result: SearchResult) => void;
  onHover: (resultId: string) => void;
}

/**
 * `<GlobalSearchDropdown>` — the anchored, NON-modal result menu below the
 * global search input (spec `global-search.md` v1.1). Pure presentation +
 * keyboard delegation: the active option is driven from the parent via
 * `aria-activedescendant` (focus never leaves the input), so there is no
 * base-ui Dialog, no focus trap and no `inert`.
 *
 * `onMouseDown` is prevented on the whole menu so clicking a result does not
 * blur the input (which would race the click into a close) — the standard
 * combobox pattern.
 */
export function GlobalSearchDropdown({
  belowMinChars,
  query,
  grouped,
  activeResultId,
  showOffline,
  onSelect,
  onHover,
}: GlobalSearchDropdownProps) {
  const t = useTranslations('search');
  const hasResults = grouped.length > 0;

  return (
    <div
      className="lg-search-dropdown"
      onMouseDown={(e) => e.preventDefault()}
    >
      {showOffline ? (
        <p className="lg-search-offline" role="note">
          {t('offline_notice')}
        </p>
      ) : null}

      {belowMinChars ? (
        <p className="lg-search-hint">{t('hint_min_chars')}</p>
      ) : !hasResults ? (
        <div className="lg-search-empty">
          <p className="lg-search-empty-title">{t('no_results', { query })}</p>
          <p className="lg-search-empty-hint">{t('no_results_hint')}</p>
        </div>
      ) : (
        <div
          role="listbox"
          id={GLOBAL_SEARCH_LISTBOX_ID}
          className="lg-search-listbox"
        >
          {grouped.map((g) => {
            const groupLabel = t(`group_${g.group}`);
            const Icon = GROUP_ICON[g.group];
            return (
              <div
                key={g.group}
                role="group"
                aria-label={groupLabel}
                className="lg-search-group"
              >
                <p className="lg-search-group-label" aria-hidden="true">
                  {groupLabel}
                </p>
                {g.items.map((result) => {
                  const isActive = activeResultId === result.id;
                  return (
                    <div
                      key={result.id}
                      id={optionDomId(result.id)}
                      role="option"
                      aria-selected={isActive}
                      className={cn('lg-search-option', isActive && 'is-active')}
                      onMouseEnter={() => onHover(result.id)}
                      onClick={() => onSelect(result)}
                    >
                      <Icon
                        className="lg-search-option-icon"
                        aria-hidden="true"
                      />
                      <span className="lg-search-option-text">
                        <span
                          className="lg-search-option-title"
                          title={result.title}
                        >
                          {result.title}
                        </span>
                        {result.subtitle ? (
                          <span className="lg-search-option-sub">
                            {result.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
