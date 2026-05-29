import { cn } from '@/lib/utils';

interface OnboardingQrMockProps {
  label?: string;
  className?: string;
}

// Fixed decorative pattern — deliberately NOT a scannable code. The cells are a
// static layout so the visual is stable and obviously a placeholder.
const QR_PATTERN: boolean[] = [
  true, true, true, false, true, false, true, true, true,
  true, false, true, false, false, true, true, false, true,
  true, true, true, false, true, false, true, true, true,
  false, false, false, true, false, true, false, false, false,
  true, false, true, false, true, false, true, true, false,
  false, true, false, true, false, true, false, false, true,
  true, true, true, false, true, true, true, false, true,
  true, false, true, false, false, false, true, true, false,
  true, true, true, true, true, false, true, false, true,
];

/**
 * Decorative QR/Wallet mock visual (Screen B). Clearly a placeholder, never a
 * real code. Exposed to assistive tech only via the supplied `label`.
 */
export function OnboardingQrMock({ label, className }: OnboardingQrMockProps) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'grid size-32 grid-cols-9 gap-0.5 rounded-lg border border-border bg-surface p-2.5',
        className,
      )}
    >
      {QR_PATTERN.map((filled, i) => (
        <span
          key={i}
          className={cn(
            'aspect-square rounded-[1px]',
            filled ? 'bg-text-primary' : 'bg-transparent',
          )}
        />
      ))}
    </div>
  );
}
