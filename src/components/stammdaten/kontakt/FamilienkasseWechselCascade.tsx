'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { Inbox, Mail } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface FamilienkasseWechselCascadeProps {
  /** Datum (ISO) des Vorher-Briefs (Familienkasse-Bewilligung); fallback heute. */
  vorherDatumIso?: string;
  /** Postfach-Followup-Letter (kommt vom Mock-Backend nach Save). */
  followup: {
    aktenzeichen: string;
    datumIso: string;
  } | null;
  /** Steuert, ob Animation läuft (true nach Save-Confirm). */
  active: boolean;
}

type CascadeFrame = 'idle' | 'vorher' | 'transitioning' | 'nachher';

/**
 * `<FamilienkasseWechselCascade>` — Spec § 6.10 + Hard-Line § 11.31, § 13.3.
 *
 * Hero-Wow-Component. Vorher-Frame (Brief, § 41 Abs. 2 VwVfG) → Cross-fade
 * → Nachher-Frame (Postfach, § 9 OZG). Bei `prefers-reduced-motion: reduce`
 * direkt in `nachher`-Frame ohne Animation; aria-live announce.
 *
 * Caller löst die Cascade via `active=true` aus, sobald
 * `simulateFamilienkasseFollowupLetter()` resolved hat.
 */
export function FamilienkasseWechselCascade({
  vorherDatumIso,
  followup,
  active,
}: FamilienkasseWechselCascadeProps) {
  const t = useTranslations('stammdaten.kontakt.cascade');
  const [frame, setFrame] = React.useState<CascadeFrame>('idle');
  const [reducedMotion, setReducedMotion] = React.useState(false);
  // P1 — re-announce reliability across NVDA/JAWS/VoiceOver bei Re-Trigger:
  // identical-text aria-live updates werden sonst u.U. nicht erneut gesprochen.
  // Inkrementiert pro Übergang nach `nachher` und erzwingt Remount via `key`.
  const [announceKey, setAnnounceKey] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  React.useEffect(() => {
    if (!active) {
      setFrame('idle');
      return;
    }
    if (reducedMotion) {
      setFrame('nachher');
      setAnnounceKey((k) => k + 1);
      return;
    }
    setFrame('vorher');
    const t1 = window.setTimeout(() => setFrame('transitioning'), 800);
    const t2 = window.setTimeout(() => {
      setFrame('nachher');
      setAnnounceKey((k) => k + 1);
    }, 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active, reducedMotion]);

  if (!active) return null;

  const vorherFormatted = formatDateOrFallback(vorherDatumIso);
  const nachherFormatted = followup
    ? formatDateOrFallback(followup.datumIso)
    : '';

  return (
    <section
      aria-label={t('section_aria_label')}
      data-testid="familienkasse-cascade"
      data-frame={frame}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
    >
      {/* Vorher (Brief) */}
      <article
        data-testid="cascade-vorher"
        aria-hidden={frame === 'nachher' ? 'true' : undefined}
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 transition-opacity duration-500',
          (frame === 'nachher' || (reducedMotion && frame !== 'idle')) &&
            'opacity-30',
          frame === 'transitioning' && !reducedMotion && 'opacity-60',
        )}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Mail aria-hidden="true" className="size-4" />
          {t('vorher_label')}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {wrapNormZitate(
            t('vorher_caption_template', { datum: vorherFormatted }),
          )}
        </p>
      </article>

      {/* Nachher (Postfach) */}
      <article
        data-testid="cascade-nachher"
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-3 transition-opacity duration-500 dark:border-emerald-800 dark:bg-emerald-900/20',
          frame !== 'nachher' && !reducedMotion && 'opacity-0',
          frame === 'transitioning' && !reducedMotion && 'opacity-60',
        )}
        aria-hidden={frame !== 'nachher' && !reducedMotion ? 'true' : undefined}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
          <Inbox aria-hidden="true" className="size-4" />
          {t('nachher_label')}
        </div>
        {followup && (
          <>
            <p className="text-xs leading-relaxed text-emerald-950 dark:text-emerald-100">
              {wrapNormZitate(
                t('nachher_caption_template', { datum: nachherFormatted }),
              )}
            </p>
            <p className="font-mono text-[11px] text-emerald-900 dark:text-emerald-200">
              {t('nachher_aktenzeichen_label')} {followup.aktenzeichen}
            </p>
          </>
        )}
      </article>

      {/* Reduced-motion announce — sichtbar nur für Screenreader.
          `key` erzwingt Remount pro Re-Trigger, damit NVDA/JAWS/VoiceOver
          identical-text Re-Announcements zuverlässig sprechen. */}
      <span key={announceKey} className="sr-only" aria-live="polite">
        {frame === 'nachher' ? t('reduced_motion_announce') : ''}
      </span>
    </section>
  );
}

function formatDateOrFallback(iso?: string): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
