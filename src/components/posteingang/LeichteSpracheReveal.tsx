'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Info, TextQuote } from 'lucide-react';

import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import type { Letter } from '@/types';

interface LeichteSpracheRevealProps {
  letter: Letter;
}

/**
 * Opt-in, click-gated Leichte-Sprache-Erläuterung des Briefs (Spec §4.1, HERO).
 *
 * Vorautorisierter Seed-Content (`letter.leichte_sprache`) — KEIN Live-KI-Aufruf,
 * daher ohne Übermittlungs-/Consent-Zeile und ohne Lade-Spinner (⟦A1⟧). Fehlt
 * das Feld oder ist es leer, rendert die Komponente `null`: kein toter
 * Eintrittspunkt. Der vollständige Originaltext bleibt darunter unverändert
 * führend (⟦A4⟧) — die Komponente ersetzt ihn nie.
 *
 * Bewusst distinkt vom mehrsprachigen KI-Brief-Erklärer (`AISummaryBlock`):
 * andere Achse (kognitive statt sprachliche Zugänglichkeit), neutrales Icon
 * (⟦A2⟧ — nie das offizielle Leichte-Sprache-Logo), eigene Copy — nirgends
 * „Übersetzung in Ihre Sprache" (⟦A3⟧).
 */
export function LeichteSpracheReveal({ letter }: LeichteSpracheRevealProps) {
  const t = useTranslations('posteingang.leichte_sprache');
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);

  const body = letter.leichte_sprache?.trim();
  if (!body) return null;

  const panelId = `leichte-sprache-${letter.id}`;

  // Netzwerk-Leichte-Sprache-Stil: eine Aussage pro Zeile (`\n`), Leerzeile
  // (`\n\n`) trennt Themen-Blöcke. In Blöcke gruppieren, damit `\n\n` einen
  // größeren vertikalen Abstand als der Zeilenumbruch innerhalb eines Blocks
  // erhält.
  const blocks = body
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    )
    .filter((block) => block.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted"
      >
        <TextQuote className="size-4" aria-hidden="true" />
        {open ? t('collapse') : t('cta')}
      </button>

      {!open && (
        <p className="text-xs leading-relaxed text-text-secondary">
          {t('cta_hint')}
        </p>
      )}

      {open && (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-heading`}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 animate-in fade-in-0 slide-in-from-top-1 duration-200"
        >
          <header className="flex flex-wrap items-center gap-2">
            <h3
              id={`${panelId}-heading`}
              className="flex items-center gap-2 text-sm font-semibold text-text-primary"
            >
              <TextQuote
                className="size-4 text-text-secondary"
                aria-hidden="true"
              />
              {t('heading')}
            </h3>
            <span className="inline-flex items-center rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
              {t('badge_simplified')}
            </span>
            <span className="inline-flex items-center rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
              {t('badge_not_binding')}
            </span>
            <MockWatermarkBanner variant="inline" />
          </header>

          <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-primary">
            {blocks.map((block, blockIndex) => (
              <div key={`ls-block-${blockIndex}`} className="flex flex-col gap-1">
                {block.map((line, lineIndex) => (
                  <p key={`ls-line-${blockIndex}-${lineIndex}`}>{line}</p>
                ))}
              </div>
            ))}
          </div>

          {locale !== 'de' && (
            <p className="text-xs leading-relaxed text-text-secondary">
              {t('de_only_note')}
            </p>
          )}

          <p className="text-xs leading-relaxed text-text-secondary">
            {t('original_leading')}
          </p>

          <div className="flex items-start gap-2 border-t border-border pt-3 text-xs leading-relaxed text-text-secondary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p>{t('disclaimer_body')}</p>
              <p>{t('disclaimer_pruefung')}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
