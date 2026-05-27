'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { CheckCheck, Sparkles } from 'lucide-react';

import { IconCircle } from '@/components/shared/IconCircle';
import { cn } from '@/lib/utils';

import { MessageMarkdown } from './MessageMarkdown';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
}

function Timestamp({ iso }: { iso: string }) {
  const format = useFormatter();
  const date = new Date(iso);
  const valid = !Number.isNaN(date.getTime());
  return (
    <time
      dateTime={valid ? iso : undefined}
      className="text-xs text-text-muted tabular-nums"
    >
      {valid ? format.dateTime(date, { hour: '2-digit', minute: '2-digit' }) : ''}
    </time>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const t = useTranslations('assistent.message');
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-surface-muted px-4 py-3 text-base text-text-primary">
          <MessageMarkdown text={message.text} />
          <div className="mt-1 flex items-center justify-end gap-1">
            <Timestamp iso={message.at} />
            <CheckCheck
              className="size-3.5 text-primary"
              aria-label={t('user_sent')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <IconCircle
        icon={<Sparkles aria-hidden="true" />}
        tone="primary"
        size="sm"
        className="mt-0.5"
      />
      <div className="min-w-0 max-w-[85%] rounded-lg rounded-tl-sm bg-accent-soft px-4 py-3 text-base text-text-primary">
        <span className="sr-only">{t('assistant_label')}: </span>
        {message.text ? (
          <MessageMarkdown text={message.text} />
        ) : (
          <span className="text-text-muted">…</span>
        )}
        <div
          className={cn(
            'mt-1 flex items-center justify-end',
            !message.text && 'hidden',
          )}
        >
          <Timestamp iso={message.at} />
        </div>
      </div>
    </div>
  );
}
