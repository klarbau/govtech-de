'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Baby,
  Building2,
  ChevronRight,
  Clock,
  Euro,
  Home,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { AutopilotKatalogEntry, Behoerde } from '@/types';

const ICON_BY_ID: Record<
  AutopilotKatalogEntry['id'],
  { icon: React.ReactNode; tone: string }
> = {
  umzug: { icon: <Home aria-hidden="true" />, tone: '' },
  kindergeburt: { icon: <Baby aria-hidden="true" />, tone: 'green' },
  steuererklaerung: { icon: <Euro aria-hidden="true" />, tone: 'violet' },
};

/**
 * `<AutopilotKatalogTeaser>` (§A-katalog) — rendert die vollständige
 * „Lebenslagen / Autopilot-Katalog"-Karte aus `getAutopilotKatalog()`. Umzug ist
 * `live` (Karte verlinkt auf den Start); Kindergeburt/Steuererklärung sind
 * `demnächst`-Vorschau (Karte verlinkt auf /vorgaenge, dezenter „demnächst"-Chip).
 */
export function AutopilotKatalogTeaser() {
  const t = useTranslations('katalog');
  const [entries, setEntries] = React.useState<AutopilotKatalogEntry[]>([]);
  const [behoerdenNames, setBehoerdenNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [katalog, behoerden] = await Promise.all([
          api.getAutopilotKatalog(),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        const names: Record<string, string> = {};
        for (const b of behoerden as Behoerde[]) names[b.id] = b.name_de;
        setEntries(katalog);
        setBehoerdenNames(names);
      } catch {
        if (!cancelled) setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="katalog-title" className="heute-card">
      <div className="heute-head">
        <h2 id="katalog-title">{t('lebenslagen_titel')}</h2>
        <Link href="/vorgaenge" className="card-head-link">
          {t('alle_lebenslagen')}
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>

      <div className="katalog-grid">
        {entries.map((entry) => {
          const isLive = entry.status === 'live';
          const href = isLive ? '/vorgaenge/umzug/start' : '/vorgaenge';
          const title = safe(t, `${entry.id}.titel`);
          const meta = ICON_BY_ID[entry.id];
          const behoerdenMetric =
            entry.behoerden_count > 1
              ? t('behoerden_count', { count: entry.behoerden_count })
              : behoerdenNames[entry.behoerden_preview[0] ?? ''] ??
                entry.behoerden_preview[0] ??
                t('behoerden_count', { count: entry.behoerden_count });
          return (
            <Link
              key={entry.id}
              href={href}
              className="katalog-card"
              aria-label={isLive ? undefined : `${title} – ${t('status.demnaechst')}`}
            >
              {!isLive ? (
                <span className="badge outline kc-soon">{t('status.demnaechst')}</span>
              ) : null}
              <span className={`icon-circle lg ${meta.tone}`}>{meta.icon}</span>
              <div className="kc-title">{title}</div>
              <p className="kc-desc">{safe(t, `${entry.id}.beschreibung`)}</p>
              <div className="kc-meta">
                <Building2 aria-hidden="true" />
                <span>{behoerdenMetric}</span>
                <span className="kc-dot" aria-hidden="true">·</span>
                <Clock aria-hidden="true" />
                <span>{t('zeit_gespart', { min: entry.geschaetzte_zeitersparnis_min })}</span>
                <ChevronRight className="kc-chev" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function safe(t: (k: string) => string, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
