'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useMessages } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FilePlus2,
  FileText,
  MoreHorizontal,
  PenSquare,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import { NormTooltip } from '@/components/shared/NormTooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  Behoerde,
  Letter,
  LetterAiSummaryPostOpen,
  LetterCitation,
  LetterFrist,
  Reply,
} from '@/types';

import { api } from '@/lib/mock-backend';

import { AiErklaererCard } from './AiErklaererCard';
import { AuthentizitaetsBadge, DEFAULT_AUTH_CHANNEL } from './AuthentizitaetsBadge';
import { BehoerdenAvatarV2 } from './BehoerdenAvatarV2';
import { FristChip } from './FristChip';
import { NeuerVorgangAusBriefModal } from './NeuerVorgangAusBriefModal';
import { OriginaltextBlock, type OriginaltextBlockHandle } from './OriginaltextBlock';
import { ReplySheet } from './ReplySheet';
import { ARCHETYPE_ACTION_DEFAULTS } from './letter-archetype-actions';
import { parseBoldAndNorms } from './utils/parse-bold-norms';

interface LetterReaderProtoProps {
  letter: Letter;
  absender: Behoerde | null;
  vorgangTitle?: string;
  nowIso: string;
}

/**
 * Reads a nested key (`steuerbescheid.zahlung`) out of the
 * `posteingang.was_kann_ich_tun.…` namespace. Returns `null` when missing.
 * Avoids the `try/catch` around `t(id)` anti-pattern.
 */
function lookupCatalogText(
  messages: Record<string, unknown>,
  id: string,
): string | null {
  const segments = id.split('.');
  let cursor: unknown =
    (messages as Record<string, unknown>)['posteingang'];
  if (!cursor || typeof cursor !== 'object') return null;
  cursor = (cursor as Record<string, unknown>)['was_kann_ich_tun'];
  for (const seg of segments) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return typeof cursor === 'string' ? cursor : null;
}

function renderWithNormTooltips(text: string): React.ReactNode {
  const segments = parseBoldAndNorms(text);
  if (segments.length === 0) return text;
  return segments.map((seg, idx) => {
    if (seg.kind === 'bold') {
      return (
        <strong key={`b-${idx}`} className="font-semibold text-foreground">
          {seg.text}
        </strong>
      );
    }
    if (seg.kind === 'norm') {
      return <NormTooltip key={`n-${idx}`} norm={seg.norm} />;
    }
    return <React.Fragment key={`t-${idx}`}>{seg.text}</React.Fragment>;
  });
}

/**
 * Short label for the chip-row buttons. Picks the first 3–4 words from
 * the full catalog text, dropping anything in parentheses (norm citations).
 */
function shortChipLabel(full: string): string {
  const noParen = full.replace(/\s*\([^)]*\)/g, '').trim();
  const words = noParen.split(/\s+/).slice(0, 4);
  return words.join(' ');
}

/**
 * Right-pane Posteingang reader matching `docs/design-prototype-v2/posteingang.html`.
 *
 * Card-style container: 40px Behörden avatar + who/what + "Authentisch
 * geprüft" + kebab menu in the head; H2 + meta-row; AI-Brief-Erklärer card
 * (cobalt-tinted, 3-col grid w/ illustration); Frist row; primary CTA stack;
 * follow-up chips; collapsible "Auszug aus dem Originaltext".
 *
 * The standalone `/posteingang/[id]` page still uses `<LetterReader>` — that
 * route is out of scope for this design pass.
 */
export function LetterReaderProto({
  letter,
  absender,
  vorgangTitle,
  nowIso,
}: LetterReaderProtoProps) {
  const t = useTranslations('posteingang.reader');
  const tCard = useTranslations('posteingang.card');
  const tActions = useTranslations('posteingang.actions');
  const tToast = useTranslations('posteingang.toast');
  const tWasKannIchTun = useTranslations('posteingang.reader.was_kann_ich_tun');
  const router = useRouter();
  const messages = useMessages() as Record<string, unknown>;

  const [summary, setSummary] = React.useState<LetterAiSummaryPostOpen | null>(
    letter.ai_summary?.post_open ?? null,
  );
  const [fristen, setFristen] = React.useState<LetterFrist[]>(
    letter.fristen ?? [],
  );
  const [actionOptions, setActionOptions] = React.useState<string[]>(
    letter.was_kann_ich_tun_options ?? [],
  );
  const [summaryLoading, setSummaryLoading] = React.useState(!summary);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [vorgangModal, setVorgangModal] = React.useState<Letter | null>(null);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [reply, setReply] = React.useState<Reply | null>(null);
  const [originaltextOpen, setOriginaltextOpen] = React.useState(false);

  const originalRef = React.useRef<OriginaltextBlockHandle>(null);
  const originaltextDetailsRef = React.useRef<HTMLDetailsElement>(null);

  // mark-as-read + lazy summary on mount.
  React.useEffect(() => {
    let cancelled = false;
    void api.markiereLetterGelesen(letter.id).catch(() => undefined);
    void api.protokolliereLetterAktivitaet(letter.id, 'opened_in_app');

    if (summary) return () => undefined;

    setSummaryLoading(true);
    setSummaryError(null);
    void api
      .extrahiereAktion(letter.id)
      .then((res) => {
        if (cancelled) return;
        setSummary(res.ai_summary_post_open);
        setFristen(res.fristen);
        setActionOptions(res.was_kann_ich_tun_options);
      })
      .catch(() => {
        if (cancelled) return;
        setSummaryError(t('summary_error'));
      })
      .finally(() => {
        if (cancelled) return;
        setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [letter.id, summary, t]);

  const refreshReplyState = React.useCallback(async () => {
    try {
      const list = await api.getRepliesForLetter(letter.id);
      const sentList = list.filter((r) => r.status === 'sent_simulated');
      setReply(sentList.length > 0 ? (sentList[sentList.length - 1] ?? null) : null);
    } catch {
      setReply(null);
    }
  }, [letter.id]);

  React.useEffect(() => {
    void refreshReplyState();
  }, [refreshReplyState]);

  const onShowInOriginal = React.useCallback((citation: LetterCitation) => {
    if (citation.original_zitat) {
      if (originaltextDetailsRef.current && !originaltextDetailsRef.current.open) {
        originaltextDetailsRef.current.open = true;
        setOriginaltextOpen(true);
      }
      requestAnimationFrame(() => {
        originalRef.current?.scrollToZitat(citation.original_zitat);
      });
    }
  }, []);

  const empfangen = (() => {
    try {
      return format(parseISO(letter.empfangen_am), 'dd.MM.yyyy', { locale: de });
    } catch {
      return letter.empfangen_am;
    }
  })();

  // Reply is sent only after the user confirms a draft; for the demo we
  // present the empfangen timestamp as the "Verifiziert am" caption — the
  // signature check happens at receive-time, not on read.
  const verifiziertAm = empfangen;

  const archetype = letter.archetype ?? 'sonstiges';
  const authChannel = letter.auth_channel ?? DEFAULT_AUTH_CHANNEL;
  const earliestFrist = fristen[0];
  const tArche = useTranslations('posteingang.archetype.label');
  const brieftyp = tArche(archetype);

  const optionIds =
    actionOptions && actionOptions.length > 0
      ? actionOptions
      : (ARCHETYPE_ACTION_DEFAULTS[archetype] ?? []);

  const chipItems = optionIds
    .map((id) => {
      const full = lookupCatalogText(messages, id);
      if (!full) return null;
      return { id, full, short: shortChipLabel(full) };
    })
    .filter((x): x is { id: string; full: string; short: string } => x !== null)
    .slice(0, 3);

  const restItems = optionIds
    .map((id) => {
      const full = lookupCatalogText(messages, id);
      if (!full) return null;
      return { id, full };
    })
    .filter((x): x is { id: string; full: string } => x !== null);

  const heroText = summary?.bullets[0]?.text ?? null;
  const heroNode = heroText ? renderWithNormTooltips(heroText) : null;

  const behoerdeName = absender?.name_de ?? letter.absender_behoerde_id;

  return (
    <article
      aria-labelledby="reader-title"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <MockWatermarkBanner />

      {/* Head row — avatar + who/what + verify + kebab. */}
      <header className="flex items-start gap-3">
        <BehoerdenAvatarV2
          absenderId={letter.absender_behoerde_id}
          name={behoerdeName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-snug text-text-primary">
            {behoerdeName}
          </div>
          <div className="text-[13px] leading-snug text-text-secondary">
            {t('archetype_short')} · {brieftyp}
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="hidden text-right sm:block">
            <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <span>{t('auth_badge')}</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">
              {t('verifiziert_am_template', { datum: verifiziertAm })}
            </div>
          </div>
          <button
            type="button"
            aria-label={tActions('kebab_menu_aria')}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md border border-border-strong bg-surface text-text-secondary transition-colors',
              'hover:bg-surface-soft',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="sm:hidden">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <span>{t('auth_badge')}</span>
        </span>
        <span className="ml-2 text-[11.5px] text-text-muted">
          {t('verifiziert_am_template', { datum: verifiziertAm })}
        </span>
        <AuthentizitaetsBadge channel={authChannel} variant="tiny-icon-only" />
      </div>

      <h2
        id="reader-title"
        className="text-[22px] font-semibold tracking-tight text-text-primary"
      >
        {letter.betreff}
      </h2>

      <dl className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 text-[13px] text-text-secondary">
        <div className="flex items-baseline gap-1.5">
          <dt className="font-medium">{t('aktenzeichen_primaer_label')}:</dt>
          <dd className="font-mono">{letter.aktenzeichen}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="font-medium">{t('empfangen_label')}:</dt>
          <dd>{empfangen}</dd>
        </div>
        {vorgangTitle ? (
          <div className="flex items-baseline gap-1.5">
            <dt className="font-medium">{tCard('vorgang_tag_template', { title: vorgangTitle }).split(' ')[0]}</dt>
            <dd>{vorgangTitle}</dd>
          </div>
        ) : null}
      </dl>

      <DatenschutzCockpitLink
        variant="posteingang-card"
        letterId={letter.id}
      />

      <AiErklaererCard
        summary={summary ?? undefined}
        loading={summaryLoading}
        error={summaryError}
        onShowInOriginal={onShowInOriginal}
        hero={heroNode}
        describedById="original"
        onRetry={() => {
          setSummaryError(null);
          setSummaryLoading(true);
          void api
            .extrahiereAktion(letter.id)
            .then((res) => {
              setSummary(res.ai_summary_post_open);
              setFristen(res.fristen);
              setActionOptions(res.was_kann_ich_tun_options);
            })
            .catch(() => setSummaryError(t('summary_error')))
            .finally(() => setSummaryLoading(false));
        }}
      />

      {earliestFrist ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3 text-[13.5px] text-text-ink-2">
          <Clock className="size-4 text-text-secondary" aria-hidden="true" />
          <FristChip frist={earliestFrist} fromIso={nowIso} className="text-xs" />
        </div>
      ) : null}

      <div
        role="group"
        aria-label={t('actions_heading')}
        className="flex flex-wrap items-center gap-2.5"
      >
        <Button type="button" onClick={() => setReplyOpen(true)}>
          <PenSquare className="size-4" aria-hidden="true" />
          {t('actions.antwort_vorbereiten')}
        </Button>
        {!letter.vorgang_id ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setVorgangModal(letter)}
          >
            <FilePlus2 className="size-4" aria-hidden="true" />
            {t('actions.vorgang_erstellen')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (originaltextDetailsRef.current) {
              originaltextDetailsRef.current.open = true;
              setOriginaltextOpen(true);
            }
            requestAnimationFrame(() => {
              originalRef.current?.scrollIntoView();
            });
          }}
          aria-expanded={originaltextOpen}
          aria-controls="originaltext-details"
        >
          <FileText className="size-4" aria-hidden="true" />
          {t('actions.originalbrief')}
        </Button>
      </div>

      {chipItems.length > 0 ? (
        <section
          aria-labelledby="was-kann-ich-tun-chips"
          className="flex flex-col gap-2"
        >
          <h3
            id="was-kann-ich-tun-chips"
            className="text-[13px] text-text-secondary"
          >
            {tWasKannIchTun('heading')}
          </h3>
          <ul role="list" className="flex flex-wrap items-center gap-2">
            {chipItems.map((chip) => (
              <li key={chip.id} className="list-none">
                <button
                  type="button"
                  title={chip.full}
                  onClick={() => {
                    document
                      .getElementById('was-kann-ich-tun-full')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] text-text-ink-2 transition-colors',
                    'hover:border-primary/40 hover:bg-accent-soft hover:text-primary',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  )}
                >
                  {chip.short}
                </button>
              </li>
            ))}
            <span aria-hidden="true" className="ms-auto">
              <ChevronRight className="size-4 text-text-muted" />
            </span>
          </ul>
        </section>
      ) : null}

      {restItems.length > 0 ? (
        <section
          id="was-kann-ich-tun-full"
          aria-labelledby="was-kann-ich-tun-full-heading"
          className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3"
        >
          <h3
            id="was-kann-ich-tun-full-heading"
            className="text-sm font-semibold text-text-primary"
          >
            {tWasKannIchTun('helper')}
          </h3>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-text-secondary">
            {restItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-text-muted"
                />
                <span>{renderWithNormTooltips(item.full)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details
        ref={originaltextDetailsRef}
        id="originaltext-details"
        className="group rounded-md border border-border bg-surface"
        onToggle={(event) =>
          setOriginaltextOpen((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[13px] text-text-secondary transition-colors hover:bg-surface-soft',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
          )}
        >
          <span className="font-medium">
            {t('originaltext_auszug_title')}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
            <span>{t('originaltext_mehr')}</span>
            <ChevronDown
              className="size-3 transition-transform group-open:-rotate-180"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="border-t border-border px-4 py-3">
          <OriginaltextBlock ref={originalRef} body={letter.body_de} />
        </div>
      </details>

      <ReplySheet
        open={replyOpen}
        onOpenChange={(o) => {
          setReplyOpen(o);
          if (!o) void refreshReplyState();
        }}
        letter={letter}
        empfaengerBehoerde={absender}
        existingReply={reply}
        onPersisted={() => void refreshReplyState()}
      />

      <NeuerVorgangAusBriefModal
        letter={vorgangModal}
        open={vorgangModal !== null}
        onOpenChange={(o) => {
          if (!o) setVorgangModal(null);
        }}
        onCreated={() => {
          toast.success(tToast('refresh_after_vorgang_created'));
          router.refresh();
        }}
      />
    </article>
  );
}
