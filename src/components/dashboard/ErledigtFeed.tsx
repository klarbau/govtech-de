'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';

import type { ErledigtFeedItem } from '@/types';

interface ErledigtFeedPending {
  /** Anzeigename der Behörde, deren Termin noch zu bestätigen ist. */
  behoerdeName: string;
  /** Klick-Ziel für die Bestätigungs-Aktion (i. d. R. /termine). */
  href: string;
}

interface ErledigtFeedProps {
  items: ErledigtFeedItem[];
  /** behoerde_id → Anzeigename (für die Subline). */
  behoerdenNames: Record<string, string>;
  nowIso: string;
  /**
   * Optionale ausstehende Schluss-Zeile (Terminbestätigung). Wird als ein
   * zusätzlicher Eintrag mit Outline-Kreis (kein grüner Haken) gerendert; die
   * Bedeutung trägt Text + Aktion, nicht Farbe allein (§a11y).
   */
  pending?: ErledigtFeedPending;
}

/**
 * `<ErledigtFeed>` (§B2) — „Automatisch erledigt für Sie" als vertikale
 * Timeline. Jede abgeschlossene Zeile = Agent-Stimme + Behörde + relative Zeit
 * (`<time>`); aufeinanderfolgende Haken werden über einen Verbinder visuell
 * verkettet. Optional eine ausstehende Termin-Zeile am Ende.
 */
export function ErledigtFeed({ items, behoerdenNames, pending }: ErledigtFeedProps) {
  const t = useTranslations('dashboard.erledigt_feed');

  if (items.length === 0 && !pending) {
    return <p className="erledigt-empty">{t('empty')}</p>;
  }

  return (
    <ul className="erledigt-feed">
      {items.map((item) => {
        const href = item.letter_id
          ? `/posteingang/${item.letter_id}`
          : `/vorgaenge/umzug/${item.vorgang_id}`;
        const behoerde = behoerdenNames[item.behoerde_id] ?? item.behoerde_id;
        return (
          <li key={item.id} className="erledigt-row">
            <Link href={href} className="erledigt-item">
              <span className="ei-icon" aria-hidden="true">
                <CheckCircle2 />
              </span>
              <div className="ei-body">
                <div className="ei-title">{behoerde}</div>
                <div className="ei-sub">{item.agent_label}</div>
              </div>
              <span className="ei-meta">
                <time className="ei-time" dateTime={item.erledigt_at}>
                  {absoluteDe(item.erledigt_at)}
                </time>
                <span className="badge green ei-badge">{t('badge_erledigt')}</span>
              </span>
            </Link>
          </li>
        );
      })}
      {pending ? (
        <li className="erledigt-row">
          <Link href={pending.href} className="erledigt-item pending">
            <span className="ei-icon outline" aria-hidden="true">
              <Circle />
            </span>
            <div className="ei-body">
              <div className="ei-title">{pending.behoerdeName}</div>
              <div className="ei-sub">{t('termin_pending')}</div>
            </div>
            <span className="ei-action">
              {t('termin_bestaetigen')}
              <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        </li>
      ) : null}
    </ul>
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
