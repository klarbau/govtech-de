'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Baby, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { ZukunftChip } from '@/components/shared/ZukunftChip';
import type { KinderzuschlagAnspruchEstimate } from '@/types';

interface KinderzuschlagRadarCardProps {
  estimate: KinderzuschlagAnspruchEstimate;
  /** „Ausblenden" (X) — optimistic hide + persist (dismiss). */
  onDismiss: () => void;
  /** „Erkennung ausschalten" — Consent-Widerruf (Datenschutz-by-design). */
  onRevokeConsent: () => void;
}

/**
 * `<KinderzuschlagRadarCard>` (Spec `anspruch-arc.md` § 4.3, Beat c) — der
 * „Anspruch erkannt"-Flagship-Eintrag der „Ihnen steht zu"-Lane. Grün ist reiner
 * Akzent (Waldgrün `--color-primary`); die Bedeutung trägt der Text.
 *
 * Honesty (§ 11): KiZ ist antragsgebunden (§ 6a Abs. 7 BKGG) → „Antrag für mich
 * vorbereiten", NIE „läuft schon"; der Betrag ist „geschätzt ca."-Range (kein
 * fixer Bescheid); der Counter nennt die INANSPRUCHNAHME-Quote (~35 % = Bezug,
 * nicht invertiert) mit BMFSFJ-Attribution; der Einkommens-Datenpunkt trägt ein
 * prominentes [MOCK] ohne konkrete Einkommenszahl; [ZUKUNFT 2027].
 */
export function KinderzuschlagRadarCard({
  estimate,
  onDismiss,
  onRevokeConsent,
}: KinderzuschlagRadarCardProps) {
  const t = useTranslations('kinderzuschlagRadar');
  const titleId = React.useId();

  const range = t('betrag_range', {
    min: estimate.geschaetzt_min_eur,
    max: estimate.geschaetzt_max_eur,
  });

  return (
    <section
      aria-labelledby={titleId}
      className="lg-glass-surface-accent relative flex flex-col gap-3 rounded-xl border border-primary/30 bg-accent-soft/40 p-4"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('dismiss')}
        title={t('dismiss')}
        className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <X aria-hidden="true" className="size-4" />
      </button>

      <div className="flex items-start gap-3 pr-10">
        <IconCircle icon={<Baby />} tone="primary" size="md" />
        <h3 id={titleId} className="text-sm font-semibold text-text-primary">
          {t('title')}
        </h3>
      </div>

      <p className="text-sm font-medium text-text-primary tabular-nums">
        {t('lead', { range })}
      </p>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-text-secondary">{t('warum_title')}</p>
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          <li className="flex gap-1.5">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            {t('datenpunkt.kindergeld', { n: estimate.kinder_im_haushalt })}
          </li>
          <li className="flex gap-1.5">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            {t('datenpunkt.einkommen')}
          </li>
          <li className="flex gap-1.5">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            {t('datenpunkt.kein_bezug')}
          </li>
        </ul>
      </div>

      <Button
        className="self-start"
        render={<Link href={estimate.cta_route} />}
      >
        {t('cta')}
      </Button>

      <p className="text-xs text-text-secondary">{t('counter')}</p>

      <div className="flex flex-col gap-1 text-xs text-text-muted">
        <p>{t('zustaendig')}</p>
        <p>{t('rechtsgrundlage')}</p>
      </div>

      <button
        type="button"
        onClick={onRevokeConsent}
        className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {t('consent_off')}
      </button>

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        <ZukunftChip label={t('zukunft_chip')} />
        {t('disclaimer')}
      </p>
    </section>
  );
}
