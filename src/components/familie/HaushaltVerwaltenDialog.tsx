'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HaushaltVerwaltenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Speculative „Haushalt verwalten"-Dialog. The household-management workflow
 * (digital powers of attorney, add/remove members) is a 2027-Vision — this
 * dialog only states that the function is upcoming. No mutation path
 * (consistent with the read-/wegweiser-layer). Base-UI traps + restores focus.
 */
export function HaushaltVerwaltenDialog({
  open,
  onOpenChange,
}: HaushaltVerwaltenDialogProps) {
  const t = useTranslations('familie.verwalten_dialog');
  const tRoot = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <Badge variant="info" size="md" leadingIcon={<Sparkles />}>
            {tRoot('common.context_chip.speculative')}
          </Badge>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t('close')}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
