'use client';

import * as React from 'react';
import { useMessages, useTranslations } from 'next-intl';
import { ListChecks } from 'lucide-react';

import { NormTooltip } from '@/components/shared/NormTooltip';
import { cn } from '@/lib/utils';

import { ARCHETYPE_ACTION_DEFAULTS } from './letter-archetype-actions';
import type { Letter, LetterArchetype } from '@/types';
import { parseBoldAndNorms } from './utils/parse-bold-norms';

interface WasKannIchTunFooterProps {
  archetype: LetterArchetype | undefined;
  /** IDs aus dem Archetyp-Katalog (Spec §6.1) — kommt vom Mock-Backend pro Brief. */
  options?: string[];
  /**
   * Phase 6b (Audit #5) — Optionaler Brief-Kontext für pre-action-hint.
   * Wenn `letter.required_action.typ === 'zahlung'`: Nachzahlungs-Heuristik.
   * Wenn ein offenes `fristen[0]` existiert (= Frist-Brief): Frist-Heuristik.
   * Bei keiner Übereinstimmung wird kein Hint gerendert (defensive default).
   */
  letter?: Pick<Letter, 'required_action' | 'fristen'>;
  className?: string;
}

function renderWithNormTooltips(text: string): React.ReactNode {
  const segments = parseBoldAndNorms(text);
  if (segments.length === 0) return text;
  return segments.map((seg, idx) => {
    if (seg.kind === 'bold') {
      return (
        <strong key={`b-${idx}`} className="font-semibold text-foreground">
          {seg.text}
        </strong>
      );
    }
    if (seg.kind === 'norm') {
      return <NormTooltip key={`n-${idx}`} norm={seg.norm} />;
    }
    return <React.Fragment key={`t-${idx}`}>{seg.text}</React.Fragment>;
  });
}

/**
 * Liest einen verschachtelten Schlüssel (`steuerbescheid.zahlung`) aus dem
 * `posteingang.was_kann_ich_tun`-Bundle und gibt `null` zurück, wenn er
 * nicht existiert. Vermeidet das Try/Catch-Anti-Pattern um `t(id)`.
 */
function lookupCatalogText(
  messages: Record<string, unknown>,
  id: string,
): string | null {
  const segments = id.split('.');
  let cursor: unknown =
    (messages as Record<string, unknown>)['posteingang'];
  if (!cursor || typeof cursor !== 'object') return null;
  cursor = (cursor as Record<string, unknown>)['was_kann_ich_tun'];
  for (const seg of segments) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return typeof cursor === 'string' ? cursor : null;
}

/**
 * Informativer Was-kann-ich-tun-Footer (Spec §10 V1-Out für „Antwort vorschlagen"!).
 *
 * Rendert nur die Optionen-Liste mit `<NormTooltip>` auf juristischen
 * Bezügen. Direkt darüber der `no_legal_advice`-Disclaimer.
 *
 * Verbatim-Wortlaut der Disclaimer-Strings stammt aus i18n-key
 * `posteingang.disclaimer.no_legal_advice` (verifier §1, Spec §8.1).
 */
export function WasKannIchTunFooter({
  archetype,
  options,
  letter,
  className,
}: WasKannIchTunFooterProps) {
  const t = useTranslations('posteingang.reader.was_kann_ich_tun');
  const tHint = useTranslations('posteingang.was_kann_ich_tun');
  const tDisclaimer = useTranslations('posteingang.disclaimer');
  const messages = useMessages() as Record<string, unknown>;

  const ids =
    options && options.length > 0
      ? options
      : archetype
        ? (ARCHETYPE_ACTION_DEFAULTS[archetype] ?? [])
        : [];

  if (ids.length === 0) return null;

  // Phase 6b (Audit #5) — pre-action-hint Heuristik (nur die zwei häufigsten
  // Cases — Spec-Vorgabe: NICHT alle Fälle lösen):
  //   1. required_action.typ === 'zahlung' → Nachzahlungs-Hint.
  //   2. fristen[0] mit Typ einspruch/widerspruch/klage → Frist-Hint.
  const hintKind: 'zahlung' | 'frist' | null = (() => {
    if (!letter) return null;
    if (letter.required_action?.typ === 'zahlung') return 'zahlung';
    const earliest = letter.fristen?.[0];
    if (
      earliest &&
      (earliest.typ === 'einspruch' ||
        earliest.typ === 'widerspruch' ||
        earliest.typ === 'klage')
    ) {
      return 'frist';
    }
    return null;
  })();

  const hintText = hintKind
    ? (() => {
        try {
          return tHint(`hint_${hintKind}`);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <section
      aria-labelledby="was-kann-ich-tun-heading"
      className={cn(
        'flex flex-col gap-3 rounded-lg p-1',
        className,
      )}
    >
      <h2
        id="was-kann-ich-tun-heading"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <ListChecks
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        {t('heading')}
      </h2>
      {hintText && (
        <p
          data-testid="was-kann-ich-tun-pre-hint"
          className="rounded-md border-l-4 border-[var(--ds-color-accent)] bg-[var(--ds-color-accent-soft)] p-3 text-sm leading-relaxed text-[var(--ds-color-text-primary)]"
        >
          {hintText}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('helper')}
      </p>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed">
        {ids.map((id) => {
          const copy = lookupCatalogText(messages, id);
          if (copy === null) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(
                `[WasKannIchTunFooter] missing i18n key posteingang.was_kann_ich_tun.${id}`,
              );
            }
            return null;
          }
          return (
            <li key={id} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-foreground/40"
              />
              <span>{renderWithNormTooltips(copy)}</span>
            </li>
          );
        })}
      </ul>
      <details className="mt-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
        <summary className="cursor-pointer font-medium">
          {tDisclaimer('no_legal_advice_title')}
        </summary>
        <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">
          {renderWithNormTooltips(tDisclaimer('no_legal_advice'))}
        </p>
      </details>
    </section>
  );
}
