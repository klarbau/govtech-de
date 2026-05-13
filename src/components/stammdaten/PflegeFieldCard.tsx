'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { HeartHandshake } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PflegegradView {
  grad: 1 | 2 | 3 | 4 | 5;
  /** ISO YYYY-MM-DD. */
  bewilligt_am: string;
  begutachtung_stelle: 'md' | 'medicproof';
}

interface PflegeFieldCardProps {
  pflegekasseName: string;
  /**
   * Existenz-Marker (Art-9-Gating-Fix, REVISE-Wave 2026-05-10): `true`, wenn
   * die Persona einen Pflegegrad-Seed besitzt — UNABHÄNGIG vom Session-
   * Consent. Steuert, ob `<RevealConsentButton>` (Modal-Trigger) oder
   * `<EmptyPflegeCard>` rendert.
   */
  pflegegradExists: boolean;
  /**
   * Pflegegrad-Daten — undefined wenn `consentSession === false` (Hard-Line
   * § 11.22 Gating), auch wenn `pflegegradExists === true`. Wird nur in der
   * Revealed-Branch verwendet.
   */
  pflegegrad?: PflegegradView;
  /**
   * Hard-Line § 11.22 sessionStorage-Toggle. Wenn true → Pflegegrad-Sub-
   * Card ist enthüllt. Wenn false → Button „Pflegegrad anzeigen" rendert.
   */
  consentSession: boolean;
  /** Click-Handler für „Pflegegrad anzeigen" → öffnet `<PflegegradConsentModal>`. */
  onRequestConsent: () => void;
}

function formatIsoDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}

/**
 * `<PflegeFieldCard>` (Spec § 6.2, § 11.21 + § 11.22 — Stammdaten V1.1).
 *
 * Pflegekasse-Name (= GKV-Kasse oder PKV-Pflichtversicherer) sichtbar;
 * Pflegegrad-Sub-Card default-collapsed mit Button „Pflegegrad anzeigen";
 * Klick öffnet `<PflegegradConsentModal>`. Nach Consent rendert Grad +
 * Bewilligungsdatum + 25-AT-Frist-Info (`§ 18c SGB XI`) + Begutachtungs-
 * Stelle (MD vs MEDICPROOF) + Wegweiser Höher-stufungs-antrag.
 *
 * a11y:
 *   - Pflegegrad-Reveal-Button als `<button>` mit `aria-expanded` semantisch
 *     (auch wenn Modal nicht inline expanded — der Button beschreibt seine
 *     Aktion über `aria-haspopup="dialog"`)
 *   - Norm-Zitate via `<NormZitatSpan>`
 */
export function PflegeFieldCard({
  pflegekasseName,
  pflegegradExists,
  pflegegrad,
  consentSession,
  onRequestConsent,
}: PflegeFieldCardProps) {
  const t = useTranslations('stammdaten.kv_pflege.pflege');

  let title: string;
  try {
    title = t('title');
  } catch {
    title = 'Pflegeversicherung';
  }
  let kasseLabel: string;
  try {
    kasseLabel = t('kasse_label');
  } catch {
    kasseLabel = 'Pflegekasse';
  }
  let collapsedButton: string;
  try {
    collapsedButton = t('pflegegrad_collapsed_button');
  } catch {
    collapsedButton = 'Pflegegrad anzeigen';
  }
  let frist25at: string;
  try {
    frist25at = t('frist_25_at');
  } catch {
    frist25at =
      'Pflegekasse muss innerhalb von 25 Arbeitstagen entscheiden (§ 18c SGB XI)';
  }
  let ctaHoeherstufung: string;
  try {
    ctaHoeherstufung = t('cta_hoeherstufung');
  } catch {
    ctaHoeherstufung = 'Höherstufung beantragen → Online-Filiale Ihrer Pflegekasse';
  }
  let mdLabel: string;
  try {
    mdLabel = t('begutachtung_md_label');
  } catch {
    mdLabel = 'Begutachtet durch Medizinischen Dienst (GKV)';
  }
  let medicproofLabel: string;
  try {
    medicproofLabel = t('begutachtung_medicproof_label');
  } catch {
    medicproofLabel = 'Begutachtet durch MEDICPROOF (PKV)';
  }
  let gradLabel: string;
  try {
    gradLabel = t('pflegegrad_grad_label', {
      grad: pflegegrad?.grad.toString() ?? '?',
    });
  } catch {
    gradLabel = pflegegrad ? `Pflegegrad ${pflegegrad.grad}` : '';
  }
  let bewilligtAmLabel: string;
  try {
    bewilligtAmLabel = t('bewilligt_am_label', {
      datum: pflegegrad ? formatIsoDe(pflegegrad.bewilligt_am) : '',
    });
  } catch {
    bewilligtAmLabel = pflegegrad
      ? `Bewilligt am ${formatIsoDe(pflegegrad.bewilligt_am)}`
      : '';
  }

  const titleId = 'pflege-field-card-title';

  return (
    <article
      aria-labelledby={titleId}
      data-testid="pflege-field-card"
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <HeartHandshake
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
      </header>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="font-medium text-muted-foreground">{kasseLabel}</dt>
        <dd>
          <BehoerdenBadge name={pflegekasseName} kategorie="sozialversicherung" />
        </dd>
      </dl>

      {pflegegradExists ? (
        consentSession && pflegegrad ? (
          <div
            className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3"
            data-testid="pflegegrad-revealed"
          >
            <p className="text-sm font-semibold text-foreground">
              {gradLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {bewilligtAmLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {pflegegrad.begutachtung_stelle === 'md' ? mdLabel : medicproofLabel}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {frist25at}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <NormZitatSpan text="§ 14 SGB XI" /> · {ctaHoeherstufung}
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 self-start"
            onClick={onRequestConsent}
            aria-haspopup="dialog"
            data-testid="pflegegrad-reveal-button"
          >
            {collapsedButton}
          </Button>
        )
      ) : (
        <p
          className="mt-4 rounded-md bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground"
          role="status"
          data-testid="pflegegrad-empty"
        >
          Kein Pflegegrad in Ihren Stammdaten hinterlegt. Bei Änderungen wenden
          Sie sich an Ihre Pflegekasse (<NormZitatSpan text="§ 18c SGB XI" />,
          25 Arbeitstage Bearbeitungsfrist).
        </p>
      )}
    </article>
  );
}
