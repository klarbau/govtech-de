import { Avatar } from '@/components/shared/Avatar';

interface MemberChipMember {
  name: string;
  initials?: string;
}

interface MemberChipsProps {
  members: MemberChipMember[];
  /** Maximum chips before collapsing into a „+N" overflow chip. */
  max?: number;
  /** Accessible label, e.g. „Betrifft: Anna Petrov, Lev Petrov-Becker". */
  'aria-label': string;
}

/**
 * Overlapping monogram chips marking which household members an entry concerns.
 * Avatars are decorative (`aria-hidden`); the accessible name is carried by the
 * `aria-label` on the group so the names reach assistive tech as text.
 */
export function MemberChips({ members, max = 4, 'aria-label': ariaLabel }: MemberChipsProps) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;

  return (
    <span className="flex items-center" role="img" aria-label={ariaLabel}>
      <span className="flex items-center -space-x-1.5">
        {shown.map((m, i) => (
          <Avatar
            key={`${m.name}-${i}`}
            name={m.name}
            initials={m.initials}
            size="sm"
            className="ring-2 ring-surface"
          />
        ))}
        {overflow > 0 ? (
          <span
            aria-hidden="true"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-secondary ring-2 ring-surface"
          >
            +{overflow}
          </span>
        ) : null}
      </span>
    </span>
  );
}
