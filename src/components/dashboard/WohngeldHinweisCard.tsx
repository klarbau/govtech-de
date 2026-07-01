'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Home,
  Info,
  Plus,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';

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
      className={isRisiko ? 'wh-card wh-card--risiko' : 'wha-card'}
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
      <div className="wha-head">
        <span className="wha-badge">
          <CheckCircle2 className="wha-badge-icon" aria-hidden="true" />
          <span>{t('title')}</span>
        </span>
      </div>

      <div className="wha-body">
        {/* LEFT — Headline, Schätzung, Begründung, CTA */}
        <div className="wha-main">
          <h2 id={titleId} className="wha-headline">
            {t('headline')}
          </h2>
          <div className="wha-rule" aria-hidden="true" />

          <div className="wha-estimate">
            <span className="wha-estimate-label">
              {t('betrag_label')}
              <Info className="wha-info" aria-hidden="true" />
            </span>
            <p className="wha-amount">
              <span className="wha-amount-num">
                {t('amount_value', { min, max })}
              </span>
              <span className="wha-amount-per">{t('amount_per')}</span>
              <span className="sr-only">{t('amount_a11y', { min, max })}</span>
            </p>
            <p className="wha-subline">{t('subline')}</p>
          </div>

          {/* Begründung — Datenminimierung sichtbar (warum + was fehlt) */}
          <div className="wha-reasons">
            <div className="wha-reasons-col">
              <div className="wha-reasons-head">
                <CheckCircle2 className="wha-rh-icon green" aria-hidden="true" />
                <span>{t('reasons_title')}</span>
              </div>
              <ul className="wha-list">
                <li>
                  <CheckCircle2 className="wha-li-check" aria-hidden="true" />
                  <span>
                    {t('daten_haushalt', { n: estimate.haushaltsgroesse })}
                  </span>
                </li>
                <li>
                  <CheckCircle2 className="wha-li-check" aria-hidden="true" />
                  <span>
                    {t('daten_mietstufe', {
                      stufe: ROMAN[estimate.mietstufe],
                      ort,
                    })}
                  </span>
                </li>
                <li>
                  <CheckCircle2 className="wha-li-check" aria-hidden="true" />
                  <span>{t('daten_wohnverhaeltnis')}</span>
                </li>
                <li>
                  <CheckCircle2 className="wha-li-check" aria-hidden="true" />
                  <span>{t('reason_datenabgleich')}</span>
                </li>
              </ul>
            </div>
            <div className="wha-reasons-col wha-reasons-col--needed">
              <div className="wha-reasons-head">
                <CircleDashed className="wha-rh-icon muted" aria-hidden="true" />
                <span>{t('needed_title')}</span>
              </div>
              <ul className="wha-list wha-list--dots">
                <li>
                  <span className="wha-dot" aria-hidden="true" />
                  <span>{t('needed_einkommen')}</span>
                </li>
                <li>
                  <span className="wha-dot" aria-hidden="true" />
                  <span>{t('needed_mietvertrag')}</span>
                </li>
              </ul>
            </div>
          </div>

          <Button
            className="wha-cta text-primary-foreground!"
            render={<Link href="/lebenslagen/wohngeld" />}
          >
            {t('cta_primary')}
            <ArrowRight aria-hidden="true" />
          </Button>

          <Link href="/lebenslagen/wohngeld" className="wha-calc-link">
            {t('how_calculated')}
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>

        {/* RIGHT — Kennzahl-Schiene */}
        <aside className="wha-rail" aria-label={t('rail_aria')}>
          <div className="wha-rail-item">
            <span className="wha-rail-icon" aria-hidden="true">
              <BarChart3 />
            </span>
            <div className="min-w-0">
              <div className="wha-rail-label">{t('rail_betrag_label')}</div>
              <div className="wha-rail-value">
                {t('rail_betrag_value', { min, max })}
              </div>
            </div>
          </div>
          <div className="wha-rail-item">
            <span className="wha-rail-icon" aria-hidden="true">
              <Clock3 />
            </span>
            <div className="min-w-0">
              <div className="wha-rail-label">{t('rail_zeit_label')}</div>
              <div className="wha-rail-value with-info">
                {t('rail_zeit_value')}
                <Info className="wha-info" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="wha-rail-item">
            <span className="wha-rail-icon" aria-hidden="true">
              <Building2 />
            </span>
            <div className="min-w-0">
              <div className="wha-rail-label">{t('rail_behoerde_label')}</div>
              <div className="wha-rail-value">{t('rail_behoerde_value')}</div>
            </div>
          </div>
          <div className="wha-rail-item">
            <span className="wha-rail-icon" aria-hidden="true">
              <ShieldCheck />
            </span>
            <div className="min-w-0">
              <div className="wha-rail-value sm-title">
                {t('rail_sicher_title')}
              </div>
              <div className="wha-rail-label">{t('rail_sicher_body')}</div>
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER — verpflichtende Compliance-Zeile: Disclaimer, [ZUKUNFT 2027],
          Rechtsgrundlage, Einwilligung (widerrufbar) */}
      <div className="wha-footer">
        <Shield className="wha-footer-shield" aria-hidden="true" />
        <div className="wha-footer-text">
          <p className="wha-disclaimer">{t('disclaimer')}</p>
          <p className="wha-fineprint">
            {t('zukunft_schaetzung')} · {t('rechtsgrundlage', { normen })} ·{' '}
            {t('consent_line')}{' '}
            <button
              type="button"
              className="wh-revoke"
              onClick={onRevokeConsent}
            >
              {t('consent_settings')}
            </button>
          </p>
        </div>
        <Link href="/datenschutz" className="wha-learn">
          {t('learn_more')}
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>
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
