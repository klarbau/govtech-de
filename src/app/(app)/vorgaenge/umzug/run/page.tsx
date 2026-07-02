'use client';

import * as React from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ProtokollInspector } from '@/components/autopilot/ProtokollInspector';
import { VorgangAbgeschlossen } from '@/components/lebenslagen/VorgangAbgeschlossen';
import { VorgangInBearbeitung } from '@/components/lebenslagen/VorgangInBearbeitung';
import {
  buildCascadeRows,
  filledPctOf,
  heroBadgeOf,
} from '@/components/lebenslagen/lebenslagen-shared';
import { useEidGate } from '@/components/lebenslagen/use-eid-gate';
import {
  LaufzettelPanel,
  OrchestrationTestBridge,
  RecoveryBanner,
} from '@/components/orchestration';
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

/* Umzug-Autopilot-Run-Seite. Rendert dieselben geteilten Dossier-Komponenten
 * wie die sieben Lebenslagen (`VorgangInBearbeitung` / `VorgangAbgeschlossen`),
 * gespeist aus der live Autopilot-Tick-Subscription — DO NOT BREAK. */

function UmzugRunInner() {
  const searchParams = useSearchParams();
  const tRun = useTranslations('umzug.run');
  const td = useTranslations('lebenslagen.detail');
  const tHero = useTranslations('lebenslagen.detail.cascade.heroStatus');

  const vorgangId = searchParams?.get('vorgangId') ?? null;

  const [config, setConfig] = useState<LebenslageConfig | null>(null);
  const [vorgang, setVorgang] = useState<Vorgang | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [behoerdenById, setBehoerdenById] = useState<Record<BehoerdeId, Behoerde>>({});
  const [receipt, setReceipt] = useState<ValueReceipt | null>(null);
  const [related, setRelated] = useState<{
    letters: Letter[];
    documents: Document[];
  }>({ letters: [], documents: [] });

  const receiptFetchedRef = React.useRef(false);
  const relatedFetchedRef = React.useRef(false);

  /* Config laden — der Umzug-Stub (leere Cascade, kein Ergebnis). Beide Dossier-
   * Komponenten gehen damit anstandslos um; nichts wird synthetisiert. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await api.getLebenslageConfig('umzug');
        if (!cancelled) setConfig(c);
      } catch {
        // Config ist Routing-Metadaten — ohne sie rendert die Seite nur nicht.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Initial fetch. With a vorgangId we load that live autopilot session.
   * Without one (the demo entry point) we load the seeded Umzug-Vorgang from
   * the backend so the cascade view is sourced from real mock data and never
   * empty — the same derivation path handles both cases. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (vorgangId) {
          const v = await api.getVorgang(vorgangId);
          if (!cancelled) setVorgang(v);
        } else {
          const umzuege = await api.getVorgaenge({ typ: 'umzug' });
          if (!cancelled && umzuege.length > 0) setVorgang(umzuege[0]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : td('load_error'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId]);

  /* Autopilot tick subscription — DO NOT BREAK. */
  useEffect(() => {
    if (!vorgangId) return;
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (event.type === 'autopilot_step' && event.vorgangId === vorgangId) {
        setVorgang((prev) => {
          if (!prev) return prev;
          const idx = prev.schritte.findIndex((s) => s.id === event.step.id);
          const nextSteps =
            idx === -1
              ? [...prev.schritte, event.step]
              : prev.schritte.map((s, i) => (i === idx ? event.step : s));
          return { ...prev, schritte: nextSteps };
        });
      }
      if (event.type === 'vorgang_status_changed' && event.vorgangId === vorgangId) {
        setVorgang((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [vorgangId]);

  /* Behörden lookup. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, Behoerde> = {};
        for (const b of list) map[b.id] = b;
        setBehoerdenById(map);
      } catch {
        // names fall back to behoerde_id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* B1: bei Abschluss Value-Receipt + verknüpfte Artefakte je einmal laden. Die
   * id löst sich auf, egal ob wir mit einer live vorgangId kamen oder auf den
   * seeded Umzug zurückgefallen sind. */
  useEffect(() => {
    if (!vorgang || vorgang.status !== 'abgeschlossen') return;
    const id = vorgang.id;
    if (!receiptFetchedRef.current) {
      receiptFetchedRef.current = true;
      void (async () => {
        try {
          const r = await api.getValueReceipt(id);
          setReceipt(r);
        } catch {
          // receipt is nice-to-have
        }
      })();
    }
    if (!relatedFetchedRef.current) {
      relatedFetchedRef.current = true;
      void (async () => {
        try {
          const rel = await api.getVorgangRelated(id);
          setRelated({ letters: rel.letters, documents: rel.documents });
        } catch {
          // nice-to-have
        }
      })();
    }
  }, [vorgang]);

  /* Zeilen: alle Nicht-C-Schritte, sortiert A → D → B (keine Begrenzung —
   * volle Transparenz ist die Design-Absicht). */
  const rows = useMemo(
    () => (vorgang ? buildCascadeRows(vorgang, config, vorgangId, behoerdenById) : []),
    [vorgang, config, vorgangId, behoerdenById],
  );

  const filledPct = useMemo(() => filledPctOf(rows), [rows]);

  const heroBadge = useMemo(
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
    confirmStep: api.bestaetigeAutopilotSchritt,
  });

  const isDone = vorgang?.status === 'abgeschlossen';

  return (
    // Kein eigenes <main className="app-content"> — das (app)-Layout stellt
    // bereits main#main-content.app-content; doppelt = doppeltes Padding +
    // doppelte main-Landmark.
    <div>
      {/* When done, the dossier renders its own <h1> — suppress the page head
          so the completed Umzug view keeps exactly one <h1>. */}
      {!isDone ? (
        <div className="gt-page-head">
          <h1>{tRun('headline')}</h1>
          <div className="sub">{tRun('headline_sub')}</div>
        </div>
      ) : null}

      {error ? (
        <div className="gt-banner amber" role="alert">
          {error}
        </div>
      ) : null}

      {vorgangId ? (
        <>
          <OrchestrationTestBridge />
          <div style={{ marginBottom: 16 }}>
            <RecoveryBanner sagaId={vorgangId} />
          </div>
        </>
      ) : null}

      {isDone ? (
        config && vorgang ? (
          <VorgangAbgeschlossen
            config={config}
            vorgang={vorgang}
            rows={rows}
            receipt={receipt}
            related={related}
            title={tRun('headline')}
            subtitle={tRun('headline_sub')}
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

      {vorgangId ? (
        <div style={{ marginTop: 20 }}>
          <LaufzettelPanel
            sagaId={vorgangId}
            variant="inspector"
            behoerdenById={behoerdenById}
          />
        </div>
      ) : null}

      {/* Protokoll-Modus (FIT-Connect) — capability-gated; renders nothing in
          Demo-Modus (flag off), so the dossier above stays byte-identical. */}
      {vorgangId ? (
        <div style={{ marginTop: 20 }}>
          <ProtokollInspector
            behoerdeName={behoerdenById['kfz-berlin-labo']?.name_de ?? ''}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function UmzugRunPage() {
  return (
    <Suspense fallback={null}>
      <UmzugRunInner />
    </Suspense>
  );
}
