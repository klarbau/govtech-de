'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatDateDe } from '@/lib/utils';

interface WalletZeileProps {
  count: number;
}

/**
 * „Nachweise & Wallet" (Spec § 4.4b; since `stammdaten-blatt-dense.md` § 3.2 it
 * closes the identity band instead of the rail). One editorial line instead of
 * the old check-mark panel: how many proofs, which trust service, when they are
 * re-checked. With an empty wallet the trust-service claim disappears too.
 */
const NAECHSTE_PRUEFUNG_MOCK_ISO = '2027-06-14';

export function WalletZeile({ count }: WalletZeileProps) {
  const t = useTranslations('stammdaten.datenblatt');

  return (
    <section aria-labelledby="sd-wallet-title" data-testid="sd-wallet-line">
      <h2 id="sd-wallet-title" className="text-sm font-semibold text-text-primary">
        {t('wallet.title')}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
        {count === 0
          ? t('wallet.empty')
          : t('wallet.line', {
              count,
              datum: formatDateDe(NAECHSTE_PRUEFUNG_MOCK_ISO),
            })}
      </p>
      <Link
        href="/dokumente"
        className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {t('wallet.link')}
      </Link>
    </section>
  );
}
