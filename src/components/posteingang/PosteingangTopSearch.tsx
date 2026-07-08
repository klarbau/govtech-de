'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { usePosteingangSearch } from '@/components/posteingang/posteingang-search-store';
import { lgEnabled } from '@/lib/liquid-glass';

/**
 * Liquid-Glass top-bar search — the „Suchen ⌘K" pill from the Posteingang
 * mockup, hosted in the global `TopNav` but rendered ONLY on /posteingang (where
 * the glass skin is mounted). It writes the shared query
 * (`usePosteingangSearch`) that `PosteingangInbox` reads to filter the list; on
 * every other route it returns null, leaving the header exactly as it was.
 *
 * ⌘K / Ctrl-K focuses the field (honouring the visible kbd hint). The shared
 * query is cleared on leaving the route so a stale filter never lingers. Below
 * 1024px the CSS hides this pill (the top bar is too dense on phones) and the
 * in-list search takes over — both bind to the same store.
 */
export function PosteingangTopSearch() {
  const pathname = usePathname();
  const isPosteingang = pathname === '/posteingang';
  const t = useTranslations('posteingang.search');
  const query = usePosteingangSearch((s) => s.query);
  const setQuery = usePosteingangSearch((s) => s.setQuery);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Clear the shared query when leaving the inbox so the next visit starts fresh.
  React.useEffect(() => {
    if (!isPosteingang) setQuery('');
  }, [isPosteingang, setQuery]);

  // ⌘K / Ctrl-K focuses the search.
  React.useEffect(() => {
    if (!lgEnabled || !isPosteingang) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPosteingang]);

  if (!lgEnabled || !isPosteingang) return null;

  return (
    <>
      <div className="lg-top-search">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          className="lg-top-search-input"
          placeholder={t('top_placeholder')}
          aria-label={t('aria_label')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd className="lg-top-search-kbd" aria-hidden="true">
          ⌘K
        </kbd>
      </div>
      <div className="lg-top-search-spacer" />
    </>
  );
}
