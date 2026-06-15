'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarCheck2, ChevronRight, Loader2, MapPin } from 'lucide-react';

import { RechtsgrundlageTag } from '@/components/shared/RechtsgrundlageTag';
import { cn } from '@/lib/utils';
import type { Termin } from '@/types';

/**
 * Confirm state of the in-cascade Termin proposal. Mirrors the eID-confirm state
 * machine in `InlineCascade` (`idle | confirming | error`) plus the terminal
 * `confirmed` once the optimistic update / `termin_updated` event lands.
 */
export type TerminConfirmState = 'idle' | 'confirming' | 'confirmed' | 'error';

interface TerminVorschlagRowProps {
  termin: Termin;
  /** Display name of the responsible Meldebehörde (for the reasoning string). */
  behoerdeName: string;
  /** ISO "now" the FristCountdown compares against (SSR-stable). */
  nowIso: string;
  /** Days the slot sits before the statutory Frist (from the ranker; reasoning string). */
  tageVorFrist: number;
  /** ISO date of the § 17 BMG Anmeldefrist (slot + tageVorFrist). */
  fristIso: string;
  state: TerminConfirmState;
  onConfirm: () => void;
  /**
   * Ref to the focusable "bestätigt" status span. `InlineCascade` moves focus
   * here once the confirm lands so focus never drops to <body> (§4.6 a11y).
   */
  statusRef?: (el: HTMLSpanElement | null) => void;
}

function fristTage(deadlineIso: string, fromIso: string): number {
  try {
    const a = parseISO(deadlineIso);
    const b = parseISO(fromIso);
    const ms = a.getTime() - b.getTime();
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

/**
 * `<TerminVorschlagRow>` — the Termin-Autopilot consequence line (Spec §4.1).
 * Renders indented (`ml-9`) directly under the Block-A Bürgeramt row in
 * `InlineCascade` as that row's CONSEQUENCE — NOT a new CascadeBlock, NOT a Card,
 * NO slot-grid, NO reschedule (those live only on /termine). [Cond 5]
 *
 * Collapsed (default): status pill „Termin vorgemerkt" + FristCountdown micro-line
 * + disclosure toggle „Warum dieser Termin?" + the primary „Termin bestätigen"
 * <button>. Expanded (disclosure open): the mandatory reasoning string (§4.4),
 * Datum/Uhrzeit + Ort, the [MOCK] Vorgangsnummer, the RechtsgrundlageTag (§ 17
 * Abs. 1 BMG) and the [ZUKUNFT] one-liner (§4.5).
 */
export function TerminVorschlagRow({
  termin,
  behoerdeName,
  nowIso,
  tageVorFrist,
  fristIso,
  state,
  onConfirm,
  statusRef,
}: TerminVorschlagRowProps) {
  const t = useTranslations('termin_autopilot');
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const detailId = useId();

  const tageBisFrist = fristTage(fristIso, nowIso);
  const fristMicro =
    tageBisFrist < 0
      ? t('frist.abgelaufen')
      : tageBisFrist === 0
        ? t('frist.heute')
        : t('frist.countdown', { n: tageBisFrist });

  const reasoning =
    tageVorFrist <= 0
      ? t('reasoning.kein_slot')
      : t('reasoning.full', { n: tageVorFrist, behoerde: behoerdeName });

  let datumZeit = '';
  try {
    datumZeit = format(parseISO(termin.datum), "EEEE, dd.MM.yyyy, HH:mm 'Uhr'", {
      locale: de,
    });
  } catch {
    datumZeit = termin.datum.slice(0, 10);
  }

  const confirming = state === 'confirming';
  const confirmed = state === 'confirmed';

  return (
    <div
      data-testid="termin-vorschlag-row"
      className="ml-9 mt-1.5 flex flex-col gap-1.5 border-l-2 border-border/60 pl-3"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary"
          data-testid="termin-vorschlag-pill"
        >
          <CalendarCheck2 className="size-3" aria-hidden="true" />
          {confirmed ? t('row.confirmed') : t('row.status_vorgemerkt')}
        </span>
        <span className="text-xs text-text-secondary">{datumZeit}</span>
      </div>

      {/* FristCountdown micro-line — static (no ticker). It renders once with the
          run and is part of the cascade's own polite region, so it carries no
          aria-live of its own (§11 a11y). */}
      <p
        data-testid="termin-vorschlag-frist"
        className={cn(
          'text-xs',
          tageBisFrist < 0
            ? 'text-danger'
            : tageBisFrist <= 3
              ? 'text-warning'
              : 'text-text-muted',
        )}
      >
        {fristMicro}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen((v) => !v)}
          data-testid="termin-vorschlag-disclosure"
          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronRight
            className={cn(
              'size-3.5 transition-transform',
              reduceMotion && 'transition-none',
              open && 'rotate-90',
            )}
            aria-hidden="true"
          />
          {open ? t('row.disclosure_close') : t('row.disclosure_open')}
        </button>

        {confirmed ? (
          <span
            ref={statusRef}
            tabIndex={-1}
            aria-live="polite"
            data-testid="termin-vorschlag-status"
            data-status="bestaetigt"
            className="inline-flex items-center text-xs font-medium text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t('row.confirmed')}
          </span>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            aria-busy={confirming}
            data-testid="termin-vorschlag-confirm"
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
          >
            {confirming ? (
              <>
                <Loader2
                  className={cn('size-3.5', !reduceMotion && 'animate-spin')}
                  aria-hidden="true"
                />
                {t('row.confirming')}
              </>
            ) : (
              t('row.confirm_cta')
            )}
          </button>
        )}
      </div>

      {state === 'error' ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {t('row.confirm_error')}
        </p>
      ) : null}

      {/* Expanded disclosure — a STATIC region (§11 a11y). The row lives inside the
          cascade's single polite live region, so toggling the disclosure could let
          a screen reader re-announce the whole block. `aria-live="off"` opts this
          subtree out of the ancestor live region — the user reads it on demand via
          the toggle, it is never auto-announced on expand. */}
      <div
        id={detailId}
        hidden={!open}
        aria-live="off"
        data-testid="termin-vorschlag-detail"
        className="flex flex-col gap-2 pt-1"
      >
        <p className="text-xs leading-relaxed text-text-secondary">{reasoning}</p>
        <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          {termin.ort.details}
        </p>
        {termin.buchungsreferenz ? (
          <p className="text-xs tabular-nums text-text-muted">
            {termin.buchungsreferenz}
          </p>
        ) : null}
        <RechtsgrundlageTag
          norm="§ 17 Abs. 1 BMG"
          i18nKey="umzug.rechtsgrundlage.bmg_17"
        />
        <p className="text-xs leading-relaxed text-text-muted">
          {t('label.zukunft')}
        </p>
      </div>
    </div>
  );
}
