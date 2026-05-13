'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RentenBridgeCTAProps {
  /** Aktenzeichen des Yellow Letter (für ausgeschriebenes `aria-label`). */
  letterAktenzeichen: string;
  /**
   * Hard-Line § 11.25 Idempotenz-Indikator. Wenn ISO-Datum gesetzt → Bridge
   * wurde bereits angewendet; CTA rendert als Read-Only-Indikator
   * „bereits am DD.MM.YYYY abgelegt" mit Deeplink zu
   * `/stammdaten#altersvorsorge`.
   */
  appliedAt?: string | null;
  /**
   * Caller-supplied async handler. Frontend-coder ruft NICHT direkt das
   * Mock-Backend auf — der Parent (`<LetterReader>`) bindet
   * `api.applyYellowLetterBridge()` und triggert post-success Toast +
   * Navigation.
   */
  onApply: () => Promise<void> | void;
  /** Loading-State während des Awaits. */
  pending?: boolean;
}

function formatIsoDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}

/**
 * `<RentenBridgeCTA>` (Spec § 6.3, § 11.20, § 11.25 — Stammdaten V1.1).
 *
 * Atomare CTA-Komponente für den Yellow-Letter-Bridge-Pfad. SEPARATER
 * CTA-Pfad — NICHT Reply-Template, NICHT `was_kann_ich_tun`-Option, NICHT
 * Skelett-Template (Hard-Line § 11.20-Konsistenz mit Posteingang V1.5.1).
 *
 * Idempotenz-Behavior:
 *   - `appliedAt === null/undefined` → primary Button „Werte in meinen
 *     Stammdaten ablegen"
 *   - `appliedAt === ISO-Datum` → Read-Only-Indikator mit Deeplink zu
 *     `/stammdaten#altersvorsorge`
 *
 * a11y:
 *   - `aria-label` enthält Letter-Aktenzeichen (nicht nur „Werte ablegen")
 *   - Loading-State mit `aria-busy="true"` + visible Spinner
 *   - Erfolgs-Toast (vom Caller) mit `role="status"` + `aria-live="polite"`
 */
export function RentenBridgeCTA({
  letterAktenzeichen,
  appliedAt,
  onApply,
  pending,
}: RentenBridgeCTAProps) {
  const t = useTranslations('posteingang.bridge');

  let ctaLabel: string;
  try {
    ctaLabel = t('renten_cta_label');
  } catch {
    ctaLabel = 'Werte in meinen Stammdaten ablegen';
  }
  let alreadyAppliedLabel: string;
  try {
    alreadyAppliedLabel = t('renten_already_applied', {
      datum: appliedAt ? formatIsoDe(appliedAt) : '',
    });
  } catch {
    alreadyAppliedLabel = appliedAt
      ? `Bereits am ${formatIsoDe(appliedAt)} in Ihrer Sektion Altersvorsorge abgelegt`
      : '';
  }
  let navigateLabel: string;
  try {
    navigateLabel = t('renten_navigate_label');
  } catch {
    navigateLabel = 'Zur Sektion Altersvorsorge';
  }

  if (appliedAt) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900',
          'dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-100',
        )}
        data-testid="renten-bridge-applied-indicator"
      >
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        <span>{alreadyAppliedLabel}</span>
        <Link
          href="/stammdaten#altersvorsorge"
          className="ml-auto inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          aria-label={`${navigateLabel} (Az. ${letterAktenzeichen})`}
        >
          {navigateLabel}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={() => void onApply()}
      disabled={pending}
      aria-busy={pending ? 'true' : undefined}
      aria-label={`${ctaLabel} — Az. ${letterAktenzeichen}`}
      data-testid="renten-bridge-cta"
    >
      {pending && (
        <Loader2
          className="mr-1 size-4 animate-spin"
          aria-hidden="true"
        />
      )}
      {ctaLabel}
    </Button>
  );
}
