'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Info, Sparkles } from 'lucide-react';

import { NormTooltip } from '@/components/shared/NormTooltip';
import { cn } from '@/lib/utils';
import type { LetterAiSummaryPostOpen, LetterCitation } from '@/types';

import { CitationFootnote } from './CitationFootnote';
import { RoterHinweisBanner } from './RoterHinweisBanner';
import { parseBoldAndNorms } from './utils/parse-bold-norms';

interface AISummaryBlockProps {
  summary: LetterAiSummaryPostOpen | undefined;
  /** Status der Lazy-AI-Erklärung. */
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onShowInOriginal?: (citation: LetterCitation) => void;
  /** id-Anker für `aria-describedby` von Original-Block (Erweiterung, kein Ersatz). */
  describedById?: string;
  className?: string;
}

function renderBulletText(text: string): React.ReactNode {
  const segments = parseBoldAndNorms(text);
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.kind === 'bold') {
          return (
            <strong key={`b-${idx}`} className="font-semibold text-foreground">
              {seg.text}
            </strong>
          );
        }
        if (seg.kind === 'norm') {
          return <NormTooltip key={`n-${idx}`} norm={seg.norm} />;
        }
        return <React.Fragment key={`t-${idx}`}>{seg.text}</React.Fragment>;
      })}
    </>
  );
}

/**
 * AI-Summary-Block (5–8 Bullets + Citation pro Bullet) für den
 * LetterReader. Bullets ohne Original-Zitat werden mit `<NormTooltip>`
 * statt `<CitationFootnote>` gerendert (Spec §6.4.3).
 *
 * Animationen respektieren `prefers-reduced-motion`.
 */
export function AISummaryBlock({
  summary,
  loading,
  error,
  onRetry,
  onShowInOriginal,
  describedById,
  className,
}: AISummaryBlockProps) {
  const t = useTranslations('posteingang.reader');
  const tDisclaimer = useTranslations('posteingang.disclaimer');
  const prefersReducedMotion = useReducedMotion();

  // Subtle entry-animation only via Y-translate; opacity bleibt durchgehend
  // 1, damit Bullets nie Niedrig-Kontrast-States während des Fade-Ins
  // durchlaufen (a11y-tester 2026-05-09 — color-contrast für animierte Bullets).
  const variants = {
    hidden: { opacity: 1, y: prefersReducedMotion ? 0 : 4 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      id="summary"
      aria-labelledby="summary-heading"
      aria-describedby={describedById}
      aria-live="polite"
      className={cn('flex flex-col gap-3', className)}
    >
      <header className="flex items-center justify-between gap-2">
        <h2
          id="summary-heading"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Sparkles
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {t('summary_heading')}
        </h2>
      </header>

      <div
        role="note"
        className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{t('summary_skeleton_hint')}</p>
      </div>

      <RoterHinweisBanner />

      {loading && (
        <ul className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={`sk-${i}`}
              className="h-4 animate-pulse rounded-md bg-muted/60"
            />
          ))}
        </ul>
      )}

      {!loading && error && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">{t('summary_error')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="self-start rounded-md border border-red-300 px-2 py-1 text-[11px] underline underline-offset-4 dark:border-red-800"
            >
              {t('summary_error_retry')}
            </button>
          )}
        </div>
      )}

      {!loading && !error && summary && (
        <ol className="flex list-none flex-col gap-2.5 text-sm leading-relaxed">
          {summary.bullets.map((bullet, idx) => {
            const citation = summary.citations.find(
              (c) => c.bullet_index === idx,
            );
            const hasZitat =
              citation && citation.original_zitat.trim().length > 0;
            return (
              <motion.li
                key={`b-${idx}`}
                initial="hidden"
                animate="visible"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.25, delay: idx * 0.04 }
                }
                variants={variants}
                className="flex items-start gap-2"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-foreground/40"
                />
                <span className="flex-1">
                  {renderBulletText(bullet.text)}
                  {hasZitat && citation && (
                    <CitationFootnote
                      citation={citation}
                      number={idx + 1}
                      onShowInOriginal={onShowInOriginal}
                    />
                  )}
                </span>
              </motion.li>
            );
          })}
        </ol>
      )}

      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {tDisclaimer('summary_footer_hint')}
      </p>
    </section>
  );
}
