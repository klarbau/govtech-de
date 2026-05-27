'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, Send } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_TEXTAREA_HEIGHT = 160;

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const t = useTranslations('assistent.composer');
  const [value, setValue] = React.useState('');
  const textareaId = React.useId();
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-lg border border-border-strong bg-surface p-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-disabled="true"
            tabIndex={-1}
            aria-label={t('attach')}
            onClick={(event) => event.preventDefault()}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted opacity-50"
          >
            <Paperclip className="size-5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{t('attach_disabled')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <label htmlFor={textareaId} className="sr-only">
        {t('label')}
      </label>
      <textarea
        id={textareaId}
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder')}
        className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-text-primary outline-none placeholder:text-text-muted disabled:opacity-50"
      />

      <button
        type="button"
        onClick={submit}
        disabled={disabled || value.trim().length === 0}
        aria-label={t('send')}
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <Send className="size-5 rtl:-scale-x-100" aria-hidden="true" />
      </button>
    </div>
  );
}
