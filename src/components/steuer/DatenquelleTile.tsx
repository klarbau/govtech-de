import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface DatenquelleTileProps {
  icon: LucideIcon;
  /** Lokalisierter Quelle-Name (z. B. „Lohnsteuer"). */
  label: ReactNode;
  /** Lokalisierte Herkunft (Behörden-Name oder Arbeitgeber). */
  herkunft: string;
}

/**
 * Eine Datenquellen-Kachel im Steuer-Hero (Spec § 4.1): IconCircle + Quelle +
 * „von {Herkunft}" + Verifiziert-Badge. Macht Datenminimierung sichtbar — der
 * Bürger sieht, welche Daten von welcher Stelle kommen.
 */
export function DatenquelleTile({ icon: Icon, label, herkunft }: DatenquelleTileProps) {
  const tStatus = useTranslations('common.status');
  const t = useTranslations('steuer.quelle');

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
      <IconCircle icon={<Icon />} tone="primary" size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">
            {label}
          </span>
          <StatusBadge variant="verifiziert">{tStatus('verifiziert')}</StatusBadge>
        </div>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {t('herkunft', { herkunft })}
        </p>
      </div>
    </div>
  );
}
