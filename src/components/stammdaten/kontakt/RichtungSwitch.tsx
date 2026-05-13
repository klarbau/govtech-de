'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type Richtung = 'alle' | 'eingehend' | 'ausgehend' | 'intern';

interface RichtungSwitchProps {
  value: Richtung;
  onChange: (value: Richtung) => void;
  className?: string;
}

const ORDER: Richtung[] = ['alle', 'eingehend', 'ausgehend', 'intern'];

/**
 * `<RichtungSwitch>` — Spec § 6.11 + Hard-Line § 11.40.
 *
 * Filter-Switch oberhalb des Aktivitätsprotokolls. 4 Werte:
 * alle / eingehend / ausgehend / intern. Default „alle".
 *
 * a11y: native `<fieldset>` / `<legend>` mit `<input type="radio">`-Gruppe;
 * `aria-label` über die Legende.
 */
export function RichtungSwitch({
  value,
  onChange,
  className,
}: RichtungSwitchProps) {
  const t = useTranslations('stammdaten.aktivitaet.richtung');

  return (
    <fieldset
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 text-xs',
        className,
      )}
      data-testid="richtung-switch"
    >
      <legend className="sr-only">{t('label')}</legend>
      {ORDER.map((opt) => (
        <label
          key={opt}
          className={cn(
            'inline-flex cursor-pointer items-center rounded px-2 py-1 font-medium transition-colors',
            value === opt
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <input
            type="radio"
            name="richtung"
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
            data-testid={`richtung-switch-${opt}`}
          />
          {t(`${opt}.label`)}
        </label>
      ))}
    </fieldset>
  );
}
