'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { differenceInCalendarDays, parseISO, type Locale } from 'date-fns';
import { Check, CheckCircle2 } from 'lucide-react';

import type { Termin, TerminVorbereitungItem } from '@/types';

import { formatDateLong, formatTimeRange } from './termin-format';
import { displayStatus, istBuergeramtVorgemerkt } from './termin-status';

interface TerminDetailContentProps {
  termin: Termin;
  nowIso: string;
  dateLocale: Locale;
  busy: boolean;
  behoerdeName: (id?: string) => string;
  recentlyConfirmed: boolean;
  onBestaetigen: () => void;
  onReschedule: () => void;
  onAbsagen: () => void;
}

const ACTION_LINK =
  'inline-flex items-center rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 max-[767px]:min-h-[44px]';

const DOT_SEP = <span className="mx-1.5 text-text-muted" aria-hidden="true">·</span>;

/**
 * Dossier-Anatomie eines Präsenz-/Beratungs-Termins (termine-uebergaben.md § 6):
 * Kopf (Titel + Meta-Fließtext), „Warum persönlich" / „Ohne Anfahrt" als
 * schlichter Absatz (keine getönte Box), Prep-Split System/Bürger (nur nicht-leere
 * Spalten), Logistik-Zeile nur aus Seed, Aktionen. Der §17-Bürgeramt-Hero trägt
 * zusätzlich das §17-Reasoning + den „Termin bestätigen"-CTA und danach die
 * ehrliche Datenminimierungs-Quittung („Gelesen: nichts aus Ihrem Kalender.") —
 * nie eine Posteingang-/Versand-Behauptung.
 */
export function TerminDetailContent({
  termin,
  nowIso,
  dateLocale,
  busy,
  behoerdeName,
  recentlyConfirmed,
  onBestaetigen,
  onReschedule,
  onAbsagen,
}: TerminDetailContentProps) {
  const t = useTranslations('termine');

  const isHero = istBuergeramtVorgemerkt(termin, nowIso);
  const ds = displayStatus(termin, nowIso);
  const isPraesenz = termin.ort.typ === 'praesenz';

  const ortLabel =
    termin.ort.typ === 'video'
      ? t('ort.video')
      : termin.ort.typ === 'telefon'
        ? t('ort.telefon')
        : t('ort.praesenz');

  const reasoningLine = React.useMemo(() => {
    if (termin.reasoning_typ !== 'bmg_17' || !termin.frist_iso) {
      return t('hero.reasoning_bmg17_statisch');
    }
    const frist = parseISO(termin.frist_iso);
    if (Number.isNaN(frist.getTime())) return t('hero.reasoning_bmg17_statisch');
    const tage = differenceInCalendarDays(frist, parseISO(nowIso));
    if (tage < 0) return t('hero.reasoning_bmg17_statisch');
    return t('hero.reasoning_bmg17', { tage });
  }, [termin, nowIso, t]);

  const systemItems = termin.vorbereitung?.filter((v) => v.wer === 'system') ?? [];
  const buergerItems =
    termin.vorbereitung?.filter((v) => (v.wer ?? 'buerger') === 'buerger') ?? [];

  const whyLead = !isPraesenz
    ? t('dossier.ohne_anfahrt_lead')
    : termin.warum_persoenlich_i18n_key
      ? t('dossier.warum_persoenlich_lead')
      : null;
  const whyBody = !isPraesenz
    ? termin.ort.typ === 'video'
      ? t('dossier.ohne_anfahrt_video')
      : t('dossier.ohne_anfahrt_telefon')
    : termin.warum_persoenlich_i18n_key
      ? t(termin.warum_persoenlich_i18n_key.replace(/^termine\./, '') as never)
      : null;

  return (
    <>
      <h2 className="text-base font-semibold tracking-tight text-text-primary sm:text-lg">
        {behoerdeName(termin.behoerde_id)} — {termin.betreff}
      </h2>

      {/* § 6.1 Kopf — Meta als Fließtext mit Punkt-Trennern; Chip nur beim §17-Hero. */}
      <p className="mt-1 text-sm text-text-secondary">
        <span className="tabular-nums">
          {formatDateLong(termin.datum, dateLocale)}
        </span>
        {DOT_SEP}
        <span className="tabular-nums">
          {t('zeit_range', { range: formatTimeRange(termin.datum) })}
        </span>
        {DOT_SEP}
        {ortLabel}
        {isHero ? (
          <>
            {DOT_SEP}
            <span className="badge amber">{t('hero.tag')}</span>
          </>
        ) : ds === 'bestaetigt' ? (
          <>
            {DOT_SEP}
            {t('meta.bestaetigt')}
          </>
        ) : null}
      </p>

      {whyLead && whyBody ? (
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">{whyLead}</span>{' '}
          {whyBody}
        </p>
      ) : null}

      {systemItems.length > 0 || buergerItems.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 min-[641px]:grid-cols-2">
          {systemItems.length > 0 ? (
            <PrepColumn
              label={t('dossier.prep_system')}
              items={systemItems}
              systemDone
            />
          ) : null}
          {buergerItems.length > 0 ? (
            <PrepColumn label={t('dossier.prep_buerger')} items={buergerItems} />
          ) : null}
        </div>
      ) : null}

      {/* § 6 Logistik — nur aus Seed (Adresse/Wartebereich + Buchungsreferenz). */}
      <p className="mt-4 border-t border-border pt-3 text-sm text-text-secondary">
        {termin.ort.details}
        {termin.buchungsreferenz ? (
          <>
            {DOT_SEP}
            <span className="font-mono tabular-nums">
              {termin.buchungsreferenz}
            </span>
          </>
        ) : null}
      </p>

      {isHero ? (
        <p className="mt-3 text-sm text-text-secondary">
          <span className="tabular-nums">{reasoningLine}</span>{' '}
          <span className="font-medium text-text-primary">
            {t('hero.nicht_abgeschlossen')}
          </span>
        </p>
      ) : null}

      {recentlyConfirmed ? (
        <section
          className="vr-card mt-4"
          aria-live="polite"
          aria-label={t('quittung.titel')}
        >
          <div className="vr-head">
            <span className="vr-icon" aria-hidden="true">
              <CheckCircle2 />
            </span>
            <h3 className="vr-title">{t('quittung.titel')}</h3>
          </div>
          <p className="text-[13.5px] leading-relaxed">{t('quittung.gelesen')}</p>
        </section>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 max-[540px]:flex-col max-[540px]:items-stretch">
        {isHero && !recentlyConfirmed ? (
          <button
            type="button"
            className="btn btn-primary lg-iridescent max-[540px]:justify-center"
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
        ) : null}
        <button
          type="button"
          className={ACTION_LINK}
          disabled={busy}
          onClick={onReschedule}
        >
          {t('action.verschieben')}
        </button>
        <button
          type="button"
          className={ACTION_LINK}
          disabled={busy}
          onClick={onAbsagen}
        >
          {t('action.absagen')}
        </button>
      </div>
    </>
  );
}

function PrepColumn({
  label,
  items,
  systemDone,
}: {
  label: string;
  items: TerminVorbereitungItem[];
  systemDone?: boolean;
}) {
  const tRoot = useTranslations();
  return (
    <div>
      <p className="mb-1.5 text-xs text-text-muted">{label}</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const done = systemDone || item.done === true;
          return (
            <li
              key={item.label_i18n_key}
              className="flex items-start gap-2 text-sm text-text-secondary"
            >
              <span
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-primary"
                aria-hidden="true"
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="size-1.5 rounded-full border border-text-muted" />
                )}
              </span>
              <span className={done ? 'text-text-primary' : undefined}>
                {tRoot(item.label_i18n_key as never)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
