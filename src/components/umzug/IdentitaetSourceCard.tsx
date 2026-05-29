import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/shared/IconCircle';
import {
  StatusBadge,
  type StatusVariant,
} from '@/components/shared/StatusBadge';

interface IdentitaetSourceCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  connectionLabel: string;
  status: Extract<StatusVariant, 'verifiziert' | 'bestaetigt'>;
  statusLabel: string;
}

export function IdentitaetSourceCard({
  icon,
  title,
  subtitle,
  connectionLabel,
  status,
  statusLabel,
}: IdentitaetSourceCardProps) {
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconCircle icon={icon} tone="primary" size="lg" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary">{subtitle}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3.5" aria-hidden="true" />
              <span>{connectionLabel}</span>
            </p>
          </div>
        </div>
        <span className="flex shrink-0">
          <StatusBadge variant={status} size="md">
            {statusLabel}
          </StatusBadge>
        </span>
      </div>
    </Card>
  );
}
