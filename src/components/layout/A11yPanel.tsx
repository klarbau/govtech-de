'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Pause, Play, Plus, RotateCcw, Square } from 'lucide-react';

import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useA11yPreferences } from '@/lib/a11y/use-a11y-preferences';
import { useSpeech } from '@/lib/a11y/use-speech';
import { A11Y_DEFAULTS } from '@/lib/a11y/preferences';
import { cn } from '@/lib/utils';

interface A11yPanelProps {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function readMainText(): string {
  if (typeof document === 'undefined') return '';
  const main = document.querySelector('main');
  return main?.innerText.trim() ?? '';
}

export function A11yPanel({ id, open, onOpenChange }: A11yPanelProps) {
  const t = useTranslations('a11y');
  const {
    fontScale,
    contrast,
    readable,
    reduceMotion,
    isDefault,
    canIncreaseFont,
    canDecreaseFont,
    increaseFontScale,
    decreaseFontScale,
    setContrast,
    setReadable,
    setReduceMotion,
    reset,
  } = useA11yPreferences();
  const speech = useSpeech();

  // aria-live announcements for font-step + reset (status only — no visual row).
  const [announce, setAnnounce] = React.useState('');

  // Reset also restores the default fontScale, which would re-fire the font
  // announce effect below and overwrite the "Bedienhilfen zurückgesetzt" message.
  // This flag tells that effect to skip the one tick triggered by a reset so the
  // reset announcement stays final.
  const fromResetRef = React.useRef(false);

  // Stop reading when the panel closes (and the cleanup in useSpeech catches
  // unmount / navigation). The transport reads the live `<main>` landmark.
  React.useEffect(() => {
    if (!open) speech.stop();
  }, [open, speech.stop]);

  React.useEffect(() => {
    if (fromResetRef.current) {
      fromResetRef.current = false;
      return;
    }
    setAnnounce(t('fontsize.announce', { value: fontScale }));
  }, [fontScale, t]);

  const handleReset = React.useCallback(() => {
    // Only arm the suppression flag when the reset will actually move fontScale
    // (and thus re-fire the font announce effect). If fontScale is already at
    // default, the effect won't run and an armed flag would wrongly swallow the
    // NEXT genuine font change.
    if (fontScale !== A11Y_DEFAULTS.fontScale) fromResetRef.current = true;
    reset();
    speech.stop();
    setAnnounce(t('reset.announce'));
  }, [fontScale, reset, speech, t]);

  const handlePlay = React.useCallback(() => {
    speech.play(readMainText());
  }, [speech]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={id}
        className="sm:max-w-md"
        aria-describedby={`${id}-subtitle`}
      >
        <DialogHeader>
          <DialogTitle>{t('panel.title')}</DialogTitle>
          <DialogDescription id={`${id}-subtitle`}>
            {t('panel.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Schriftgröße */}
        <section aria-labelledby={`${id}-font-label`} className="flex flex-col gap-2">
          <h3
            id={`${id}-font-label`}
            className="text-sm font-semibold text-text-primary"
          >
            {t('fontsize.label')}
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={decreaseFontScale}
              disabled={!canDecreaseFont}
              aria-label={t('fontsize.decrease')}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span
              className="min-w-16 text-center text-sm font-medium tabular-nums text-text-primary"
              aria-hidden="true"
            >
              {t('fontsize.level', { value: fontScale })}
            </span>
            <button
              type="button"
              onClick={increaseFontScale}
              disabled={!canIncreaseFont}
              aria-label={t('fontsize.increase')}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        <hr className="border-border" />

        {/* Vorlesen */}
        <section aria-labelledby={`${id}-read-label`} className="flex flex-col gap-2">
          <h3
            id={`${id}-read-label`}
            className="text-sm font-semibold text-text-primary"
          >
            {t('vorlesen.label')}
          </h3>
          {speech.supported ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {speech.status === 'paused' ? (
                  <button
                    type="button"
                    onClick={speech.resume}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted"
                  >
                    <Play className="size-4" aria-hidden="true" />
                    {t('vorlesen.resume')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlay}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted"
                  >
                    <Play className="size-4" aria-hidden="true" />
                    {t('vorlesen.play')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={speech.pause}
                  disabled={speech.status !== 'playing'}
                  aria-label={t('vorlesen.pause')}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Pause className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={speech.stop}
                  disabled={speech.status === 'idle'}
                  aria-label={t('vorlesen.stop')}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Square className="size-4" aria-hidden="true" />
                </button>
              </div>
              {speech.status === 'playing' && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs text-text-secondary"
                >
                  {t('vorlesen.running')}
                </p>
              )}
              <p className="text-xs leading-relaxed text-text-secondary">
                {t('vorlesen.privacy')}
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-text-secondary">
              {t('vorlesen.unsupported')}
            </p>
          )}
        </section>

        <hr className="border-border" />

        {/* Toggles */}
        <div className="flex flex-col gap-3">
          <ToggleRow
            id={`${id}-contrast`}
            label={t('contrast.label')}
            checked={contrast}
            onCheckedChange={setContrast}
          />
          <ToggleRow
            id={`${id}-readable`}
            label={t('readable.label')}
            hint={t('readable.hint')}
            checked={readable}
            onCheckedChange={setReadable}
          />
          <ToggleRow
            id={`${id}-motion`}
            label={t('motion.label')}
            checked={reduceMotion}
            onCheckedChange={setReduceMotion}
          />
        </div>

        <hr className="border-border" />

        <button
          type="button"
          onClick={handleReset}
          disabled={isDefault}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('reset.label')}
        </button>

        <div className="flex flex-col gap-1 border-t border-border pt-3 text-xs leading-relaxed text-text-secondary">
          <p>{t('storage_note')}</p>
          <p>{t('native_note')}</p>
        </div>

        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      </DialogContent>
    </Dialog>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

function ToggleRow({ id, label, hint, checked, onCheckedChange }: ToggleRowProps) {
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="text-sm font-medium text-text-primary">
          {label}
        </span>
        {hint && (
          <span id={hintId} className={cn('text-xs text-text-secondary')}>
            {hint}
          </span>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="mt-0.5"
      />
    </div>
  );
}
