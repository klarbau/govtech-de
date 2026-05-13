'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import {
  CalendarPlus,
  Eye,
  Download,
  CheckCheck,
  MoreVertical,
  PenSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LetterFrist, Reply } from '@/types';

interface StickyFristActionProps {
  fristen: LetterFrist[];
  /** Bereits beantwortet → Datum für „Bereits beantwortet am" Hinweis. */
  alreadyRepliedAt: string | null;
  /**
   * Alle gesendeten Replies, chronologisch aufsteigend (Spec § 8.5). Bei
   * `replies.length >= 2` rendert der Hint die dual-template-Variante mit
   * den Labels der beiden letzten Replies.
   */
  replies?: Reply[];
  /** Existierender Draft → CTA-Label wechselt auf „Entwurf weiter schreiben". */
  hasDraft: boolean;
  /** Reply existiert → Reply-Button wird zu „Erneut antworten" / „Versendete Antwort anzeigen". */
  hasSentReply: boolean;
  onCalendar: (frist: LetterFrist) => void;
  onReply: () => void;
  onViewSent: () => void;
  onSavePlain: () => void;
  onShowOriginal: () => void;
  onMarkRead: () => void;
  /** ISO-Datum „now" für SSR-stabile Tag-Labels. */
  fromIso?: string;
  className?: string;
}

/**
 * Sticky-Action-Band (Spec §4.2). Auf `md..xl` als Bottom-Band; auf `xl` als
 * 4. Spalte mit `sticky top-N` (Architect-Empfehlung); auf Mobile als fixed
 * Bottom-Sheet. Frontend-coder hat den Cut-off-Breakpoint zwischen md/lg/xl
 * frei — für V1.5 wird `md` als Sticky-Bottom-Schwelle gewählt (alle Desktops
 * erhalten konsistent das Bottom-Band; eine 4. Spalte wäre nur auf >1280 px
 * brauchbar und schlüge das Side-by-Side schmaler).
 */
export function StickyFristAction({
  fristen,
  alreadyRepliedAt,
  replies,
  hasDraft,
  hasSentReply,
  onCalendar,
  onReply,
  onViewSent,
  onSavePlain,
  onShowOriginal,
  onMarkRead,
  fromIso,
  className,
}: StickyFristActionProps) {
  const t = useTranslations('posteingang.sticky_action');
  const tReader = useTranslations('posteingang.reader');
  const tPicker = useTranslations('posteingang.compose.template_picker');

  const earliest = fristen[0];
  const fristLabel = (() => {
    if (!earliest) return t('frist_label_no_frist');
    const datum = format(parseISO(earliest.datum), 'dd.MM.yyyy', { locale: de });
    const days = differenceInCalendarDays(
      parseISO(earliest.datum),
      fromIso ? parseISO(fromIso) : new Date(),
    );
    const tageTemplate =
      days < 0
        ? tReader('frist_chip_abgelaufen_template', { datum })
        : days === 0
          ? tReader('frist_chip_today')
          : tReader('frist_chip_days_template', { tage: days });
    return t('frist_label_template', { datum, tage_template: tageTemplate });
  })();

  const replyLabel = hasDraft
    ? t('cta_reply_resume_draft')
    : hasSentReply
      ? t('cta_reply_again')
      : t('cta_reply');

  const formattedReplyDate = alreadyRepliedAt
    ? format(parseISO(alreadyRepliedAt), 'dd.MM.yyyy', { locale: de })
    : null;

  /**
   * Spec § 8.5 — Cross-Template-Versand-Pfad: bei zwei oder mehr versendeten
   * Replies wird der dual-template-Hint genutzt. Für 3+ Replies werden die
   * zwei letzten (chronologisch jüngsten) verwendet.
   */
  function lookupTemplateLabel(reply: Reply): string {
    if (!reply.template_id) return t('cta_reply');
    try {
      return tPicker(`${reply.template_id}.label`);
    } catch {
      return reply.template_id;
    }
  }
  const sentReplies = (replies ?? []).filter(
    (r) => r.status === 'sent_simulated',
  );
  const isDualTemplateReply = sentReplies.length >= 2;
  const dualTemplateHint = (() => {
    if (!isDualTemplateReply) return null;
    const lastTwo = sentReplies.slice(-2);
    const [a, b] = lastTwo;
    if (!a || !b) return null;
    const refDate = b.sent_at ?? a.sent_at;
    if (!refDate) return null;
    let datum: string;
    try {
      datum = format(parseISO(refDate), 'dd.MM.yyyy', { locale: de });
    } catch {
      datum = refDate;
    }
    return t('already_replied_dual_template', {
      datum,
      template_a_label: lookupTemplateLabel(a),
      template_b_label: lookupTemplateLabel(b),
    });
  })();

  return (
    <aside
      aria-label={t('overflow_label')}
      className={cn(
        // Mobile: fixed Bottom-Sheet. Desktop ≥ md: sticky right-rail Bottom-Band.
        'sticky bottom-0 z-30 -mx-4 mt-4 flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:rounded-xl md:border md:border-border md:px-4 md:py-3 md:shadow-md',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
            earliest
              ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300/60 dark:bg-amber-900/40 dark:text-amber-100'
              : 'bg-muted text-muted-foreground ring-1 ring-border',
          )}
        >
          {fristLabel}
        </span>
        {dualTemplateHint ? (
          <span className="text-xs text-muted-foreground">
            {dualTemplateHint}
          </span>
        ) : alreadyRepliedAt && formattedReplyDate ? (
          <span className="text-xs text-muted-foreground">
            {t('already_replied_template', { datum: formattedReplyDate })}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {earliest && earliest.citation_match !== false && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCalendar(earliest)}
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            {t('cta_kalender')}
          </Button>
        )}
        {hasSentReply && !hasDraft ? (
          <Button type="button" size="sm" onClick={onViewSent} variant="outline">
            {t('cta_reply_view_sent')}
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={onReply}>
          <PenSquare className="size-4" aria-hidden="true" />
          {replyLabel}
        </Button>
        <MenuPrimitive.Root>
          <MenuPrimitive.Trigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('overflow_label')}
              />
            }
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </MenuPrimitive.Trigger>
          <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner sideOffset={6} align="end">
              <MenuPrimitive.Popup className="z-50 min-w-56 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
                <MenuPrimitive.Item
                  onClick={onSavePlain}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-highlighted:bg-muted"
                >
                  <Download className="size-4" aria-hidden="true" />
                  <span>{t('overflow.speichern')}</span>
                </MenuPrimitive.Item>
                <MenuPrimitive.Item
                  onClick={onShowOriginal}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-highlighted:bg-muted"
                >
                  <Eye className="size-4" aria-hidden="true" />
                  <span>{t('overflow.original_pdf')}</span>
                </MenuPrimitive.Item>
                <MenuPrimitive.Item
                  onClick={onMarkRead}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-highlighted:bg-muted"
                >
                  <CheckCheck className="size-4" aria-hidden="true" />
                  <span>{t('overflow.markiere_gelesen')}</span>
                </MenuPrimitive.Item>
              </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
          </MenuPrimitive.Portal>
        </MenuPrimitive.Root>
      </div>
    </aside>
  );
}
