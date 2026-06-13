'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Building2, CheckCircle2, Clock } from 'lucide-react';

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
}

/**
 * `<TriumphBanner>` (§B2) — weiße Hero-Karte über dem Umzug-Lauf, nur gerendert,
 * wenn `autopilot_highlight` vorhanden ist. Spiegelt die §B1-Receipt-Zahlen
 * (alle „ca.").
 */
export function TriumphBanner({ highlight, variant = 'static' }: TriumphBannerProps) {
  const t = useTranslations('dashboard.triumph');
  const receipt = highlight.value_receipt;
  const min = receipt.geschaetzte_zeitersparnis_min;
  const zeitWert =
    min >= 120
      ? t('std_value', { hours: Math.round(min / 60) })
      : t('min_value', { min });

  return (
    <section
      className="umz-hero"
      aria-label={t('koordiniert')}
      {...(variant === 'live' ? { 'aria-live': 'polite' as const } : {})}
    >
      <div className="umz-hero-top">
        <span className="icon-circle green" aria-hidden="true">
          <CheckCircle2 />
        </span>
        <span className="badge green">{t('badge_abgeschlossen')}</span>
      </div>
      <h3 className="umz-hero-title">{t('koordiniert')}</h3>
      <p className="umz-hero-body">{t('body')}</p>
      <div className="umz-hero-divider" />
      <div className="umz-hero-stats">
        <div className="umz-stat">
          <div className="umz-stat-label">{t('zeit_label')}</div>
          <div className="umz-stat-value">
            <Clock aria-hidden="true" />
            {zeitWert}
          </div>
          <div className="umz-stat-caption">{t('zeit_caption')}</div>
        </div>
        <div className="umz-stat">
          <div className="umz-stat-label">{t('stellen_label')}</div>
          <div className="umz-stat-value">
            <Building2 aria-hidden="true" />
            {receipt.behoerden_count}
          </div>
          <div className="umz-stat-caption">{t('stellen_caption')}</div>
        </div>
      </div>
      <Link
        href={`/vorgaenge/umzug/${highlight.vorgang_id}`}
        className="btn btn-primary umz-hero-cta"
      >
        {t('link')}
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
