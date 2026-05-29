'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { IconCircle } from '@/components/shared/IconCircle';
import {
  StatusBadge,
  type StatusVariant,
} from '@/components/shared/StatusBadge';

type IconTone = 'success' | 'primary' | 'neutral';

interface IdentitaetDatenRowProps {
  icon: ReactNode;
  iconTone: IconTone;
  label: string;
  sub: string;
  status: Extract<StatusVariant, 'verifiziert' | 'neu' | 'vorlage'>;
  statusLabel: string;
  expandedBody: string;
}

export function IdentitaetDatenRow({
  icon,
  iconTone,
  label,
  sub,
  status,
  statusLabel,
  expandedBody,
}: IdentitaetDatenRowProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          'flex w-full items-center gap-3 py-3 text-left',
          'min-h-[3rem] rounded-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        )}
      >
        <IconCircle icon={icon} tone={iconTone} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-text-primary">{label}</span>
          <span className="text-xs text-text-secondary">{sub}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusBadge variant={status} size="sm">
            {statusLabel}
          </StatusBadge>
          <ChevronRight
            className={cn(
              'size-4 text-text-secondary transition-transform motion-reduce:transition-none',
              open && 'rotate-90',
              'rtl:-scale-x-100',
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      {open ? (
        <p
          id={bodyId}
          className="pb-3 pl-10 pr-3 text-xs leading-relaxed text-text-secondary"
        >
          {expandedBody}
        </p>
      ) : null}
    </li>
  );
}
