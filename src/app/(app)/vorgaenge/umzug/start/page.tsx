'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import {
  AdresseInput,
  PLZ_REGEX,
  emptyAdresseValue,
  toAdresse,
  type AdresseFormValue,
} from '@/components/umzug/AdresseInput';
import { WizardProgress } from '@/components/umzug/WizardProgress';
import { WohnungsgeberUpload } from '@/components/umzug/WohnungsgeberUpload';
import { useUmzugDraft } from '@/stores/umzugDraft';

export default function UmzugStartPage() {
  const router = useRouter();
  const t = useTranslations('umzug.start');
  const tCommon = useTranslations('common');
  const setDraft = useUmzugDraft((s) => s.setDraft);

  const [adresse, setAdresse] = useState<AdresseFormValue>(emptyAdresseValue);
  const [stichtag, setStichtag] = useState('');
  const [wohnungsgeber, setWohnungsgeber] = useState<{
    filename: string | null;
    isDemo: boolean;
  }>({ filename: null, isDemo: false });
  const [errors, setErrors] = useState<{
    plz?: string;
    wohnungsgeber?: string;
    fields?: string;
  }>({});

  const titleId = 'umzug-start-title';

  function validateAndSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = {};

    if (!PLZ_REGEX.test(adresse.plz.trim())) {
      next.plz = t('error.plz_invalid');
    }
    if (!wohnungsgeber.filename) {
      next.wohnungsgeber = t('error.wohnungsgeber_missing');
    }
    if (
      !adresse.strasse.trim() ||
      !adresse.hausnummer.trim() ||
      !adresse.ort.trim() ||
      !stichtag
    ) {
      next.fields = t('error.felder_unvollstaendig');
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setDraft({
      neueAdresse: toAdresse(adresse),
      stichtagIso: stichtag,
      wohnungsgeber,
    });
    router.push('/vorgaenge/umzug/preview');
  }

  return (
    <form
      onSubmit={validateAndSubmit}
      aria-labelledby={titleId}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tCommon('cta.zurueck')}
        </Link>
        <WizardProgress currentStep={0} />
        <div className="flex flex-col gap-2">
          <h1
            id={titleId}
            className="text-3xl font-semibold tracking-tight text-foreground"
          >
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader />
        <CardContent className="flex flex-col gap-6">
          <AdresseInput
            value={adresse}
            onChange={setAdresse}
            plzError={errors.plz}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stichtag">{t('stichtag.label')}</Label>
            <p id="stichtag-helper" className="text-xs text-muted-foreground">
              {t('stichtag.helper')}
            </p>
            <Input
              id="stichtag"
              type="date"
              value={stichtag}
              onChange={(e) => setStichtag(e.target.value)}
              required
              aria-describedby="stichtag-helper"
              className="w-fit"
            />
          </div>
        </CardContent>
      </Card>

      <WohnungsgeberUpload
        onChange={setWohnungsgeber}
        errorId="wohnungsgeber-error"
        errorMessage={errors.wohnungsgeber}
      />

      {errors.fields ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.fields}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          <span>{t('cta_weiter')}</span>
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>

      <PrototypeDisclaimer />
    </form>
  );
}
