'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type Anthropic from '@anthropic-ai/sdk';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  ListChecks,
  Mail,
  RotateCcw,
  Shield,
  Truck,
  User,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { formatDateDe } from '@/lib/utils';
import {
  requiresConfirmation,
  validateLebenslageToolInput,
  validateUmzugToolInput,
  type StarteLebenslageInput,
  type StarteUmzugInput,
} from '@/lib/ai/tool-schemas';
import type { AssistantStreamEvent } from '@/lib/ai/stream';
import type { PersonaContextInput } from '@/lib/ai/system-prompt';
import type { Behoerde, Persona } from '@/types';

import { Skeleton } from '@/components/shared/Skeleton';

import { OrchestrationTestBridge } from '@/components/orchestration';

import { ChatComposer } from './ChatComposer';
import { LebenslageConfirmCard } from './LebenslageConfirmCard';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { UmzugConfirmCard } from './UmzugConfirmCard';
import {
  dispatchReadTool,
  dispatchStarteUmzug,
  type PreviewResult,
} from './dispatch-tool';
import type { ChatMessage, LebenslageProposal, UmzugProposal } from './types';

const MAX_TOOL_ROUNDS = 4;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

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

type ContentBlock =
  | Anthropic.TextBlockParam
  | Anthropic.ToolUseBlockParam
  | Anthropic.ToolResultBlockParam;

interface KontextCounts {
  ungeleseneBriefe: number;
  dokumente: number;
  termine: number;
}

export function AssistentView() {
  const locale = useLocale();
  const t = useTranslations('assistent');
  const tGreeting = useTranslations('assistent.greeting');
  const tKontext = useTranslations('assistent.kontext');
  const tCommon = useTranslations('common');

  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [counts, setCounts] = React.useState<KontextCounts | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = React.useState(false);
  const [confirmBusyId, setConfirmBusyId] = React.useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState('');

  const apiMessagesRef = React.useRef<Anthropic.MessageParam[]>([]);
  const personaCtxRef = React.useRef<PersonaContextInput | null>(null);

  const behoerdeName = React.useCallback(
    (id: string) => behoerdenById[id]?.name_de ?? id,
    [behoerdenById],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const [p, letters, documents, termine, behoerden, steuerLetters] =
            await Promise.all([
              api.getProfile(),
              api.getLetters({ status: ['ungelesen'] }),
              api.getDocuments(),
              api.getTermine(),
              api.getBehoerden(),
              api.getLetters({ archetype: 'steuerbescheid' }),
            ]);
          if (cancelled) return;
          setPersona(p);
          personaCtxRef.current = toPersonaContext(p, locale);
          setCounts({
            ungeleseneBriefe: letters.length,
            dokumente: documents.length,
            termine: termine.length,
          });
          const behoerdenMap = Object.fromEntries(
            behoerden.map((b) => [b.id, b]),
          );
          setBehoerdenById(behoerdenMap);

          const steuerbescheid = steuerLetters[0];
          const einspruchFrist = steuerbescheid?.fristen?.find(
            (f) => f.typ === 'einspruch',
          );
          const facts: GreetingFacts = {
            steuerbescheidBehoerde: steuerbescheid
              ? behoerdenMap[steuerbescheid.absender_behoerde_id]?.name_de
              : undefined,
            einspruchFristIso: einspruchFrist?.datum,
            aufenthaltstitelBisIso: p.aufenthaltstitel?.valid_until,
            steuerBetragCent: steuerbescheid?.betrag_cent,
            steuerBetragRichtung: steuerbescheid?.betrag_richtung,
          };

          setMessages([buildGreeting(tGreeting, p, facts)]);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      if (!cancelled) setMessages([buildStaticGreeting(tGreeting)]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

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
      // Only commit the assistant turn to the wire history on a clean stream.
      // On `streamError` — an immediate fail OR a partial stream that errored
      // mid-frame (error frame or catch after some text_delta/tool_use) — the
      // turn is abandoned and returns below before any tool_result is produced.
      // Appending its partial content would leave an assistant turn (possibly
      // with an unanswered tool_use) as the tail, breaking the retry invariant
      // and later producing back-to-back assistant messages → Anthropic 400.
      if (!streamError && assistantContent.length > 0) {
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
              ? {
                  ...m,
                  text: t('unavailable'),
                  error: true,
                }
              : m,
          ),
        );
        // Announce the fallback the same way a streamed reply is announced, so
        // screen readers hear that the turn failed (the bubble text alone is not
        // in a live region).
        setLiveAnnouncement(t('unavailable'));
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
      let heldLebenslage: LebenslageProposal | null = null;
      let heldLebenslageToolUseId: string | undefined;

      for (const tu of toolUses) {
        if (requiresConfirmation(tu.name)) {
          const input = (tu.input ?? {}) as Record<string, unknown>;

          // The antragslos-cascade write (`starte_lebenslage`) is confirm-gated
          // exactly like `starte_umzug`: build the held proposal, surface the
          // <LebenslageConfirmCard>, and dispatch ONLY on the explicit click.
          if (tu.name === 'starte_lebenslage') {
            const result = await buildProposalFromStarteLebenslage(input);
            if (!result.ok) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tu.id,
                is_error: true,
                content: JSON.stringify({ error: result.error }),
              });
              continue;
            }
            heldLebenslageToolUseId = tu.id;
            heldLebenslage = result.proposal;
            continue;
          }

          const result = await buildProposalFromStarteUmzug(input);
          if (!result.ok) {
            // Irreversible-write input failed structural validation: do NOT
            // hold a confirm card for malformed data. Feed the error back so
            // the model re-asks the user, and continue the turn.
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              is_error: true,
              content: JSON.stringify({ error: result.error }),
            });
            continue;
          }
          heldUmzugToolUseId = tu.id;
          heldUmzug = result.proposal;
          continue;
        }

        const callId = makeId('tc');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: [
                    ...(m.toolCalls ?? []),
                    { id: callId, name: tu.name, status: 'running' },
                  ],
                }
              : m,
          ),
        );

        // `preview_lebenslage` is read-only (slug → config): it feeds the
        // <LebenslageConfirmCard> without writing, mirroring `preview_umzug`.
        // The proposal builder validates + enriches (beteiligte Behörden,
        // masked IBAN); we then echo a compact preview back to the model.
        if (tu.name === 'preview_lebenslage') {
          const built = await buildProposalFromStarteLebenslage(
            (tu.input ?? {}) as Record<string, unknown>,
          );
          if (built.ok) {
            heldLebenslage = built.proposal;
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify({
                slug: built.proposal.slug,
                beteiligte_behoerden: built.proposal.beteiligteBehoerden,
                zukunft: built.proposal.zukunft,
                note: 'Vorschau erstellt. Die Nutzerin bestätigt in der Karte „Kindergeld einrichten".',
              }),
            });
          } else {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              is_error: true,
              content: JSON.stringify({ error: built.error }),
            });
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map((c) =>
                      c.id === callId
                        ? { ...c, status: built.ok ? 'done' : 'error' }
                        : c,
                    ),
                  }
                : m,
            ),
          );
          continue;
        }

        const outcome = await dispatchReadTool(tu.name, tu.input, tu.id);
        toolResults.push(outcome.toolResult);

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
                          zustaendigkeit: outcome.zustaendigkeit,
                        }
                      : c,
                  ),
                }
              : m,
          ),
        );
      }

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

      if (heldLebenslage) {
        const finalProposal: LebenslageProposal = {
          ...heldLebenslage,
          toolUseId: heldLebenslageToolUseId,
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, lebenslageProposal: finalProposal }
              : m,
          ),
        );
      }

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

      if (heldLebenslageToolUseId) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: heldLebenslageToolUseId,
          content: JSON.stringify({
            status: 'awaiting_user_confirmation',
            note: 'Die Nutzerin muss in der Bestätigungskarte „Kindergeld einrichten" klicken.',
          }),
        });
      }

      if (toolResults.length === 0) return;

      apiMessagesRef.current = [
        ...apiMessagesRef.current,
        { role: 'user', content: toolResults },
      ];

      // A held confirm-gated write (Umzug or Lebenslage) parks the turn until the
      // citizen clicks; any other tool round continues the loop.
      if (!heldUmzugToolUseId && !heldLebenslageToolUseId) {
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

  const retryLastTurn = React.useCallback(
    async (erroredMessageId: string) => {
      if (streaming || confirmBusyId) return;
      // A failed turn never commits to `apiMessagesRef` — the append in runTurn
      // is gated on `!streamError`, which holds universally (immediate fail AND
      // partial-then-errored streams) — so the tail is still the last user
      // message. Drop the error bubble and re-run the turn to re-send it. No
      // wire change; just another attempt at the same context.
      setMessages((prev) => prev.filter((m) => m.id !== erroredMessageId));
      await runTurn(0);
    },
    [streaming, confirmBusyId, runTurn],
  );

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
      if (outcome.ok) setLiveAnnouncement('Umzug gestartet.');
    },
    [messages, persona],
  );

  const onCancelUmzug = React.useCallback((messageId: string) => {
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
      {
        role: 'user',
        content: 'Bitte den Umzug jetzt nicht starten.',
      },
    ];
  }, []);

  const onConfirmLebenslage = React.useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      const proposal = message?.lebenslageProposal;
      if (!proposal || proposal.resolution || !persona) return;

      setConfirmBusyId(messageId);
      const callId = makeId('tc');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                lebenslageProposal: { ...proposal, resolution: 'started' },
                toolCalls: [
                  ...(m.toolCalls ?? []),
                  {
                    id: callId,
                    name: 'starte_lebenslage',
                    status: 'running',
                    vorgangTyp: proposal.vorgangTyp,
                  },
                ],
              }
            : m,
        ),
      );

      let ok = false;
      let vorgangId: string | undefined;
      try {
        // The irreversible antragslos-cascade write — dispatched ONLY after the
        // explicit „Kindergeld einrichten" click. Kindergeld carries no
        // consent step, so `consents` is `[]`; form values stay empty (the
        // engine reads the register/Stammdaten, no PII round-trips the model).
        const result = await api.starteLebenslage(
          proposal.slug,
          {},
          proposal.consents,
        );
        vorgangId = result.vorgangId;
        ok = true;
      } catch {
        ok = false;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolCalls: (m.toolCalls ?? []).map((c) =>
                  c.id === callId
                    ? { ...c, status: ok ? 'done' : 'error', vorgangId }
                    : c,
                ),
              }
            : m,
        ),
      );
      setConfirmBusyId(null);
      if (ok) setLiveAnnouncement('Kindergeld eingerichtet.');
    },
    [messages, persona],
  );

  const onCancelLebenslage = React.useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.lebenslageProposal
          ? {
              ...m,
              lebenslageProposal: {
                ...m.lebenslageProposal,
                resolution: 'cancelled',
              },
            }
          : m,
      ),
    );
    apiMessagesRef.current = [
      ...apiMessagesRef.current,
      {
        role: 'user',
        content: 'Bitte das Kindergeld jetzt nicht einrichten.',
      },
    ];
  }, []);

  const interactionDisabled = streaming || confirmBusyId !== null;

  const threadEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Skip the initial greeting-only render: auto-scrolling the window to the
    // thread end on mount pushed the page title, subtitle and first quick-chip
    // under the sticky header on phones. Only follow the thread once a real
    // exchange has started (a user message brings the count above 1).
    if (messages.length <= 1) return;
    threadEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, streaming]);

  return (
    <>
      {/* Test-only window seam for the resilience e2e (no-op unless the
          NEXT_PUBLIC_ENABLE_ORCH_TEST flag is set) — mounted here so faults can
          be armed before the user confirms the Umzug. */}
      <OrchestrationTestBridge />
      <div className="gt-page-head">
        <h1>{t('title')}</h1>
        <div className="sub">{t('subtitle')}</div>
      </div>

      <div className="quick-chips" role="group" aria-label={t('quick.label')}>
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('Erkläre meinen Brief.')}
        >
          <FileText aria-hidden="true" />
          {t('quick.erklaere_brief')}
        </button>
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('Was ist als Nächstes zu tun?')}
        >
          <ListChecks aria-hidden="true" />
          {t('quick.naechster_schritt')}
        </button>
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('Welche Unterlagen fehlen?')}
        >
          <FolderOpen aria-hidden="true" />
          {t('quick.fehlende_unterlagen')}
        </button>
        {/* Surfaces the hero autopilot: sends the canonical prompt so the
            existing confirm-gated preview_umzug flow fires (the confirm-gate is
            never bypassed — the model still proposes, the user still confirms). */}
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('leite meinen Umzug ein')}
        >
          <Truck aria-hidden="true" />
          {t('quick.umzug_einleiten')}
        </button>
      </div>

      <div className="as-layout">
        <div className="chat-card">
          <ol className="chat-thread" aria-label={t('log_label')}>
            {messages.map((message) => (
              <li key={message.id} style={{ display: 'contents' }}>
                <MessageBubble message={message} />
                {message.error ? (
                  <div
                    className="msg-error-actions"
                    role="group"
                    aria-label={t('error.actions_label')}
                  >
                    <button
                      type="button"
                      className="chip"
                      disabled={interactionDisabled}
                      onClick={() => void retryLastTurn(message.id)}
                    >
                      <RotateCcw aria-hidden="true" />
                      {t('error.retry')}
                    </button>
                    <Link className="msg-error-link" href="/vorgaenge/umzug/start">
                      {t('error.alt_umzug')}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                ) : null}
                {message.toolCalls?.map((call) => (
                  <ToolCallCard key={call.id} call={call} />
                ))}
                {message.umzugProposal ? (
                  <UmzugConfirmCard
                    proposal={message.umzugProposal}
                    behoerdeName={behoerdeName}
                    busy={confirmBusyId === message.id}
                    onConfirm={() => void onConfirmUmzug(message.id)}
                    onCancel={() => onCancelUmzug(message.id)}
                  />
                ) : null}
                {message.lebenslageProposal ? (
                  <LebenslageConfirmCard
                    proposal={message.lebenslageProposal}
                    behoerdeName={behoerdeName}
                    busy={confirmBusyId === message.id}
                    onConfirm={() => void onConfirmLebenslage(message.id)}
                    onCancel={() => onCancelLebenslage(message.id)}
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <div ref={threadEndRef} />
          <div className="sr-only" role="status" aria-live="polite">
            {liveAnnouncement}
          </div>

          <ChatComposer onSend={sendUserMessage} disabled={interactionDisabled} />
        </div>

        <aside
          className="ctx-card"
          aria-label={tKontext('aside_label')}
          aria-busy={counts === null}
        >
          <h2>{tKontext('title')}</h2>
          <div className="sub">{tKontext('subtitle')}</div>
          {counts === null ? (
            <span className="sr-only" role="status">
              {tCommon('loading')}
            </span>
          ) : null}
          <Link className="ctx-row" href="/posteingang">
            <span className="icon-circle">
              <Mail aria-hidden="true" />
            </span>
            <div className="grow">
              <div className="t">{tKontext('posteingang')}</div>
              <div className="s">
                {counts ? (
                  tKontext('posteingang_value', { ungelesen: counts.ungeleseneBriefe })
                ) : (
                  <Skeleton shape="text" className="w-28" />
                )}
              </div>
            </div>
            <ChevronRight aria-hidden="true" />
          </Link>
          <Link className="ctx-row" href="/dokumente">
            <span className="icon-circle">
              <FileText aria-hidden="true" />
            </span>
            <div className="grow">
              <div className="t">{tKontext('dokumente')}</div>
              <div className="s">
                {counts ? (
                  tKontext('dokumente_value', { count: counts.dokumente })
                ) : (
                  <Skeleton shape="text" className="w-24" />
                )}
              </div>
            </div>
            <ChevronRight aria-hidden="true" />
          </Link>
          <Link className="ctx-row" href="/termine">
            <span className="icon-circle">
              <Calendar aria-hidden="true" />
            </span>
            <div className="grow">
              <div className="t">{tKontext('termine')}</div>
              <div className="s">
                {counts ? (
                  tKontext('termine_value', { count: counts.termine })
                ) : (
                  <Skeleton shape="text" className="w-24" />
                )}
              </div>
            </div>
            <ChevronRight aria-hidden="true" />
          </Link>
          <Link className="ctx-row" href="/stammdaten">
            <span className="icon-circle">
              <User aria-hidden="true" />
            </span>
            <div className="grow">
              <div className="t">{tKontext('stammdaten')}</div>
              <div className="s">{tKontext('stammdaten_value')}</div>
            </div>
            <ChevronRight aria-hidden="true" />
          </Link>

          <div className="ctx-foot">
            <div className="row">
              <Shield aria-hidden="true" />
              <div>
                <div className="t">{tKontext('datenschutz_title')}</div>
                <div className="s">{tKontext('datenschutz_body')}</div>
                <Link href="/datenschutz">
                  {tKontext('datenschutz_link')}{' '}
                  <ExternalLink aria-hidden="true" style={{ width: 11, height: 11 }} />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function proposalFromPreview(preview: PreviewResult): UmzugProposal {
  return {
    neue_adresse: preview.neue_adresse,
    stichtag: preview.stichtag,
    blockBConsent: preview.umzugPreview.block_b.map((s) => s.behoerde_id),
    preview: preview.umzugPreview,
  };
}

type BuildProposalResult =
  | { ok: true; proposal: UmzugProposal }
  | { ok: false; error: string };

/**
 * Build the held confirm-card proposal from a `starte_umzug` tool_use.input.
 *
 * The irreversible write path MUST validate to the SAME zod contract that
 * `preview_umzug` already enforces — structurally, not by loose manual checks.
 * `validateUmzugToolInput('starte_umzug', …)` enforces 5-digit `plz`,
 * `land === 'DE'`, all required address fields, ISO `stichtag_iso`, and the
 * `block_b_consent` array. On failure we REFUSE (return an error the caller
 * surfaces) rather than proceed into an "Umzug nach undefined".
 */
async function buildProposalFromStarteUmzug(
  input: Record<string, unknown>,
): Promise<BuildProposalResult> {
  const validation = validateUmzugToolInput('starte_umzug', input);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Die Umzugsdaten sind unvollständig oder ungültig (z. B. fehlende PLZ, kein deutsches Land oder kein gültiges Stichtag-Datum). Bitte ergänzen Sie die Adresse und den Stichtag.',
    };
  }
  const data = validation.data as StarteUmzugInput;
  try {
    const umzugPreview = await api.previewUmzug({
      neue_adresse: data.neue_adresse,
      stichtag: data.stichtag_iso,
    });
    return {
      ok: true,
      proposal: {
        neue_adresse: data.neue_adresse,
        stichtag: data.stichtag_iso,
        blockBConsent: data.block_b_consent,
        preview: umzugPreview,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Die Umzugsvorschau konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
    };
  }
}

type BuildLebenslageProposalResult =
  | { ok: true; proposal: LebenslageProposal }
  | { ok: false; error: string };

/**
 * Maskiert eine (`[MOCK]`-präfixierte) IBAN auf `DE.. •••• 4711` — die
 * Auszahlungskonto-Vorschau des Stufe-1-eID-Bestätigungsschritts. Spiegelt
 * `maskIban` der Cascade-Engine (das Länderpräfix wird aus der IBAN abgeleitet,
 * nicht hart auf „DE" gesetzt). `undefined`, wenn keine (brauchbare) IBAN
 * vorliegt — dann trägt die Karte nur „Mit eID bestätigen".
 */
function maskIbanForConfirm(iban?: string): string | undefined {
  if (!iban) return undefined;
  const cleaned = iban.replace(/\[MOCK\]\s*/i, '').replace(/\s+/g, '');
  if (cleaned.length < 4) return undefined;
  const prefix = /^[A-Za-z]{2}/.test(cleaned)
    ? cleaned.slice(0, 2).toUpperCase()
    : 'DE';
  return `${prefix}.. •••• ${cleaned.slice(-4)}`;
}

/**
 * Build the held confirm-card proposal from a `preview_lebenslage` /
 * `starte_lebenslage` tool_use.input — the antragslos-cascade mirror of
 * `buildProposalFromStarteUmzug`.
 *
 * `validateLebenslageToolInput('starte_lebenslage', …)` enforces the whitelisted
 * `slug` enum (`STARTE_LEBENSLAGE_SLUGS`, currently only `kindergeld`) so
 * antragsgebundene Leistungen can never be drawn as an auto-cascade, and lifts
 * the optional `consents` array (defaults `[]`; kindergeld has no consent step).
 * The preview input (`{slug}`) also validates cleanly here (consents defaults).
 *
 * On success it enriches with `api.getLebenslageConfig(slug)` (beteiligte
 * Behörden in Datenketten-Reihenfolge + `zukunft` + `vorgangTyp`) and
 * `api.getProfile()` (masked IBAN for the Stufe-1 confirmation line). On any
 * failure it REFUSES with an error the caller surfaces rather than hold a card
 * for an unbuildable cascade.
 */
async function buildProposalFromStarteLebenslage(
  input: Record<string, unknown>,
): Promise<BuildLebenslageProposalResult> {
  const validation = validateLebenslageToolInput('starte_lebenslage', input);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Diese Lebenslage kann nicht als automatische Kaskade eingerichtet werden. Antragslos läuft derzeit nur das Kindergeld (Regierungsentwurf, gestuft 2027).',
    };
  }
  const data = validation.data as StarteLebenslageInput;
  try {
    const [config, profile] = await Promise.all([
      api.getLebenslageConfig(data.slug),
      api.getProfile(),
    ]);
    if (!config || config.engine !== 'lebenslage-cascade') {
      return {
        ok: false,
        error: `Die Lebenslage „${data.slug}" ist nicht als antragslose Kaskade verfügbar.`,
      };
    }
    // Beteiligte Behörden = distinkte Cascade-Behörden in Datenketten-Reihenfolge
    // (persona-gefiltert), identisch zur Backend-Ableitung in starteLebenslage.
    const beteiligteBehoerden = Array.from(
      new Set(
        config.cascade
          .filter((s) => !s.visibleIf || s.visibleIf(profile))
          .map((s) => s.behoerdeId),
      ),
    );
    return {
      ok: true,
      proposal: {
        slug: config.slug,
        vorgangTyp: config.vorgangTyp,
        beteiligteBehoerden,
        zukunft: config.zukunft,
        maskedIban: maskIbanForConfirm(profile.bankverbindung?.iban),
        consents: data.consents,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Die Kaskaden-Vorschau konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
    };
  }
}

type GreetingTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

interface GreetingFacts {
  /** Name der absendenden Behörde des Steuerbescheids (aus getBehoerden-Lookup). */
  steuerbescheidBehoerde?: string;
  /** ISO-Datum der Einspruchs-Frist des Steuerbescheids. */
  einspruchFristIso?: string;
  /** ISO-Datum, bis zu dem der Aufenthaltstitel gültig ist. */
  aufenthaltstitelBisIso?: string;
  /** Betrag des Steuerbescheids in Euro-Cent (Erstattung oder Nachzahlung). */
  steuerBetragCent?: number;
  /** Richtung des Steuer-Betrags: Geld an den/die Bürger:in oder ans Finanzamt. */
  steuerBetragRichtung?: 'erstattung' | 'nachzahlung';
}

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

/**
 * Baut die Begrüßung ausschließlich aus realen, strukturierten API-Daten. Fehlt
 * eine Tatsache (kein Steuerbescheid, kein Aufenthaltstitel), entfällt der
 * jeweilige Punkt, statt eine veraltete Konstante anzuzeigen.
 */
function buildGreetingText(
  t: GreetingTranslator,
  vorname: string | null,
  facts: GreetingFacts,
): string {
  const lines: string[] = [
    vorname ? t('intro_named', { vorname }) : t('intro'),
  ];

  if (facts.steuerbescheidBehoerde) {
    lines.push(`- ${t('bullet_steuerbescheid', { behoerde: facts.steuerbescheidBehoerde })}`);
  }
  if (facts.steuerBetragCent != null && facts.steuerBetragRichtung) {
    const betrag = euroFormatter.format(facts.steuerBetragCent / 100);
    const key =
      facts.steuerBetragRichtung === 'erstattung'
        ? 'bullet_erstattung'
        : 'bullet_nachzahlung';
    lines.push(`- ${t(key, { betrag })}`);
  }
  if (facts.aufenthaltstitelBisIso) {
    lines.push(`- ${t('bullet_aufenthalt', { datum: formatDateDe(facts.aufenthaltstitelBisIso) })}`);
  }
  if (facts.einspruchFristIso) {
    lines.push(`- ${t('bullet_einspruch', { datum: formatDateDe(facts.einspruchFristIso) })}`);
  }

  lines.push('', t('cta'));
  return lines.join('\n');
}

function buildGreeting(
  t: GreetingTranslator,
  persona: Persona,
  facts: GreetingFacts,
): ChatMessage {
  return {
    id: 'greeting',
    role: 'assistant',
    text: buildGreetingText(t, persona.vorname, facts),
    at: new Date().toISOString(),
    uiOnly: true,
  };
}

function buildStaticGreeting(t: GreetingTranslator): ChatMessage {
  return {
    id: 'greeting',
    role: 'assistant',
    text: buildGreetingText(t, null, {}),
    at: new Date().toISOString(),
    uiOnly: true,
  };
}

