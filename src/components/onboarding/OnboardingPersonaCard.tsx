'use client';

import { EidCredentialCard } from '@/components/onboarding/EidCredentialCard';

interface OnboardingPersonaCardProps {
  personaId: string;
  name: string;
  descriptor: string;
  selected?: boolean;
  onClick: () => void;
}

/**
 * Single selectable persona row (Screen C). Renders the credential's `select`
 * variant so the picker reads as a rack of digital IDs. The accessible name
 * combines name + descriptor (both real text); the MRZ hint is derived from the
 * name and stays decorative.
 */
export function OnboardingPersonaCard({
  name,
  descriptor,
  selected = false,
  onClick,
}: OnboardingPersonaCardProps) {
  return (
    <EidCredentialCard
      variant="select"
      name={name}
      descriptor={descriptor}
      selected={selected}
      onClick={onClick}
    />
  );
}
