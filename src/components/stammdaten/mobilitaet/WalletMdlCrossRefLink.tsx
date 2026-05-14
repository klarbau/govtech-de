import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, ArrowUpRight } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface WalletMdlCrossRefLinkProps {
  className?: string;
}

/**
 * `<WalletMdlCrossRefLink>` (Spec § 4.1 / VL-7).
 *
 * Cross-Ref-Link aus der Mobilität-Sektion zum Wallet-Sub-Tab. Pattern erbt
 * von V1.2 `<PostanschriftCrossRefCard>`: kein Card-Duplikat, ein Render-Pfad
 * für die mDL-Card.
 *
 * Vision-Pill „2029-Vision" semantisch distinkt von V1 `2027_vision` (HL-MOB-7).
 */
export function WalletMdlCrossRefLink({
  className,
}: WalletMdlCrossRefLinkProps) {
  const t = useTranslations('stammdaten.mobilitaet.wallet_cross_ref');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  return (
    <aside
      aria-label={t('link_label')}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-violet-200/70 bg-violet-50/60 p-4 dark:border-violet-700/60 dark:bg-violet-900/20',
        className,
      )}
      data-testid="wallet-mdl-cross-ref-link"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles
          className="size-4 text-violet-700 dark:text-violet-200"
          aria-hidden="true"
        />
        <Link
          href="?tab=wallet"
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-950 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-violet-100"
          data-testid="wallet-mdl-cross-ref-cta"
        >
          {t('link_label')}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
        <span
          aria-label={t('vision_pill_aria_label')}
          className="inline-flex items-center gap-1 rounded-full bg-violet-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-950 dark:bg-violet-800/60 dark:text-violet-100"
        >
          {t('vision_pill')}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-violet-900/90 dark:text-violet-100/85">
        {wrapNormZitate(tDisclaimer('eudi_mdl_speculative'))}
      </p>
    </aside>
  );
}
