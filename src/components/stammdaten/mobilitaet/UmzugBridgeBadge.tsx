import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface UmzugBridgeBadgeProps {
  className?: string;
}

/**
 * `<UmzugBridgeBadge>` (Spec § 4.1 / VL-13 / HL-MOB-13).
 *
 * Render-Wortlaut **verbatim** aus i18n
 * `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug`:
 * „Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der
 * Zulassungsstelle steht aus."
 *
 * **Verboten** (HL-MOB-13): die Phrase „Halter-Adresse aktualisiert" darf
 * in keinem Render-Output erscheinen; ebenso „automatische Synchronisierung"
 * (HL-MOB-14). CI-Lint via Ban-List-Grep-Test.
 *
 * a11y:
 *   - `role="status"` (nicht-modal-Information; Screenreader-Live-Region
 *     mit `aria-live="polite"` durch das Native-Role-Mapping)
 *   - `prefers-reduced-motion: reduce` respektiert (kein Fade-In; instant render)
 */
export function UmzugBridgeBadge({ className }: UmzugBridgeBadgeProps) {
  const t = useTranslations('stammdaten.field_card.halter_adresse');

  return (
    <div
      role="status"
      data-testid="umzug-bridge-badge"
      className={cn(
        'flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950',
        'dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100',
        className,
      )}
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-200"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="font-medium text-amber-950 dark:text-amber-100">
          {wrapNormZitate(t('uebergangs_badge_via_umzug'))}
        </p>
        <p className="text-[11px] text-amber-950 dark:text-amber-100">
          {wrapNormZitate(t('uebergangs_badge_tooltip'))}
        </p>
      </div>
    </div>
  );
}
