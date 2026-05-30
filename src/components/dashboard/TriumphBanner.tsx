'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, PartyPopper } from 'lucide-react';

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
 * `<TriumphBanner>` (§B2) — Triumph-Banner über „Heute zu tun", nur gerendert,
 * wenn `autopilot_highlight` vorhanden ist. Spiegelt die §B1-Receipt-Zahlen
 * (alle „ca.").
 */
export function TriumphBanner({ highlight, variant = 'static' }: TriumphBannerProps) {
  const t = useTranslations('dashboard.triumph');
  const receipt = highlight.value_receipt;

  return (
    <section
      className="triumph"
      aria-label={t('title')}
      {...(variant === 'live' ? { 'aria-live': 'polite' as const } : {})}
    >
      <span className="tr-icon" aria-hidden="true">
        <PartyPopper />
      </span>
      <div className="tr-body">
        <div className="tr-title">{t('title')}</div>
        <div className="tr-sub">
          {t('subtitle', { count: receipt.behoerden_count })}
        </div>
        <div className="tr-meta">
          <span>{t('zeitersparnis', { min: receipt.geschaetzte_zeitersparnis_min })}</span>
          <span>
            <time
              dateTime={highlight.abgeschlossen_at}
              title={absoluteDe(highlight.abgeschlossen_at)}
            >
              {t('gerade_eben')}
            </time>
          </span>
        </div>
        <Link href={`/vorgaenge/umzug/${highlight.vorgang_id}`} className="tr-link">
          {t('link')}
          <ChevronRight aria-hidden="true" style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    </section>
  );
}

function absoluteDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
