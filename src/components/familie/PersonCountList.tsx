import { KeyValueRow } from '@/components/shared/KeyValueRow';

interface PersonCounts {
  vorgaenge: number;
  dokumente: number;
  nachweise: number;
  vertretungen: number;
}

interface PersonCountListProps {
  counts: PersonCounts;
  labels: {
    vorgaenge: string;
    dokumente: string;
    nachweise: string;
    vertretungen: string;
  };
}

/**
 * The per-person count rows for the „Was betrifft wen?"-rail. Each row is a
 * `KeyValueRow` (its own `<dl>/<dt>/<dd>`); the numbers use `tabular-nums`
 * (HL-DS-6).
 */
export function PersonCountList({ counts, labels }: PersonCountListProps) {
  const rows: { label: string; value: number }[] = [
    { label: labels.vorgaenge, value: counts.vorgaenge },
    { label: labels.dokumente, value: counts.dokumente },
    { label: labels.nachweise, value: counts.nachweise },
    { label: labels.vertretungen, value: counts.vertretungen },
  ];

  return (
    <div className="divide-y divide-border">
      {rows.map((r) => (
        <KeyValueRow
          key={r.label}
          label={r.label}
          value={<span className="tabular-nums">{r.value}</span>}
        />
      ))}
    </div>
  );
}
