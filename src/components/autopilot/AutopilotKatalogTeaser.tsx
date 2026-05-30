'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { AutopilotKatalogEntry, Behoerde } from '@/types';

/**
 * `<AutopilotKatalogTeaser>` (§A-katalog) — surfaces `getAutopilotKatalog()`:
 * Umzug `live` (actionable), Kindergeburt/Steuererklärung `demnächst` (disabled),
 * jeweils mit echten Behörden-Namen aus `behoerden.json`. Preview-only — keine
 * Orchestrierung für die „demnächst"-Verticals (Pass-2).
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
    <section aria-labelledby="katalog-title" className="flex flex-col gap-3">
      <div>
        <h2 id="katalog-title" style={{ fontSize: 16, fontWeight: 650 }}>
          {t('titel')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
          {t('untertitel')}
        </p>
      </div>

      <div className="katalog-grid">
        {entries.map((entry) => {
          const isLive = entry.status === 'live';
          const behoerden = entry.behoerden_preview
            .map((id) => behoerdenNames[id] ?? id)
            .join(', ');
          const title = safe(t, `${entry.id}.titel`);
          return (
            <div
              key={entry.id}
              className={`katalog-card${isLive ? '' : ' demnaechst'}`}
              aria-label={isLive ? undefined : `${title} – ${t('status.demnaechst')}`}
            >
              <div className="kc-head">
                <span className="kc-title">{title}</span>
                <span className={`badge ${isLive ? 'green' : 'eagle'}`}>
                  {isLive ? (
                    <>
                      <Sparkles style={{ width: 12, height: 12 }} aria-hidden="true" />
                      {t('status.live')}
                    </>
                  ) : (
                    t('status.demnaechst')
                  )}
                </span>
              </div>
              <p className="kc-desc">{safe(t, `${entry.id}.beschreibung`)}</p>
              <div className="kc-behoerden">
                <span className="kc-bh-label">{t('behoerden_label')}: </span>
                {behoerden}
              </div>
              {isLive ? (
                <Link
                  href="/vorgaenge/umzug/start"
                  className="btn btn-primary btn-sm"
                  style={{ width: 'fit-content', marginTop: 4 }}
                >
                  {t('starten')}
                  <ArrowRight aria-hidden="true" />
                </Link>
              ) : null}
            </div>
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
