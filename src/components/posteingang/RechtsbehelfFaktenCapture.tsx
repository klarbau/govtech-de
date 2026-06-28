'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Info, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  requestSachverhalt,
  type SachverhaltNormFamilie,
} from '@/lib/ai/sachverhalt-client';

import { wrapNormZitate } from './wrapNormZitate';

/**
 * Klartext-Rückkanal — Plain-Language-Fakten-Capture
 * (Spec `2026-06-28-klartext-rueckkanal.md` § 4.2).
 *
 * Rendert NUR über dem Entwurf-Body-`<textarea>`, wenn ein Rechtsbehelf-Skelett
 * aktiv ist (`isSkelettTemplate(formState.template) === true`). Die Bürger:in
 * sagt in eigenen Worten, was am Bescheid nicht stimmt; auf „Entwurf erstellen"
 * ruft die Komponente das eng-eingezäunte AI-Restatement-Tool
 * (`requestSachverhalt`) und meldet den `sachverhalt` + `source` an den Parent
 * (`ReplyComposeContent`), der den `begruendung_kurz`-Slot setzt und den Body
 * neu auflöst.
 *
 * **Wichtig:** Diese Box ist EINE separate Fähigkeit — sie un-gated NICHT die
 * `disabledForSkelett`-Rewrite-Chips (die bleiben gesperrt). Sie bewertet nichts,
 * empfiehlt nichts, nennt keine Norm — das garantiert der gefencte System-Prompt
 * (§ 7.2). Offline droppt das Tool den Rohtext verbatim (`source: 'fallback'`),
 * nie stille Rechtsformulierung (Correction #9).
 */
interface RechtsbehelfFaktenCaptureProps {
  /** Mechanisch aus `letter.archetype` via `pickNormFamilie` (NIE aus dem Freitext). */
  normFamilie: SachverhaltNormFamilie;
  /** True während der Parent den Body neu auflöst (`resolveReplyBody`). */
  resolvePending: boolean;
  /**
   * Liefert das Restatement-Ergebnis an den Parent. Dieser setzt
   * `userInput.begruendung_kurz = sachverhalt` und re-resolved den Body.
   */
  onSachverhalt: (sachverhalt: string) => void | Promise<void>;
}

type CaptureStatus = 'idle' | 'pending' | 'done' | 'fallback' | 'error';

export function RechtsbehelfFaktenCapture({
  normFamilie,
  resolvePending,
  onSachverhalt,
}: RechtsbehelfFaktenCaptureProps) {
  const t = useTranslations('posteingang.compose.fakten_capture');

  const [rohtext, setRohtext] = React.useState('');
  const [status, setStatus] = React.useState<CaptureStatus>('idle');

  const headingId = React.useId();
  const textareaId = React.useId();
  const disclaimerId = React.useId();
  const remedyId = React.useId();

  const trimmedEmpty = rohtext.trim().length === 0;
  const pending = status === 'pending' || resolvePending;
  const ctaDisabled = trimmedEmpty || pending;

  const remedyLabel = (() => {
    try {
      return t(`remedy_label.${normFamilie}`);
    } catch {
      return '';
    }
  })();

  async function onErstellen() {
    if (ctaDisabled) return;
    setStatus('pending');
    try {
      const result = await requestSachverhalt(rohtext, normFamilie);
      await onSachverhalt(result.sachverhalt);
      setStatus(result.source === 'fallback' ? 'fallback' : 'done');
    } catch {
      // requestSachverhalt never throws, but onSachverhalt (body re-resolve) can.
      await onSachverhalt(rohtext);
      setStatus('error');
    }
  }

  const note = (() => {
    if (status === 'fallback') return t('fallback_note');
    if (status === 'error') return t('error_note');
    return null;
  })();

  return (
    <section
      aria-labelledby={headingId}
      data-testid="rechtsbehelf-fakten-capture"
      className="flex flex-col gap-2.5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-200/40 dark:bg-brand-50/[0.06]"
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className="size-4 shrink-0 text-brand-600 dark:text-[var(--brand-600)]"
          aria-hidden="true"
        />
        <h3
          id={headingId}
          className="text-sm font-semibold text-text-primary"
        >
          2a. {t('heading')}
        </h3>
      </div>

      <p className="text-[13px] leading-relaxed text-text-secondary">
        {t('intro')}
      </p>

      {remedyLabel && (
        <p
          id={remedyId}
          data-testid="fakten-capture-remedy-confirm"
          className="text-[13px] leading-relaxed text-text-primary"
        >
          {t('remedy_confirm', { remedy: remedyLabel })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textareaId}
          className="text-[13px] font-medium text-text-primary"
        >
          {t('textarea_label')}
        </label>
        <textarea
          id={textareaId}
          dir="ltr"
          lang="de"
          rows={3}
          value={rohtext}
          onChange={(e) => {
            setRohtext(e.target.value);
            if (status !== 'idle' && status !== 'pending') setStatus('idle');
          }}
          aria-describedby={disclaimerId}
          aria-busy={pending}
          placeholder={t('textarea_placeholder')}
          className="w-full resize-y rounded-lg border border-border-strong bg-background p-3 font-sans text-sm leading-relaxed shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => void onErstellen()}
          disabled={ctaDisabled}
          aria-busy={pending}
          className="gap-2"
        >
          {pending ? (
            <Loader2
              className="size-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {pending ? t('pending') : t('cta')}
        </Button>
      </div>

      {/* Ergebnis-/Fallback-Ankündigung — polite live region. */}
      <p
        role="status"
        aria-live="polite"
        data-testid="fakten-capture-status"
        className={cn(
          'min-h-0 text-[13px] leading-relaxed',
          status === 'fallback' || status === 'error'
            ? 'text-amber-800 dark:text-[var(--ds-color-text-primary)]'
            : 'text-emerald-700 dark:text-emerald-400',
        )}
      >
        {status === 'done'
          ? t('success_announce')
          : note}
      </p>

      <p
        id={disclaimerId}
        data-testid="fakten-capture-disclaimer"
        className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground"
      >
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{wrapNormZitate(t('disclaimer'))}</span>
      </p>
    </section>
  );
}
