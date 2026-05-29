import type { ReactNode } from 'react';

import { IconCircle } from '@/components/shared/IconCircle';

interface OnboardingTrustItemProps {
  icon: ReactNode;
  label: string;
  /**
   * Optional 1–2 line supporting copy. When present, the item renders as a
   * stacked card (icon → bold label → caption) to match the prototype-v2
   * three-column trust strip. When absent, falls back to the inline pill form.
   */
  desc?: string;
}

/**
 * Trust mini-item (Screen A). The icon is decorative; the label carries meaning.
 */
export function OnboardingTrustItem({
  icon,
  label,
  desc,
}: OnboardingTrustItemProps) {
  if (desc) {
    return (
      <div className="flex flex-col gap-2">
        <IconCircle icon={icon} tone="neutral" size="sm" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-text-primary">
            {label}
          </span>
          <span className="text-xs leading-snug text-text-secondary">
            {desc}
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <IconCircle icon={icon} tone="neutral" size="sm" />
      <span className="text-sm text-text-secondary">{label}</span>
    </span>
  );
}
