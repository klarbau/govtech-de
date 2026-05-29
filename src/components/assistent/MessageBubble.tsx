'use client';

import * as React from 'react';
import { CheckCheck, Sparkles } from 'lucide-react';

import { MessageMarkdown } from './MessageMarkdown';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const time = formatTime(message.at);

  if (isUser) {
    return (
      <div className="msg user">
        <span
          className="av"
          aria-hidden="true"
          style={{ background: 'var(--brand-50)', color: 'var(--brand-700)' }}
        >
          AP
        </span>
        <div>
          <div className="bubble">
            <MessageMarkdown text={message.text} />
          </div>
          <div className="time">
            {time} <CheckCheck aria-label="Gesendet" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg">
      <span className="av" aria-hidden="true">
        <Sparkles />
      </span>
      <div>
        <div className="bubble">
          {message.text ? (
            <MessageMarkdown text={message.text} />
          ) : (
            <span style={{ color: 'var(--ink-3)' }}>…</span>
          )}
        </div>
        <div className="time" style={{ display: message.text ? 'flex' : 'none' }}>
          {time}
        </div>
      </div>
    </div>
  );
}
