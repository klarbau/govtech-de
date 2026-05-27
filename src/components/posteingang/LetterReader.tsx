'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  Behoerde,
  Letter,
  LetterAiSummaryPostOpen,
  LetterCitation,
  LetterFrist,
  Reply,
  ReplyDraft,
} from '@/types';

import { api } from '@/lib/mock-backend';

import { AISummaryBlock } from './AISummaryBlock';
import { AuthentizitaetsBadge, DEFAULT_AUTH_CHANNEL } from './AuthentizitaetsBadge';
import { FristChip } from './FristChip';
import { NeuerVorgangAusBriefModal } from './NeuerVorgangAusBriefModal';
import { OriginaltextBlock, type OriginaltextBlockHandle } from './OriginaltextBlock';
import { RechtlicheHinweiseDetails } from './RechtlicheHinweiseDetails';
import { RentenBridgeCTA } from './RentenBridgeCTA';
import { ReplySheet } from './ReplySheet';
import { StickyFristAction } from './StickyFristAction';
import { WasKannIchTunFooter } from './WasKannIchTunFooter';
import { VorgangsBuendelTagInitial } from './VorgangsBuendelTag';

interface LetterReaderProps {
  letter: Letter;
  absender: Behoerde | null;
  vorgangTitle?: string;
  nowIso: string;
  /**
   * Inline 3-pane mode (≥ lg): the reader sits next to the list, so the
   * standalone „Zurück zum Posteingang"-Link is suppressed and the heading
   * level can be demoted to keep one `<h1>` per screen (the PageHeader owns it).
   */
  embedded?: boolean;
}

function downloadIcs(letter: Letter, frist: LetterFrist): void {
  const dt = frist.datum.replaceAll('-', '');
  const summary = `Frist · ${frist.typ} · ${letter.aktenzeichen}`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//govtech-de-demo//posteingang//DE',
    'BEGIN:VEVENT',
    `UID:${letter.id}-${frist.typ}@govtech-de-demo`,
    `DTSTAMP:${dt}T080000Z`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:[MOCK] ${frist.original_zitat.replaceAll(/[\r\n]+/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `frist-${letter.id}-${frist.typ}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadLetter(letter: Letter): void {
  const blob = new Blob([letter.body_de], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${letter.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LetterReader({
  letter,
  absender,
  vorgangTitle,
  nowIso,
  embedded = false,
}: LetterReaderProps) {
  const t = useTranslations('posteingang.reader');
  const tArche = useTranslations('posteingang.archetype.label');
  const tBridge = useTranslations('posteingang.bridge');
  const router = useRouter();

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
  const [replies, setReplies] = React.useState<Reply[]>([]);
  const [draft, setDraft] = React.useState<ReplyDraft | null>(null);

  // V1.1 — Yellow-Letter-Bridge State (Hard-Line § 11.20 separater CTA-Pfad).
  const [bridgeAppliedAt, setBridgeAppliedAt] = React.useState<string | null>(
    null,
  );
  const [bridgePending, setBridgePending] = React.useState(false);

  const originalRef = React.useRef<OriginaltextBlockHandle>(null);

  // markiereLetterGelesen + lazy summary on mount.
  React.useEffect(() => {
    let cancelled = false;
    void api.markiereLetterGelesen(letter.id).catch(() => {
      // Stiller Fehler — App-interner Lese-Status, kein Bekanntgabe-Trigger.
    });
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

  // Reply / Draft state laden.
  const refreshReplyState = React.useCallback(async () => {
    try {
      const list = await api.getRepliesForLetter(letter.id);
      const sentList = list.filter((r) => r.status === 'sent_simulated');
      setReplies(sentList);
      // Latest reply (chronologisch zuletzt) für Single-Reply-CTA-Hint.
      setReply(sentList.length > 0 ? (sentList[sentList.length - 1] ?? null) : null);
    } catch {
      setReplies([]);
      setReply(null);
    }
    try {
      const d = await api.getReplyDraft(letter.id);
      setDraft(d);
    } catch {
      setDraft(null);
    }
  }, [letter.id]);

  React.useEffect(() => {
    void refreshReplyState();
  }, [refreshReplyState]);

  // V1.1 — Yellow-Letter-Bridge: lade applied-Status für renteninfo-Briefe.
  React.useEffect(() => {
    if (letter.archetype !== 'renteninfo') return;
    let cancelled = false;
    void api.getProfile().then(async (persona) => {
      try {
        const av = await api.getAltersvorsorge(persona.id);
        if (cancelled) return;
        if (
          av?.yellow_letter_id === letter.id &&
          av.eckdaten?.abgelegt_am
        ) {
          setBridgeAppliedAt(av.eckdaten.abgelegt_am);
        }
      } catch {
        // Stiller Fehler — Idempotenz-Indikator ist optional.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [letter.id, letter.archetype]);

  const onApplyBridge = React.useCallback(async () => {
    setBridgePending(true);
    try {
      const persona = await api.getProfile();
      const result = await api.applyYellowLetterBridge({
        letter_id: letter.id,
        persona_id: persona.id,
      });
      if (result.applied && result.eckdaten) {
        setBridgeAppliedAt(result.eckdaten.abgelegt_am);
        toast.success(tBridge('renten_toast_success'));
        router.push('/stammdaten#altersvorsorge');
      } else {
        // Idempotenz § 11.25: 2. Aufruf returns applied: false.
        toast.info(tBridge('renten_toast_already_applied'));
        router.push('/stammdaten#altersvorsorge');
      }
    } catch (err) {
      toast.error(tBridge('renten_toast_error'));
      if (typeof console !== 'undefined') console.error(err);
    } finally {
      setBridgePending(false);
    }
  }, [letter.id, router, tBridge]);

  const onAddToCalendar = React.useCallback(
    (frist: LetterFrist) => {
      if (frist.citation_match === false) {
        toast.error(t('citation.mismatch_warning'));
        return;
      }
      downloadIcs(letter, frist);
      void api.protokolliereLetterAktivitaet(
        letter.id,
        'frist_added_to_calendar',
      );
      toast.success(t('frist_added_toast'));
    },
    [letter, t],
  );

  const onShowInOriginal = React.useCallback((citation: LetterCitation) => {
    if (citation.original_zitat) {
      originalRef.current?.scrollToZitat(citation.original_zitat);
    }
  }, []);

  const empfangen = (() => {
    try {
      return format(parseISO(letter.empfangen_am), 'd. MMMM yyyy', { locale: de });
    } catch {
      return letter.empfangen_am;
    }
  })();

  const archetype = letter.archetype ?? 'sonstiges';
  const authChannel = letter.auth_channel ?? DEFAULT_AUTH_CHANNEL;
  const aktenzeichenWeitere = letter.aktenzeichen_weitere ?? [];

  const hasCitationMismatch = fristen.some((f) => f.citation_match === false);

  return (
    <article aria-labelledby="reader-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {!embedded && (
          <Link
            href="/posteingang"
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-print="hide"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('zurueck')}
          </Link>
        )}

        <nav aria-label={t('skip_link.aria')} className="flex gap-2 text-xs">
          <a
            href="#summary"
            className="sr-only rounded bg-foreground px-2 py-1 text-background focus:not-sr-only"
          >
            {t('skip_link.zur_zusammenfassung')}
          </a>
          <a
            href="#original"
            className="sr-only rounded bg-foreground px-2 py-1 text-background focus:not-sr-only"
          >
            {t('skip_link.zum_original')}
          </a>
        </nav>

        <MockWatermarkBanner />

        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <BehoerdenBadge
              name={absender?.name_de ?? letter.absender_behoerde_id}
              kategorie={absender?.kategorie}
            />
            <StatusBadge variant="verifiziert">{t('auth_badge')}</StatusBadge>
            <AuthentizitaetsBadge channel={authChannel} />
            {vorgangTitle ? (
              <Link
                href={letter.vorgang_id ? `/vorgaenge/${letter.vorgang_id}` : '#'}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t('vorgang_link_template', { title: vorgangTitle })}
              </Link>
            ) : (
              archetype !== 'sonstiges' && (
                <VorgangsBuendelTagInitial
                  brieftypLabel={tArche(archetype)}
                  jahr={(() => {
                    try {
                      return new Date(letter.empfangen_am).getUTCFullYear();
                    } catch {
                      return new Date().getUTCFullYear();
                    }
                  })()}
                  onCreate={() => setVorgangModal(letter)}
                />
              )
            )}
          </div>
          {embedded ? (
            <h2
              id="reader-title"
              className="text-2xl font-semibold tracking-tight text-text-primary"
            >
              {letter.betreff}
            </h2>
          ) : (
            <h1
              id="reader-title"
              className="text-2xl font-semibold tracking-tight"
            >
              {letter.betreff}
            </h1>
          )}
          <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr]">
            <dt className="font-medium">{t('aktenzeichen_primaer_label')}</dt>
            <dd className="font-mono">{letter.aktenzeichen}</dd>
            {aktenzeichenWeitere.length > 0 && (
              <>
                <dt className="font-medium">
                  {t('aktenzeichen_weitere_label')}
                </dt>
                <dd className="font-mono">{aktenzeichenWeitere.join(' · ')}</dd>
              </>
            )}
            <dt className="font-medium">{t('empfangen_label')}</dt>
            <dd>{empfangen}</dd>
          </dl>
          <DatenschutzCockpitLink
            variant="posteingang-card"
            letterId={letter.id}
          />
        </header>

        {fristen.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fristen.map((f, i) => (
              <FristChip key={`top-frist-${i}`} frist={f} fromIso={nowIso} />
            ))}
            {hasCitationMismatch && (
              <p
                role="status"
                className="basis-full text-xs text-amber-700 dark:text-amber-300"
              >
                {t('citation.mismatch_warning')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mobile (< md): Tab-Switcher; Desktop (md+): side-by-side. */}
      <div className="md:hidden">
        <Tabs defaultValue="originaltext">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="originaltext">{t('tab_originaltext')}</TabsTrigger>
            <TabsTrigger value="zusammenfassung">
              {t('tab_zusammenfassung')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="originaltext" className="mt-4">
            <OriginaltextBlock ref={originalRef} body={letter.body_de} />
          </TabsContent>
          <TabsContent value="zusammenfassung" className="mt-4">
            <AISummaryBlock
              summary={summary ?? undefined}
              loading={summaryLoading}
              error={summaryError}
              describedById="original"
              onShowInOriginal={onShowInOriginal}
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
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-2">
        <AISummaryBlock
          summary={summary ?? undefined}
          loading={summaryLoading}
          error={summaryError}
          describedById="original"
          onShowInOriginal={onShowInOriginal}
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
        <OriginaltextBlock ref={originalRef} body={letter.body_de} />
      </div>

      {letter.archetype === 'renteninfo' && (
        <section
          aria-labelledby="renten-bridge-title"
          data-testid="renten-bridge-section"
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <h2
            id="renten-bridge-title"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {tBridge('renten_section_title')}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {tBridge('renten_section_subtitle')}
          </p>
          <div className="mt-3">
            <RentenBridgeCTA
              letterAktenzeichen={letter.aktenzeichen}
              appliedAt={bridgeAppliedAt}
              onApply={onApplyBridge}
              pending={bridgePending}
            />
          </div>
        </section>
      )}

      <WasKannIchTunFooter
        archetype={archetype}
        options={actionOptions}
        letter={letter}
      />

      <RechtlicheHinweiseDetails />

      <StickyFristAction
        fristen={fristen}
        alreadyRepliedAt={reply?.sent_at ?? null}
        replies={replies}
        hasDraft={!!draft}
        hasSentReply={!!reply}
        onCalendar={onAddToCalendar}
        onReply={() => setReplyOpen(true)}
        onViewSent={() => setReplyOpen(true)}
        onSavePlain={() => downloadLetter(letter)}
        onShowOriginal={() => originalRef.current?.scrollIntoView()}
        onMarkRead={() => {
          void api.markiereLetterGelesen(letter.id);
          toast.success(t('frist_added_toast'));
        }}
        fromIso={nowIso}
      />

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
        onCreated={() => router.refresh()}
      />
    </article>
  );
}
