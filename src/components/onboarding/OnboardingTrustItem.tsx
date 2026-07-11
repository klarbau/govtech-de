import { cn } from '@/lib/utils';

interface OnboardingTrustItemProps {
  label: string;
  desc: string;
  /** Divider/spacing utilities the parent grid uses to draw the hairlines. */
  className?: string;
}

/**
 * Trust column (Screen A). Text-led — bold label + supporting line, separated
 * from its neighbours by hairlines (no icon container). Mirrors the landing's
 * Trust-Prinzipien block (docs/research/ai-design-tells.md §3).
 */
export function OnboardingTrustItem({
  label,
  desc,
  className,
}: OnboardingTrustItemProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="text-xs leading-snug text-text-secondary">{desc}</span>
    </div>
  );
}
