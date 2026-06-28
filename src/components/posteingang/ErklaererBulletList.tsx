'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';

import { NormTooltip } from '@/components/shared/NormTooltip';
import { rtlLocales } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { LetterAiSummaryPostOpen, LetterCitation } from '@/types';

import { CitationFootnote } from './CitationFootnote';
import type { ErklaererLang } from './use-erklaerer-lang';
import { parseBoldAndNorms } from './utils/parse-bold-norms';

interface ErklaererBulletListProps {
  summary: LetterAiSummaryPostOpen;
  /** Aktive Erläuterungs-Sprache — setzt `lang` (+ `dir=rtl` für ar) am Container. */
  activeLang: ErklaererLang;
  /** `true`, wenn die aktive Sprache ≠ de ist (übersetzte Ansicht). */
  isTranslated: boolean;
  onShowInOriginal?: (citation: LetterCitation) => void;
  /** Tailwind-Klassen für den Bullet-Punkt (Card vs. Reader Tint). */
  bulletDotClassName?: string;
  className?: string;
}

/**
 * In RTL-Text eingebettete LTR-Läufe (deutsche Daten „14.09.2027", Beträge,
 * Aktenzeichen) in `<bdi dir="ltr">` isolieren, damit sie LTR-stabil bleiben
 * (Spec §4.2.4 / §A11y). Trifft Datums-/Zahl-/Latin-Runs; reiner RTL-Text
 * bleibt unberührt.
 */
const LTR_RUN_PATTERN =
  /(\d[\d.,:/-]*\s?(?:€|EUR|%)?|[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.\-/]*)/g;

function renderPlainLtrStable(
  text: string,
  keyPrefix: string,
): React.ReactNode {
  const out: React.ReactNode[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(LTR_RUN_PATTERN);
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) {
      out.push(
        <React.Fragment key={`${keyPrefix}-t-${lastEnd}`}>
          {text.slice(lastEnd, m.index)}
        </React.Fragment>,
      );
    }
    out.push(
      <bdi key={`${keyPrefix}-ltr-${m.index}`} dir="ltr">
        {m[0]}
      </bdi>,
    );
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) {
    out.push(
      <React.Fragment key={`${keyPrefix}-t-end`}>
        {text.slice(lastEnd)}
      </React.Fragment>,
    );
  }
  return <>{out}</>;
}

/**
 * Locale-bewusster Bullet-Renderer. Bold/Norm-Segmente wie gehabt; in RTL
 * werden deutsche Paragraphen (Norm) und eingebettete LTR-Runs in plain-Text
 * über `<bdi dir="ltr">` stabilisiert. In LTR-Sprachen ist `<bdi>` ein No-Op.
 */
function renderBulletText(text: string, wrapGermanLtr: boolean): React.ReactNode {
  const segments = parseBoldAndNorms(text);
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.kind === 'bold') {
          return (
            <strong key={`b-${idx}`} className="font-semibold text-foreground">
              {seg.text}
            </strong>
          );
        }
        if (seg.kind === 'norm') {
          // Deutsche Paragraphen bleiben deutsch (nie lokalisiert) und in RTL
          // LTR-stabil → in <bdi dir="ltr">.
          const norm = <NormTooltip key={`n-${idx}`} norm={seg.norm} />;
          return wrapGermanLtr ? (
            <bdi key={`bdi-${idx}`} dir="ltr">
              {norm}
            </bdi>
          ) : (
            norm
          );
        }
        return wrapGermanLtr ? (
          <React.Fragment key={`t-${idx}`}>
            {renderPlainLtrStable(seg.text, `p-${idx}`)}
          </React.Fragment>
        ) : (
          <React.Fragment key={`t-${idx}`}>{seg.text}</React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Gemeinsamer Bullet-Renderer für `AISummaryBlock` + `AiErklaererCard`.
 *
 * - Container trägt `lang={activeLang}` und (für `ar`) `dir="rtl"`.
 * - Neben **jedem** Bullet steht der bestehende `CitationFootnote` mit dem
 *   **unübersetzten deutschen** `original_zitat` (verbatim aus `body_de`).
 * - `citation_match === false` (über die Frist-Citations verknüpft) wird vom
 *   Aufrufer separat geprüft; hier wird der bestehende Footnote gerendert, der
 *   das deutsche Original anbietet.
 * - Eingebettete deutsche Paragraphen werden in RTL über `<bdi>` LTR-stabilisiert.
 */
export function ErklaererBulletList({
  summary,
  activeLang,
  isTranslated,
  onShowInOriginal,
  bulletDotClassName,
  className,
}: ErklaererBulletListProps) {
  const tErkl = useTranslations('posteingang.erklaerer');
  const prefersReducedMotion = useReducedMotion();

  const isRtl = (rtlLocales as readonly string[]).includes(activeLang);
  const wrapGermanLtr = isRtl;

  const variants = {
    hidden: { opacity: 1, y: prefersReducedMotion ? 0 : 4 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <ol
      lang={activeLang}
      dir={isRtl ? 'rtl' : undefined}
      className={cn(
        'flex list-none flex-col gap-2.5 text-sm leading-relaxed',
        className,
      )}
    >
      {summary.bullets.map((bullet, idx) => {
        const citation = summary.citations.find((c) => c.bullet_index === idx);
        const hasZitat = citation && citation.original_zitat.trim().length > 0;
        return (
          <motion.li
            key={`b-${idx}`}
            initial="hidden"
            animate="visible"
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.25, delay: idx * 0.04 }
            }
            variants={variants}
            className="flex items-start gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-2 inline-block size-1.5 shrink-0 rounded-full',
                bulletDotClassName ?? 'bg-foreground/40',
              )}
            />
            <span className="flex-1">
              {renderBulletText(bullet.text, wrapGermanLtr)}
              {hasZitat && citation && (
                <bdi dir="ltr">
                  <span className="sr-only">
                    {' '}
                    {tErkl('original_zitat_label')}{' '}
                  </span>
                  <CitationFootnote
                    citation={citation}
                    number={idx + 1}
                    onShowInOriginal={onShowInOriginal}
                  />
                </bdi>
              )}
            </span>
          </motion.li>
        );
      })}
      {isTranslated && (
        <li className="mt-1 flex list-none">
          <p
            lang={activeLang}
            dir={isRtl ? 'rtl' : undefined}
            className="text-[11px] leading-relaxed text-muted-foreground"
          >
            {tErkl('mock_watermark')}
          </p>
        </li>
      )}
    </ol>
  );
}
