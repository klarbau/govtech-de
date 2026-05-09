'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FristDetailModalProps {
  triggerLabel?: string;
}

/**
 * The Bußgeld disclaimer copy lives ONLY in this component (per spec §8 ruling).
 * Code review will grep for the i18n key to confirm isolation. Do not lift the
 * text into siblings, tooltips, or hero/preview/run surfaces.
 */
export function FristDetailModal({ triggerLabel }: FristDetailModalProps) {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);

  const label = triggerLabel ?? t('frist_detail.open_cta');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
      >
        <Clock3 className="size-3" aria-hidden="true" />
        <span>{label}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg"
          data-bussgeld-context="frist-detail-modal"
        >
          <DialogHeader>
            <DialogTitle>{t('frist_detail.title')}</DialogTitle>
            <DialogDescription>§ 17 BMG · § 54 BMG</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-foreground">
            {t('disclaimer.bussgeld_frist_modal')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('frist_detail.close_cta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
