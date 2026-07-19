'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Home,
  Plus,
  Shield,
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
  /**
   * Disclosure-Modus (Dashboard-„Heute"-Liste): ist dieser Callback gesetzt,
   * rendert die Karte ausschließlich ihren entfalteten Inhalt (kein eigener
   * Einklapp-Trigger) — die „Heute"-Zeile darüber steuert das Auf-/Zuklappen.
   * Der Einklapp-Knopf im Karten-Kopf ruft dann diesen Callback statt der
   * komponentenlokalen Kollaps-Logik.
   */
  onRequestCollapse?: () => void;
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
  onRequestCollapse,
}: WohngeldHinweisCardProps) {
  const t = useTranslations('wohngeldHinweis');
  const titleId = React.useId();
  const panelId = React.useId();
  const isRisiko = estimate.variant === 'risiko';

  // Entdeckung startet EINGEKLAPPT: ruhige Disclosure-Zeile statt Hero-Karte.
  // Klick auf den Kopf klappt die volle Karte an Ort und Stelle auf. Die Risiko-
  // Variante (eigene Compliance-Rahmung) bleibt unverändert immer entfaltet.
  // Im Disclosure-Modus (Dashboard-„Heute") ist die Karte immer entfaltet — die
  // Zeile darüber besitzt die Kollaps-Steuerung.
  const disclosureMode = onRequestCollapse !== undefined;
  const [collapsedInternal, setCollapsed] = React.useState(!isRisiko);
  const collapsed = disclosureMode ? false : collapsedInternal;
  const handleCollapse = onRequestCollapse ?? (() => setCollapsed(true));

  if (isRisiko) {
    return (
      <section aria-labelledby={titleId} className="wh-card wh-card--risiko">
        <RisikoVariant
          t={t}
          titleId={titleId}
          estimate={estimate}
          onRevokeConsent={onRevokeConsent}
        />
        <WohngeldControls t={t} onDismiss={onDismiss} onSnooze={onSnooze} />
      </section>
    );
  }

  const min = estimate.geschaetzt_min_eur;
  const max = estimate.geschaetzt_max_eur;

  return (
    <section
      aria-labelledby={titleId}
      className={collapsed ? 'whx is-collapsed' : 'whx'}
    >
      {collapsed ? (
        // Eingeklappt: eine ruhige, vollflächig klickbare Zeile — Icon, Titel,
        // €-Hook als Sub, Chevron. Keine große Farbfläche, kein Schatten.
        <button
          type="button"
          className="whx-collapsed"
          aria-expanded={false}
          onClick={() => setCollapsed(false)}
        >
          <span className="whx-ico" aria-hidden="true">
            <Home />
          </span>
          <span className="whx-collapsed-text">
            <span className="whx-collapsed-title" id={titleId}>
              {t('collapsed_title')}
            </span>
            <span className="whx-collapsed-sub">
              {t('amount_value', { min, max })} {t('amount_per')} ·{' '}
              {t('amount_schaetzung')}
            </span>
          </span>
          <ChevronDown className="whx-chev" aria-hidden="true" />
        </button>
      ) : (
        <div id={panelId} className="whx-panel">
          <EntdeckungVariant
            t={t}
            titleId={titleId}
            estimate={estimate}
            ort={ort}
            onCollapse={handleCollapse}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
            onRevokeConsent={onRevokeConsent}
          />
        </div>
      )}
    </section>
  );
}

/** Dismiss/Snooze — geteiltes Suppression-Gate, visuell oben rechts. Im DOM
    zuletzt, damit der Karteninhalt/CTA das erste interaktive Ziel bleibt. */
function WohngeldControls({
  t,
  onDismiss,
  onSnooze,
}: {
  t: T;
  onDismiss: () => void;
  onSnooze: () => void;
}) {
  return (
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
  );
}

/**
 * Discovery-Variante — ruhige, einspaltige Karte (Redesign): kein Serif-Hero,
 * keine Kennzahl-Schiene, kein 2-spaltiger Begründungs-Bock. Ein Icon-Kopf mit
 * Eyebrow + Titel + Steuertasten (einklappen/schließen/snooze), eine €-Zeile,
 * die Begründung als Chips (Datenminimierung sichtbar), CTA und ein
 * gedämpfter, aber sichtbarer Compliance-Fuß (Rechtsgrundlage, Einwilligung).
 */
function EntdeckungVariant({
  t,
  titleId,
  estimate,
  ort,
  onCollapse,
  onDismiss,
  onSnooze,
  onRevokeConsent,
}: {
  t: T;
  titleId: string;
  estimate: WohngeldAnspruchEstimate;
  ort: string;
  onCollapse: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
  onRevokeConsent: () => void;
}) {
  const min = estimate.geschaetzt_min_eur;
  const max = estimate.geschaetzt_max_eur;
  const normen = estimate.rechtsgrundlage.join(' · ');

  return (
    <>
      <header className="whx-head">
        <span className="whx-ico" aria-hidden="true">
          <Home />
        </span>
        <div className="whx-head-text">
          <span className="whx-eyebrow">{t('title')} · [MOCK]</span>
          <h2 id={titleId} className="whx-title">
            {t('headline')}
          </h2>
        </div>
        <div className="whx-head-ctrl">
          <button
            type="button"
            className="whx-icon-btn"
            aria-label={t('collapse')}
            title={t('collapse')}
            aria-expanded={true}
            onClick={onCollapse}
          >
            <ChevronUp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="whx-icon-btn"
            aria-label={t('snooze')}
            title={t('snooze')}
            onClick={onSnooze}
          >
            <Clock3 aria-hidden="true" />
          </button>
          <button
            type="button"
            className="whx-icon-btn"
            aria-label={t('dismiss')}
            title={t('dismiss')}
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <p className="whx-amount">
        <span className="whx-amount-num">{t('amount_value', { min, max })}</span>
        <span className="whx-amount-per">{t('amount_per')}</span>
        <span className="whx-amount-tag">{t('amount_schaetzung')}</span>
        <span className="sr-only">{t('amount_a11y', { min, max })}</span>
      </p>
      <p className="whx-sub">{t('subline')}</p>

      {/* Begründung — Datenminimierung sichtbar (was genutzt / was fehlt). */}
      <div className="whx-why">
        <span className="whx-why-label">{t('reasons_title')}</span>
        <ul className="whx-chips">
          <li>
            <CheckCircle2 aria-hidden="true" />
            {t('chip_haushalt', { n: estimate.haushaltsgroesse })}
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            {t('chip_mietstufe', { stufe: ROMAN[estimate.mietstufe], ort })}
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            {t('chip_miete')}
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            {t('chip_amtlich')}
          </li>
        </ul>
        <p className="whx-need">{t('need_inline')}</p>
      </div>

      <div className="whx-actions">
        <Button
          className="whx-cta text-primary-foreground!"
          render={<Link href="/lebenslagen/wohngeld" />}
        >
          {t('cta_primary')}
          <ArrowRight aria-hidden="true" />
        </Button>
        <Link href="/lebenslagen/wohngeld" className="whx-link">
          {t('how_calculated')}
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>

      {/* Compliance — gedämpft, aber sichtbar: [ZUKUNFT 2027], Rechtsgrundlage,
          Einwilligung (widerrufbar), zuständige Behörde. */}
      <footer className="whx-foot">
        <Shield className="whx-foot-ico" aria-hidden="true" />
        <p className="whx-fine">
          {t('zukunft_schaetzung')} · {t('rechtsgrundlage', { normen })} ·{' '}
          {t('consent_line')}{' '}
          <button type="button" className="whx-revoke" onClick={onRevokeConsent}>
            {t('consent_settings')}
          </button>
        </p>
        <Link href="/datenschutz" className="whx-link whx-foot-link">
          {t('learn_more')}
          <ChevronRight aria-hidden="true" />
        </Link>
      </footer>
      <p className="whx-meta">{t('behoerde')}</p>
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
