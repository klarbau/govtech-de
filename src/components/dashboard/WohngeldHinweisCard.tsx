'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Clock3, Home, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { WohngeldAnspruchEstimate } from '@/types';

const ROMAN: Record<WohngeldAnspruchEstimate['mietstufe'], string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
};

interface WohngeldHinweisCardProps {
  estimate: WohngeldAnspruchEstimate;
  /** Registrierte Gemeinde (aus `persona.adresse.ort`) für die Mietstufen-Zeile. */
  ort: string;
  onDismiss: () => void;
  onSnooze: () => void;
  onRevokeConsent: () => void;
}

/**
 * `<WohngeldHinweisCard>` — proaktiver „Möglicher Anspruch erkannt"-Hinweis
 * (Spec `proaktiver-wohngeld-anspruch.md` §4.1). DETECT + NUDGE, kein Autopilot:
 * der CTA navigiert nur in den bestehenden Pull-only-Flow `/lebenslagen/wohngeld`,
 * die Karte selbst sendet nichts an eine Behörde. Euro-Range ist eine
 * synthetische [MOCK]-Schätzung, immer als „Schätzung" gerahmt; der proaktive
 * Hinweis selbst ist [ZUKUNFT 2027].
 *
 * Fokus-Reihenfolge (§4.1): Titel → CTA → Einstellung → schließen → snooze.
 * Dismiss/Snooze stehen im DOM zuletzt (visuell oben rechts via CSS), damit der
 * CTA das erste interaktive Ziel ist.
 */
export function WohngeldHinweisCard({
  estimate,
  ort,
  onDismiss,
  onSnooze,
  onRevokeConsent,
}: WohngeldHinweisCardProps) {
  const t = useTranslations('wohngeldHinweis');
  const titleId = React.useId();

  const min = estimate.geschaetzt_min_eur;
  const max = estimate.geschaetzt_max_eur;
  const normen = estimate.rechtsgrundlage.join(' · ');

  return (
    <section aria-labelledby={titleId} className="wh-card">
      <div className="wh-head">
        <span className="icon-circle green wh-icon" aria-hidden="true">
          <Home />
        </span>
        <h2 id={titleId} className="wh-title">
          {t('title')}
        </h2>
      </div>

      <p className="wh-trigger">{t('trigger_label')}</p>

      <p className="wh-amount">
        <span className="wh-amount-num">{t('amount_range', { min, max })}</span>
        <span className="wh-amount-tag">{t('amount_schaetzung')}</span>
        <span className="sr-only">{t('amount_a11y', { min, max })}</span>
      </p>

      <p className="wh-nontakeup">{t('non_take_up')}</p>

      <div className="wh-daten">
        <p className="wh-daten-title">{t('datenblock_title')}</p>
        <ul className="wh-daten-list">
          <li>
            <CheckCircle2 className="wh-check" aria-hidden="true" />
            <span>{t('daten_haushalt', { n: estimate.haushaltsgroesse })}</span>
          </li>
          <li>
            <CheckCircle2 className="wh-check" aria-hidden="true" />
            <span>
              {t('daten_mietstufe', { stufe: ROMAN[estimate.mietstufe], ort })}
            </span>
          </li>
          <li>
            <CheckCircle2 className="wh-check" aria-hidden="true" />
            <span>{t('daten_wohnverhaeltnis')}</span>
          </li>
          <li className="wh-daten-ergaenzen">
            <Plus className="wh-plus" aria-hidden="true" />
            <span>{t('daten_ergaenzen')}</span>
          </li>
        </ul>
      </div>

      <Button
        className="wh-cta text-primary-foreground!"
        render={<Link href="/lebenslagen/wohngeld" />}
      >
        {t('cta_primary')}
        <ArrowRight aria-hidden="true" />
      </Button>

      <p className="wh-behoerde">{t('behoerde')}</p>

      <p className="wh-legal">{t('rechtsgrundlage', { normen })}</p>

      <p className="wh-consent">
        {t('consent_line')}{' '}
        <button type="button" className="wh-revoke" onClick={onRevokeConsent}>
          {t('consent_settings')}
        </button>
      </p>

      <p className="wh-zukunft">{t('zukunft_schaetzung')}</p>

      <div className="wh-controls">
        <button
          type="button"
          className="wh-ctrl"
          aria-label={t('dismiss')}
          title={t('dismiss')}
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </button>
        <button
          type="button"
          className="wh-ctrl"
          aria-label={t('snooze')}
          title={t('snooze')}
          onClick={onSnooze}
        >
          <Clock3 aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
