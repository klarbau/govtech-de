import { getTranslations } from 'next-intl/server';

import type {
  AutopilotStep,
  Behoerde,
  BehoerdeId,
  Letter,
} from '@/types';

import { BehoerdenStatusRow } from './BehoerdenStatusRow';

interface BehoerdenStatusListProps {
  steps: AutopilotStep[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
  lettersById: Record<string, Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>>;
}

export async function BehoerdenStatusList({
  steps,
  behoerdenById,
  lettersById,
}: BehoerdenStatusListProps) {
  const t = await getTranslations('umzug.detail');

  return (
    <section
      aria-labelledby="behoerden-status-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="behoerden-status-title"
        className="text-sm font-medium text-foreground"
      >
        {t('beteiligte_behoerden_count', { count: steps.length })}
      </h2>
      <ol className="divide-y divide-border rounded-xl border border-border bg-card">
        {steps.map((step) => (
          <BehoerdenStatusRow
            key={step.id}
            step={step}
            behoerde={behoerdenById[step.behoerde_id]}
            letter={step.letter_id ? lettersById[step.letter_id] : undefined}
          />
        ))}
      </ol>
    </section>
  );
}
