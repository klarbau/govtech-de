'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

import type { ErledigtFeedItem } from '@/types';

interface ErledigtFeedProps {
  items: ErledigtFeedItem[];
  /** behoerde_id → Anzeigename (für die Subline). */
  behoerdenNames: Record<string, string>;
  nowIso: string;
}

/**
 * `<ErledigtFeed>` (§B2) — „Automatisch erledigt für Sie". Semantische Liste;
 * jede Zeile = delegierte Agent-Stimme + Behörde + relative Zeit (`<time>`) +
 * Link zum Quell-Vorgang/Letter.
 */
export function ErledigtFeed({ items, behoerdenNames, nowIso }: ErledigtFeedProps) {
  const t = useTranslations('dashboard.erledigt_feed');

  if (items.length === 0) {
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
          <li key={item.id}>
            <Link href={href} className="erledigt-item">
              <span className="ei-icon" aria-hidden="true">
                <CheckCircle2 />
              </span>
              <div className="ei-body">
                <div className="ei-title">{item.agent_label}</div>
                <div className="ei-sub">
                  {behoerde}
                  {' · '}
                  <time
                    dateTime={item.erledigt_at}
                    title={absoluteDe(item.erledigt_at)}
                  >
                    {relativeDe(item.erledigt_at, nowIso)}
                  </time>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
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

function relativeDe(iso: string, nowIso: string): string {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return '';
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 2) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  const diffD = Math.round(diffH / 24);
  return `vor ${diffD} Tag${diffD === 1 ? '' : 'en'}`;
}
