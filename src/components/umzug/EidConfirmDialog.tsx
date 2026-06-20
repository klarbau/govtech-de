'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Fingerprint } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EidConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  behoerdeName: string;
  onConfirm: () => Promise<void> | void;
  /** Optional copy overrides for the generic Lebenslagen flows. When omitted,
   *  the Umzug eID-dialog strings are used (backward-compatible default). */
  title?: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function EidConfirmDialog({
  open,
  onOpenChange,
  behoerdeName,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
}: EidConfirmDialogProps) {
  const t = useTranslations('umzug.run.eid_dialog');
  const titleText = title ?? t('title');
  const bodyText = body ?? t('body_template', { behoerde: behoerdeName });
  const confirmText = confirmLabel ?? t('cta_confirm');
  const cancelText = cancelLabel ?? t('cta_cancel');
  const reducedMotion = useReducedMotion();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!open) setPulsing(false);
  }, [open]);

  async function handleConfirm() {
    setPulsing(true);
    try {
      await onConfirm();
    } finally {
      setPulsing(false);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{bodyText}</DialogDescription>
        </DialogHeader>
        <div
          className="flex items-center justify-center py-6"
          aria-hidden={!pulsing}
        >
          <motion.span
            className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary"
            animate={
              pulsing && !reducedMotion
                ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }
                : { scale: 1, opacity: 1 }
            }
            transition={{
              duration: reducedMotion ? 0 : 1.5,
              repeat: pulsing && !reducedMotion ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            <Fingerprint className="size-10" aria-hidden="true" />
          </motion.span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pulsing}
          >
            <Fingerprint aria-hidden="true" />
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
