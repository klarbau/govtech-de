'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Check,
  CheckCircle2,
  Crosshair,
  Eye,
  EyeOff,
  Globe,
  Hash,
  Info,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { EidCredentialCard } from '@/components/onboarding/EidCredentialCard';
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

const PANEL_EYEBROW = 'text-[11px] font-semibold uppercase tracking-wide text-text-muted';
const BADGE_OUTLINE_NEUTRAL =
  'rounded-full border border-border px-2 py-0.5 text-xs font-medium text-text-secondary';

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
    <Card className="mx-auto w-full max-w-3xl gap-0 p-6 sm:p-8">
      {/* 1) Demo banner */}
      <div
        role="note"
        className="flex items-center gap-2 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-text-secondary"
      >
        <Info className="size-4 shrink-0 text-success" aria-hidden="true" />
        {t('demo_banner')}
      </div>

      {/* 2) Heading */}
      <div className="mt-6 flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      {/* 3) eID hero credential */}
      <div className="mt-6">
        <EidCredentialCard
          variant="hero"
          name={attrs.name}
          nationality={attrs.nationality}
          birthYear={attrs.birthYear}
          birthdate={attrs.birthdate}
        />
      </div>

      {/* 4) Recipient / purpose / legal-basis panel */}
      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface-muted/40 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PanelFact
            icon={Landmark}
            label={t('panel.empfaenger_label')}
            value={t('panel.empfaenger_value')}
            sub={t('panel.empfaenger_sub')}
          />
          <PanelFact
            icon={Crosshair}
            label={t('panel.zweck_label')}
            value={t('panel.zweck_value')}
            sub={t('panel.zweck_sub')}
          />
          <PanelFact
            label={t('panel.rechtsgrundlage_label')}
            value={t('panel.rechtsgrundlage_value')}
            sub={t('panel.rechtsgrundlage_sub')}
            paragraphGlyph
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

      {/* 5) Pflichtangaben */}
      <section className="mt-7 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              {t('required_group')}
            </h2>
            <span className="rounded-full border border-success/30 px-2 py-0.5 text-xs font-medium text-success">
              {t('required_badge')}
            </span>
          </div>
          <p className="text-sm text-text-secondary">{t('required_caption')}</p>
        </div>

        <dl className="flex flex-col divide-y divide-border">
          <RequiredAttrRow
            icon={User}
            label={t('attr.name')}
            value={attrs.name}
            verifiedLabel={t('verified')}
            requiredLabel={t('required_item')}
          />
          <RequiredAttrRow
            icon={Calendar}
            label={t('attr.birthdate')}
            value={<span className="tabular-nums">{attrs.birthdate}</span>}
            verifiedLabel={t('verified')}
            requiredLabel={t('required_item')}
          />
          <RequiredAttrRow
            icon={MapPin}
            label={t('attr.address')}
            value={attrs.address}
            verifiedLabel={t('verified')}
            requiredLabel={t('required_item')}
          />
          <RequiredAttrRow
            icon={Globe}
            label={t('attr.nationality')}
            value={attrs.nationality}
            verifiedLabel={t('verified')}
            requiredLabel={t('required_item')}
          />
        </dl>
      </section>

      {/* 6) Optionale Angaben */}
      <section className="mt-7 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              {t('optional_group')}
            </h2>
            <span className={BADGE_OUTLINE_NEUTRAL}>{t('optional_badge')}</span>
          </div>
          <p className="text-sm text-text-secondary">{t('optional_caption')}</p>
        </div>

        <dl className="flex flex-col divide-y divide-border">
          <OptionalAttrRow
            icon={Users}
            label={t('attr.marital_status')}
            value={
              shareMarital ? (
                attrs.maritalStatus
              ) : (
                <span className="text-text-muted">{t('not_shared')}</span>
              )
            }
            optionalLabel={t('badge.optional')}
            toggleLabel={`${t('share_toggle')}: ${t('attr.marital_status')}`}
            checked={shareMarital}
            onChange={setShareMarital}
          />
          <OptionalAttrRow
            icon={Hash}
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
            optionalLabel={t('badge.optional')}
            toggleLabel={`${t('share_toggle')}: ${t('attr.tax_id')}`}
            checked={shareTaxId}
            onChange={setShareTaxId}
          />
        </dl>
      </section>

      {/* 7) Counter panel */}
      <div className="mt-7 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <CheckCircle2 className="size-5" />
          </span>
          <div className="flex flex-col">
            <p
              aria-live="polite"
              className="text-sm font-semibold text-text-primary"
            >
              {t('counter', { shared: sharedCount, total: totalCount })}
            </p>
            <p className="text-xs text-text-secondary">{t('adjust_hint')}</p>
          </div>
        </div>
        <SlidersHorizontal
          className="size-5 shrink-0 text-text-muted"
          aria-hidden="true"
        />
      </div>

      {/* 8) Trust strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-3 sm:p-5">
        <TrustItem
          icon={ShieldCheck}
          title={t('trust.consent_title')}
          desc={t('trust.consent_desc')}
        />
        <TrustItem
          icon={Lock}
          title={t('trust.dsgvo_title')}
          desc={t('trust.dsgvo_desc')}
        />
        <TrustItem
          icon={ShieldCheck}
          title={t('trust.secure_title')}
          desc={t('trust.secure_desc')}
        />
      </div>

      {/* 9) Footer actions */}
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
            <>
              <Lock className="size-4" aria-hidden="true" />
              {t('confirm')}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

interface PanelFactProps {
  icon?: LucideIcon;
  label: string;
  value: string;
  sub: string;
  /** Render the literal „§" section sign instead of a lucide icon. */
  paragraphGlyph?: boolean;
}

function PanelFact({ icon: Icon, label, value, sub, paragraphGlyph }: PanelFactProps) {
  return (
    <div className="flex items-start gap-2.5">
      {paragraphGlyph ? (
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-base font-semibold leading-none text-text-muted"
        >
          §
        </span>
      ) : Icon ? (
        <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
      ) : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={PANEL_EYEBROW}>{label}</span>
        <span className="text-sm font-semibold text-text-primary">
          <bdi>{value}</bdi>
        </span>
        <span className="text-xs text-text-secondary">
          <bdi>{sub}</bdi>
        </span>
      </div>
    </div>
  );
}

interface RequiredAttrRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  verifiedLabel: string;
  requiredLabel: string;
}

function RequiredAttrRow({
  icon: Icon,
  label,
  value,
  verifiedLabel,
  requiredLabel,
}: RequiredAttrRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-text-secondary">
        <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-end text-sm font-medium text-text-primary">
        <span className="min-w-0 break-words">{value}</span>
        <Badge variant="success" leadingIcon={<Check aria-hidden="true" />}>
          {verifiedLabel}
        </Badge>
        <span className={BADGE_OUTLINE_NEUTRAL}>{requiredLabel}</span>
      </dd>
    </div>
  );
}

interface OptionalAttrRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  optionalLabel: string;
  toggleLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function OptionalAttrRow({
  icon: Icon,
  label,
  value,
  optionalLabel,
  toggleLabel,
  checked,
  onChange,
}: OptionalAttrRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-text-secondary">
        <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-end text-sm font-medium text-text-primary">
        <span className="min-w-0 break-words">{value}</span>
        <label className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center">
          <span className="sr-only">{toggleLabel}</span>
          <Switch checked={checked} onCheckedChange={onChange} />
        </label>
        <span className={cn(BADGE_OUTLINE_NEUTRAL, 'shrink-0')}>{optionalLabel}</span>
      </dd>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon className="size-4 shrink-0 text-success" aria-hidden="true" />
        {title}
      </p>
      <p className="text-xs text-text-secondary">{desc}</p>
    </div>
  );
}
