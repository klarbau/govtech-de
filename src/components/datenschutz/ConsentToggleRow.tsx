'use client';

import { useTranslations } from 'next-intl';

import { Switch } from '@/components/ui/switch';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface ConsentToggleRowProps {
  /** Lokalisierter Empfänger-Name (z. B. „Krankenkasse"). */
  label: string;
  checked: boolean;
  rechtsgrundlage: string;
  /** UI-busy während des persistierenden Backend-Calls (optimistic). */
  pending?: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * Einwilligungs-Toggle-Zeile (Spec § 4.1). Der `Switch` trägt einen
 * accessiblen Namen inkl. Empfänger + Zustand; der Zustands-Text („Ein"/„Aus")
 * steht zusätzlich sichtbar daneben (Status nicht nur über Farbe). Touch-Target
 * ≥ 44px über die `after:`-Hit-Area des Switch + Zeilen-Padding.
 */
export function ConsentToggleRow({
  label,
  checked,
  rechtsgrundlage,
  pending = false,
  onToggle,
}: ConsentToggleRowProps) {
  const t = useTranslations('datenschutz.einwilligungen');

  const switchLabel = `${t('switch_aria', { empfaenger: label })}, ${
    checked ? t('ein') : t('aus')
  }`;

  return (
    <div
      aria-busy={pending || undefined}
      className="flex min-h-[44px] items-center justify-between gap-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          <span className="me-1">{t('rechtsgrundlage_label')}:</span>
          <span className="tabular-nums">{wrapNormZitate(rechtsgrundlage)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'text-xs font-medium tabular-nums',
            checked ? 'text-success' : 'text-text-muted',
          )}
        >
          {checked ? t('ein') : t('aus')}
        </span>
        <Switch
          checked={checked}
          disabled={pending}
          aria-label={switchLabel}
          onCheckedChange={(next) => onToggle(next)}
        />
      </div>
    </div>
  );
}
