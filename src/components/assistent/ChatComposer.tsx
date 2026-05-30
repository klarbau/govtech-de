'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, Send } from 'lucide-react';

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const t = useTranslations('assistent.composer');
  const [value, setValue] = React.useState('');
  const inputId = React.useId();

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <Paperclip aria-hidden="true" />
      <label htmlFor={inputId} className="sr-only">
        {t('label')}
      </label>
      <input
        id={inputId}
        placeholder={t('placeholder')}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="send"
        onClick={submit}
        disabled={disabled || value.trim().length === 0}
        aria-label={t('send')}
      >
        <Send />
      </button>
    </div>
  );
}
