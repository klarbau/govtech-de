'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn, formatDateDe, formatTimeDe } from '@/lib/utils';
import type { Reply } from '@/types';

interface ReplyConfirmationViewProps {
  reply: Reply;
  letterId: string;
  empfaengerBehoerde: string;
  /** Heute-Kanal-Realitäts-Check (z. B. „Familienkasse-Online"). */
  kanalHeute: string;
  onClose: () => void;
  onViewSubmittedBody: () => void;
  className?: string;
}

/**
 * [MOCK] Versand-Bestätigungs-View, gerendert im Sheet nach erfolgreichem
 * `sendReplySimulated` (Spec §4.4). Read-only — Body + Anhänge + Kanal +
 * Realitäts-Check.
 */
export function ReplyConfirmationView({
  reply,
  letterId,
  empfaengerBehoerde,
  kanalHeute,
  onClose,
  onViewSubmittedBody,
  className,
}: ReplyConfirmationViewProps) {
  const t = useTranslations('posteingang.compose.confirmation');

  const sentAt = reply.sent_at
    ? t('sent_at_template', {
        datum: formatDateDe(reply.sent_at),
        uhrzeit: formatTimeDe(reply.sent_at),
      })
    : '';

  const receiptText = t('full_receipt_template', {
    kanal_speculative_2027_text: t('kanal_speculative_2027_text'),
    empfaenger_behoerde: empfaengerBehoerde,
  });

  return (
    <section
      aria-labelledby="reply-confirmation-heading"
      className={cn('flex flex-col gap-4', className)}
      aria-live="polite"
    >
      <header className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 size-6 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <h2
            id="reply-confirmation-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {t('headline')}
          </h2>
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            {t('mock_disclaimer')}
          </p>
        </div>
      </header>

      <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">
        <dt className="font-medium text-muted-foreground">
          {t('metadata_label_sent_at')}
        </dt>
        <dd className="text-foreground">{sentAt}</dd>
        <dt className="font-medium text-muted-foreground">
          {t('metadata_label_kanal')}
        </dt>
        <dd className="text-foreground">{reply.kanal ?? '—'}</dd>
        <dt className="font-medium text-muted-foreground">
          {t('metadata_label_files', { count: reply.attachments.length })}
        </dt>
        <dd className="text-foreground">
          {reply.attachments.length === 0 ? (
            <span className="text-muted-foreground">{t('no_attachments')}</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {reply.attachments.map((att, i) => (
                <li
                  key={`${att.name}-${i}`}
                  className="flex items-center gap-1 font-mono text-[11px]"
                >
                  <FileText className="size-3" aria-hidden="true" />
                  <span>{att.name}</span>
                  <span className="text-muted-foreground">
                    ·{' '}
                    {Math.max(1, Math.round(att.size_bytes / 1024)).toLocaleString(
                      'de-DE',
                    )}{' '}
                    KB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>

      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {receiptText}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('kanal_realitaetscheck_template', { kanal_heute: kanalHeute })}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onViewSubmittedBody}>
          {t('view_sent_link')}
        </Button>
        <Link
          href={`/datenschutz?letter=${encodeURIComponent(letterId)}`}
          className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
        >
          {t('cta_view_in_cockpit')}
        </Link>
        <span className="ml-auto" aria-hidden="true" />
        <Button type="button" size="sm" onClick={onClose}>
          {t('cta_close')}
        </Button>
      </div>
    </section>
  );
}
