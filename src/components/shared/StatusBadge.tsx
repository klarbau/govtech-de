import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

/**
 * Semantic status keys reused app-wide. Labels live under `common.status.*`;
 * the consuming screen passes the localized label via `children` (so screen
 * specs don't duplicate status strings). The variant alone never carries the
 * status — the label is always present.
 */
export type StatusVariant =
  | 'laufend'
  | 'neu'
  | 'verifiziert'
  | 'bestaetigt'
  | 'aktiv'
  | 'geprueft'
  | 'erledigt'
  | 'abgeschlossen'
  | 'eingereicht'
  | 'warten'
  | 'in_bearbeitung'
  | 'wird_geprueft'
  | 'manuell'
  | 'vorlage'
  | 'ablauf_bald'
  | 'abgelaufen';

type BaseVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'success-muted'
  | 'warning'
  | 'danger';

interface StatusStyle {
  base: BaseVariant;
  dot?: boolean;
  check?: boolean;
}

const styles: Record<StatusVariant, StatusStyle> = {
  laufend: { base: 'info', dot: true },
  neu: { base: 'info', dot: true },
  verifiziert: { base: 'success', check: true },
  bestaetigt: { base: 'success', check: true },
  aktiv: { base: 'success', dot: true },
  geprueft: { base: 'success', check: true },
  erledigt: { base: 'success-muted', check: true },
  abgeschlossen: { base: 'success-muted', check: true },
  eingereicht: { base: 'success' },
  warten: { base: 'warning', dot: true },
  in_bearbeitung: { base: 'warning', dot: true },
  wird_geprueft: { base: 'warning', dot: true },
  manuell: { base: 'warning' },
  vorlage: { base: 'neutral' },
  ablauf_bald: { base: 'warning' },
  abgelaufen: { base: 'danger' },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
  /** Override urgency for deadline-near badges (warn → danger). */
  urgency?: 'warn' | 'danger';
  size?: 'sm' | 'md';
  leadingIcon?: ReactNode;
  className?: string;
}

export function StatusBadge({
  variant,
  children,
  urgency,
  size = 'sm',
  leadingIcon,
  className,
}: StatusBadgeProps) {
  // Unknown variants fall back to neutral — never an invisible/colourless state.
  const style = styles[variant] ?? { base: 'neutral' as const };
  const base =
    urgency === 'danger'
      ? 'danger'
      : urgency === 'warn'
        ? 'warning'
        : style.base;

  const icon =
    leadingIcon ?? (style.check ? <Check aria-hidden="true" /> : undefined);

  return (
    <Badge
      variant={base}
      size={size}
      leadingDot={style.dot && !icon}
      leadingIcon={icon}
      className={className}
    >
      {children}
    </Badge>
  );
}
