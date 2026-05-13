'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn, formatDateDe } from '@/lib/utils';
import type { Letter, ReplyTemplateId } from '@/types';

import {
  pickFristDatumForNormFamilie,
  pickNormFamilie,
} from './preInsertionModalLookup';

interface FristAbgelaufenWarnungProps {
  letter: Letter;
  templateId: ReplyTemplateId | 'freitext' | null;
  /** Optional: Stable-„now" für SSR-Tests. */
  now?: Date;
  className?: string;
}

/**
 * Frist-abgelaufen-Warnung (Spec § 9.3).
 *
 * Render-Bedingung: für die Norm-Familien-spezifische Frist (Einspruch /
 * Widerspruch / AdV-Einspruch-Verweis) gilt `now > fristDatum`.
 *
 * V1.5.0 hat keine `frist.status`-Property — wir leiten das hier ab via
 * `new Date() > new Date(frist.datum)` (Spec § 9.3 Architect-Note).
 *
 * Visual: amber-warning-Box mit `bg-amber-50 text-amber-900`-Token-Pair
 * (WCAG-AA-Kontrast ≥ 4.5:1; Tailwind defaults erfüllen das per
 * https://www.tailwindcss.com/docs/colors — amber-50/900 ≈ 12.5:1).
 */
export function FristAbgelaufenWarnung({
  letter,
  templateId,
  now,
  className,
}: FristAbgelaufenWarnungProps): React.ReactElement | null {
  const t = useTranslations('posteingang.compose');

  if (templateId === null || templateId === 'freitext') return null;

  let norm: ReturnType<typeof pickNormFamilie>;
  try {
    norm = pickNormFamilie(letter, templateId);
  } catch {
    return null;
  }

  // AdV-Skelett selbst hat keine eigene Frist (Spec § 9.2 letzte Zeile);
  // die Warnung gehört zum Einspruch-Skelett. Daher kein Render bei AdV.
  if (norm === 'aussetzung_ao') return null;

  const fristIso = pickFristDatumForNormFamilie(letter, norm);
  if (!fristIso) return null;

  const reference = now ?? new Date();
  const fristDate = new Date(fristIso);
  if (Number.isNaN(fristDate.getTime())) return null;
  if (reference.getTime() <= fristDate.getTime()) return null;

  let body: string;
  try {
    body = t('frist_abgelaufen_warnung', {
      frist_datum: formatDateDe(fristIso),
    });
  } catch {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900',
        'dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100',
        className,
      )}
      data-testid="frist-abgelaufen-warnung"
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-200"
        aria-hidden="true"
      />
      <p>{body}</p>
    </div>
  );
}
