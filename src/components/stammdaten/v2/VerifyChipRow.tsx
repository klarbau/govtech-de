'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VerifyChipRowProps {
  adresseBestaetigt: boolean;
  walletVerbunden: boolean;
  aufenthaltGueltig: boolean;
  /** Driven by `emailVerifiziert || mobilVerifiziert`. */
  kontaktVerifiziert?: boolean;
  /** When the persona is German and has no Aufenthaltstitel, swap the chip
   *  for a sensible alternative ("Personalausweis hinterlegt" or
   *  "Reisepass hinterlegt"). Caller decides the label. */
  fallbackChip?: string;
}

/**
 * Prototype-v2 — verify chip row under the page subtitle (Spec § Verify chips).
 *
 * Pill-shaped 1px-bordered chips with a green check-circle icon and a
 * monolingual label. Derived from the same data that drives the legacy
 * `<StatusChipRow>`, but rendered with the prototype's chip styling
 * (white surface + 1px border + green icon), not the StatusBadge soft-pill.
 */
export function VerifyChipRow({
  adresseBestaetigt,
  walletVerbunden,
  aufenthaltGueltig,
  kontaktVerifiziert,
  fallbackChip,
}: VerifyChipRowProps) {
  const t = useTranslations('stammdaten.chip');

  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      data-testid="v2-verify-chips"
    >
      {adresseBestaetigt ? <Chip label={t('adresse_bestaetigt')} /> : null}
      {walletVerbunden ? <Chip label={t('wallet_verbunden')} /> : null}
      {aufenthaltGueltig ? <Chip label={t('aufenthalt_gueltig')} /> : null}
      {!aufenthaltGueltig && fallbackChip ? <Chip label={fallbackChip} /> : null}
      {kontaktVerifiziert ? <Chip label={t('kontakt_verifiziert')} /> : null}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-secondary">
      <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" />
      {label}
    </span>
  );
}
