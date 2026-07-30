'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Rail block e (Spec `stammdaten-akte-v2.md` § 4.7e) — who decides about
 * sharing, in one honest sentence.
 *
 * § 36 Abs. 1 BMG lets regular transmissions to other public bodies run without
 * consent; a „nur mit Ihrer Zustimmung" would contradict both the statute and
 * this app's own Umzug cascade. The shield sits INLINE beside the heading, not
 * as a tile above it.
 */
export function DatenhoheitKarte() {
  const t = useTranslations('stammdaten.akte');
  const tD = useTranslations('stammdaten.datenblatt');

  return (
    <section
      aria-labelledby="sd-datenhoheit-title"
      data-testid="sd-datenhoheit"
      className="flex min-w-0 gap-x-2.5 rounded-[10px] border border-border bg-surface-muted px-[15px] py-[13px]"
    >
      <Shield
        aria-hidden="true"
        className="mt-px size-[15px] shrink-0 text-primary"
      />
      <div className="min-w-0">
        <h2
          id="sd-datenhoheit-title"
          className="text-[13px] font-semibold text-text-primary md:text-[12.5px]"
        >
          {t('datenhoheit.title')}
        </h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary md:text-[11.5px]">
          {t('datenhoheit.text_kurz')}
        </p>
        <Link
          href="/datenschutz"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {tD('datenhoheit.link')}
        </Link>
      </div>
    </section>
  );
}
