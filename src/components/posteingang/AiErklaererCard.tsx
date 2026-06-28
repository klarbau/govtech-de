'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Sparkles, Coins, FileText } from 'lucide-react';

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

interface AiErklaererCardProps {
  summary: LetterAiSummaryPostOpen | undefined;
  /**
   * Vollständige `ai_summary` — trägt `translations` für die locale-bewusste
   * Erläuterung (Mehrsprachiger Brief-Erklärer, Spec §4.2). Ohne dieses Prop
   * rendert die Card rein deutsch (Alt-Verhalten).
   */
  aiSummary?: LetterAiSummary;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onShowInOriginal?: (citation: LetterCitation) => void;
  /** id-Anker für `aria-describedby` von Original-Block. */
  describedById?: string;
  /** Optional hero sentence above the bullets ("Sie erhalten 371,00 €…"). */
  hero?: React.ReactNode;
  /**
   * Top-right decorative illustration. Defaults to a `Coins` + `FileText`
   * pair (the steuer look in the sketch). Pass `null` to hide.
   */
  illustration?: React.ReactNode | null;
  className?: string;
}

function defaultIllustration(): React.ReactNode {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex size-14 shrink-0 items-center justify-center"
    >
      <FileText className="absolute left-0 top-0 size-9 text-primary/35" />
      <Coins className="absolute -bottom-0 -right-0 size-7 text-primary" />
    </span>
  );
}

/**
 * Cobalt-tinted "KI-Brief-Erklärer" card matching the prototype-v2 sketch.
 *
 * Self-contained reimplementation of the bullet+citation rendering used by
 * `<AISummaryBlock>` so we own the tint/headline + illustration without
 * double-heading or nested-landmark hacks. Disclaimer text below the bullets
 * reuses `posteingang.disclaimer.summary_footer_hint` so the legal copy
 * stays in sync with the V1.5.1 wording.
 *
 * Hardcoded sketch labels per redesign-sweep convention (no i18n JSON edits).
 */
export function AiErklaererCard({
  summary,
  aiSummary,
  loading,
  error,
  onRetry,
  onShowInOriginal,
  describedById,
  hero,
  illustration = defaultIllustration(),
  className,
}: AiErklaererCardProps) {
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
      aria-labelledby="ai-erklaerer-heading"
      aria-describedby={describedById}
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/15 bg-accent-soft px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="ai-erklaerer-heading"
            className="text-sm font-semibold uppercase tracking-wide text-primary"
          >
            KI-Brief-Erklärer
          </h3>
          {hero ? (
            <p className="mt-1.5 text-base font-medium leading-snug text-text-primary">
              {hero}
            </p>
          ) : null}
        </div>
        {!loading && !error && summary && (
          <ErklaererLangToggle
            activeLang={activeLang}
            options={options}
            onChange={setActiveLang}
            className="shrink-0"
          />
        )}
        {illustration ? (
          <div className="hidden shrink-0 sm:block">{illustration}</div>
        ) : null}
      </header>

      <div className="mt-3 sm:mt-4">
        <RoterHinweisBanner />
      </div>

      {loading && (
        <div role="status" aria-busy="true" className="mt-3 flex flex-col gap-2">
          <span className="sr-only">{tCommon('loading')}</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`sk-${i}`} shape="text" className="h-4" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">{t('summary_error')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 self-start rounded-md border border-red-300 px-2 py-1 text-[11px] underline underline-offset-4 dark:border-red-800"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              {t('summary_error_retry')}
            </button>
          )}
        </div>
      )}

      {!loading && !error && isFallbackDe && (
        <p
          role="status"
          className="mt-3 text-xs leading-relaxed text-text-muted"
        >
          {tErkl('fallback_de_note')}
        </p>
      )}

      {!loading && !error && isTranslated && activeLang !== 'de' && (
        <div className="mt-3">
          <TranslationDisclaimerBadge activeLang={activeLang} />
        </div>
      )}

      {!loading && !error && activeSummary && (
        <ErklaererBulletList
          summary={activeSummary}
          activeLang={activeLang}
          isTranslated={isTranslated}
          onShowInOriginal={onShowInOriginal}
          bulletDotClassName="bg-primary/70"
          className="mt-3 text-text-primary sm:mt-4"
        />
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
        {tDisclaimer('summary_footer_hint')}
      </p>
    </section>
  );
}
