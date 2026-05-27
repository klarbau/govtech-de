'use client';

import type { ReactNode } from 'react';

import { IconCircle } from '@/components/shared/IconCircle';

interface KontrollAktionTileProps {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}

/**
 * Aktions-Kachel in „Ihre Datenschutz-Kontrolle" (Spec § 4.1). Echter
 * `<button>` (kein div-onClick); Touch-Target ≥ 44px über das Padding.
 * Datenexport/Einstellungen sind speculative → öffnen einen Vision-Hinweis
 * (Toast), kein echter PII-Export.
 */
export function KontrollAktionTile({
  icon,
  label,
  description,
  onClick,
}: KontrollAktionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-md border border-border-strong bg-surface px-4 py-3 text-start transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <IconCircle icon={icon} tone="primary" size="md" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {description ? (
          <span className="block text-xs text-text-muted">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
