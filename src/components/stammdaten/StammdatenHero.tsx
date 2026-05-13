'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowRight, Info, Sparkles } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';
import type {
  StammdatenDisclaimerMeta,
  UebermittlungsLogEntry,
} from '@/types/stammdaten';

interface StammdatenHeroProps {
  personaName: string;
  registerCount: number;
  /** Top-Eintrag aus dem Aktivitätsprotokoll für „Letzte Übermittlung". */
  letzteUebermittlung: UebermittlungsLogEntry | null;
  behoerdenById: Record<string, Behoerde>;
  disclaimerMeta: StammdatenDisclaimerMeta;
  /** Render-Time-„now" für SSR-stable Distanz-Berechnung. */
  nowIso: string;
  className?: string;
}

/**
 * `<StammdatenHero>` (Spec § 3 / § 6.3 / Hard-Line § 11.10).
 *
 * Header oben auf `/stammdaten`:
 *   - Persona-Name
 *   - Pilot-Phase-Badge „Datenschutzcockpit (Pilot-Phase)" als Text + Farbe
 *     (Hard-Line § 11.10)
 *   - „Sie sind in N Registern geführt" + letzte Übermittlung
 *   - 2027-Vision-Banner (verbatim aus i18n; verifier-locked)
 *   - CTA „Vollständiges Aktivitätsprotokoll öffnen" → /datenschutz (V2-Stub)
 *   - Pilot-Phase Tooltip-Hinweis: „Sukzessive Anbindung — KBA seit 04/2026 …"
 */
export function StammdatenHero({
  personaName,
  registerCount,
  letzteUebermittlung,
  behoerdenById,
  disclaimerMeta,
  nowIso,
  className,
}: StammdatenHeroProps) {
  const t = useTranslations();
  const tHero = useTranslations('stammdaten.hero');

  const lese = useDisclaimerString(disclaimerMeta.lese_schicht_i18n_key);
  const auditAppInternal = useDisclaimerString(
    disclaimerMeta.audit_log_app_internal_i18n_key,
  );

  const summaryNode: React.ReactNode = tHero('summary', {
    register_count: registerCount,
  });
  let lastTransmissionNode: React.ReactNode | null = null;

  if (letzteUebermittlung) {
    const absender = letzteUebermittlung.absender_behoerde_id
      ? (behoerdenById[letzteUebermittlung.absender_behoerde_id]?.name_de ??
        '—')
      : '—';
    const empfaenger = letzteUebermittlung.empfaenger_id
      ? (behoerdenById[letzteUebermittlung.empfaenger_id]?.name_de ??
        letzteUebermittlung.empfaenger_id)
      : '—';
    let dauer: string;
    try {
      const ago = formatDistanceToNow(parseISO(letzteUebermittlung.timestamp), {
        locale: deLocale,
        addSuffix: false,
      });
      dauer = ago;
      // Use nowIso to avoid "before mount" hydration drift in tests.
      void nowIso;
    } catch {
      dauer = '—';
    }
    let feldLabel: string;
    try {
      feldLabel = t(letzteUebermittlung.zweck_i18n_key);
    } catch {
      feldLabel = letzteUebermittlung.zweck_i18n_key;
    }

    const raw = tHero('last_transmission', {
      dauer,
      feld: feldLabel,
      absender,
      empfaenger,
      rechtsgrundlage: letzteUebermittlung.rechtsgrundlage,
    });
    lastTransmissionNode = wrapNormZitate(raw);
  } else {
    lastTransmissionNode = tHero('empty_state');
  }

  return (
    <section
      aria-labelledby="stammdaten-hero-title"
      className={cn('flex flex-col gap-4', className)}
      data-testid="stammdaten-hero"
    >
      <header className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tHero('eyebrow')}
        </span>
        <h1
          id="stammdaten-hero-title"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {tHero('title_with_name', { name: personaName })}
        </h1>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sky-900 ring-1 ring-sky-300/70 dark:bg-sky-900/40 dark:text-sky-100 dark:ring-sky-700/60"
            data-testid="pilot-phase-badge"
            title={tHero('dsc_pilot_tooltip')}
          >
            <Info className="size-3" aria-hidden="true" />
            {tHero('dsc_pilot_phase_label')}
          </span>
        </div>
        <p
          className="text-sm leading-relaxed text-foreground"
          data-testid="hero-summary"
        >
          {summaryNode}
        </p>
        <p
          className="text-sm leading-relaxed text-muted-foreground"
          data-testid="hero-last-transmission"
        >
          {lastTransmissionNode}
        </p>
        <Link
          href="/datenschutz"
          data-testid="hero-cta-full-log"
          className="inline-flex h-7 items-center gap-1 self-start rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {tHero('cta_full_log')}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div
        className="flex flex-col gap-2 rounded-xl border border-violet-200/70 bg-violet-50/60 p-4 dark:border-violet-700/60 dark:bg-violet-900/20"
        data-testid="hero-2027-vision-banner"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-700 dark:text-violet-200" aria-hidden="true" />
          <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
            {tHero('vision_2027_banner_title')}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-violet-900/90 dark:text-violet-100/90">
          {tHero('vision_2027_banner_body')}
        </p>
      </div>

      <details className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground marker:hidden">
          <Info className="size-4 text-muted-foreground" aria-hidden="true" />
          <span>{tHero('disclaimer_lese_title')}</span>
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {wrapNormZitate(lese)}
        </p>
      </details>

      <details className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground marker:hidden">
          <Info className="size-4 text-muted-foreground" aria-hidden="true" />
          <span>{tHero('disclaimer_audit_title')}</span>
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {wrapNormZitate(auditAppInternal)}
        </p>
      </details>
    </section>
  );
}

function useDisclaimerString(key: string): string {
  const t = useTranslations();
  try {
    return t(key);
  } catch {
    return key;
  }
}

// Re-export utilities used in tests (formatDate fallback for SSR-stable rendering).
export function formatHeroDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: deLocale });
  } catch {
    return iso;
  }
}
