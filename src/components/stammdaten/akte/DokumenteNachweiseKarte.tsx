'use client';

import Link from 'next/link';
import { BookUser, IdCard, Wallet, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { istVorzeigbar } from '@/components/stammdaten/akte/DokumentePanel';
import { formatDateDe } from '@/lib/utils';
import type { Behoerde, Document } from '@/types';

/**
 * Wallet re-check date — the same constant the retired `WalletZeile` carried.
 * It is a mock horizon, not a derived value, and it lives with the one line
 * that states it.
 */
const NAECHSTE_PRUEFUNG_MOCK_ISO = '2027-06-14';

const KACHEL_ICON: Record<string, LucideIcon> = {
  aufenthaltstitel: IdCard,
  personalausweis: IdCard,
  reisepass: BookUser,
};

interface DokumenteNachweiseKarteProps {
  /** Already derived by the caller (max. 2, in priority order). */
  dokumente: Document[];
  behoerdenById: Record<string, Behoerde>;
  walletCount: number;
  onPresent: (doc: Document) => void;
}

/**
 * Card B of the register „Überblick" (Spec `stammdaten-akte-v2.md` § 4.6): the
 * two papers that actually prove something plus the wallet, as three bordered
 * tiles — the one nested frame level of this screen, and it ends here.
 *
 * The titles come from the documents themselves (`doc.titel`); nothing is
 * invented. Only the eAT can be presented (`istVorzeigbar`), everything else
 * links into the vault where downloading really happens — there is no upload
 * flow in this demo, so there is no „+"-tile either.
 */
export function DokumenteNachweiseKarte({
  dokumente,
  behoerdenById,
  walletCount,
  onPresent,
}: DokumenteNachweiseKarteProps) {
  const t = useTranslations('stammdaten.akte');
  const tD = useTranslations('stammdaten.datenblatt');
  const tPresent = useTranslations('dokumente.present');

  const gueltigBis = (doc: Document) =>
    doc.gueltig_bis
      ? tD('value.gueltig_bis', { datum: formatDateDe(doc.gueltig_bis) })
      : t('dokumente.ohne_ablauf');

  return (
    <section
      aria-labelledby="sd-doks-title"
      data-testid="sd-doks"
      className="sd-flaeche min-w-0 px-5 pb-5 pt-[18px] md:px-6 md:pb-[22px] md:pt-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="sd-doks-title"
          className="text-[15px] font-semibold text-text-primary"
        >
          {t('dokumente.title')}
        </h2>
        <Link
          href="/dokumente"
          className="inline-flex min-h-11 items-center text-[13px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t('dokumente.alle')}
        </Link>
      </div>

      {/* ≤767 the tiles become a card carousel (`.m-shelf`) — a shelf carries
          cards, and these are cards. From 768 up they are an auto-fit grid, so
          two tiles fill the row instead of leaving a third of it empty. */}
      <div className="sd-dok-tiles m-shelf m-shelf-top mt-3">
        {dokumente.map((doc) => {
          const Icon = KACHEL_ICON[doc.typ] ?? IdCard;
          return (
            <div
              key={doc.id}
              data-testid="sd-dok-kachel"
              className="rounded-lg border border-border px-3.5 py-3"
            >
              <p className="flex items-start gap-2 text-[13px] font-semibold text-text-primary">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-[15px] shrink-0 text-text-secondary"
                />
                <span className="min-w-0 break-words">{doc.titel}</span>
              </p>
              <p className="mt-1 min-w-0 break-words text-[12px] leading-snug text-text-secondary md:text-[11.5px]">
                {behoerdenById[doc.ausstellende_behoerde_id]?.name_de ??
                  doc.ausstellende_behoerde_id}
                {' · '}
                {gueltigBis(doc)}
              </p>
              {istVorzeigbar(doc) ? (
                <button
                  type="button"
                  onClick={() => onPresent(doc)}
                  aria-label={tPresent('button_aria', { name: doc.titel })}
                  className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {t('dokumente.kachel_vorzeigen')}
                </button>
              ) : (
                <Link
                  href="/dokumente"
                  className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {t('dokumente.kachel_details')}
                </Link>
              )}
            </div>
          );
        })}

        <div
          data-testid="sd-dok-kachel"
          className="rounded-lg border border-border px-3.5 py-3"
        >
          <p className="flex items-start gap-2 text-[13px] font-semibold text-text-primary">
            <Wallet
              aria-hidden="true"
              className="mt-0.5 size-[15px] shrink-0 text-text-secondary"
            />
            <span className="min-w-0 break-words">
              {t('dokumente.wallet_titel')}
            </span>
          </p>
          <p className="mt-1 min-w-0 break-words text-[12px] leading-snug text-text-secondary md:text-[11.5px]">
            {walletCount === 0
              ? tD('wallet.empty')
              : t('dokumente.wallet_sub', {
                  count: walletCount,
                  datum: formatDateDe(NAECHSTE_PRUEFUNG_MOCK_ISO),
                })}
          </p>
          <Link
            href="/dokumente"
            className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('aktionen.nachweise_ansehen')}
          </Link>
        </div>
      </div>
    </section>
  );
}
