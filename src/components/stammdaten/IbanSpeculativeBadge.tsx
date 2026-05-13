import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

interface IbanSpeculativeBadgeProps {
  className?: string;
}

/**
 * `<IbanSpeculativeBadge>` (Spec § 11.12).
 *
 * Inline-Pill „2027-Vision" mit Funkel-Icon. Reuse-fähig im IBAN-FieldCard
 * und im Push-Modal-Header. Trägt **zusätzlich zur Farbe** den Text
 * (verifier Architekturelle-Flag #6: Farbe + Text-Marker).
 *
 * Hard-Line § 11.12: dieses Badge ist mandatorisch direkt am IBAN-Field-Label.
 */
export function IbanSpeculativeBadge({ className }: IbanSpeculativeBadgeProps) {
  const t = useTranslations('stammdaten.badge');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-900 ring-1 ring-violet-300/70',
        'dark:bg-violet-900/40 dark:text-violet-100 dark:ring-violet-700/60',
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {t('2027_vision')}
    </span>
  );
}
