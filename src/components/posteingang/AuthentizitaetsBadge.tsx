import { useTranslations } from 'next-intl';
import { Inbox, Mail, ShieldCheck, UserPlus } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { LetterAuthChannel } from '@/types';

interface AuthentizitaetsBadgeProps {
  channel: LetterAuthChannel;
  /**
   * Visuelle Variante:
   *  - `inline` (Default): Badge mit Icon + Volltext-Label (V1-Verhalten;
   *    weiterhin in `<LetterReader>` verwendet).
   *  - `tiny-icon-only`: 16-px-Icon + 1-Wort-Label „Brief"; volle Kanal-
   *    Bezeichnung wandert in `aria-label`. V1.5 LetterCard-Hierarchie.
   */
  variant?: 'inline' | 'tiny-icon-only';
  className?: string;
}

const CHANNEL_LABELS: Record<LetterAuthChannel, string> = {
  briefpost: 'briefpost',
  'mein-elster': 'mein_elster',
  'zbp-bundid': 'zbp_bundid',
  'krankenkassen-portal': 'krankenkassen_portal',
  'eingabe-buerger': 'eingabe_buerger',
  'eudi-versiegelt': 'eudi_versiegelt',
};

const CHANNEL_ICONS: Record<
  LetterAuthChannel,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  briefpost: Mail,
  'mein-elster': Inbox,
  'zbp-bundid': Inbox,
  'krankenkassen-portal': Inbox,
  'eingabe-buerger': UserPlus,
  'eudi-versiegelt': ShieldCheck,
};

/**
 * 3-Stufen-Authentizitäts-Badge.
 *
 * - `inline` (Default): „Empfangen über [Kanal]"-Pille.
 * - `tiny-icon-only` (V1.5 LetterCard): Icon + 1-Wort-Label „Brief"; volle
 *   Kanal-Bezeichnung in `aria-label` für Screen-Reader (Spec §4.5,
 *   Verifier-Auflage #B2).
 */
export function AuthentizitaetsBadge({
  channel,
  variant = 'inline',
  className,
}: AuthentizitaetsBadgeProps) {
  const t = useTranslations('posteingang.card.authentizitaet');
  const Icon = CHANNEL_ICONS[channel] ?? Mail;
  const labelKey = CHANNEL_LABELS[channel];
  const channelLabel = t(`channels.${labelKey}`);

  let copy: string;
  if (channel === 'eingabe-buerger') {
    copy = t('eingabe_buerger');
  } else if (channel === 'eudi-versiegelt') {
    copy = t('eudi_versiegelt');
  } else {
    copy = t('empfangen_template', { kanal: channelLabel });
  }

  if (variant === 'tiny-icon-only') {
    const ariaLabel = t('icon_aria_template', { kanal: channelLabel });
    const shortLabel = t('icon_label');
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[11px] text-muted-foreground',
          className,
        )}
      >
        <Icon className="size-4" aria-hidden={true} />
        <span aria-hidden="true">{shortLabel}</span>
        <span className="sr-only">{ariaLabel}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden={true} />
      <span>{copy}</span>
    </span>
  );
}

/** Default-Authentizitäts-Kanal, falls Brief-Daten kein Feld setzen. */
export const DEFAULT_AUTH_CHANNEL: LetterAuthChannel = 'briefpost';
