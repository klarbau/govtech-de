'use client';

import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Clock3 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { LetterFrist, LetterFristTyp } from '@/types';

interface FristChipProps {
  frist: LetterFrist;
  /** Optional: ISO-Datum als „heute" für SSR-stabile Renders. */
  fromIso?: string;
  className?: string;
  onClick?: () => void;
}

function fristTypLabelKey(typ: LetterFristTyp): string {
  return typ;
}

/**
 * Ein einzelner Frist-Chip auf LetterCard / LetterReader.
 * Mehrfach-Fristen werden als horizontale Chip-Reihe gerendert
 * (Spec §9 Edge case #1). Bei `citation_match: false` wird ein Warn-
 * Icon ergänzt; in der LetterReader-Detailansicht deaktiviert das den
 * „Frist im Kalender"-CTA (Spec §9 Edge case #10).
 */
export function FristChip({ frist, fromIso, className, onClick }: FristChipProps) {
  const t = useTranslations('posteingang.reader');
  const tCommon = useTranslations('common.frist');

  const deadline = parseISO(frist.datum);
  const from = fromIso ? parseISO(fromIso) : new Date();
  const days = differenceInCalendarDays(deadline, from);
  const datumFormatted = format(deadline, 'dd.MM.yyyy', { locale: de });

  const overdue = days < 0;
  // Phase 6b — Dringlichkeits-Palette (audit #3):
  //   days < 0   → danger-strong (abgelaufen, Icon-Variant warning)
  //   days < 3   → danger        (sehr dringend)
  //   days < 7   → warning       (dringend, amber-Migration → DS-Token)
  //   days >= 7  → neutral       (Standardchip)
  const veryUrgent = !overdue && days < 3;
  const urgent = !overdue && !veryUrgent && days < 7;

  const typLabel = tCommon(fristTypLabelKey(frist.typ));
  const tageLabel = overdue
    ? t('frist_chip_abgelaufen_template', { datum: datumFormatted })
    : days === 0
      ? t('frist_chip_today')
      : t('frist_chip_days_template', { tage: days });

  const srLabel = overdue
    ? t('frist_sr_overdue_template', { typ: typLabel, datum: datumFormatted })
    : t('frist_sr_open_template', {
        typ: typLabel,
        tage: days,
        datum: datumFormatted,
      });

  // Palette nutzt design-system-v2 Tokens (Phase 5b). Fallback-Pfad: existierende
  // amber-Klassen für `urgent` werden durch `--ds-color-warning(-soft)` ersetzt.
  // V1.5.1-`text-amber-950`-Härtung (HL-DS-7) ist hier nicht betroffen — FristChip
  // ist nicht in der `text-amber-950`-Whitelist (V1.3 Mobilitäts-Banner).
  const palette = overdue
    ? // abgelaufen → danger-strong (HL-DS-3)
      'bg-[var(--ds-color-danger)] text-[var(--ds-color-accent-foreground)] ring-[var(--ds-color-danger)]'
    : veryUrgent
      ? // < 3 Tage → danger (soft surface, strong text)
        'bg-[color-mix(in_oklch,var(--ds-color-danger)_12%,var(--ds-color-surface))] text-[var(--ds-color-danger)] ring-[var(--ds-color-danger)]/40'
      : urgent
        ? // < 7 Tage → warning
          'bg-[var(--ds-color-warning-soft)] text-amber-950 ring-[var(--ds-color-warning)]/40 dark:text-[var(--ds-color-text-primary)]'
        : // >= 7 Tage → neutral
          'bg-[var(--ds-color-surface-muted)] text-[var(--ds-color-text-secondary)] ring-[var(--ds-color-border)]';

  const Wrapper: 'button' | 'span' = onClick ? 'button' : 'span';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
        palette,
        onClick && 'hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      aria-label={srLabel}
    >
      {overdue || frist.citation_match === false ? (
        <AlertTriangle className="size-3" aria-hidden="true" />
      ) : (
        <Clock3 className="size-3" aria-hidden="true" />
      )}
      <span>
        {typLabel} · {tageLabel}
      </span>
      {frist.citation_match === false && (
        <span className="sr-only">{t('citation.mismatch_warning_sr')}</span>
      )}
    </Wrapper>
  );
}
