'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FileText } from 'lucide-react';

import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { Behoerde, Letter } from '@/types';

import { ARCHETYPE_TO_VORGANG_TYP } from './letter-archetype-actions';
import { AuthentizitaetsBadge, DEFAULT_AUTH_CHANNEL } from './AuthentizitaetsBadge';
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

  const statusVariant: StatusVariant = isErledigt
    ? 'erledigt'
    : isUngelesen
      ? 'neu'
      : 'warten';
  const statusLabel = isErledigt
    ? t('status.erledigt')
    : isUngelesen
      ? t('status.ungelesen')
      : actionHint;

  // ── ROW VARIANT (3-Pane) ──────────────────────────────────────────────
  if (variant === 'row') {
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
            'flex min-h-[44px] items-start gap-3 rounded-lg border p-3 transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            selected
              ? 'border-primary bg-accent-soft'
              : 'border-border hover:bg-surface-muted',
          )}
        >
          <IconCircle icon={<FileText aria-hidden="true" />} tone="primary" size="md" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              {isUngelesen && (
                <span
                  aria-hidden="true"
                  className="inline-block size-2 shrink-0 rounded-full bg-primary"
                />
              )}
              <span
                className={cn(
                  'truncate text-sm text-text-primary',
                  isUngelesen ? 'font-semibold' : 'font-medium',
                )}
              >
                {behoerdeName}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-sm text-text-secondary">
              {letter.betreff}
            </span>
            <span className="mt-1 flex items-center gap-2">
              <span className="text-xs text-text-muted tabular-nums">
                {empfangenDatum}
              </span>
              {fristen.length > 0 && !isErledigt ? (
                <FristChip frist={fristen[0]!} fromIso={nowIso} className="text-[11px]" />
              ) : null}
            </span>
          </span>
          <StatusBadge variant={statusVariant} className="mt-0.5 shrink-0">
            {statusLabel}
          </StatusBadge>
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
