'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface EpaStatusFieldCardProps {
  eingerichtet: boolean;
  widerspruch_gesetzt: boolean;
  /** ISO YYYY-MM-DD; default 2025-01-15 (universeller ePA-Start). */
  eingerichtet_am?: string;
  /**
   * Optionaler Render-Hook: wird einmal pro Page-Load aufgerufen, wenn die
   * Card initial sichtbar wird (Idempotenz auf Component-Level — Spec § 6.2).
   * Caller kann hier z. B. Activity-Log-Event emittieren.
   */
  onBannerSeen?: () => void;
}

/**
 * `<EpaStatusFieldCard>` (Spec § 6.2, § 11.26 Hard-Line — Stammdaten V1.1).
 *
 * ePA-Existenz Status-Pill + ePA-Widerspruch Boolean-Pill +
 * obligatorisches Disclaimer-Banner mit Disclaimer-8 verbatim
 * (`§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V` — Hard-Line § 11.26 zwei-Norm-
 * Zitat). Frontend-coder darf die Norm NICHT auf `§ 343 SGB V` allein
 * verkürzen.
 *
 * Idempotenz: `onBannerSeen` wird höchstens 1× pro Mount aufgerufen — der
 * Caller (StammdatenView) ist verantwortlich, den Activity-Log-Event nur
 * 1× pro Page-Load zu emittieren.
 *
 * a11y:
 *   - Disclaimer-Banner als `<div role="region" aria-labelledby>` mit
 *     Visible-Title; KEIN `role="alert"` (informativ, nicht zeit-kritisch).
 *   - Status-Pills mit ausgeschriebenen `aria-label`s.
 */
export function EpaStatusFieldCard({
  eingerichtet,
  widerspruch_gesetzt,
  eingerichtet_am,
  onBannerSeen,
}: EpaStatusFieldCardProps) {
  const t = useTranslations();
  const tCard = useTranslations('stammdaten.kv_pflege.epa');

  // Idempotenz auf Component-Level: Hook ruft `onBannerSeen` einmal pro Mount.
  const seenRef = React.useRef(false);
  React.useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    onBannerSeen?.();
  }, [onBannerSeen]);

  let title: string;
  try {
    title = tCard('title');
  } catch {
    title = 'Elektronische Patientenakte (ePA)';
  }
  let pillEingerichtet: string;
  try {
    pillEingerichtet = tCard('status_pill_eingerichtet');
  } catch {
    pillEingerichtet = 'ePA eingerichtet (Standard seit 15.01.2025)';
  }
  let pillWidersprochenJa: string;
  try {
    pillWidersprochenJa = tCard('status_pill_widerspruch_ja');
  } catch {
    pillWidersprochenJa = 'Anlage widersprochen';
  }
  let pillWidersprochenNein: string;
  try {
    pillWidersprochenNein = tCard('status_pill_widerspruch_nein');
  } catch {
    pillWidersprochenNein = 'Anlage nicht widersprochen';
  }
  let externalCta: string;
  try {
    externalCta = tCard('cta_external');
  } catch {
    externalCta = 'ePA verwalten Sie über Ihre Kassen-App';
  }

  let disclaimerBody: string;
  try {
    disclaimerBody = t('stammdaten.disclaimer.epa_anlage_widerspruch');
  } catch {
    disclaimerBody =
      'Seit 15.01.2025 wird für alle gesetzlich Versicherten automatisch eine ePA angelegt, sofern Sie nicht widersprochen haben (§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V). Die App zeigt nur den Status — die Inhalte Ihrer ePA werden hier nicht verarbeitet.';
  }

  const titleId = 'epa-field-card-title';
  const bannerTitleId = 'epa-banner-title';

  return (
    <article
      aria-labelledby={titleId}
      data-testid="epa-status-field-card"
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            eingerichtet
              ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/70 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-700/60'
              : 'bg-muted text-muted-foreground',
          )}
          aria-label={pillEingerichtet}
          data-testid="epa-pill-eingerichtet"
        >
          {pillEingerichtet}
        </span>
        <span
          className={cn(
            'rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground',
          )}
          aria-label={
            widerspruch_gesetzt ? pillWidersprochenJa : pillWidersprochenNein
          }
          data-testid={
            widerspruch_gesetzt ? 'epa-pill-widersprochen-ja' : 'epa-pill-widersprochen-nein'
          }
        >
          {widerspruch_gesetzt ? pillWidersprochenJa : pillWidersprochenNein}
        </span>
      </div>

      <div
        role="region"
        aria-labelledby={bannerTitleId}
        className={cn(
          'mt-3 flex gap-2 rounded-lg border border-border bg-muted/30 p-3',
        )}
        data-testid="epa-disclaimer-banner"
      >
        <Info
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <h4
            id={bannerTitleId}
            className="text-xs font-semibold text-foreground"
          >
            {t('stammdaten.kv_pflege.epa.disclaimer_heading')}
          </h4>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {wrapNormZitate(disclaimerBody)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('stammdaten.kv_pflege.epa.rechtsgrundlage_label')}{' '}
            <NormZitatSpan text="§ 342 Abs. 1 S. 2 SGB V" /> i.V.m.{' '}
            <NormZitatSpan text="§ 343 SGB V" />
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {externalCta}
        {eingerichtet_am
          ? ` · ${t('stammdaten.kv_pflege.epa.eingerichtet_seit_template', { date: eingerichtet_am })}`
          : ''}
      </p>
    </article>
  );
}
