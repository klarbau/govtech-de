'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { formatDateDe } from '@/lib/utils';
import type { Letter, ReplyTemplateId } from '@/types';

import { NormZitatSpan } from './NormZitatSpan';
import { NORM_ZITAT_REGEX } from './normZitatLookup';
import {
  pickFristCitedFormatKey,
  pickFristDatumForNormFamilie,
  pickNormFamilie,
} from './preInsertionModalLookup';

interface FristCitedFormatHeaderProps {
  letter: Letter;
  templateId: ReplyTemplateId | 'freitext' | null;
  className?: string;
}

/**
 * Norm-spezifischer Frist-Cited-Format-Header (Spec § 9.2).
 *
 * Rendert verbatim aus `posteingang.compose.frist_cited_format.<norm>` und
 * substituiert `{frist_datum}` aus `letter.fristen[]` per Norm-Familie.
 *
 * Beispiel (AO-Einspruch):
 *   „Sie haben **1 Monat** ab Bekanntgabe … **§ 355 Abs. 1 AO**.
 *    Die Frist endet am 04.06.2026."
 *
 * **Hard-Lines:**
 *   - § 11.5: jedes §-Zitat im String wird mit `<NormZitatSpan>` gewrappt.
 *   - § 11.8: Header bleibt auf jeder Viewport-Breite sichtbar (Caveat
 *     darf ihn nie überlagern).
 *
 * Die Markdown-Sterne `**…**` aus dem i18n-String werden zu `<strong>`-Tags.
 * Ein bewusst minimaler Inline-Renderer reicht — wir wollen kein vollständiges
 * Markdown-System für eine Hand voll Zitate ziehen.
 */
export function FristCitedFormatHeader({
  letter,
  templateId,
  className,
}: FristCitedFormatHeaderProps): React.ReactElement | null {
  const t = useTranslations('posteingang.compose');

  if (templateId === null || templateId === 'freitext') return null;

  const i18nKey = pickFristCitedFormatKey(letter, templateId);
  if (!i18nKey) return null;

  let norm: ReturnType<typeof pickNormFamilie>;
  try {
    norm = pickNormFamilie(letter, templateId);
  } catch {
    return null;
  }

  const fristIso = pickFristDatumForNormFamilie(letter, norm);
  const fristDatum = fristIso ? formatDateDe(fristIso) : '';

  let raw: string;
  try {
    raw = t(i18nKey, { frist_datum: fristDatum });
  } catch {
    return null;
  }

  const parts = renderInlineRichText(raw);

  return (
    <p
      className={
        className ??
        'rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground'
      }
      data-testid="frist-cited-format-header"
    >
      {parts}
    </p>
  );
}

/**
 * Mini-Renderer:
 *   1. erkennt `**bold**`-Spans
 *   2. erkennt §-Zitate via `NORM_ZITAT_REGEX`
 *   3. wickelt §-Zitate in `<NormZitatSpan>` ein
 *   4. setzt `**…**` als `<strong>`
 *
 * Reihenfolge: erst bold-Splitting (weil §-Zitate oft *innerhalb* der bold-
 * Spans liegen), dann NormZitat-Splitting innerhalb der bold/non-bold-Segmente.
 */
function renderInlineRichText(text: string): React.ReactNode[] {
  // 1) Split by **bold**
  const boldSegments = splitByBold(text);
  const out: React.ReactNode[] = [];
  boldSegments.forEach((seg, i) => {
    const inner = wrapNormZitate(seg.text, `${i}`);
    if (seg.bold) {
      out.push(
        <strong key={`b-${i}`} className="font-semibold">
          {inner}
        </strong>,
      );
    } else {
      out.push(...inner);
    }
  });
  return out;
}

interface BoldSegment {
  text: string;
  bold: boolean;
}

function splitByBold(text: string): BoldSegment[] {
  const out: BoldSegment[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ text: text.slice(last, m.index), bold: false });
    }
    out.push({ text: m[1], bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) {
    out.push({ text: text.slice(last), bold: false });
  }
  if (out.length === 0) {
    out.push({ text, bold: false });
  }
  return out;
}

function wrapNormZitate(text: string, parentKey: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = new RegExp(NORM_ZITAT_REGEX.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    out.push(
      <NormZitatSpan key={`nz-${parentKey}-${i}`} text={m[0]} />,
    );
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  if (out.length === 0) out.push(text);
  return out;
}

export { renderInlineRichText };
