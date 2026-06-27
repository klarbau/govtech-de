'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  onConfirm: () => Promise<void> | void;
  /** Vom Aufrufer aufgelöste Dialog-Texte (jeder Konsument übergibt sie). */
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
}

export function EidConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
}: EidConfirmDialogProps) {
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div
          className="flex items-center justify-center py-6"
          aria-hidden="true"
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
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pulsing}
          >
            <Fingerprint aria-hidden="true" />
            <span>{confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
