'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, X } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';

interface DatenschutzVisionBannerProps {
  /** Wird beim Schließen aufgerufen (persistiert via `api.dismissVisionBanner`). */
  onDismiss: () => void;
  /** Ref auf das Element, das nach dem Schließen den Fokus erhalten soll. */
  dismissButtonRef?: React.Ref<HTMLButtonElement>;
}

/**
 * Dismissible 2027-Vision-Banner für das Datenschutz-Cockpit (Spec § 4.1).
 *
 * Eigene Variante statt der nicht-dismissiblen
 * `stammdaten/kontakt/VisionBanner.tsx` (an `stammdaten.kontakt.notification`
 * gebunden) — hier mit eigenen `datenschutz.vision_banner.*`-Keys + ×-Button.
 * `role="note"`; der ×-Button trägt ein klares `aria-label`. Der Fokus wird
 * vom aufrufenden View nach dem Schließen sinnvoll gesetzt.
 */
export function DatenschutzVisionBanner({
  onDismiss,
  dismissButtonRef,
}: DatenschutzVisionBannerProps) {
  const t = useTranslations('datenschutz.vision_banner');

  return (
    <aside
      role="note"
      aria-label={t('heading')}
      className="flex items-start gap-3 rounded-lg border border-border bg-accent-soft p-4 text-sm leading-relaxed text-text-primary"
    >
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {t('heading')}
        </p>
        <p>{wrapNormZitate(t('body'))}</p>
      </div>
      <button
        ref={dismissButtonRef}
        type="button"
        onClick={onDismiss}
        aria-label={t('dismiss')}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
