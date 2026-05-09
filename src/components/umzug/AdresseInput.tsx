'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Adresse } from '@/types';

export interface AdresseFormValue {
  strasse: string;
  hausnummer: string;
  zusatz: string;
  plz: string;
  ort: string;
}

export const PLZ_REGEX = /^\d{5}$/;

export const emptyAdresseValue: AdresseFormValue = {
  strasse: '',
  hausnummer: '',
  zusatz: '',
  plz: '',
  ort: '',
};

export function toAdresse(value: AdresseFormValue): Adresse {
  return {
    strasse: value.strasse.trim(),
    hausnummer: value.hausnummer.trim(),
    zusatz: value.zusatz.trim() || undefined,
    plz: value.plz.trim(),
    ort: value.ort.trim(),
    land: 'DE',
  };
}

interface AdresseInputProps {
  value: AdresseFormValue;
  onChange: (next: AdresseFormValue) => void;
  plzError?: string;
  required?: boolean;
}

export function AdresseInput({
  value,
  onChange,
  plzError,
  required = true,
}: AdresseInputProps) {
  const t = useTranslations('umzug.start.adresse');
  const baseId = useId();
  const ids = {
    strasse: `${baseId}-strasse`,
    hausnummer: `${baseId}-hausnummer`,
    zusatz: `${baseId}-zusatz`,
    plz: `${baseId}-plz`,
    plzError: `${baseId}-plz-error`,
    ort: `${baseId}-ort`,
  };

  function update<K extends keyof AdresseFormValue>(
    key: K,
    next: AdresseFormValue[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-medium text-foreground">
        {t('label')}
      </legend>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.strasse}>{t('strasse')}</Label>
          <Input
            id={ids.strasse}
            value={value.strasse}
            onChange={(e) => update('strasse', e.target.value)}
            autoComplete="address-line1"
            required={required}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.hausnummer}>{t('hausnummer')}</Label>
          <Input
            id={ids.hausnummer}
            value={value.hausnummer}
            onChange={(e) => update('hausnummer', e.target.value)}
            inputMode="text"
            required={required}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.zusatz}>{t('zusatz')}</Label>
          <Input
            id={ids.zusatz}
            value={value.zusatz}
            onChange={(e) => update('zusatz', e.target.value)}
            autoComplete="address-line2"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.plz}>{t('plz')}</Label>
          <Input
            id={ids.plz}
            value={value.plz}
            onChange={(e) => update('plz', e.target.value)}
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            autoComplete="postal-code"
            aria-invalid={Boolean(plzError) || undefined}
            aria-describedby={plzError ? ids.plzError : undefined}
            required={required}
          />
          {plzError ? (
            <p
              id={ids.plzError}
              className="text-xs text-destructive"
              role="alert"
            >
              {plzError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.ort}>{t('ort')}</Label>
          <Input
            id={ids.ort}
            value={value.ort}
            onChange={(e) => update('ort', e.target.value)}
            autoComplete="address-level2"
            required={required}
          />
        </div>
      </div>
    </fieldset>
  );
}
