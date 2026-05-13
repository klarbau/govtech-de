'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Compass } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

/**
 * `<TrackCEmptyStateCard>` (Spec § 11.24 Hard-Line — Stammdaten V1.1).
 *
 * Mehmet-Empty-State. Wording verbatim aus Verifier-Pass 2026-05-10:
 *
 * > „Sie haben keine Renteninformation, weil Sie nicht in der GRV pflicht-
 * > versichert sind. Im PKV-Bereich existiert kein zentraler Aggregator wie
 * > ZfDR — Sie müssen die App Ihres Versicherers nutzen. Optionen:
 * > 1) freiwillige GRV (§ 7 SGB VI), 2) Privatvorsorge prüfen,
 * > 3) Falls Pflichtversicherten-Beruf (§ 2 SGB VI), Pflichtversicherung
 * > beantragen."
 *
 * Frontend-coder darf das Wording NICHT umformulieren oder kürzen.
 *
 * a11y:
 *   - `<section role="status">` (informativ, nicht zeit-kritisch — KEIN
 *     `role="alert"`)
 *   - illustrierender Icon mit `aria-hidden="true"`
 *   - Norm-Zitate via `wrapNormZitate` automatisch gewrappt
 */
export function TrackCEmptyStateCard() {
  const t = useTranslations('stammdaten.altersvorsorge.track_c');

  let title: string;
  try {
    title = t('empty_state_title');
  } catch {
    title = 'Keine Renteninformation vorhanden';
  }
  let body: string;
  try {
    body = t('empty_state_body');
  } catch {
    body =
      'Sie haben keine Renteninformation, weil Sie nicht in der GRV pflichtversichert sind. ' +
      'Im PKV-Bereich existiert kein zentraler Aggregator wie ZfDR — Sie müssen die App Ihres Versicherers nutzen. ' +
      'Optionen: 1) freiwillige GRV (§ 7 SGB VI), 2) Privatvorsorge prüfen, 3) Falls Pflichtversicherten-Beruf (§ 2 SGB VI), Pflichtversicherung beantragen.';
  }

  const titleId = 'track-c-empty-state-title';

  return (
    <section
      aria-labelledby={titleId}
      role="status"
      data-testid="track-c-empty-state-card"
      className={cn(
        'flex gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4',
      )}
    >
      <Compass
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {wrapNormZitate(body)}
        </p>
      </div>
    </section>
  );
}
