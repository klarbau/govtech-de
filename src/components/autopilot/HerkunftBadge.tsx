'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

import { useProtokollCapability } from '@/components/autopilot/use-protokoll-capability';
import { cn } from '@/lib/utils';

interface HerkunftBadgeProps {
  className?: string;
}

/**
 * `<HerkunftBadge>` (`unter-der-haube.md` § 5.C) — the quiet origin chip at the
 * cascade header.
 *
 * Renders NOTHING unless the shared capability probe says the live FIT-Connect
 * layer is available (`available === true`) — so Demo-Modus stays byte-identical
 * (the existing foot disclaimer carries the simulation honesty; no redundant
 * „Simulation"-chip in the primary hero). The honest scoping („nur die
 * eID-Schritte") is VISIBLE in the chip text; the full sentence lives in the
 * `aria-describedby` description. Static — no aria-live.
 */
export function HerkunftBadge({ className }: HerkunftBadgeProps) {
  const t = useTranslations('protokoll.haube');
  const { available } = useProtokollCapability();
  const descId = useId();

  if (available !== true) return null;

  return (
    <div
      data-testid="haube-herkunft-badge"
      aria-describedby={descId}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-primary',
        className,
      )}
    >
      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{t('badge_live')}</span>
      <span id={descId} className="sr-only">
        {t('badge_live_desc')}
      </span>
    </div>
  );
}
