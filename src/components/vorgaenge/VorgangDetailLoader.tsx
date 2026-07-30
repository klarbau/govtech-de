'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Skeleton } from '@/components/shared/Skeleton';
import {
  VorgangUebersichtView,
  type VorgangUebersichtData,
} from '@/components/vorgaenge/VorgangUebersichtView';
import { api, MockBackendError } from '@/lib/mock-backend';
import type { Behoerde, Document, Letter, Termin, ValueReceipt, Vorgang } from '@/types';

interface VorgangDetailLoaderProps {
  id: string;
}

export function VorgangDetailLoader({ id }: VorgangDetailLoaderProps) {
  const [state, setState] = React.useState<
    | { kind: 'loading' }
    | { kind: 'ready'; data: VorgangUebersichtData }
    | { kind: 'not-found' }
  >({ kind: 'loading' });

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    // `silent` = In-Place-Reconcile nach einer Aktion: kein Skeleton, die Seite
    // bleibt gemountet, nur der frische Datenstand wird eingespielt. Sonst
    // identischer Rumpf (inkl. Transient-Retry).
    if (!opts?.silent) setState({ kind: 'loading' });
    let vorgang: Vorgang | undefined;
    let letters: Letter[] = [];
    let termine: Termin[] = [];
    // The mock backend simulates a ~5% transient error rate — only a real
    // VORGANG_NOT_FOUND may render the not-found screen; transient failures
    // get retried instead of masquerading as a deleted Vorgang.
    for (let attempt = 0; attempt < 3 && !vorgang; attempt++) {
      try {
        const [v, l, te] = await Promise.all([
          api.getVorgang(id),
          api.getLetters({ vorgang_id: id }).catch(() => [] as Letter[]),
          api.getTermine().catch(() => [] as Termin[]),
        ]);
        vorgang = v;
        letters = l;
        termine = te.filter((tx) => tx.vorgang_id === id);
      } catch (e) {
        if (e instanceof MockBackendError && e.code === 'VORGANG_NOT_FOUND') break;
      }
    }
    if (!vorgang) {
      setState({ kind: 'not-found' });
      return;
    }

    // One retry: a transient mock error here degrades every Behörden-Name on
    // the screen to its slug (timeline, action band).
    let behoerden: Behoerde[] = [];
    try {
      behoerden = await api.getBehoerden();
    } catch {
      behoerden = await api.getBehoerden().catch(() => [] as Behoerde[]);
    }

    // A4 / B1: completed Umzug shows its value receipt; C5 guard keeps the
    // receipt fetch scoped to umzug + abgeschlossen.
    let receipt: ValueReceipt | null = null;
    if (vorgang.typ === 'umzug' && vorgang.status === 'abgeschlossen') {
      try {
        receipt = await api.getValueReceipt(id);
      } catch {
        receipt = null;
      }
    }

    let relatedDocuments: Document[] = [];
    try {
      const related = await api.getVorgangRelated(id);
      relatedDocuments = related.documents;
    } catch {
      relatedDocuments = [];
    }

    setState({
      kind: 'ready',
      data: { vorgang, letters, termine, behoerden, relatedDocuments, receipt },
    });
  }, [id]);

  const reconcile = React.useCallback(() => load({ silent: true }), [load]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Live-Vollzug: nach einer Autorisierung streamt `starteVorgangSchritt` die
  // Übergänge `in_progress` → `letter_received` → `confirmed` über den
  // In-Process-EventBus. Auf diesen Vorgang gefiltert, löst jedes Event einen
  // stillen Reconcile aus (kein Skeleton) → die Timeline rendert live, dann die
  // geshippte Erledigt-Choreo. Max. 3 Reconciles je Lauf (kein Debounce nötig).
  React.useEffect(() => {
    return api.subscribe((event) => {
      const relevant =
        (event.type === 'autopilot_step' && event.vorgangId === id) ||
        (event.type === 'letter_received' && event.letter.vorgang_id === id) ||
        (event.type === 'vorgang_status_changed' && event.vorgangId === id);
      if (relevant) void load({ silent: true });
    });
  }, [id, load]);

  if (state.kind === 'loading') {
    return <VorgangDetailSkeleton />;
  }

  if (state.kind === 'not-found') {
    return <VorgangDetailNotFound />;
  }

  return <VorgangUebersichtView data={state.data} id={id} reconcile={reconcile} />;
}

function VorgangDetailSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-48" />
      </div>
      <div className="vg-layout">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function VorgangDetailNotFound() {
  const t = useTranslations('umzug.detail');
  return (
    <>
      <div className="gt-page-head">
        <h1>{t('not_found_title')}</h1>
        <div className="sub">{t('not_found_body')}</div>
      </div>
      <Link href="/dashboard" className="btn btn-secondary">
        <ArrowRight aria-hidden="true" />
        {t('back_to_dashboard')}
      </Link>
    </>
  );
}
