'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wallet, ArrowUpRight, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

interface MdlTeaserCardProps {
  className?: string;
}

/**
 * `<MdlTeaserCard>` (Phase 6c — audit-finding #5).
 *
 * Sichtbarer Hinweis im Profil-Tab, dass eine mobile Driving Licence
 * (mDL / ISO 18013-5) im Wallet zur Vorschau bereit liegt. Wird vom Parent
 * NUR gerendert, wenn `api.getMdlAttestation(persona) !== null`.
 *
 * HL-DS-12: folgt strikt Page-Theme (kein eigener Dark-Mode-Override).
 * HL-DS-8: Touch-Target ≥ 44 px für den CTA-Link.
 *
 * Hard-Line-Hygiene:
 *   - kein Render der mDL-Attribute (closed-list bleibt im Wallet-Sub-Tab).
 *   - reine Teaser-Card, keine eigene Reveal-Logik.
 */
export function MdlTeaserCard({ className }: MdlTeaserCardProps) {
  const t = useTranslations('stammdaten.mdl_teaser');

  return (
    <aside
      aria-label={t('title')}
      className={cn(
        'flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      data-testid="mdl-teaser-card"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Wallet className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {t('title')}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-900 ring-1 ring-violet-300/70 dark:bg-violet-900/40 dark:text-violet-100 dark:ring-violet-700/60">
              <Sparkles className="size-3" aria-hidden="true" />
              {t('vision_pill')}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('body')}
          </p>
        </div>
      </div>
      <Link
        href="?tab=wallet"
        data-testid="mdl-teaser-cta"
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center gap-1 self-start rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground',
          'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'sm:self-center',
        )}
      >
        {t('cta')}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </aside>
  );
}
