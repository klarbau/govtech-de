'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ConsentToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  describedById?: string;
  disabled?: boolean;
}

export function ConsentToggle({
  checked,
  onCheckedChange,
  label,
  describedById,
  disabled,
}: ConsentToggleProps) {
  const id = useId();
  const t = useTranslations('umzug.preview.block_b');

  return (
    <div className="flex items-start gap-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={describedById}
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <span id={describedById} className="text-xs text-muted-foreground">
          {t('consent_helper')}
        </span>
      </div>
    </div>
  );
}
