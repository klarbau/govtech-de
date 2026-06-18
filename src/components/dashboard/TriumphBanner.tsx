'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Building2, Clock } from 'lucide-react';

import type { DashboardSnapshot } from '@/types';

type AutopilotHighlight = NonNullable<DashboardSnapshot['autopilot_highlight']>;

interface TriumphBannerProps {
  highlight: AutopilotHighlight;
  /**
   * `live` → arrived as the result of an in-session run → `aria-live` announce.
   * `static` (default, cold-open seed) → no live-region announce (avoid SR spam
   * on load, §14/§B2).
   */
  variant?: 'live' | 'static';
  /**
   * Optionales Frist-Datum (vorformatiert, z. B. „24.06.2025") für die
   * „Nächster Schritt … Fällig bis"-Zeile. Fehlt es, entfällt die Frist-Zeile.
   */
  fristDatum?: string;
}

/**
 * `<TriumphBanner>` (§B2 / Mockup #4 „Ihr Umzug im Überblick") — weiße Karte über
 * dem Umzug-Rail, nur gerendert, wenn `autopilot_highlight` vorhanden ist. Zeigt
 * einen **Fortschritts-Ring** (Anteil informierter Stellen), die §B1-Receipt-Zahlen
 * (alle „ca.") und den nächsten Schritt mit Frist + primärem CTA zum Umzug.
 */
export function TriumphBanner({ highlight, variant = 'static', fristDatum }: TriumphBannerProps) {
  const t = useTranslations('dashboard.triumph');
  const receipt = highlight.value_receipt;
  const min = receipt.geschaetzte_zeitersparnis_min;
  const zeitWert =
    min >= 120
      ? t('std_value', { hours: Math.round(min / 60) })
      : t('min_value', { min });

  const done = receipt.behoerden_count;
  const total = Math.max(done, receipt.klassische_schritte);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section
      className="umz-hero"
      aria-labelledby="umz-overview-title"
      {...(variant === 'live' ? { 'aria-live': 'polite' as const } : {})}
    >
      <div className="umz-hero-top">
        <h3 id="umz-overview-title" className="umz-hero-title">{t('overview_title')}</h3>
        <span className="badge green">{t('badge_abgeschlossen')}</span>
      </div>

      <div className="umz-overview">
        <ProgressRing percent={percent} ariaLabel={t('ring_aria', { percent })} />
        <div className="umz-overview-facts">
          <div className="umz-fact">
            <Building2 className="umz-fact-icon" aria-hidden="true" />
            <span className="umz-fact-num">{t('stellen_informiert', { done, total })}</span>
          </div>
          <div className="umz-fact">
            <Clock className="umz-fact-icon" aria-hidden="true" />
            <span>
              <span className="umz-fact-label">{t('zeit_label')}</span>
              <span className="umz-fact-num">{zeitWert}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="umz-hero-divider" />

      <div className="umz-next">
        <div className="umz-next-label">{t('naechster_schritt_label')}</div>
        <div className="umz-next-wert">{t('naechster_schritt_wert')}</div>
        {fristDatum ? (
          <div className="umz-next-frist">{t('naechster_schritt_frist', { datum: fristDatum })}</div>
        ) : null}
      </div>

      <Link
        href={`/vorgaenge/umzug/${highlight.vorgang_id}`}
        className="btn btn-primary umz-hero-cta"
      >
        {t('zum_umzug')}
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

interface ProgressRingProps {
  percent: number;
  /** Volltext-Beschreibung für Assistive-Technik (z. B. „Umzug zu 78 Prozent abgeschlossen"). */
  ariaLabel: string;
}

/**
 * Kreis-Fortschrittsanzeige in Waldgrün (Brandbook §03). SVG-`stroke-dasharray`
 * statt `conic-gradient`, damit der Rundungs-Cap sauber ist und der Wert per
 * `role="img"` + `aria-label` zugänglich bleibt (die große Prozent-Zahl in der
 * Mitte trägt die Bedeutung zusätzlich als Text — nicht farb-allein).
 */
function ProgressRing({ percent, ariaLabel }: ProgressRingProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="umz-ring" role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="umz-ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="umz-ring-fill"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="umz-ring-pct" aria-hidden="true">
        {clamped}%
      </span>
    </div>
  );
}
