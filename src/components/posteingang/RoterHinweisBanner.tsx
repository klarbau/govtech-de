import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

import { parseBoldAndNorms } from './utils/parse-bold-norms';

interface RoterHinweisBannerProps {
  className?: string;
}

function renderWithBold(text: string): React.ReactNode {
  const segments = parseBoldAndNorms(text);
  if (segments.length === 0) return text;
  return segments.map((seg, idx) => {
    if (seg.kind === 'bold') {
      return (
        <strong key={`b-${idx}`} className="font-semibold">
          {seg.text}
        </strong>
      );
    }
    return <React.Fragment key={`t-${idx}`}>{seg.text}</React.Fragment>;
  });
}

/**
 * Roter Hinweis-Banner über AI-Summary („Rechtsverbindlich ist der
 * Originaltext"). Spec §4.3 + §8.1 — Wortlaut verbatim aus
 * `posteingang.disclaimer.original_authoritative`.
 */
export function RoterHinweisBanner({ className }: RoterHinweisBannerProps) {
  const t = useTranslations('posteingang.disclaimer');

  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="whitespace-pre-line">
        {renderWithBold(t('original_authoritative'))}
      </p>
    </div>
  );
}
