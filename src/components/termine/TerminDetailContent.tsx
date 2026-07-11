'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { differenceInCalendarDays, parseISO, type Locale } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Info,
  Landmark,
  X,
} from 'lucide-react';

import type { Termin } from '@/types';

import { formatDateLong, formatTimeRange } from './termin-format';
import { istBuergeramtVorgemerkt } from './termin-status';
import { viewBadge, viewBadgeTone, type ViewBadge } from './termin-badge';

interface TerminDetailContentProps {
  termin: Termin;
  nowIso: string;
  dateLocale: Locale;
  busy: boolean;
  behoerdeName: (id?: string) => string;
  statusLabel: (badge: ViewBadge) => string;
  recentlyConfirmed: boolean;
  /**
   * `band` = the „Wartet auf Sie" hero (always expanded, standalone) → renders
   * the full substance incl. title/badge + date/time. `accordion` = inline agenda
   * expansion under a row that ALREADY shows title, status badge and start time →
   * suppress those to avoid the duplication the audit flagged (finding #2).
   */
  context: 'band' | 'accordion';
  onBestaetigen: () => void;
  onReschedule: () => void;
  onAbsagen: () => void;
}

/**
 * Detail substance of a termin — shared by the „Wartet auf Sie"-Band hero (always
 * expanded) and the inline agenda accordion (§5). Migrated from the former
 * persistent `TerminDetailPanel` body, without the panel head / close-X.
 *
 * For a Bürgeramt §17 termin (only ever the band hero) it surfaces the live
 * „noch N Tage"-Reasoning + the primary „Termin bestätigen" CTA; after confirm it
 * renders the honest Datenminimierungs-Quittung („Gelesen: nichts aus Ihrem
 * Kalender.") — never a Posteingang/sent claim (api.bestaetigeTerminVorschlag
 * mints no letter).
 */
export function TerminDetailContent({
  termin,
  nowIso,
  dateLocale,
  busy,
  behoerdeName,
  statusLabel,
  recentlyConfirmed,
  context,
  onBestaetigen,
  onReschedule,
  onAbsagen,
}: TerminDetailContentProps) {
  const t = useTranslations('termine');
  const tRoot = useTranslations();
  const [done, setDone] = React.useState<Record<number, boolean>>({});

  // Reset the local checklist toggles when the rendered termin changes.
  React.useEffect(() => {
    setDone({});
  }, [termin.id]);

  const isBand = context === 'band';
  const istVorgemerktHero = istBuergeramtVorgemerkt(termin, nowIso);

  const reasoningLine = React.useMemo(() => {
    if (termin.reasoning_typ !== 'bmg_17' || !termin.frist_iso) {
      return t('hero.reasoning_bmg17_statisch');
    }
    const frist = parseISO(termin.frist_iso);
    if (Number.isNaN(frist.getTime())) {
      return t('hero.reasoning_bmg17_statisch');
    }
    const tage = differenceInCalendarDays(frist, parseISO(nowIso));
    if (tage < 0) return t('hero.reasoning_bmg17_statisch');
    return t('hero.reasoning_bmg17', { tage });
  }, [termin, nowIso, t]);

  const badge = viewBadge(termin, nowIso);
  const isVideo = termin.ort.typ === 'video';
  const ortLabel =
    termin.ort.typ === 'video'
      ? t('ort.video')
      : termin.ort.typ === 'telefon'
        ? t('ort.telefon')
        : t('ort.praesenz');

  // Press feedback (scale on :active) for every pressable action; the transform
  // transition is scoped so it never fights the buttons' own color transitions.
  const PRESS =
    'transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100';

  const primaryAction = istVorgemerktHero ? (
    <button
      type="button"
      /* `.lg-iridescent` = the design system's opt-in confirm-moment CTA (same
         family as the Dashboard hero / eID confirms); inert when LG is off. */
      className={`btn btn-primary lg-iridescent ${PRESS}${isBand ? ' w-full justify-center' : ''}`}
      disabled={busy}
      aria-label={t('hero.aria_bestaetigen', {
        behoerde: behoerdeName(termin.behoerde_id),
        datum: formatDateLong(termin.datum, dateLocale),
      })}
      onClick={onBestaetigen}
    >
      <CheckCircle2 aria-hidden="true" />
      {t('hero.cta_bestaetigen')}
    </button>
  ) : termin.vorgang_id ? (
    <Link
      href={`/vorgaenge/${termin.vorgang_id}`}
      className={`btn btn-primary ${PRESS}${isBand ? ' w-full justify-center' : ''}`}
    >
      {t('detail.zum_vorgang')}
    </Link>
  ) : null;

  return (
    <>
      {isBand ? (
        <div className="tm-detail-title">
          <span className="t">
            {behoerdeName(termin.behoerde_id)} — {termin.betreff}
          </span>
          <span className={`badge ${viewBadgeTone(badge)}`}>
            {statusLabel(badge)}
          </span>
        </div>
      ) : null}

      <div className="ns-info">
        {isBand ? (
          <>
            <div className="row tabular-nums">
              <Calendar aria-hidden="true" />
              {formatDateLong(termin.datum, dateLocale)}
            </div>
            <div className="row tabular-nums">
              <Clock aria-hidden="true" />
              {t('uhr_dauer', {
                zeit: formatTimeRange(termin.datum),
                dauer: 45,
              })}
            </div>
          </>
        ) : null}
        <div className="row">
          <Landmark aria-hidden="true" />
          <div>
            <span className="link">{behoerdeName(termin.behoerde_id)}</span>
            <br />
            {ortLabel} · {termin.ort.details}
          </div>
        </div>
        {termin.buchungsreferenz ? (
          <div className="row">
            <FileText aria-hidden="true" />
            <span className="mono tabular-nums">{termin.buchungsreferenz}</span>
          </div>
        ) : null}
      </div>

      {termin.vorbereitung && termin.vorbereitung.length > 0 ? (
        <div className="prep-card">
          <h3>{t('detail.vorbereitung_titel')}</h3>
          {termin.vorbereitung.map((item, idx) => {
            const checked = done[idx] ?? item.done ?? false;
            return (
              <button
                key={item.label_i18n_key}
                type="button"
                className="prep-toggle"
                aria-pressed={checked}
                onClick={() => setDone((prev) => ({ ...prev, [idx]: !checked }))}
              >
                <span className="pt-icon" aria-hidden="true">
                  {checked ? <CheckCircle2 /> : <Circle />}
                </span>
                <span className="pt-label">
                  {tRoot(item.label_i18n_key as never)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {termin.vorgang_id ? (
        <div className="ns-info" style={{ marginBottom: 8 }}>
          <div className="row">
            <FileText aria-hidden="true" />
            <Link href={`/vorgaenge/${termin.vorgang_id}`} className="link">
              {t('detail.zugehoeriger_vorgang')}
            </Link>
          </div>
        </div>
      ) : null}

      {istVorgemerktHero ? (
        <div className="tm-detail-reason">
          <Info aria-hidden="true" />
          <div>
            <span className="tabular-nums">{reasoningLine}</span>
            <br />
            <span className="open">{t('hero.nicht_abgeschlossen')}</span>
          </div>
        </div>
      ) : null}

      {recentlyConfirmed ? (
        <section
          className="vr-card"
          aria-live="polite"
          aria-label={t('quittung.titel')}
          style={{ marginBottom: 12 }}
        >
          <div className="vr-head">
            <span className="vr-icon" aria-hidden="true">
              <CheckCircle2 />
            </span>
            <h3 className="vr-title">{t('quittung.titel')}</h3>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            {t('quittung.gelesen')}
          </p>
        </section>
      ) : null}

      {/* Actions. Band: full-width primary + two secondaries in a row beneath.
          Accordion: all actions side by side in one wrapping row (auto width). */}
      {isBand ? (
        <div className="mt-1 flex flex-col gap-2.5">
          {primaryAction}
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className={`btn btn-secondary flex-1 justify-center ${PRESS}`}
              disabled={busy}
              onClick={onReschedule}
            >
              <Calendar aria-hidden="true" />
              {t('detail.verschieben')}
            </button>
            <button
              type="button"
              className={`btn btn-danger flex-1 justify-center ${PRESS}`}
              disabled={busy}
              onClick={onAbsagen}
            >
              <X aria-hidden="true" />
              {t('action.absagen')}
            </button>
          </div>
        </div>
      ) : (
        /* Phones: the auto-width buttons stacked with ragged right edges —
           stack them full-width instead (flex-col stretches children). */
        <div className="mt-1 flex flex-wrap gap-2.5 max-[540px]:flex-col [&>.btn]:max-[540px]:justify-center">
          {primaryAction}
          <button
            type="button"
            className={`btn btn-secondary ${PRESS}`}
            disabled={busy}
            onClick={onReschedule}
          >
            <Calendar aria-hidden="true" />
            {t('detail.verschieben')}
          </button>
          <button
            type="button"
            className={`btn btn-danger ${PRESS}`}
            disabled={busy}
            onClick={onAbsagen}
          >
            <X aria-hidden="true" />
            {t('action.absagen')}
          </button>
        </div>
      )}

      {isVideo ? (
        <div className="tm-detail-foot">{t('detail.link_hinweis')}</div>
      ) : null}
    </>
  );
}
