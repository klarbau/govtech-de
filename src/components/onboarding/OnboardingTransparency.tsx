'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { KeyValueRow } from '@/components/shared/KeyValueRow';
import { EidCredentialCard } from '@/components/onboarding/EidCredentialCard';
import { OnboardingLegalBasis } from '@/components/onboarding/OnboardingLegalBasis';
import { getOnboardingPersonaAttributes } from '@/components/onboarding/persona-attributes';
import { cn } from '@/lib/utils';

interface OnboardingTransparencyProps {
  personaId: string;
  onBack: () => void;
  onConfirm: () => void;
}

/** Splits a `[MOCK] 47 113 815 421` value into its prefix and the digit body. */
function splitMockValue(raw: string): { prefix: string; body: string } {
  const match = raw.match(/^(\[MOCK\]\s*)?(.*)$/);
  return { prefix: match?.[1]?.trim() ?? '', body: match?.[2] ?? raw };
}

function MaskedTaxId({ value, revealLabel }: { value: string; revealLabel: string }) {
  const [revealed, setRevealed] = useState(false);
  const { prefix, body } = splitMockValue(value);
  const masked = body.replace(/\d/g, '•');

  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums" dir="ltr">
        {prefix ? <span className="me-1 font-mono text-xs uppercase text-text-muted">{prefix}</span> : null}
        {revealed ? body : masked}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
        aria-label={revealLabel}
      >
        {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </span>
  );
}

const SECTION_EYEBROW = 'text-xs font-semibold uppercase tracking-wide text-text-muted';

/**
 * eID-attribute transparency + commit (Screen D). Carries the step's `<h1>`.
 * „Anmeldung bestätigen" is the only place that mutates demo state — it reseeds
 * the chosen persona and redirects (both handled by `onConfirm`).
 */
export function OnboardingTransparency({
  personaId,
  onBack,
  onConfirm,
}: OnboardingTransparencyProps) {
  const t = useTranslations('onboarding.transparency');
  const [shareMarital, setShareMarital] = useState(false);
  const [shareTaxId, setShareTaxId] = useState(false);
  const [committing, setCommitting] = useState(false);

  const attrs = getOnboardingPersonaAttributes(personaId);

  function handleConfirm() {
    if (committing) return;
    setCommitting(true);
    onConfirm();
  }

  if (!attrs) {
    return null;
  }

  const sharedCount = 4 + (shareMarital ? 1 : 0) + (shareTaxId ? 1 : 0);
  const totalCount = 6;

  return (
    <Card className="mx-auto w-full max-w-2xl gap-0 p-6 sm:p-8">
      <div
        role="note"
        className="inline-flex items-center gap-2 self-start rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-primary"
      >
        {t('mock_note')}
      </div>

      <div className="mt-5 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="mt-6">
        <EidCredentialCard
          variant="hero"
          name={attrs.name}
          nationality={attrs.nationality}
          birthYear={attrs.birthYear}
        />
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-muted">
          <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />
          {t('release_to')}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className={SECTION_EYEBROW}>{t('required_group')}</h2>
          <div className="divide-y divide-border">
            <KeyValueRow
              label={t('attr.name')}
              value={<span className="truncate">{attrs.name}</span>}
            />
            <KeyValueRow
              label={t('attr.birthdate')}
              value={<span className="tabular-nums">{attrs.birthdate}</span>}
            />
            <KeyValueRow label={t('attr.address')} value={attrs.address} />
            <KeyValueRow
              label={t('attr.nationality')}
              value={attrs.nationality}
            />
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
            <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
            {t('verified_source')}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className={SECTION_EYEBROW}>{t('optional_group')}</h2>
          <div className="divide-y divide-border">
            <OptionalAttrRow
              label={t('attr.marital_status')}
              value={
                shareMarital ? (
                  attrs.maritalStatus
                ) : (
                  <span className="text-text-muted">{t('not_shared')}</span>
                )
              }
              toggleLabel={`${t('share_toggle')}: ${t('attr.marital_status')}`}
              checked={shareMarital}
              onChange={setShareMarital}
            />
            <OptionalAttrRow
              label={t('attr.tax_id')}
              value={
                shareTaxId ? (
                  <MaskedTaxId
                    value={attrs.taxId}
                    revealLabel={t('attr.tax_id')}
                  />
                ) : (
                  <span className="text-text-muted">{t('not_shared')}</span>
                )
              }
              toggleLabel={`${t('share_toggle')}: ${t('attr.tax_id')}`}
              checked={shareTaxId}
              onChange={setShareTaxId}
            />
          </div>
          <p
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary"
          >
            <ShieldCheck className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
            {t('minimization', { shared: sharedCount, total: totalCount })}
          </p>
        </section>
      </div>

      <div className="mt-7">
        <OnboardingLegalBasis />
        <p className="mt-3 text-sm text-text-muted">{t('dsgvo_footer')}</p>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onBack} disabled={committing}>
          {t('back')}
        </Button>
        <Button onClick={handleConfirm} disabled={committing} aria-busy={committing}>
          {committing ? (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {t('committing')}
            </>
          ) : (
            t('confirm')
          )}
        </Button>
      </div>
    </Card>
  );
}

interface OptionalAttrRowProps {
  label: string;
  value: React.ReactNode;
  toggleLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function OptionalAttrRow({
  label,
  value,
  toggleLabel,
  checked,
  onChange,
}: OptionalAttrRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dl className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <dt className="text-sm text-text-secondary">{label}</dt>
        <dd className="flex min-w-0 items-center gap-2 text-end text-sm font-medium text-text-primary">
          <span className="min-w-0 break-words">{value}</span>
        </dd>
      </dl>
      <label
        className={cn(
          'inline-flex min-h-[44px] shrink-0 cursor-pointer items-center',
        )}
      >
        <span className="sr-only">{toggleLabel}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
      </label>
    </div>
  );
}
