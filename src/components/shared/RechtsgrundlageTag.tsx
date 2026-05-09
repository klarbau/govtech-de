'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RechtsgrundlageTagProps {
  norm: string;
  i18nKey?: string;
}

export function RechtsgrundlageTag({ norm, i18nKey }: RechtsgrundlageTagProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const detail = i18nKey ? t(i18nKey) : norm;
  const title = t('umzug.rechtsgrundlage.detail_title');
  const opener = t('umzug.rechtsgrundlage.open_cta');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${opener}: ${norm}`}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
      >
        <Scale className="size-3" aria-hidden="true" />
        <span>{norm}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {norm}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-foreground">{detail}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
