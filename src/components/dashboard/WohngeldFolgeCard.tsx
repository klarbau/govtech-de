'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { ZukunftChip } from '@/components/shared/ZukunftChip';
import { api } from '@/lib/mock-backend';
import type { PersonaId, WohngeldAnspruchEstimate } from '@/types';

interface WohngeldFolgeCardProps {
  personaId: PersonaId;
  className?: string;
}

/**
 * `<WohngeldFolgeCard>` (Spec `anspruch-arc.md` § 4.1/§ 4.4, Beat a) — der ruhige
 * Wohngeld-Folge-Beat, der DIREKT nach der `<ValueReceiptCard>` erscheint (inline
 * im Assistenten-Thread + auf der Run-Page), gegatet auf Umzug + qualifizierte
 * Persona. Self-fetching: teilt NUR den Estimate-Datenpfad mit der Dashboard-
 * `WohngeldHinweisCard` (`api.getWohngeldHinweis` — derselbe Consent-/Dismiss-/
 * Snooze-Gate), NICHT deren Markup. Rendert `null`, bis der Estimate da ist bzw.
 * wenn er `null` ist (nicht qualifiziert / dismissed / consent widerrufen) —
 * kein Layout-Shift, kein „kein Anspruch"-Text.
 *
 * Honesty (§ 11): Wohngeld ist antragsgebunden → „Anspruch prüfen & Antrag
 * vorbereiten", nie „läuft schon"; die Höhe ist „geschätzt ca." (kein Register-
 * Claim); Zuständigkeit kommunal (Wohngeldstelle); [ZUKUNFT 2027].
 */
export function WohngeldFolgeCard({ personaId, className }: WohngeldFolgeCardProps) {
  const t = useTranslations('wohngeldFolge');
  const titleId = React.useId();
  const [estimate, setEstimate] = React.useState<WohngeldAnspruchEstimate | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.getWohngeldHinweis(personaId);
        if (!cancelled) setEstimate(result);
      } catch {
        // Folge-Card ist nice-to-have — bei Fetch-Fehler rendert sie nicht.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  if (!estimate) return null;

  const min = estimate.geschaetzt_min_eur;
  const max = estimate.geschaetzt_max_eur;

  return (
    <section
      aria-labelledby={titleId}
      className={[
        'flex flex-col gap-3 rounded-xl border border-primary/30 bg-accent-soft/40 p-4',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <div className="flex items-start gap-3">
        <IconCircle icon={<Home />} tone="primary" size="md" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-primary">{t('eyebrow')}</span>
          <h3 id={titleId} className="text-sm font-semibold text-text-primary">
            {t('title')}
          </h3>
        </div>
      </div>

      <p className="text-lg font-semibold text-text-primary tabular-nums">
        {t('betrag_range', { min, max })}
      </p>

      <p className="text-sm text-text-secondary">{t('plus_context')}</p>

      <Button className="self-start" render={<Link href="/lebenslagen/wohngeld" />}>
        {t('cta')}
      </Button>

      <p className="text-xs text-text-muted">{t('zustaendig')}</p>

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        <ZukunftChip label={t('zukunft_chip')} />
        {t('disclaimer')}
      </p>
    </section>
  );
}
