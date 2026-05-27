'use client';

import * as React from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type Anthropic from '@anthropic-ai/sdk';

import { api } from '@/lib/mock-backend';
import { requiresConfirmation } from '@/lib/ai/tool-schemas';
import type { AssistantStreamEvent } from '@/lib/ai/stream';
import type { PersonaContextInput } from '@/lib/ai/system-prompt';
import { PageHeader } from '@/components/shared/PageHeader';
import type { Behoerde, Letter, Persona } from '@/types';

import { ChatComposer } from './ChatComposer';
import { ChatPanel } from './ChatPanel';
import { KontextRail, type KontextCounts } from './KontextRail';
import { QuickActionChips } from './QuickActionChips';
import {
  dispatchReadTool,
  dispatchStarteUmzug,
  type PreviewResult,
} from './dispatch-tool';
import type { ChatMessage, UmzugProposal } from './types';

const MAX_TOOL_ROUNDS = 4;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Build the cached PersonaContextInput sent to /api/assistant. */
function toPersonaContext(
  persona: Persona,
  locale: string,
): PersonaContextInput {
  const supported = (['de', 'en', 'ru', 'uk', 'ar', 'tr'] as const).find(
    (l) => l === locale,
  );
  return {
    id: persona.id,
    vorname: persona.vorname,
    nachname: persona.nachname,
    geburtsdatum: persona.geburtsdatum,
    staatsangehoerigkeit: persona.staatsangehoerigkeit,
    bevorzugte_sprache: supported,
    wohnort_kurz: `${persona.adresse.ort} (${persona.adresse.plz})`,
    aufenthaltstitel: persona.aufenthaltstitel
      ? {
          norm: persona.aufenthaltstitel.norm,
          gueltig_bis: persona.aufenthaltstitel.valid_until,
        }
      : undefined,
    kfz_halter: persona.kfz_halter,
    kindergeld_bezug: persona.kindergeld_bezug,
  };
}

/** Anthropic content block helpers. */
type ContentBlock =
  | Anthropic.TextBlockParam
  | Anthropic.ToolUseBlockParam
  | Anthropic.ToolResultBlockParam;

export function AssistentView() {
  const t = useTranslations('assistent');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const locale = useLocale();

  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [counts, setCounts] = React.useState<KontextCounts | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = React.useState(false);
  const [confirmBusyId, setConfirmBusyId] = React.useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState('');

  // The LLM conversation (excludes UI-only greeting). Kept in a ref so the
  // streaming loop reads the latest without re-subscribing.
  const apiMessagesRef = React.useRef<Anthropic.MessageParam[]>([]);
  const personaCtxRef = React.useRef<PersonaContextInput | null>(null);

  const behoerdeName = React.useCallback(
    (id: string) => behoerdenById[id]?.name_de ?? id,
    [behoerdenById],
  );

  /* ───────────────────────── bootstrap (mount) ─────────────────────────── */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, letters, documents, termine, behoerden] = await Promise.all([
          api.getProfile(),
          api.getLetters({ status: ['ungelesen'] }),
          api.getDocuments(),
          api.getTermine(),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        setPersona(p);
        personaCtxRef.current = toPersonaContext(p, locale);
        setCounts({
          ungeleseneBriefe: letters.length,
          dokumente: documents.length,
          termine: termine.length,
        });
        setBehoerdenById(
          Object.fromEntries(behoerden.map((b) => [b.id, b])),
        );
        setMessages([buildGreeting(p, letters, t, format)]);
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-bootstrap on locale/persona change resets the thread (spec §9).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  /* ──────────────────────────── streaming ──────────────────────────────── */

  // Mutual recursion (runTurn ↔ handleToolUses) routed through a ref so the
  // tool-result round-trip can re-enter the stream without a declaration cycle.
  const handleToolUsesRef = React.useRef<
    (
      assistantId: string,
      toolUses: Array<{ id: string; name: string; input: unknown }>,
      round: number,
    ) => Promise<void>
  >(async () => {});

  const runTurn = React.useCallback(
    async (round: number) => {
      const ctx = personaCtxRef.current;
      if (!ctx) return;

      const assistantId = makeId('a');
      const assistantAt = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          text: '',
          at: assistantAt,
          streaming: true,
        },
      ]);
      setStreaming(true);

      let accText = '';
      const toolUses: Array<{ id: string; name: string; input: unknown }> = [];
      let stopReason: string | null = null;
      let streamError = false;

      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessagesRef.current,
            persona: ctx,
            locale,
          }),
        });

        if (!res.ok || !res.body) {
          streamError = true;
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split('\n\n');
            buffer = frames.pop() ?? '';
            for (const frame of frames) {
              const line = frame.trim();
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') continue;
              let event: AssistantStreamEvent;
              try {
                event = JSON.parse(payload) as AssistantStreamEvent;
              } catch {
                continue;
              }
              if (event.type === 'text_delta') {
                accText += event.text;
                const snapshot = accText;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, text: snapshot } : m,
                  ),
                );
              } else if (event.type === 'tool_use') {
                toolUses.push({
                  id: event.id,
                  name: event.name,
                  input: event.input,
                });
              } else if (event.type === 'message_stop') {
                stopReason = event.stop_reason;
              } else if (event.type === 'error') {
                streamError = true;
              }
            }
          }
        }
      } catch {
        streamError = true;
      }

      // Persist the assistant turn into the LLM message history.
      const assistantContent: ContentBlock[] = [];
      if (accText) assistantContent.push({ type: 'text', text: accText });
      for (const tu of toolUses) {
        assistantContent.push({
          type: 'tool_use',
          id: tu.id,
          name: tu.name,
          input: (tu.input ?? {}) as Record<string, unknown>,
        });
      }
      if (assistantContent.length > 0) {
        apiMessagesRef.current = [
          ...apiMessagesRef.current,
          { role: 'assistant', content: assistantContent },
        ];
      }

      setStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, error: streamError }
            : m,
        ),
      );
      if (accText) setLiveAnnouncement(accText);

      if (streamError) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !m.text
              ? { ...m, text: t('error.stream'), error: true }
              : m,
          ),
        );
        return;
      }

      if (toolUses.length === 0 || stopReason !== 'tool_use') return;
      if (round >= MAX_TOOL_ROUNDS) return;

      await handleToolUsesRef.current(assistantId, toolUses, round);
    },
    [locale, t],
  );

  const handleToolUses = React.useCallback(
    async (
      assistantId: string,
      toolUses: Array<{ id: string; name: string; input: unknown }>,
      round: number,
    ) => {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let heldUmzug: UmzugProposal | null = null;
      let heldUmzugToolUseId: string | undefined;

      for (const tu of toolUses) {
        // THE confirm gate: never auto-dispatch starte_umzug.
        if (requiresConfirmation(tu.name)) {
          heldUmzugToolUseId = tu.id;
          const input = (tu.input ?? {}) as Record<string, unknown>;
          const proposal = await buildProposalFromStarteUmzug(input);
          if (proposal) heldUmzug = proposal;
          continue;
        }

        const callId = makeId('tc');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, toolCalls: [...(m.toolCalls ?? []), { id: callId, name: tu.name, status: 'running' }] }
              : m,
          ),
        );

        const outcome = await dispatchReadTool(tu.name, tu.input, tu.id);
        toolResults.push(outcome.toolResult);

        // preview_umzug → surface the confirm card.
        if (tu.name === 'preview_umzug' && outcome.preview) {
          heldUmzug = proposalFromPreview(outcome.preview);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls ?? []).map((c) =>
                    c.id === callId
                      ? {
                          ...c,
                          status: outcome.ok ? 'done' : 'error',
                          resultSummary: outcome.summary,
                        }
                      : c,
                  ),
                }
              : m,
          ),
        );
      }

      // Attach the held Umzug proposal to the assistant message → confirm card.
      if (heldUmzug) {
        const finalProposal: UmzugProposal = {
          ...heldUmzug,
          toolUseId: heldUmzugToolUseId,
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, umzugProposal: finalProposal } : m,
          ),
        );
      }

      // If the model emitted starte_umzug directly, we held it — we must still
      // satisfy the tool_use with a tool_result so the conversation stays valid.
      // We answer it as "awaiting user confirmation" so the model doesn't retry.
      if (heldUmzugToolUseId) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: heldUmzugToolUseId,
          content: JSON.stringify({
            status: 'awaiting_user_confirmation',
            note: 'Die Nutzerin muss in der Bestätigungskarte „Umzug starten" klicken.',
          }),
        });
      }

      if (toolResults.length === 0) return;

      apiMessagesRef.current = [
        ...apiMessagesRef.current,
        { role: 'user', content: toolResults },
      ];

      // Only continue the loop if there was no held write awaiting confirm.
      if (!heldUmzugToolUseId) {
        await runTurn(round + 1);
      }
    },
    [runTurn],
  );

  React.useEffect(() => {
    handleToolUsesRef.current = handleToolUses;
  }, [handleToolUses]);

  const sendUserMessage = React.useCallback(
    async (text: string) => {
      if (streaming || confirmBusyId) return;
      const userMessage: ChatMessage = {
        id: makeId('u'),
        role: 'user',
        text,
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      apiMessagesRef.current = [
        ...apiMessagesRef.current,
        { role: 'user', content: text },
      ];
      await runTurn(0);
    },
    [streaming, confirmBusyId, runTurn],
  );

  /* ───────────────────── confirm-gate handlers ─────────────────────────── */

  const onConfirmUmzug = React.useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      const proposal = message?.umzugProposal;
      if (!proposal || proposal.resolution || !persona) return;

      setConfirmBusyId(messageId);
      const callId = makeId('tc');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                umzugProposal: { ...proposal, resolution: 'started' },
                toolCalls: [
                  ...(m.toolCalls ?? []),
                  { id: callId, name: 'starte_umzug', status: 'running' },
                ],
              }
            : m,
        ),
      );

      const outcome = await dispatchStarteUmzug({
        neue_adresse: proposal.neue_adresse,
        stichtag: proposal.stichtag,
        blockBConsent: proposal.blockBConsent,
        activePersonaId: persona.id,
        toolUseId: proposal.toolUseId ?? makeId('synthetic'),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolCalls: (m.toolCalls ?? []).map((c) =>
                  c.id === callId
                    ? {
                        ...c,
                        status: outcome.ok ? 'done' : 'error',
                        vorgangId: outcome.vorgangId,
                      }
                    : c,
                ),
              }
            : m,
        ),
      );
      setConfirmBusyId(null);
      if (outcome.ok) setLiveAnnouncement(t('tool.umzug_started'));
    },
    [messages, persona, t],
  );

  const onCancelUmzug = React.useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.umzugProposal
            ? {
                ...m,
                umzugProposal: { ...m.umzugProposal, resolution: 'cancelled' },
              }
            : m,
        ),
      );
      apiMessagesRef.current = [
        ...apiMessagesRef.current,
        { role: 'user', content: t('umzug_confirm.cancelled') },
      ];
    },
    [t],
  );

  /* ──────────────────────────── render ─────────────────────────────────── */

  const interactionDisabled = streaming || confirmBusyId !== null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        contextChip={{ label: tCommon('context_chip.prototype') }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col gap-4" aria-label={t('title')}>
          <QuickActionChips
            onSelect={sendUserMessage}
            disabled={interactionDisabled}
          />

          <ChatPanel
            messages={messages}
            streaming={streaming}
            behoerdeName={behoerdeName}
            onConfirmUmzug={onConfirmUmzug}
            onCancelUmzug={onCancelUmzug}
            confirmBusyMessageId={confirmBusyId}
            liveAnnouncement={liveAnnouncement}
          />

          <div className="sticky bottom-4 mt-auto">
            <ChatComposer
              onSend={sendUserMessage}
              disabled={interactionDisabled}
            />
          </div>
        </section>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <KontextRail counts={counts} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── helpers (module) ──────────────────────────── */

function proposalFromPreview(preview: PreviewResult): UmzugProposal {
  return {
    neue_adresse: preview.neue_adresse,
    stichtag: preview.stichtag,
    blockBConsent: preview.umzugPreview.block_b.map((s) => s.behoerde_id),
    preview: preview.umzugPreview,
  };
}

/**
 * Fallback (§7.4 b): the model streamed `starte_umzug` directly. We do NOT
 * dispatch it; instead we run `previewUmzug` now to populate the confirm card.
 */
async function buildProposalFromStarteUmzug(
  input: Record<string, unknown>,
): Promise<UmzugProposal | null> {
  const adresse = input.neue_adresse;
  const stichtag = input.stichtag_iso;
  if (
    !adresse ||
    typeof adresse !== 'object' ||
    typeof stichtag !== 'string'
  ) {
    return null;
  }
  const neue_adresse = adresse as UmzugProposal['neue_adresse'];
  const consentRaw = input.block_b_consent;
  const blockBConsent = Array.isArray(consentRaw)
    ? consentRaw.filter((v): v is string => typeof v === 'string')
    : [];
  try {
    const umzugPreview = await api.previewUmzug({
      neue_adresse,
      stichtag,
    });
    return { neue_adresse, stichtag, blockBConsent, preview: umzugPreview };
  } catch {
    return null;
  }
}

/** Client-composed greeting — UI-only, never sent to the LLM (spec §4.2). */
function buildGreeting(
  persona: Persona,
  unreadLetters: Letter[],
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): ChatMessage {
  const bullets: string[] = [];
  if (unreadLetters.length > 0) {
    bullets.push(t('greeting.bullet_briefe', { count: unreadLetters.length }));
  }
  const nextFrist = pickNextFrist(unreadLetters);
  if (nextFrist) {
    const fristDate = new Date(nextFrist.datum);
    const fristLabel = Number.isNaN(fristDate.getTime())
      ? nextFrist.datum
      : format.dateTime(fristDate, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
    bullets.push(
      t('greeting.bullet_frist', {
        betreff: nextFrist.betreff,
        datum: fristLabel,
      }),
    );
  }
  if (bullets.length === 0) {
    bullets.push(t('greeting.bullet_keine'));
  }

  const text = [
    t('greeting.intro', { vorname: persona.vorname }),
    ...bullets.map((b) => `- ${b}`),
    '',
    t('greeting.cta'),
  ].join('\n');

  return {
    id: 'greeting',
    role: 'assistant',
    text,
    at: new Date().toISOString(),
    uiOnly: true,
  };
}

function pickNextFrist(
  letters: Letter[],
): { betreff: string; datum: string } | null {
  let best: { betreff: string; datum: string } | null = null;
  for (const letter of letters) {
    for (const frist of letter.fristen ?? []) {
      if (!frist.datum) continue;
      if (!best || frist.datum < best.datum) {
        best = { betreff: letter.betreff, datum: frist.datum };
      }
    }
  }
  return best;
}
