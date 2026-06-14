'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Play, Square } from 'lucide-react';

import { useSpeech } from '@/lib/a11y/use-speech';
import { cn } from '@/lib/utils';

interface VorlesenButtonProps {
  /** Text to read on-device (Brief body or AI summary). */
  text: string;
  className?: string;
}

/**
 * On-device „Vorlesen" control for the highest-value text surface in the
 * Posteingang (the AI summary). Uses {@link useSpeech}; renders the mandatory
 * privacy line (spec §7/§9). If the text is empty or `speechSynthesis` is
 * unavailable, it renders nothing — the rest of the reader is unaffected.
 */
export function VorlesenButton({ text, className }: VorlesenButtonProps) {
  const t = useTranslations('a11y');
  const speech = useSpeech();

  const trimmed = text.trim();
  if (!speech.supported || trimmed.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)} data-print="hide">
      <div className="flex flex-wrap items-center gap-2">
        {speech.status === 'paused' ? (
          <button
            type="button"
            onClick={speech.resume}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-muted"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {t('vorlesen.resume')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => speech.play(trimmed)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-muted"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {t('vorlesen.play')}
          </button>
        )}
        <button
          type="button"
          onClick={speech.pause}
          disabled={speech.status !== 'playing'}
          aria-label={t('vorlesen.pause')}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pause className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={speech.stop}
          disabled={speech.status === 'idle'}
          aria-label={t('vorlesen.stop')}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Square className="size-3.5" aria-hidden="true" />
        </button>
        {speech.status === 'playing' && (
          <span role="status" aria-live="polite" className="text-xs text-text-secondary">
            {t('vorlesen.running')}
          </span>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-text-secondary">
        {t('vorlesen.privacy')}
      </p>
    </div>
  );
}
