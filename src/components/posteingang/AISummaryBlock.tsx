'use client';

import { useTranslations } from 'next-intl';
import { Info, Sparkles } from 'lucide-react';

import { Skeleton } from '@/components/shared/Skeleton';
import { cn } from '@/lib/utils';
import type {
  LetterAiSummary,
  LetterAiSummaryPostOpen,
  LetterCitation,
} from '@/types';

import { ErklaererBulletList } from './ErklaererBulletList';
import { ErklaererLangToggle } from './ErklaererLangToggle';
import { RoterHinweisBanner } from './RoterHinweisBanner';
import { TranslationDisclaimerBadge } from './TranslationDisclaimerBadge';
import { useErklaererLang } from './use-erklaerer-lang';

interface AISummaryBlockProps {
  summary: LetterAiSummaryPostOpen | undefined;
  /**
   * Vollständige `ai_summary` des Briefs — trägt `translations` für die
   * locale-bewusste Erläuterung (Mehrsprachiger Brief-Erklärer, Spec §4.2).
   * Wenn nicht gesetzt, rendert der Block rein deutsch (Alt-Verhalten).
   */
  aiSummary?: LetterAiSummary;
  /** Status der Lazy-AI-Erklärung. */
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onShowInOriginal?: (citation: LetterCitation) => void;
  /** id-Anker für `aria-describedby` von Original-Block (Erweiterung, kein Ersatz). */
  describedById?: string;
  className?: string;
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
  aiSummary,
  loading,
  error,
  onRetry,
  onShowInOriginal,
  describedById,
  className,
}: AISummaryBlockProps) {
  const t = useTranslations('posteingang.reader');
  const tErkl = useTranslations('posteingang.erklaerer');
  const tDisclaimer = useTranslations('posteingang.disclaimer');
  const tCommon = useTranslations('common');

  const {
    activeLang,
    setActiveLang,
    options,
    activeSummary,
    isTranslated,
    isFallbackDe,
  } = useErklaererLang(aiSummary, summary);

  return (
    <section
      id="summary"
      aria-labelledby="summary-heading"
      aria-describedby={describedById}
      aria-live="polite"
      className={cn('flex flex-col gap-3', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
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
        {!loading && !error && summary && (
          <ErklaererLangToggle
            activeLang={activeLang}
            options={options}
            onChange={setActiveLang}
          />
        )}
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
        <div role="status" aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">{tCommon('loading')}</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`sk-${i}`} shape="text" className="h-4" />
          ))}
        </div>
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

      {!loading && !error && isFallbackDe && (
        <p
          role="status"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {tErkl('fallback_de_note')}
        </p>
      )}

      {!loading && !error && isTranslated && activeLang !== 'de' && (
        <TranslationDisclaimerBadge activeLang={activeLang} />
      )}

      {!loading && !error && activeSummary && (
        <ErklaererBulletList
          summary={activeSummary}
          activeLang={activeLang}
          isTranslated={isTranslated}
          onShowInOriginal={onShowInOriginal}
        />
      )}

      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {tDisclaimer('summary_footer_hint')}
      </p>
    </section>
  );
}
