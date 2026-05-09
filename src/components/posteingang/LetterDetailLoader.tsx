'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/mock-backend';
import type { Behoerde, Letter } from '@/types';

import { LetterReader } from './LetterReader';

interface LetterDetailLoaderProps {
  id: string;
}

interface LoadedState {
  letter: Letter;
  absender: Behoerde | null;
  vorgangTitle?: string;
  nowIso: string;
}

export function LetterDetailLoader({ id }: LetterDetailLoaderProps) {
  const t = useTranslations('posteingang.reader');
  const tList = useTranslations('posteingang.list');
  const [state, setState] = React.useState<
    | { kind: 'loading' }
    | { kind: 'ready'; data: LoadedState }
    | { kind: 'error' }
    | { kind: 'not-found' }
  >({ kind: 'loading' });

  const load = React.useCallback(async () => {
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
      setState({
        kind: 'ready',
        data: {
          letter,
          absender,
          vorgangTitle,
          nowIso: new Date().toISOString(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('nicht gefunden')) {
        setState({ kind: 'not-found' });
      } else {
        setState({ kind: 'error' });
      }
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <div
        aria-busy="true"
        className="flex flex-col gap-3"
      >
        <div className="h-6 w-48 animate-pulse rounded-md bg-muted/60" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/60" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted/60" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
          <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
        </div>
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/posteingang"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('zurueck')}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('not_found_title')}
        </h1>
        <p className="text-muted-foreground">{t('not_found_body')}</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/posteingang"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('zurueck')}
        </Link>
        <p className="text-destructive">{tList('error_load')}</p>
        <Button variant="outline" size="sm" onClick={() => void load()} className="self-start">
          <RefreshCw className="size-4" aria-hidden="true" />
          {t('summary_error_retry')}
        </Button>
      </div>
    );
  }

  return (
    <LetterReader
      letter={state.data.letter}
      absender={state.data.absender}
      vorgangTitle={state.data.vorgangTitle}
      nowIso={state.data.nowIso}
    />
  );
}
