'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileUp, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface WohnungsgeberUploadProps {
  onChange: (state: { filename: string | null; isDemo: boolean }) => void;
  errorId?: string;
  errorMessage?: string;
}

export function WohnungsgeberUpload({
  onChange,
  errorId,
  errorMessage,
}: WohnungsgeberUploadProps) {
  const t = useTranslations('umzug.start.wohnungsgeber');
  const inputRef = useRef<HTMLInputElement>(null);
  const helperId = useId();
  const describedBy = errorId ? `${helperId} ${errorId}` : helperId;
  const [filename, setFilename] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  function handleSelected(file: File | null) {
    const name = file?.name ?? null;
    setFilename(name);
    setIsDemo(false);
    onChange({ filename: name, isDemo: false });
  }

  function handleDemo() {
    const name = t('demo_filename');
    setFilename(name);
    setIsDemo(true);
    onChange({ filename: name, isDemo: true });
  }

  return (
    <fieldset
      className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4"
      aria-describedby={describedBy}
      aria-invalid={Boolean(errorMessage) || undefined}
    >
      <legend className="px-1 text-sm font-medium text-foreground">
        {t('title')}
      </legend>
      <p id={helperId} className="text-xs text-muted-foreground">
        {t('helper_de')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp aria-hidden="true" />
          <span>{t('cta_upload')}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDemo}
        >
          <Sparkles aria-hidden="true" />
          <span>{t('cta_demo')}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(e) => handleSelected(e.target.files?.[0] ?? null)}
          aria-label={t('cta_upload')}
        />
      </div>
      {filename ? (
        <p
          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
          aria-live="polite"
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          <span>
            {t('selected_template', { filename })}
            {isDemo ? '' : ''}
          </span>
        </p>
      ) : null}
      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
