'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Inbox, RefreshCw } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/mock-backend';
import type { Behoerde, Letter } from '@/types';

import { LetterReader } from './LetterReader';

interface InlineLetterReaderProps {
  /** Selected letter id, or null to show the empty state. */
  letterId: string | null;
  /** Bumped to focus the reader heading after a selection on ≥ lg. */
  selectionKey?: number;
  nowIso: string;
}

interface LoadedState {
  letter: Letter;
  absender: Behoerde | null;
  vorgangTitle?: string;
}

/**
 * Right-pane inline reader for the 3-pane Posteingang (≥ lg). Loads the
 * selected letter client-side (mock-backend lives in localStorage) and renders
 * the existing `<LetterReader embedded>`. Below `lg` the list navigates to
 * `/posteingang/[id]` instead and this pane is not shown.
 */
export function InlineLetterReader({
  letterId,
  selectionKey,
  nowIso,
}: InlineLetterReaderProps) {
  const t = useTranslations('posteingang.reader');
  const tList = useTranslations('posteingang.list');
  const headingRef = React.useRef<HTMLDivElement>(null);

  const [state, setState] = React.useState<
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'ready'; data: LoadedState }
    | { kind: 'error' }
  >({ kind: 'idle' });

  const load = React.useCallback(async (id: string) => {
    setState({ kind: 'loading' });
    try {
      const letter = await api.getLetter(id);
      let absender: Behoerde | null = null;
      try {
        absender = await api.getBehoerde(letter.absender_behoerde_id);
      } catch {
        absender = null;
      }
      let vorgangTitle: string | undefined;
      if (letter.vorgang_id) {
        try {
          const v = await api.getVorgang(letter.vorgang_id);
          vorgangTitle = v.titel;
        } catch {
          vorgangTitle = undefined;
        }
      }
      setState({ kind: 'ready', data: { letter, absender, vorgangTitle } });
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  React.useEffect(() => {
    if (!letterId) {
      setState({ kind: 'idle' });
      return;
    }
    void load(letterId);
  }, [letterId, load]);

  // Move focus to the reader heading when a new selection is made.
  React.useEffect(() => {
    if (state.kind === 'ready' && headingRef.current) {
      headingRef.current.focus();
    }
  }, [state.kind, selectionKey]);

  if (state.kind === 'idle') {
    return (
      <EmptyState
        icon={<Inbox aria-hidden="true" />}
        title={t('empty_select_title')}
        description={t('empty_select_body')}
      />
    );
  }

  if (state.kind === 'loading') {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <div className="h-6 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-surface-muted/60" />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-danger">{tList('error_load')}</p>
        {letterId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(letterId)}
            className="self-start"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('summary_error_retry')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={headingRef}
      tabIndex={-1}
      className="outline-none"
      // Each new selection remounts the reader so its on-mount summary fetch
      // and reply-state reset run cleanly for the freshly opened letter.
      key={state.data.letter.id}
    >
      <LetterReader
        letter={state.data.letter}
        absender={state.data.absender}
        vorgangTitle={state.data.vorgangTitle}
        nowIso={nowIso}
        embedded
      />
    </div>
  );
}
