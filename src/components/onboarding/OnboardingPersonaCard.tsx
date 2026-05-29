'use client';

import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';

interface OnboardingPersonaCardProps {
  personaId: string;
  name: string;
  descriptor: string;
  selected?: boolean;
  onClick: () => void;
}

/**
 * Single selectable persona card (Screen C). A real `<button>` whose accessible
 * name combines name + descriptor; the monogram avatar is decorative.
 */
export function OnboardingPersonaCard({
  name,
  descriptor,
  selected = false,
  onClick,
}: OnboardingPersonaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full min-h-[44px] items-center gap-3 rounded-lg border bg-surface p-4 text-start transition-colors',
        'hover:border-border-strong hover:bg-surface-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected ? 'border-primary bg-accent-soft' : 'border-border',
      )}
    >
      <Avatar name={name} size="lg" tone="primary" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-text-primary">
          {name}
        </span>
        <span className="text-sm text-text-secondary">{descriptor}</span>
      </span>
    </button>
  );
}
