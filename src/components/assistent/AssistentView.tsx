'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type Anthropic from '@anthropic-ai/sdk';
import {
  Calendar,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  ListChecks,
  Mail,
  Shield,
  User,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { formatDateDe } from '@/lib/utils';
import { requiresConfirmation } from '@/lib/ai/tool-schemas';
import type { AssistantStreamEvent } from '@/lib/ai/stream';
import type { PersonaContextInput } from '@/lib/ai/system-prompt';
import type { Behoerde, Persona } from '@/types';

import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { UmzugConfirmCard } from './UmzugConfirmCard';
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
  const tGreeting = useTranslations('assistent.greeting');

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
              ? {
                  ...m,
                  text: 'Der Assistent ist gerade nicht erreichbar. Bitte versuchen Sie es erneut.',
                  error: true,
                }
              : m,
          ),
        );
        return;
      }

      if (toolUses.length === 0 || stopReason !== 'tool_use') return;
      if (round >= MAX_TOOL_ROUNDS) return;

      await handleToolUsesRef.current(assistantId, toolUses, round);
    },
    [locale],
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

  const interactionDisabled = streaming || confirmBusyId !== null;

  const threadEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, streaming]);

  return (
    <>
      <div className="gt-page-head">
        <h1>Assistent</h1>
        <div className="sub">
          Fragen stellen, Briefe verstehen und nächste Schritte finden.
        </div>
      </div>

      <div className="quick-chips" role="group" aria-label="Vorgeschlagene Fragen">
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('Erkläre meinen Brief.')}
        >
          <FileText />
          Erkläre meinen Brief
        </button>
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('Was ist als Nächstes zu tun?')}
        >
          <ListChecks />
          Was ist als Nächstes zu tun?
        </button>
        <button
          type="button"
          className="chip"
          disabled={interactionDisabled}
          onClick={() => void sendUserMessage('Welche Unterlagen fehlen?')}
        >
          <FolderOpen />
          Welche Unterlagen fehlen?
        </button>
      </div>

      <div className="as-layout">
        <div className="chat-card">
          <ol className="chat-thread" aria-label="Konversation mit dem Assistenten">
            {messages.map((message) => (
              <li key={message.id} style={{ display: 'contents' }}>
                <MessageBubble message={message} />
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
              </li>
            ))}
            <div ref={threadEndRef} />
          </ol>
          <div className="sr-only" role="status" aria-live="polite">
            {liveAnnouncement}
          </div>

          <ChatComposer onSend={sendUserMessage} disabled={interactionDisabled} />
        </div>

        <div className="ctx-card">
          <h3>Kontext</h3>
          <div className="sub">Ich beziehe mich auf:</div>
          <Link className="ctx-row" href="/posteingang">
            <span className="icon-circle">
              <Mail />
            </span>
            <div className="grow">
              <div className="t">Posteingang</div>
              <div className="s">
                {counts ? `${counts.ungeleseneBriefe} ungelesen` : '—'}
              </div>
            </div>
            <ChevronRight />
          </Link>
          <Link className="ctx-row" href="/dokumente">
            <span className="icon-circle">
              <FileText />
            </span>
            <div className="grow">
              <div className="t">Dokumente</div>
              <div className="s">{counts ? `${counts.dokumente} Dokumente` : '—'}</div>
            </div>
            <ChevronRight />
          </Link>
          <Link className="ctx-row" href="/termine">
            <span className="icon-circle">
              <Calendar />
            </span>
            <div className="grow">
              <div className="t">Termine</div>
              <div className="s">{counts ? `${counts.termine} anstehend` : '—'}</div>
            </div>
            <ChevronRight />
          </Link>
          <Link className="ctx-row" href="/stammdaten">
            <span className="icon-circle">
              <User />
            </span>
            <div className="grow">
              <div className="t">Stammdaten</div>
              <div className="s">Aktuell</div>
            </div>
            <ChevronRight />
          </Link>

          <div className="ctx-foot">
            <div className="row">
              <Shield />
              <div>
                <div className="t">Ihre Daten sind geschützt.</div>
                <div className="s">
                  Der Assistent verarbeitet Ihre Daten vertraulich und sicher.
                </div>
                <Link href="/datenschutz">
                  Mehr zum Datenschutz{' '}
                  <ExternalLink style={{ width: 11, height: 11 }} />
                </Link>
              </div>
            </div>
          </div>
        </div>
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

async function buildProposalFromStarteUmzug(
  input: Record<string, unknown>,
): Promise<UmzugProposal | null> {
  const adresse = input.neue_adresse;
  const stichtag = input.stichtag_iso;
  if (!adresse || typeof adresse !== 'object' || typeof stichtag !== 'string') {
    return null;
  }
  const neue_adresse = adresse as UmzugProposal['neue_adresse'];
  const consentRaw = input.block_b_consent;
  const blockBConsent = Array.isArray(consentRaw)
    ? consentRaw.filter((v): v is string => typeof v === 'string')
    : [];
  try {
    const umzugPreview = await api.previewUmzug({ neue_adresse, stichtag });
    return { neue_adresse, stichtag, blockBConsent, preview: umzugPreview };
  } catch {
    return null;
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

