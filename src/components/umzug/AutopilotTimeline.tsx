'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type {
  AutopilotStep,
  Behoerde,
  BehoerdeId,
  BlockTyp,
  Letter,
} from '@/types';

import { AutopilotStepRow } from './AutopilotStepRow';

interface AutopilotTimelineProps {
  steps: AutopilotStep[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
  lettersById: Record<string, Pick<Letter, 'aktenzeichen'>>;
  onConfirmEid?: (stepId: string) => void;
  onRetry?: (stepId: string) => void;
}

const blockOrder: BlockTyp[] = ['A', 'D', 'B', 'C'];

const blockHeadingKey: Record<BlockTyp, string> = {
  A: 'umzug.preview.block_a.title',
  B: 'umzug.preview.block_b.title',
  C: 'umzug.preview.block_c.title',
  D: 'umzug.preview.block_d.title',
};

export function AutopilotTimeline({
  steps,
  behoerdenById,
  lettersById,
  onConfirmEid,
  onRetry,
}: AutopilotTimelineProps) {
  const t = useTranslations();

  const grouped = useMemo(() => {
    const groups = new Map<BlockTyp, AutopilotStep[]>();
    for (const block of blockOrder) groups.set(block, []);
    for (const step of steps) {
      const list = groups.get(step.block);
      if (list) list.push(step);
    }
    return groups;
  }, [steps]);

  return (
    <div className="flex flex-col gap-8">
      {blockOrder.map((block) => {
        const list = grouped.get(block) ?? [];
        if (list.length === 0) return null;
        return (
          <section
            key={block}
            aria-labelledby={`run-block-${block}-title`}
            className="border-l border-border pl-4"
          >
            <h2
              id={`run-block-${block}-title`}
              className="pb-2 text-sm font-semibold tracking-wide text-text-secondary"
            >
              {t(blockHeadingKey[block])}
            </h2>
            <ol aria-live="polite" className="flex flex-col">
              {list.map((step) => (
                <AutopilotStepRow
                  key={step.id}
                  step={step}
                  behoerde={behoerdenById[step.behoerde_id]}
                  letter={step.letter_id ? lettersById[step.letter_id] : undefined}
                  onConfirmEid={
                    onConfirmEid ? () => onConfirmEid(step.id) : undefined
                  }
                  onRetry={onRetry ? () => onRetry(step.id) : undefined}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
