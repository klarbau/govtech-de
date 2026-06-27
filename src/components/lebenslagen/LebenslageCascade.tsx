'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { VorgangAbgeschlossen } from './VorgangAbgeschlossen';
import { VorgangInBearbeitung } from './VorgangInBearbeitung';
import { useEidGate } from './use-eid-gate';
import { api } from '@/lib/mock-backend';
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';
import type {
  Behoerde,
  BehoerdeId,
  Document,
  Letter,
  MockBackendEvent,
  ValueReceipt,
  Vorgang,
} from '@/types';
import {
  buildCascadeRows,
  filledPctOf,
  heroBadgeOf,
  isGenuineNotFound,
  loadWithRetry,
} from './lebenslagen-shared';

function LebenslageCascadeInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const tc = useTranslations('lebenslagen.detail.cascade');
  const td = useTranslations('lebenslagen.detail');
  const tHero = useTranslations('lebenslagen.detail.cascade.heroStatus');

  const queryVorgangId = searchParams?.get('vorgangId') ?? null;

  const [vorgangId, setVorgangId] = React.useState<string | null>(queryVorgangId);
  const [config, setConfig] = React.useState<LebenslageConfig | null>(null);
  const [notFoundFlag, setNotFoundFlag] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [vorgang, setVorgang] = React.useState<Vorgang | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<BehoerdeId, Behoerde>>({});
  const [receipt, setReceipt] = React.useState<ValueReceipt | null>(null);
  const [related, setRelated] = React.useState<{
    letters: Letter[];
    documents: Document[];
  }>({ letters: [], documents: [] });

  const startedRef = React.useRef(false);
  const receiptFetchedRef = React.useRef(false);
  const relatedFetchedRef = React.useRef(false);

  // Config laden (für gate/zukunft/aktenzeichen-Korrelation + antragslos-Start).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await loadWithRetry(() => api.getLebenslageConfig(slug));
        if (cancelled) return;
        if (!c) {
          setNotFoundFlag(true);
          return;
        }
        setConfig(c);
      } catch (err) {
        // Transienter (5%) Latenzfehler nach erschöpften Retries → Retry-Zustand,
        // KEIN 404; nur ein genuiner Not-Found-Fehler löst notFound() aus.
        if (!cancelled) {
          if (isGenuineNotFound(err)) setNotFoundFlag(true);
          else setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  // Behörden-Lookup.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadWithRetry(() => api.getBehoerden());
        if (cancelled) return;
        const map: Record<BehoerdeId, Behoerde> = {};
        for (const b of list) map[b.id] = b;
        setBehoerdenById(map);
      } catch {
        /* names fall back to id */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Antragslos-Einstieg: ohne ?vorgangId einmalig die Kaskade starten.
  React.useEffect(() => {
    if (!config) return;
    if (vorgangId) return;
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { vorgangId: newId } = await loadWithRetry(() => api.starteLebenslage(slug, {}, []));
        if (!cancelled) setVorgangId(newId);
      } catch (err) {
        if (cancelled) return;
        startedRef.current = false; // erlaubt erneuten Start-Versuch via Retry.
        if (isGenuineNotFound(err)) setNotFoundFlag(true);
        else setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config, vorgangId, slug, reloadKey]);

  // Initialer Vorgang-Load.
  React.useEffect(() => {
    if (!vorgangId) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await loadWithRetry(() => api.getVorgang(vorgangId));
        if (!cancelled) setVorgang(v);
      } catch (err) {
        // Ein gerade erstellter Vorgang „verschwindet" sonst bei der 5%-Latenz-
        // fehlerquote: transient → Retry-Zustand, nur genuiner Not-Found → 404.
        if (!cancelled) {
          if (isGenuineNotFound(err)) setNotFoundFlag(true);
          else setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId, reloadKey]);

  // Tick-Subscription — projiziert autopilot_step + status auf den lokalen State.
  React.useEffect(() => {
    if (!vorgangId) return;
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (event.type === 'autopilot_step' && event.vorgangId === vorgangId) {
        setVorgang((prev) => {
          if (!prev) return prev;
          const idx = prev.schritte.findIndex((s) => s.id === event.step.id);
          const next =
            idx === -1
              ? [...prev.schritte, event.step]
              : prev.schritte.map((s, i) => (i === idx ? event.step : s));
          return { ...prev, schritte: next };
        });
      }
      if (event.type === 'vorgang_status_changed' && event.vorgangId === vorgangId) {
        setVorgang((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    });
    return () => unsubscribe();
  }, [vorgangId]);

  // Value-Receipt + verknüpfte Artefakte bei Abschluss einmalig laden.
  React.useEffect(() => {
    if (!vorgang || !vorgangId || vorgang.status !== 'abgeschlossen') return;
    if (!receiptFetchedRef.current) {
      receiptFetchedRef.current = true;
      void (async () => {
        try {
          const r = await api.getValueReceipt(vorgangId);
          setReceipt(r);
        } catch {
          /* nice-to-have */
        }
      })();
    }
    if (!relatedFetchedRef.current) {
      relatedFetchedRef.current = true;
      void (async () => {
        try {
          const rel = await api.getVorgangRelated(vorgangId);
          setRelated({ letters: rel.letters, documents: rel.documents });
        } catch {
          /* nice-to-have */
        }
      })();
    }
  }, [vorgang, vorgangId]);

  // Zeilen: alle Nicht-C-Schritte, sortiert A → D → B (keine Begrenzung).
  const rows = React.useMemo(
    () => (vorgang ? buildCascadeRows(vorgang, config, vorgangId, behoerdenById) : []),
    [vorgang, config, vorgangId, behoerdenById],
  );

  const filledPct = React.useMemo(() => filledPctOf(rows), [rows]);

  const heroBadge = React.useMemo(
    () =>
      heroBadgeOf(vorgang, rows, {
        confirmed: tHero('confirmed'),
        failed: tHero('failed'),
        in_progress: tHero('in_progress'),
      }),
    [vorgang, rows, tHero],
  );

  const { requestEid, eidDialog } = useEidGate({
    rows,
    vorgangId,
    confirmStep: api.bestaetigeLebenslageSchritt,
  });

  if (notFoundFlag) return notFound();

  if (loadError) {
    return (
      <div className="gt-page-head">
        <div className="gt-banner amber" role="alert">
          <Info aria-hidden="true" />
          <div>
            <strong>{td('load_error')}</strong>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setLoadError(false);
            setReloadKey((k) => k + 1);
          }}
          style={{ marginTop: 12 }}
        >
          {t('common.cta.erneut_versuchen')}
        </button>
      </div>
    );
  }

  const primaryRow = rows.find((r) => r.cfg?.isPrimarySubmission);
  const primaryAz = primaryRow?.cfg?.aktenzeichen;
  const isAntragslos = config?.mode === 'antragslos';
  const isDone = vorgang?.status === 'abgeschlossen';
  const lebenslageTitle = config ? t(`lebenslagen.${config.slug}.title`) : tc('running');

  return (
    <div>
      {/* The completed dossier renders its own <h1> inside VorgangAbgeschlossen,
          so the page head is suppressed when done to keep exactly one <h1>. */}
      {!isDone ? (
        <div className="gt-page-head">
          <h1>{lebenslageTitle}</h1>
          <div className="sub">{tc('lead')}</div>
        </div>
      ) : null}

      {isAntragslos ? (
        <div className="gt-banner amber ll-zukunft-banner" role="note">
          <Info aria-hidden="true" />
          <div>
            <strong>{td('antragslos.kein_antrag_title')}</strong>{' '}
            {config?.antragslos_note_key
              ? t(config.antragslos_note_key)
              : td('antragslos.kein_antrag_body')}
          </div>
        </div>
      ) : null}

      {isDone ? (
        config && vorgang ? (
          <VorgangAbgeschlossen
            config={config}
            vorgang={vorgang}
            rows={rows}
            receipt={receipt}
            related={related}
            primaryAz={primaryAz}
            title={lebenslageTitle}
            subtitle={tc('lead')}
          />
        ) : null
      ) : config && vorgang ? (
        <VorgangInBearbeitung
          vorgang={vorgang}
          rows={rows}
          receipt={receipt}
          filledPct={filledPct}
          heroBadge={heroBadge}
          onConfirmEid={requestEid}
        />
      ) : null}

      {eidDialog}
    </div>
  );
}

export function LebenslageCascade({ slug }: { slug: string }) {
  return (
    <Suspense fallback={null}>
      <LebenslageCascadeInner slug={slug} />
    </Suspense>
  );
}
