'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/mock-backend';
import type { ErstelleVorgangAusBriefTyp } from '@/lib/mock-backend/api';
import type { Letter } from '@/types';

import { ARCHETYPE_TO_VORGANG_TYP } from './letter-archetype-actions';

type VorgangsTypForLetter = Extract<
  ErstelleVorgangAusBriefTyp,
  | 'steuer-jahr'
  | 'familienkasse'
  | 'aufenthaltstitel-verlaengerung'
  | 'sonstige'
>;

interface NeuerVorgangAusBriefModalProps {
  letter: Letter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: Callback nach erfolgreichem Anlegen (z. B. Liste neu laden). */
  onCreated?: (vorgangId: string) => void;
}

const VORGANGS_TYPEN: VorgangsTypForLetter[] = [
  'steuer-jahr',
  'familienkasse',
  'aufenthaltstitel-verlaengerung',
  'sonstige',
];

/**
 * Modal „Neuen Vorgang aus diesem Brief anlegen?" (Spec §4.4.2).
 * Auto-vorgeschlagener Vorgangs-Typ basiert auf `letter.archetype`,
 * Bürger:in kann manuell ändern.
 */
export function NeuerVorgangAusBriefModal({
  letter,
  open,
  onOpenChange,
  onCreated,
}: NeuerVorgangAusBriefModalProps) {
  const t = useTranslations('posteingang.reader.neuer_vorgang');
  const tCommon = useTranslations('common.cta');
  const router = useRouter();

  const [vorgangsTyp, setVorgangsTyp] = React.useState<VorgangsTypForLetter>(
    'sonstige',
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (letter?.archetype) {
      setVorgangsTyp(ARCHETYPE_TO_VORGANG_TYP[letter.archetype] ?? 'sonstige');
    } else {
      setVorgangsTyp('sonstige');
    }
  }, [letter?.archetype]);

  async function onSubmit() {
    if (!letter) return;
    setSubmitting(true);
    try {
      const result = await api.erstelleVorgangAusBrief(
        letter.id,
        vorgangsTyp,
      );
      toast.success(t('toast_success'));
      onOpenChange(false);
      onCreated?.(result.vorgangId);
      router.push(`/vorgaenge/${result.vorgangId}`);
    } catch {
      toast.error(t('toast_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('body_template', { typ: t(`vorgangs_typ.${vorgangsTyp}`) })}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('typ_legend')}
          </legend>
          <ul className="flex flex-col gap-1.5">
            {VORGANGS_TYPEN.map((vt) => {
              const id = `vt-${vt}`;
              return (
                <li key={vt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={id}
                    name="vorgangs-typ"
                    value={vt}
                    checked={vorgangsTyp === vt}
                    onChange={() => setVorgangsTyp(vt)}
                    className="size-4 accent-foreground"
                  />
                  <label htmlFor={id} className="text-sm">
                    {t(`vorgangs_typ.${vt}`)}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {tCommon('abbrechen')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? t('submitting') : t('cta_anlegen')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
