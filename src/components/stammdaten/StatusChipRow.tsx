'use client';

import { useTranslations } from 'next-intl';

import { StatusBadge } from '@/components/shared/StatusBadge';

interface StatusChipRowProps {
  /** Adresse stammt aus dem Melderegister → immer „bestätigt". */
  adresseBestaetigt: boolean;
  /** Wallet-/mDL-Attestation vorhanden. */
  walletVerbunden: boolean;
  /**
   * Aufenthaltstitel-Status. `undefined` = keine Persona-Aufenthaltstitel →
   * Chip wird weggelassen (kein „n/a"-Chip). `'gueltig'` / `'ablauf_bald'`
   * steuert die Variante.
   */
  aufenthalt?: 'gueltig' | 'ablauf_bald';
}

/**
 * Status-Chip-Zeile oben auf `/stammdaten` (Spec § 4.1 / § 4.5).
 *
 * Rein visuelle, nicht-interaktive Status-Pills mit Text-Label (HL-DS-3, nie
 * Farbe allein). Es werden nur die Chips gerendert, die für die geladene
 * Persona zutreffen.
 */
export function StatusChipRow({
  adresseBestaetigt,
  walletVerbunden,
  aufenthalt,
}: StatusChipRowProps) {
  const t = useTranslations('stammdaten.chip');

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="stammdaten-status-chips"
    >
      {adresseBestaetigt ? (
        <StatusBadge variant="verifiziert" size="md">
          {t('adresse_bestaetigt')}
        </StatusBadge>
      ) : null}
      {walletVerbunden ? (
        <StatusBadge variant="aktiv" size="md">
          {t('wallet_verbunden')}
        </StatusBadge>
      ) : null}
      {aufenthalt === 'gueltig' ? (
        <StatusBadge variant="verifiziert" size="md">
          {t('aufenthalt_gueltig')}
        </StatusBadge>
      ) : null}
      {aufenthalt === 'ablauf_bald' ? (
        <StatusBadge variant="ablauf_bald" size="md">
          {t('aufenthalt_ablauf_bald')}
        </StatusBadge>
      ) : null}
    </div>
  );
}
