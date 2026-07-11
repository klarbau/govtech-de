'use client';

import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface OnboardingPersonaCardProps {
  personaId: string;
  name: string;
  descriptor: string;
  /** One human sentence about the persona's life situation (i18n). */
  story: string;
  selected?: boolean;
  onClick: () => void;
}

/** Initials for the avatar disc — first letter of the first two name words. */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Single selectable persona row (Screen C) — an account-picker row like a
 * familiar account chooser, not an ID artifact: initials disc, name, one human
 * story line, then the factual descriptor as fine print. Hairlines between
 * rows come from the parent list (ai-design-tells §1: no uniform card grids).
 */
export function OnboardingPersonaCard({
  name,
  descriptor,
  story,
  selected = false,
  onClick,
}: OnboardingPersonaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group/persona flex w-full min-h-[44px] items-center gap-4 rounded-lg px-3 py-4 text-start transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected ? 'bg-accent-soft' : 'hover:bg-surface-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-wide text-primary ring-1 ring-primary/15',
          selected ? 'bg-surface' : 'bg-accent-soft',
        )}
      >
        {initialsOf(name)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-text-primary">{name}</span>
        <span className="text-sm leading-snug text-text-secondary">{story}</span>
        <span className="text-xs text-text-muted">{descriptor}</span>
      </span>

      {selected ? (
        <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <ChevronRight
          className="size-5 shrink-0 text-text-muted transition-transform group-hover/persona:translate-x-1 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-hover/persona:-translate-x-1"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
