import { useTranslations } from 'next-intl';
import { Hand } from 'lucide-react';

import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';

/**
 * Static [MOCK] placeholder for a German Sign Language (DGS) explainer video
 * (BITV 2.0 §4 Anlage 2 — Startseiten-Essentials). Shared by the Bedienhilfen
 * panel (client) and the /barrierefreiheit page (server), so this stays a plain
 * component (no `'use client'`).
 *
 * Intentionally NO player controls, progress bar or avatar: a DGS video is
 * filmed, not generated (Domain §4 realism). Blur-free (LG budget). The
 * surrounding `<section>` + heading (`a11y.dgs.heading`) belong to the caller so
 * the heading level matches its context (panel `<h3>`, page `<h2>`).
 */
export function DgsErklaervideoPlaceholder() {
  const t = useTranslations('a11y.dgs');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-muted p-4 text-center">
        <Hand className="size-8 text-text-secondary" aria-hidden="true" />
        <span className="text-sm font-medium text-text-primary">
          {t('video_label')}
        </span>
        <MockWatermarkBanner variant="inline" />
      </div>
      <p className="text-xs leading-relaxed text-text-secondary">
        {t('mock_note')}
      </p>
      <div className="flex flex-col gap-1 text-xs leading-relaxed text-text-secondary">
        <p className="font-medium text-text-primary">{t('contents_intro')}</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>{t('content_1')}</li>
          <li>{t('content_2')}</li>
          <li>{t('content_3')}</li>
        </ul>
        <p className="mt-1">{t('real_note')}</p>
      </div>
    </div>
  );
}
