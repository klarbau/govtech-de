'use client';

import { useTranslations } from 'next-intl';
import { QrCode, ShieldCheck, ShieldOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import { KeyValueRow } from '@/components/shared/KeyValueRow';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateDe } from '@/lib/utils';
import type { Document } from '@/types';

import type { DocumentStatus } from './deriveDocumentStatus';

interface DokumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  behoerdeName: string;
  status: DocumentStatus;
  statusLabel: string;
}

/**
 * Dokument-Vorschau mit `[MOCK]`-Watermark, Kopfdaten, synthetischem
 * QR-Prüfcode und EUDI-Export-Hinweis. Read-only (Vault § 10).
 */
export function DokumentPreviewDialog({
  open,
  onOpenChange,
  document,
  behoerdeName,
  status,
  statusLabel,
}: DokumentPreviewDialogProps) {
  const t = useTranslations('dokumente');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('preview.title')}</DialogTitle>
          {document ? (
            <DialogDescription>{document.titel}</DialogDescription>
          ) : null}
        </DialogHeader>

        {document ? (
          <div className="space-y-4">
            <MockWatermarkBanner />

            <div className="divide-y divide-border rounded-lg border border-border px-4">
              <KeyValueRow
                label={t('preview.aussteller')}
                value={behoerdeName}
              />
              {document.dokument_nr ? (
                <KeyValueRow
                  label={t('preview.nr_label')}
                  value={
                    <span className="tabular-nums" dir="ltr">
                      {document.dokument_nr}
                    </span>
                  }
                />
              ) : null}
              <KeyValueRow
                label={t('preview.ausgestellt_label')}
                value={
                  <span className="tabular-nums" dir="ltr">
                    {formatDateDe(document.ausgestellt_am)}
                  </span>
                }
              />
              <KeyValueRow
                label={t('preview.gueltig_bis_label')}
                value={
                  document.gueltig_bis ? (
                    <span className="tabular-nums" dir="ltr">
                      {formatDateDe(document.gueltig_bis)}
                    </span>
                  ) : (
                    t('daten.unbefristet')
                  )
                }
              />
              <KeyValueRow
                label={t('col.status')}
                value={
                  <StatusBadge variant={status}>{statusLabel}</StatusBadge>
                }
              />
            </div>

            <div className="rounded-lg border border-border bg-surface-muted/40 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <QrCode className="size-4 text-text-secondary" aria-hidden="true" />
                {t('preview.qr_label')}
              </p>
              <p
                className="break-all rounded-md bg-surface px-3 py-2 font-mono text-xs text-text-secondary"
                dir="ltr"
              >
                {document.qr_payload}
              </p>
            </div>

            <p
              className={cn(
                'flex items-center gap-1.5 text-sm',
                document.eudi_compatible ? 'text-success' : 'text-text-muted',
              )}
            >
              {document.eudi_compatible ? (
                <ShieldCheck className="size-4" aria-hidden="true" />
              ) : (
                <ShieldOff className="size-4" aria-hidden="true" />
              )}
              {document.eudi_compatible
                ? t('preview.eudi_yes')
                : t('preview.eudi_no')}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
