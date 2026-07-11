'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { EidCredentialCard } from '@/components/onboarding/EidCredentialCard';
import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import { getOnboardingPersonaAttributes } from '@/components/onboarding/persona-attributes';

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

const PANEL_EYEBROW = 'text-[11px] font-semibold uppercase tracking-wide text-text-muted';

/**
 * eID-attribute transparency + commit (Screen D). Carries the step's `<h1>`.
 * „Anmeldung bestätigen" is the only place that mutates demo state — it reseeds
 * the chosen persona and redirects (both handled by `onConfirm`).
 *
 * Layout: the credential hero + ONE transmission panel (Empfänger/Zweck/
 * Rechtsgrundlage, text-led columns) carry the trust story; the attribute
 * lists are quiet receipt rows without per-row chips or icons; the live
 * counter sits in the footer next to the actions (ai-design-tells §1).
 */
export function OnboardingTransparency({
  personaId,
  onBack,
  onConfirm,
}: OnboardingTransparencyProps) {
  const t = useTranslations('onboarding.transparency');
  const tFlow = useTranslations('onboarding');
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
    <Card className="mx-auto w-full max-w-3xl gap-0 p-6 sm:p-8">
      {/* 1) Heading */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {tFlow('wizard_step', { current: 3, total: 3 })}
          </p>
          <MockWatermarkBanner variant="inline" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      {/* 2) eID hero credential */}
      <div className="mt-6">
        <EidCredentialCard
          variant="hero"
          name={attrs.name}
          nationality={attrs.nationality}
          birthYear={attrs.birthYear}
          birthdate={attrs.birthdate}
        />
      </div>

      {/* 3) Recipient / purpose / legal-basis panel — the screen's one panel */}
      <div className="lg-aux-panel mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface-muted/40 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-0">
          <PanelFact
            label={t('panel.empfaenger_label')}
            value={t('panel.empfaenger_value')}
            sub={t('panel.empfaenger_sub')}
          />
          <PanelFact
            label={t('panel.zweck_label')}
            value={t('panel.zweck_value')}
            sub={t('panel.zweck_sub')}
            className="border-t border-border pt-4 sm:border-s sm:border-t-0 sm:pt-0 sm:ps-5"
          />
          <PanelFact
            label={t('panel.rechtsgrundlage_label')}
            value={t('panel.rechtsgrundlage_value')}
            sub={t('panel.rechtsgrundlage_sub')}
            className="border-t border-border pt-4 sm:border-s sm:border-t-0 sm:pt-0 sm:ps-5"
          />
        </div>

        <div className="border-t border-border" />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
            <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
            {t('panel.secure_line')}
          </p>
          <Badge
            variant="success"
            leadingIcon={<Check aria-hidden="true" />}
          >
            {t('panel.trusted_service')}
          </Badge>
        </div>

        <p className="text-xs text-text-secondary">
          {t('panel.eudi_context_note')}
        </p>
      </div>

      {/* 4) Pflichtangaben — quiet receipt rows, verification stated once */}
      <section className="mt-7 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text-primary">
            {t('required_group')}
          </h2>
          <p className="inline-flex items-start gap-1.5 text-sm text-text-secondary">
            <Check
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            {t('required_caption')}
          </p>
        </div>

        <dl className="flex flex-col divide-y divide-border">
          <AttrRow label={t('attr.name')} value={attrs.name} />
          <AttrRow
            label={t('attr.birthdate')}
            value={<span className="tabular-nums">{attrs.birthdate}</span>}
          />
          <AttrRow label={t('attr.address')} value={attrs.address} />
          <AttrRow label={t('attr.nationality')} value={attrs.nationality} />
        </dl>
      </section>

      {/* 5) Optionale Angaben — same rows plus a real consent switch */}
      <section className="mt-7 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text-primary">
            {t('optional_group')}
          </h2>
          <p className="text-sm text-text-secondary">{t('optional_caption')}</p>
        </div>

        <dl className="flex flex-col divide-y divide-border">
          <AttrRow
            label={t('attr.marital_status')}
            value={
              shareMarital ? (
                attrs.maritalStatus
              ) : (
                <span className="text-text-muted">{t('not_shared')}</span>
              )
            }
            control={
              <label className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center">
                <span className="sr-only">
                  {`${t('share_toggle')}: ${t('attr.marital_status')}`}
                </span>
                <Switch checked={shareMarital} onCheckedChange={setShareMarital} />
              </label>
            }
          />
          <AttrRow
            label={t('attr.tax_id')}
            value={
              shareTaxId ? (
                <MaskedTaxId value={attrs.taxId} revealLabel={t('attr.tax_id')} />
              ) : (
                <span className="text-text-muted">{t('not_shared')}</span>
              )
            }
            control={
              <label className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center">
                <span className="sr-only">
                  {`${t('share_toggle')}: ${t('attr.tax_id')}`}
                </span>
                <Switch checked={shareTaxId} onCheckedChange={setShareTaxId} />
              </label>
            }
          />
        </dl>
      </section>

      {/* 6) Footer — live counter next to the actions */}
      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <p
            aria-live="polite"
            className="text-sm font-semibold text-text-primary"
          >
            {t('counter', { shared: sharedCount, total: totalCount })}
          </p>
          <p className="text-xs text-text-secondary">{t('adjust_hint')}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onBack} disabled={committing}>
            {t('back')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={committing}
            aria-busy={committing}
            className="lg-iridescent"
          >
            {committing ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t('committing')}
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden="true" />
                {t('confirm')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface PanelFactProps {
  label: string;
  value: string;
  sub: string;
  /** Divider/spacing utilities the parent grid uses to draw the hairlines. */
  className?: string;
}

function PanelFact({ label, value, sub, className }: PanelFactProps) {
  return (
    <div className={className ? `flex min-w-0 flex-col gap-0.5 ${className}` : 'flex min-w-0 flex-col gap-0.5'}>
      <span className={PANEL_EYEBROW}>{label}</span>
      <span className="text-sm font-semibold text-text-primary">
        <bdi>{value}</bdi>
      </span>
      <span className="text-xs text-text-secondary">
        <bdi>{sub}</bdi>
      </span>
    </div>
  );
}

interface AttrRowProps {
  label: string;
  value: React.ReactNode;
  /** Optional trailing control (the consent switch on optional rows). */
  control?: React.ReactNode;
}

function AttrRow({ label, value, control }: AttrRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      <dt className="min-w-0 text-sm text-text-secondary">{label}</dt>
      {/* value + switch stay one unit — on narrow screens the unit wraps BELOW
          the label as a whole instead of scattering around it */}
      <dd className="ms-auto flex min-w-0 items-center justify-end gap-3 text-end text-sm font-medium text-text-primary">
        <span className="min-w-0 break-words">{value}</span>
        {control}
      </dd>
    </div>
  );
}
