import type { ReactNode } from 'react';
import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { IconCircle } from '@/components/shared/IconCircle';

type IconTone = 'success' | 'primary' | 'neutral';

interface IdentitaetFreigabeRowProps {
  icon: ReactNode;
  iconTone: IconTone;
  label: string;
  sub: string;
  rechtsgrundlage?: string;
  kind: 'automatic' | 'consent';
  trailingLabel: string;
}

export function IdentitaetFreigabeRow({
  icon,
  iconTone,
  label,
  sub,
  rechtsgrundlage,
  kind,
  trailingLabel,
}: IdentitaetFreigabeRowProps) {
  const content = (
    <>
      <IconCircle icon={icon} tone={iconTone} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-xs text-text-secondary">{sub}</span>
        {rechtsgrundlage ? (
          <span className="mt-0.5 font-mono text-[11px] tabular-nums text-text-secondary">
            {rechtsgrundlage}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 text-xs font-medium',
          kind === 'automatic' ? 'text-success' : 'text-warning',
        )}
      >
        {kind === 'automatic' ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : null}
        <span>{trailingLabel}</span>
        {kind === 'consent' ? (
          <ChevronRight
            className="size-4 text-text-secondary rtl:-scale-x-100"
            aria-hidden="true"
          />
        ) : null}
      </span>
    </>
  );

  if (kind === 'consent') {
    return (
      <li className="border-b border-border last:border-b-0">
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 py-3 text-left',
            'min-h-[3rem] rounded-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex w-full items-center gap-3 py-3">{content}</div>
    </li>
  );
}
