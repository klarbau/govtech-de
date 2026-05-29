'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { cn } from '@/lib/utils';
import type { Behoerde, Letter } from '@/types';

import { ARCHETYPE_TO_VORGANG_TYP } from './letter-archetype-actions';
import { AuthentizitaetsBadge, DEFAULT_AUTH_CHANNEL } from './AuthentizitaetsBadge';
import { BehoerdenAvatarV2 } from './BehoerdenAvatarV2';
import { FristChip } from './FristChip';
import {
  VorgangsBuendelTagExisting,
  VorgangsBuendelTagInitial,
} from './VorgangsBuendelTag';

interface LetterCardProps {
  letter: Letter;
  absender?: Pick<Behoerde, 'name_de' | 'kategorie'>;
  /** Vorgangs-Titel, falls Brief einem bestehenden Vorgang zugeordnet ist. */
  vorgangTitle?: string;
  /** ISO „now" für SSR-stabile Frist-Renders. */
  nowIso?: string;
  /** Triggert Öffnen des `<NeuerVorgangAusBriefModal>`. */
  onCreateVorgang?: (letter: Letter) => void;
  /**
   * Visuelle Variante:
   *  - `card` (Default): die reichhaltige 3-Zeilen-Karte (V1.5-Verhalten).
   *  - `row`: kompakte ListRow für das 3-Pane-Layout (Prototyp 08).
   */
  variant?: 'card' | 'row';
  /** 3-Pane: aktiver Brief im Reader (nur `row`). */
  selected?: boolean;
  /**
   * 3-Pane: Maus-Klick wählt den Brief inline aus (nur `row`); Tastatur-Enter
   * navigiert weiterhin zu `/posteingang/[id]` (Deep-Link-Fallback).
   */
  onSelect?: (letter: Letter) => void;
  className?: string;
}

function letterUrl(id: string): string {
  return `/posteingang/${encodeURIComponent(id)}`;
}

/**
 * Phase 6b — LetterCard mit 3-zeiliger Hierarchie (Audit-Finding #1).
 *
 * Redesign 2026-05-27: zusätzlich eine kompakte `row`-Variante für das
 * 3-Pane-Layout. Funktion (Navigation, Vorgangs-CTA, Authentizität) bleibt
 * unverändert; V1.5/V1.5.1-Hard-Lines unberührt.
 */
export function LetterCard({
  letter,
  absender,
  vorgangTitle,
  nowIso,
  onCreateVorgang,
  variant = 'card',
  selected,
  onSelect,
  className,
}: LetterCardProps) {
  const t = useTranslations('posteingang.card');
  const tArche = useTranslations('posteingang.archetype.label');

  const authChannel = letter.auth_channel ?? DEFAULT_AUTH_CHANNEL;
  const fristen = letter.fristen ?? [];
  const archetype = letter.archetype ?? 'sonstiges';
  const brieftyp = tArche(archetype);

  const behoerdeName = absender?.name_de ?? letter.absender_behoerde_id;

  const archetypIsKnown = archetype !== 'sonstiges';
  const showInitialVorgangCta =
    !letter.vorgang_id &&
    archetypIsKnown &&
    typeof onCreateVorgang === 'function';

  const vorgangsJahr = (() => {
    try {
      return new Date(letter.empfangen_am).getUTCFullYear();
    } catch {
      return new Date().getUTCFullYear();
    }
  })();

  const isUngelesen = letter.status === 'ungelesen';
  const isErledigt = letter.status === 'erledigt';
  const earliestFrist = fristen[0];
  const fristDatum = earliestFrist?.datum
    ? earliestFrist.datum.split('-').reverse().join('.')
    : '';

  const empfangenDatum = (() => {
    try {
      return letter.empfangen_am.slice(0, 10).split('-').reverse().join('.');
    } catch {
      return letter.empfangen_am;
    }
  })();

  // Action-Hint Heuristik (Phase 6b Zeile 1, Audit #1).
  const actionHintKey: 'erledigt' | 'zur_kenntnis' | 'antwort_erforderlich' =
    isErledigt
      ? 'erledigt'
      : fristen.length === 0 && !letter.required_action
        ? 'zur_kenntnis'
        : 'antwort_erforderlich';
  const actionHint = t(`action_hint.${actionHintKey}`);

  const articleAriaLabel = earliestFrist
    ? t('cta_open') +
      ': ' +
      [behoerdeName, brieftyp, t('frist_pre_open_template', { datum: fristDatum })].join(' · ')
    : t('cta_open') + ': ' + [behoerdeName, brieftyp, t('frist_keine')].join(' · ');

  const statusLabel = isErledigt
    ? t('status.erledigt')
    : isUngelesen
      ? t('status.ungelesen')
      : actionHint;

  // ── ROW VARIANT (3-Pane, design-prototype-v2) ────────────────────────
  // Grid: 44 px avatar | 1fr body | auto meta. Active row picks up the
  // brand-50 wash from the prototype; the colored avatar replaces the
  // generic IconCircle and acts as the recognition aid.
  if (variant === 'row') {
    const tRel = (key: 'heute' | 'gestern') => t(`relative.${key}`);

    const relativeDate = (() => {
      if (!nowIso) return empfangenDatum;
      try {
        const days = differenceInCalendarDays(
          parseISO(nowIso),
          parseISO(letter.empfangen_am),
        );
        if (days <= 0) return tRel('heute');
        if (days === 1) return tRel('gestern');
        return empfangenDatum;
      } catch {
        return empfangenDatum;
      }
    })();

    // No `erledigt_am` is tracked on `Letter` (only `status`); fall back to
    // the empfangen date for the second meta-line in the prototype design.
    const erledigtDatum = isErledigt ? empfangenDatum : null;

    const hasFrist = fristen.length > 0 && !isErledigt;
    const fristTage = (() => {
      if (!hasFrist || !nowIso) return null;
      try {
        return differenceInCalendarDays(
          parseISO(fristen[0]!.datum),
          parseISO(nowIso),
        );
      } catch {
        return null;
      }
    })();
    const fristIsUrgent = fristTage !== null && fristTage <= 7;
    const showUnreadDot = isUngelesen && !isErledigt;

    return (
      <li className={cn('list-none', className)}>
        <Link
          href={letterUrl(letter.id)}
          aria-current={selected ? 'true' : undefined}
          aria-label={articleAriaLabel}
          onClick={(event) => {
            // Mouse/pointer click (detail > 0) selects inline; keyboard
            // activation (detail === 0) falls through to navigation so the
            // deep-link route stays the < lg / no-JS fallback.
            if (onSelect && event.detail > 0 && !event.metaKey && !event.ctrlKey) {
              event.preventDefault();
              onSelect(letter);
            }
          }}
          className={cn(
            'grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-border px-4 py-3.5 transition-colors',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
            selected ? 'bg-accent-soft' : 'hover:bg-surface-soft',
          )}
        >
          <BehoerdenAvatarV2
            absenderId={letter.absender_behoerde_id}
            name={behoerdeName}
            size="lg"
          />
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate text-[14px] leading-snug text-text-primary',
                isUngelesen ? 'font-semibold' : 'font-medium',
              )}
            >
              {behoerdeName}
              <span className="text-text-muted"> — </span>
              <span className="font-medium">{letter.betreff}</span>
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] leading-snug text-text-secondary">
              {brieftyp}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[11.5px] leading-snug text-text-muted">
              {t('aktenzeichen_label')}: {letter.aktenzeichen}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1 text-right text-[12.5px] leading-snug">
            {isErledigt ? (
              <>
                <span className="font-medium text-text-secondary">
                  {t('status.erledigt')}
                </span>
                {erledigtDatum ? (
                  <span className="text-text-muted tabular-nums">
                    {erledigtDatum}
                  </span>
                ) : null}
              </>
            ) : hasFrist ? (
              <>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    fristIsUrgent ? 'text-red-600' : 'text-text-secondary',
                  )}
                >
                  {t('frist_pre_open_template', { datum: fristDatum })}
                </span>
                {showUnreadDot ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-block size-2 rounded-full',
                      fristIsUrgent ? 'bg-red-500' : 'bg-primary',
                    )}
                  />
                ) : null}
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="text-text-muted tabular-nums">
                  {relativeDate}
                </span>
                {showUnreadDot ? (
                  <span
                    aria-hidden="true"
                    className="inline-block size-2 rounded-full bg-primary"
                  />
                ) : null}
              </span>
            )}
          </span>
          <span className="sr-only">{statusLabel}</span>
        </Link>
      </li>
    );
  }

  // ── CARD VARIANT (Default, V1.5) ──────────────────────────────────────
  return (
    <li
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md',
        isUngelesen ? 'border-foreground/20' : 'border-border',
        className,
      )}
      aria-label={articleAriaLabel}
    >
      <Link
        href={letterUrl(letter.id)}
        className={cn(
          'absolute inset-0 z-0 rounded-xl outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-[var(--ds-color-accent)] focus-visible:ring-2 focus-visible:ring-ring/60',
        )}
        aria-label={t('cta_open')}
      />

      {/* Zeile 1 (Hero): FristChip + Action-Hint */}
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2">
        {isUngelesen && (
          <span
            aria-hidden="true"
            className="inline-block size-2 shrink-0 rounded-full bg-foreground"
          />
        )}
        <span className="sr-only">
          {isUngelesen ? t('status.ungelesen') : t('status.gelesen')}
        </span>
        {fristen.length > 0 ? (
          <FristChip
            frist={fristen[0]!}
            fromIso={nowIso}
            className="text-[length:var(--ds-text-h4,0.9375rem)] font-semibold"
          />
        ) : (
          <span className="text-sm font-medium text-[var(--ds-color-text-secondary)]">
            {t('frist_keine')}
          </span>
        )}
        <span
          className={cn(
            'text-sm',
            isErledigt
              ? 'text-[var(--ds-color-success)]'
              : actionHintKey === 'antwort_erforderlich'
                ? 'font-semibold text-[var(--ds-color-text-primary)]'
                : 'text-[var(--ds-color-text-secondary)]',
          )}
        >
          {actionHint}
        </span>
      </div>

      {/* Zeile 2: Behörde-Name (text-only, HL-DS-10) + Brieftyp */}
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span
          className={cn(
            'font-medium text-[var(--ds-color-text-primary)]',
            isUngelesen && 'font-semibold',
          )}
        >
          {behoerdeName}
        </span>
        <span aria-hidden="true" className="text-[var(--ds-color-text-muted)]">
          ·
        </span>
        <span className="truncate text-[var(--ds-color-text-secondary)]">
          {brieftyp}
        </span>
      </div>

      {/* Zeile 3: Aktenzeichen */}
      <div className="pointer-events-none relative z-10 hidden sm:block">
        <span className="tabular-nums text-xs text-[var(--ds-color-text-muted)]">
          {t('aktenzeichen_label')}: {letter.aktenzeichen}
        </span>
      </div>
      <details className="pointer-events-auto relative z-10 block sm:hidden">
        <summary className="cursor-pointer text-xs text-[var(--ds-color-text-muted)]">
          {t('aktenzeichen_label')}
        </summary>
        <span className="mt-1 block tabular-nums text-xs text-[var(--ds-color-text-secondary)]">
          {letter.aktenzeichen}
        </span>
      </details>

      {/* Optionale Vorgangs-Zeile */}
      {(letter.vorgang_id || showInitialVorgangCta) && (
        <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
          {letter.vorgang_id && vorgangTitle ? (
            <VorgangsBuendelTagExisting
              vorgangId={letter.vorgang_id}
              vorgangTitle={vorgangTitle}
              className="pointer-events-auto"
            />
          ) : showInitialVorgangCta ? (
            <VorgangsBuendelTagInitial
              brieftypLabel={brieftyp}
              jahr={vorgangsJahr}
              onCreate={() => onCreateVorgang?.(letter)}
              className="pointer-events-auto"
            />
          ) : null}
        </div>
      )}

      {/* Utility-Zeile: Datenschutz-Icon + Tiny-Authentizitäts-Icon */}
      <div
        className="pointer-events-none relative z-10 flex items-center justify-end gap-3"
        role="group"
        aria-label={t('utility_row_aria')}
      >
        <AuthentizitaetsBadge channel={authChannel} variant="tiny-icon-only" />
        <DatenschutzCockpitLink
          variant="shield-icon-only"
          letterId={letter.id}
          className="pointer-events-auto"
        />
      </div>
    </li>
  );
}

export { ARCHETYPE_TO_VORGANG_TYP };
