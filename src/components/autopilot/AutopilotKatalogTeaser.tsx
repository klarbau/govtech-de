'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Baby, ChevronRight, Euro, Flower2, Home } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { AutopilotKatalogEntry, Behoerde } from '@/types';

// Inline-Glyph je Lebenslage (klein, ohne Container — §A3): der Icon-Kreis war
// der „Icon-Tile über der Überschrift"-Marker. Neutrale Grün-Akzentfarbe für alle.
const ICON_BY_ID: Record<AutopilotKatalogEntry['id'], React.ReactNode> = {
  umzug: <Home aria-hidden="true" />,
  kindergeburt: <Baby aria-hidden="true" />,
  steuererklaerung: <Euro aria-hidden="true" />,
  trauerfall: <Flower2 aria-hidden="true" />,
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

      <ul className="border-t border-border">
        {entries.map((entry) => {
          const isLive = entry.status === 'live';
          const href = isLive ? '/vorgaenge/umzug/start' : '/vorgaenge';
          const title = safe(t, `${entry.id}.titel`);
          // Single beteiligte Stelle → ihr Kurzname (erstes Wort, z. B.
          // „Finanzamt"); sonst der konservative „ca. N Behörden"-Zähler.
          const singleName = behoerdenNames[entry.behoerden_preview[0] ?? ''];
          const behoerdenMetric =
            entry.behoerden_count === 1 && singleName
              ? singleName.split(' ')[0]
              : t('behoerden_count', { count: entry.behoerden_count });
          return (
            <li key={entry.id} className="border-b border-border">
              <Link
                href={href}
                className="group relative flex items-start gap-3 rounded-md py-4 pl-1 pr-8 no-underline transition-colors hover:bg-surface-muted/50"
              >
                <span
                  className="mt-0.5 shrink-0 text-primary [&>svg]:size-[18px]"
                  aria-hidden="true"
                >
                  {ICON_BY_ID[entry.id]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-text-primary">{title}</span>
                    {!isLive ? (
                      <span className="badge outline">{t('vorschau_badge')}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-snug text-text-secondary">
                    {safe(t, `${entry.id}.beschreibung`)}
                  </p>
                  <p className="mt-1.5 text-xs tabular-nums text-text-muted">
                    {behoerdenMetric} · {t('zeit_gespart', { min: entry.geschaetzte_zeitersparnis_min })}
                  </p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="absolute right-1 top-4 size-4 text-text-muted transition-transform motion-reduce:transition-none group-hover:translate-x-1"
                />
              </Link>
            </li>
          );
        })}
      </ul>
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
