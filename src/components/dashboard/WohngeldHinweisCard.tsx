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

type T = ReturnType<typeof useTranslations>;

interface WohngeldHinweisCardProps {
  estimate: WohngeldAnspruchEstimate;
  /** Registrierte Gemeinde (aus `persona.adresse.ort`) für die Mietstufen-Zeile. */
  ort: string;
  onDismiss: () => void;
  onSnooze: () => void;
  onRevokeConsent: () => void;
}

/**
 * `<WohngeldHinweisCard>` — proaktiver Wohngeld-Hinweis. Branche auf
 * `estimate.variant`:
 *  - `'entdeckung'` (Default, unverändert, Spec `proaktiver-wohngeld-anspruch.md`
 *    §4.1): „Möglicher Anspruch erkannt" + [MOCK]-Euro-Schätzung, CTA in den
 *    Pull-only-Flow `/lebenslagen/wohngeld`.
 *  - `'risiko'` (Spec `wohngeld-kuerzung-risiko.md`): Hinweis auf die **geplante
 *    Wohngeld-Novelle** (Referentenentwurf, noch nicht in Kraft). Konditional,
 *    quellen-zitiert, [ZUKUNFT 2027]/[MOCK]. KEIN Euro-Wert, kein Verdikt; Bestands-
 *    schutz + Weiterbewilligungs-Rahmung. Gleicher CTA-Pull-Flow.
 *
 * DETECT + NUDGE, kein Autopilot: der CTA navigiert nur, die Karte sendet nichts
 * an eine Behörde.
 *
 * Fokus-Reihenfolge (beide Varianten): Titel → CTA → Einstellung → schließen →
 * snooze. Dismiss/Snooze stehen im DOM zuletzt (visuell oben rechts via CSS),
 * damit der CTA das erste interaktive Ziel ist.
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
  const isRisiko = estimate.variant === 'risiko';

  return (
    <section
      aria-labelledby={titleId}
      className={isRisiko ? 'wh-card wh-card--risiko' : 'wh-card'}
    >
      {isRisiko ? (
        <RisikoVariant
          t={t}
          titleId={titleId}
          estimate={estimate}
          onRevokeConsent={onRevokeConsent}
        />
      ) : (
        <EntdeckungVariant
          t={t}
          titleId={titleId}
          estimate={estimate}
          ort={ort}
          onRevokeConsent={onRevokeConsent}
        />
      )}

      {/* Dismiss/Snooze — im DOM zuletzt (Fokus-Reihenfolge), visuell oben rechts.
          Für beide Varianten identisch (geteiltes Suppression-Gate). */}
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

/** Discovery-Variante — unveränderte Markup/Copy (Spec proaktiver-wohngeld §4.1). */
function EntdeckungVariant({
  t,
  titleId,
  estimate,
  ort,
  onRevokeConsent,
}: {
  t: T;
  titleId: string;
  estimate: WohngeldAnspruchEstimate;
  ort: string;
  onRevokeConsent: () => void;
}) {
  const min = estimate.geschaetzt_min_eur;
  const max = estimate.geschaetzt_max_eur;
  const normen = estimate.rechtsgrundlage.join(' · ');

  return (
    <>
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
    </>
  );
}

/**
 * Risiko-Variante — geplante Wohngeld-Novelle (Spec wohngeld-kuerzung-risiko.md
 * §4.2). KEIN Euro-Wert. Konditionale Sprache (Konjunktiv „könnten … verlieren"),
 * Bestandsschutz + Weiterbewilligungs-Rahmung, sichtbare Quellen-Zitierung,
 * [ZUKUNFT 2027]/[MOCK]. Keine Farb-only-Schwere: die Bedingtheit steht im Text
 * (Headline), das Amber-Icon ist nur Akzent.
 */
function RisikoVariant({
  t,
  titleId,
  estimate,
  onRevokeConsent,
}: {
  t: T;
  titleId: string;
  estimate: WohngeldAnspruchEstimate;
  onRevokeConsent: () => void;
}) {
  return (
    <>
      <div className="wh-head">
        <span className="icon-circle amber wh-icon" aria-hidden="true">
          <Home />
        </span>
        <h2 id={titleId} className="wh-title">
          {t('risiko.title')}
        </h2>
      </div>

      <p className="wh-trigger">
        {t('risiko.headline')}{' '}
        <span className="wh-entwurf-tag">
          {t('risiko.entwurf_tag')}
          <span className="sr-only"> — {t('risiko.entwurf_a11y')}</span>
        </span>
      </p>

      <ul className="wh-bestandsschutz">
        <li>
          <CheckCircle2 className="wh-check" aria-hidden="true" />
          <span>{t('risiko.bestandsschutz_1')}</span>
        </li>
        <li>
          <CheckCircle2 className="wh-check" aria-hidden="true" />
          <span>{t('risiko.bestandsschutz_2')}</span>
        </li>
      </ul>

      <p className="wh-nontakeup">{t('risiko.mechanik')}</p>

      <div className="wh-daten">
        <p className="wh-daten-title">{t('datenblock_title')}</p>
        <ul className="wh-daten-list">
          <li>
            <CheckCircle2 className="wh-check" aria-hidden="true" />
            <span>{t('risiko.daten_bezug')}</span>
          </li>
          <li>
            <CheckCircle2 className="wh-check" aria-hidden="true" />
            <span>{t('daten_haushalt', { n: estimate.haushaltsgroesse })}</span>
          </li>
          <li className="wh-daten-ergaenzen">
            <Plus className="wh-plus" aria-hidden="true" />
            <span>{t('risiko.daten_ergaenzen')}</span>
          </li>
        </ul>
      </div>

      <Button
        className="wh-cta text-primary-foreground!"
        render={<Link href="/lebenslagen/wohngeld" />}
      >
        {t('risiko.cta_primary')}
        <ArrowRight aria-hidden="true" />
      </Button>

      <p className="wh-quelle">{t('risiko.quelle')}</p>

      <p className="wh-legal">{t('risiko.rechtsgrundlage')}</p>

      <p className="wh-consent">
        {t('consent_line')}{' '}
        <button type="button" className="wh-revoke" onClick={onRevokeConsent}>
          {t('consent_settings')}
        </button>
      </p>

      <p className="wh-zukunft">{t('risiko.zukunft_schaetzung')}</p>
    </>
  );
}
