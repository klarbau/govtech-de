'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { ConsentToggle } from '@/components/shared/ConsentToggle';
import type {
  AutopilotStepDraft,
  Behoerde,
  BehoerdeId,
  SelfTask,
  UmzugPreview,
} from '@/types';

import { CascadeBlock } from './CascadeBlock';
import { CascadeRow } from './CascadeRow';

interface CascadePreviewProps {
  preview: UmzugPreview;
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
  defaultConsent?: BehoerdeId[];
  onStart: (consents: BehoerdeId[]) => void;
  isStarting?: boolean;
}

const blockARechtsgrundlagen = [
  { norm: '§ 33 BMG', i18nKey: 'umzug.rechtsgrundlage.bmg_33' },
  { norm: '§ 34 BMG', i18nKey: 'umzug.rechtsgrundlage.bmg_34' },
  { norm: '§ 36 BMG', i18nKey: 'umzug.rechtsgrundlage.bmg_36' },
];

const blockBRechtsgrundlagen = [
  { norm: 'Art. 6 Abs. 1 lit. a DSGVO', i18nKey: 'umzug.rechtsgrundlage.dsgvo_6_1_a' },
];

const blockDRechtsgrundlagen = [
  { norm: '§ 18 PAuswG', i18nKey: 'umzug.rechtsgrundlage.pauswg_18' },
];

function getBehoerdeName(
  step: AutopilotStepDraft,
  registry: CascadePreviewProps['behoerdenById'],
): { name: string; kategorie?: Behoerde['kategorie'] } {
  const entry = registry[step.behoerde_id];
  return {
    name: entry?.name_de ?? step.behoerde_id,
    kategorie: entry?.kategorie,
  };
}

export function CascadePreview({
  preview,
  behoerdenById,
  defaultConsent = [],
  onStart,
  isStarting = false,
}: CascadePreviewProps) {
  const t = useTranslations('umzug.preview');
  const shouldReduceMotion = useReducedMotion();
  const [consents, setConsents] = useState<Set<BehoerdeId>>(
    () => new Set(defaultConsent),
  );

  const showBlockD = preview.block_d.length > 0;

  function toggleConsent(id: BehoerdeId, next: boolean) {
    setConsents((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }

  function handleStart() {
    onStart(Array.from(consents));
  }

  const stepCount =
    preview.block_a.length +
    preview.block_b.length +
    (showBlockD ? preview.block_d.length : 0);

  return (
    <motion.div
      className="flex flex-col gap-[var(--ds-space-fixed-30,2rem)]"
      animate={{
        opacity: isStarting && !shouldReduceMotion ? 0.6 : 1,
      }}
      transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
      aria-busy={isStarting || undefined}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-[length:var(--ds-text-h2,2.25rem)] font-semibold leading-[var(--ds-line-h2,1.111)] tracking-tight text-foreground">
          {t('hero_title_template', { count: stepCount })}
        </h1>
        <p className="text-muted-foreground">{t('hero_subtitle')}</p>
      </header>

      <CascadeBlock
        id="block-a"
        block="A"
        primary
        title={t('block_a.title')}
        subhead={t('block_a.subhead')}
        rechtsgrundlagen={blockARechtsgrundlagen}
      >
        {preview.block_a.map((step) => {
          const b = getBehoerdeName(step, behoerdenById);
          return (
            <CascadeRow
              key={`${step.behoerde_id}-${step.aktion}`}
              block="A"
              behoerdeName={b.name}
              behoerdeKategorie={b.kategorie}
              aktion={step.aktion}
            />
          );
        })}
      </CascadeBlock>

      {showBlockD ? (
        <CascadeBlock
          id="block-d"
          block="D"
          title={t('block_d.title')}
          subhead={t('block_d.subhead')}
          helper={t('block_d.eid_helper')}
          rechtsgrundlagen={blockDRechtsgrundlagen}
        >
          {preview.block_d.map((step) => {
            const b = getBehoerdeName(step, behoerdenById);
            return (
              <CascadeRow
                key={`${step.behoerde_id}-${step.aktion}`}
                block="D"
                behoerdeName={b.name}
                behoerdeKategorie={b.kategorie}
                aktion={step.aktion}
              />
            );
          })}
        </CascadeBlock>
      ) : null}

      <CascadeBlock
        id="block-b"
        block="B"
        title={t('block_b.title')}
        subhead={t('block_b.subhead')}
        rechtsgrundlagen={blockBRechtsgrundlagen}
      >
        {preview.block_b.map((step) => {
          const b = getBehoerdeName(step, behoerdenById);
          const checked = consents.has(step.behoerde_id);
          return (
            <CascadeRow
              key={`${step.behoerde_id}-${step.aktion}`}
              block="B"
              behoerdeName={b.name}
              behoerdeKategorie={b.kategorie}
              aktion={step.aktion}
              trailing={
                <ConsentToggle
                  checked={checked}
                  onCheckedChange={(next) =>
                    toggleConsent(step.behoerde_id, next)
                  }
                  label={b.name}
                  describedById={`consent-${step.behoerde_id}`}
                />
              }
            />
          );
        })}
      </CascadeBlock>

      <CascadeBlock
        id="block-c"
        block="C"
        title={t('block_c.title')}
        subhead={t('block_c.helper')}
      >
        {preview.block_c.map((task: SelfTask) => (
          <li
            key={task.id}
            className="flex items-start gap-3 border-b border-border/60 py-3 last:border-b-0"
          >
            <ArrowRight
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{task.titel}</p>
              {task.beschreibung ? (
                <p className="text-xs text-muted-foreground">
                  {task.beschreibung}
                </p>
              ) : null}
              {task.link ? (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" aria-hidden="true" />
                  <span>{task.link}</span>
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </CascadeBlock>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={handleStart}
          disabled={isStarting}
        >
          {t('cta_start_autopilot')}
        </Button>
      </div>
    </motion.div>
  );
}
