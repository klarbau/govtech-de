'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RechtsgrundlageDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  norm: string;
  i18nKey: string;
}

export function RechtsgrundlageDetail({
  open,
  onOpenChange,
  norm,
  i18nKey,
}: RechtsgrundlageDetailProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('umzug.rechtsgrundlage.detail_title')}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {norm}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-foreground">{t(i18nKey)}</p>
      </DialogContent>
    </Dialog>
  );
}
