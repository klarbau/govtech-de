'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { ChevronRight, FlaskConical, ShieldCheck } from 'lucide-react';

import {
  useMockEvents,
  useTransientFlag,
} from '@/components/providers/LiveBackendProvider';
import { useProtokollCapability } from '@/components/autopilot/use-protokoll-capability';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import {
  mockEventToSimLine,
  receiptRealLineDescriptors,
  type HaubeRealLine,
  type HaubeSimLine,
  type RealLineDescriptor,
} from '@/components/autopilot/protokoll-haube';
import type { BehoerdeId, MockBackendEvent } from '@/types';
import type { FitConnectReceipt } from '@/types/fit-connect';

interface UnterDerHaubeLeisteProps {
  vorgangId: string;
  /** Tier-2 receipts (only passed on `/assistent`) → the „echt"-overlay lines. */
  fitConnectReceipts?: Record<string, FitConnectReceipt>;
  /** `/run` mode: sim-only, a pointer to the inspector, NO count/tick (§ amendment 5). */
  inspectorPointer?: boolean;
  className?: string;
}

const TICK_MS = 500;

function formatTs(tsIso: string): string {
  try {
    return format(parseISO(tsIso), 'HH:mm:ss');
  } catch {
    return '';
  }
}

/**
 * `<UnterDerHaubeLeiste>` (`unter-der-haube.md` § 5.B) — the leise Protokoll-Leiste.
 *
 * A still native `<details>/<summary>`, collapsed by default, that append-only
 * streams protocol events: `origin: 'sim'` lines (from the shared `useMockEvents`
 * hub — NO second EventSource) in both modes, plus an `origin: 'real'` overlay
 * built from the Tier-2 receipts on `/assistent`. Idle → renders `null`.
 *
 * a11y: the log is NOT aria-live (avoids a storm); the authoritative announcements
 * stay the cascade's row region + the receipt panels (rendered elsewhere, not
 * embedded here — no double live region / duplicate testid). The summary dot
 * ticks and the event count updates as a VISUAL-only activity signal (not
 * announced; the sr label is the static `strip_live_dot_sr`).
 */
export function UnterDerHaubeLeiste({
  vorgangId,
  fitConnectReceipts,
  inspectorPointer = false,
  className,
}: UnterDerHaubeLeisteProps) {
  const t = useTranslations('protokoll.haube');
  const tStatus = useTranslations('convenience.inline_cascade');
  const tFc = useTranslations('protokoll.fit_connect');
  const { available } = useProtokollCapability();

  const [simLines, setSimLines] = useState<HaubeSimLine[]>([]);
  const [realLines, setRealLines] = useState<HaubeRealLine[]>([]);
  const [behoerdenById, setBehoerdenById] = useState<Record<BehoerdeId, string>>(
    {},
  );
  const seenLineIdsRef = React.useRef<Set<string>>(new Set());
  const seenReceiptRef = React.useRef<Set<string>>(new Set());

  // Count + dot-tick belong to /assistent only — a live count would spoil the
  // frozen reveal-pacer's staging while the /run summary is collapsed.
  const showActivity = !inspectorPointer;
  const [ticking, triggerTick] = useTransientFlag(TICK_MS);

  /* Behörden-Namen für die sim-Zeilen (ein stiller Fetch; Namen laufen ggf.
   * nach → Zeilen behalten die behoerdeId und lösen im Render auf). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, string> = {};
        for (const b of list) map[b.id] = b.name_de;
        setBehoerdenById(map);
      } catch {
        // names fall back to the raw id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Basis-Feed: der geteilte Hub (keine 2. SSE). Jede sim-Zeile tickt den Dot. */
  useMockEvents(
    useCallback(
      (event: MockBackendEvent) => {
        const line = mockEventToSimLine(event, vorgangId, new Date().toISOString());
        if (!line || seenLineIdsRef.current.has(line.id)) return;
        seenLineIdsRef.current.add(line.id);
        setSimLines((prev) => [...prev, line]);
        if (showActivity) triggerTick();
      },
      [vorgangId, showActivity, triggerTick],
    ),
  );

  /* Live-Overlay: neue Tier-2-Belege → „echt"-Zeilen (nur auf /assistent, wo
   * `fitConnectReceipts` übergeben wird). Zeitstempel = Beobachtungszeitpunkt. */
  useEffect(() => {
    const receipts = fitConnectReceipts ?? {};
    const nowIso = new Date().toISOString();
    const fresh: HaubeRealLine[] = [];
    for (const [behoerdeId, receipt] of Object.entries(receipts)) {
      if (receipt.tier !== 2 || seenReceiptRef.current.has(behoerdeId)) continue;
      seenReceiptRef.current.add(behoerdeId);
      receiptRealLineDescriptors(receipt).forEach((descriptor, index) => {
        fresh.push({
          id: `real-${behoerdeId}-${index}`,
          origin: 'real',
          tsIso: nowIso,
          descriptor,
        });
      });
    }
    if (fresh.length > 0) {
      setRealLines((prev) => [...prev, ...fresh]);
      if (showActivity) triggerTick();
    }
  }, [fitConnectReceipts, showActivity, triggerTick]);

  const totalCount = simLines.length + realLines.length;
  if (totalCount === 0) return null;

  const hasReal = realLines.length > 0;

  const renderRealText = (descriptor: RealLineDescriptor): React.ReactNode => {
    if (descriptor.kind === 'event') {
      return tFc(`event.${descriptor.eventKey}`);
    }
    if (descriptor.kind === 'ids') {
      return t.rich('line_ids', {
        sid: descriptor.sid,
        cid: descriptor.cid,
        ltr: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
      });
    }
    return descriptor.verified ? tFc('set_verified') : tFc('set_not_verified');
  };

  return (
    <details
      data-testid="haube-leiste"
      className={cn(
        'group rounded-lg border border-border bg-surface-muted/50 text-xs',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <ChevronRight
          className="size-3.5 shrink-0 text-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
        <span className="inline-flex size-2 shrink-0 items-center justify-center">
          <span
            className={cn(
              'size-1.5 rounded-full bg-text-muted opacity-60',
              showActivity && ticking && 'haube-dot-tick',
            )}
          />
          <span className="sr-only">{t('strip_live_dot_sr')}</span>
        </span>
        <span className="font-medium text-text-primary">{t('strip_summary')}</span>
        <span className="inline-flex items-center gap-1">
          {hasReal ? (
            <ShieldCheck className="size-3 shrink-0" aria-hidden="true" />
          ) : (
            <FlaskConical className="size-3 shrink-0" aria-hidden="true" />
          )}
          {hasReal ? t('origin_real') : t('origin_sim')}
        </span>
        {showActivity ? (
          <span className="ml-auto min-w-[6rem] text-right tabular-nums text-text-muted">
            {t('count', { count: totalCount })}
          </span>
        ) : null}
      </summary>

      <div className="border-t border-border px-3 py-2">
        {inspectorPointer && available === true ? (
          <p className="mb-1.5 text-text-muted">{t('pointer_inspector')}</p>
        ) : null}
        <ol className="flex flex-col gap-1 font-mono">
          {simLines.map((line) => (
            <li
              key={line.id}
              data-testid="haube-leiste-line"
              data-origin={line.origin}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <time dateTime={line.tsIso} className="shrink-0 text-text-muted">
                <bdi dir="ltr">{formatTs(line.tsIso)}</bdi>
              </time>
              <FlaskConical
                className="size-3 shrink-0 self-center text-text-muted"
                aria-hidden="true"
              />
              <span className="sr-only">{t('origin_sim')}</span>
              <span className="min-w-0 break-words text-text-secondary">
                <span className="text-text-primary">
                  {behoerdenById[line.behoerdeId] ?? line.behoerdeId}
                </span>
                {' · '}
                {line.text}
                {line.statusKey ? (
                  <> {' · '}{tStatus(`row_status.${line.statusKey}`)}</>
                ) : null}
              </span>
            </li>
          ))}
          {realLines.map((line) => (
            <li
              key={line.id}
              data-testid="haube-leiste-line"
              data-origin={line.origin}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <time dateTime={line.tsIso} className="shrink-0 text-text-muted">
                <bdi dir="ltr">{formatTs(line.tsIso)}</bdi>
              </time>
              <ShieldCheck
                className="size-3 shrink-0 self-center text-primary"
                aria-hidden="true"
              />
              <span className="sr-only">{t('origin_real')}</span>
              <span className="min-w-0 break-all text-text-secondary">
                {renderRealText(line.descriptor)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
