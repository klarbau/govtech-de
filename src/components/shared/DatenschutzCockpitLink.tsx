'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';

import { cn } from '@/lib/utils';

type LabelVariant = 'umzug-detail' | 'posteingang-card' | 'shield-icon-only';

interface DatenschutzCockpitLinkProps {
  /** Vorgang-Filter — z. B. von der Umzug-Detailseite. */
  vorgangId?: string;
  /** Brief-Filter — z. B. von einer LetterCard im Posteingang. */
  letterId?: string;
  /**
   * Bestimmt den i18n-Schlüssel des Labels.
   * - `umzug-detail`: `umzug.detail.cta_datenschutz` (Default).
   * - `posteingang-card`: `posteingang.card.datenschutz_link`.
   * - `shield-icon-only` (V1.5 LetterCard): 16-px-Shield-Icon, kein sicht-
   *   barer Text; volles Label in `aria-label` (Verifier-Auflage #B2).
   */
  variant?: LabelVariant;
  className?: string;
}

/**
 * Datenschutz-Cockpit-Link — pro Brief oder pro Vorgang.
 *
 * V1: sichtbarer Text-Link mit Shield-Icon.
 * V1.5: zusätzliche `shield-icon-only`-Variante als 16-px-Icon-Button mit
 * `aria-label="Datenschutz-Cockpit für diesen Brief öffnen"`. Spec §4.5 +
 * Verifier-Auflage: visuelles Gewicht reduziert, Spec-Vertrag bleibt erfüllt.
 */
export function DatenschutzCockpitLink({
  vorgangId,
  letterId,
  variant = 'umzug-detail',
  className,
}: DatenschutzCockpitLinkProps) {
  const tCard = useTranslations('posteingang.card');
  const tUmzug = useTranslations('umzug.detail');

  const href = (() => {
    if (letterId) return `/datenschutz?letter=${encodeURIComponent(letterId)}`;
    if (vorgangId)
      return `/datenschutz?vorgangId=${encodeURIComponent(vorgangId)}`;
    return '/datenschutz';
  })();

  if (variant === 'shield-icon-only') {
    return (
      <Link
        href={href}
        aria-label={tCard('datenschutz_link_aria')}
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          className,
        )}
      >
        <Shield className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  const label =
    variant === 'posteingang-card' ? tCard('datenschutz_link') : tUmzug('cta_datenschutz');

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted',
        className,
      )}
    >
      <Shield className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
