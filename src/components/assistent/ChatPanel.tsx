'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { UmzugConfirmCard } from './UmzugConfirmCard';
import type { ChatMessage } from './types';

interface ChatPanelProps {
  messages: ChatMessage[];
  streaming: boolean;
  behoerdeName: (id: string) => string;
  onConfirmUmzug: (messageId: string) => void;
  onCancelUmzug: (messageId: string) => void;
  confirmBusyMessageId: string | null;
  /** The latest committed assistant text, announced once per turn. */
  liveAnnouncement: string;
}

export function ChatPanel({
  messages,
  streaming,
  behoerdeName,
  onConfirmUmzug,
  onCancelUmzug,
  confirmBusyMessageId,
  liveAnnouncement,
}: ChatPanelProps) {
  const t = useTranslations('assistent');
  const reduceMotion = useReducedMotion();
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({
      block: 'end',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [messages, streaming, reduceMotion]);

  return (
    <div className="flex flex-col gap-4">
      <ol
        className="flex flex-col gap-4"
        aria-label={t('log_label')}
      >
        {messages.map((message) => (
          <li key={message.id} className="contents">
            <MessageBubble message={message} />
            {message.toolCalls?.map((call) => (
              <ToolCallCard key={call.id} call={call} />
            ))}
            {message.umzugProposal ? (
              <UmzugConfirmCard
                proposal={message.umzugProposal}
                behoerdeName={behoerdeName}
                busy={confirmBusyMessageId === message.id}
                onConfirm={() => onConfirmUmzug(message.id)}
                onCancel={() => onCancelUmzug(message.id)}
              />
            ) : null}
          </li>
        ))}
      </ol>

      {streaming ? (
        <p
          className="flex items-center gap-2 pl-10 text-sm text-text-muted"
          aria-hidden="true"
        >
          <Loader2
            className={cn('size-3.5', !reduceMotion && 'animate-spin')}
          />
          {t('streaming.typing')}
        </p>
      ) : null}

      {/* Screen-reader announcement: one coarse update per committed turn. */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      <div ref={endRef} />
    </div>
  );
}
