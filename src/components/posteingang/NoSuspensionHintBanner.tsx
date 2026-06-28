'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { formatDateDe } from '@/lib/utils';
import { NO_SUSPENSION_HINT_BEITRAG_KEY } from '@/lib/mock-backend';
import type { Letter } from '@/types';

import { wrapNormZitate } from './wrapNormZitate';

/**
 * Beitrags-Archetypes, deren Widerspruch keine aufschiebende Wirkung hat
 * (§ 86a Abs. 2 SGG / § 80 Abs. 2 VwGO). Spiegelt
 * `BEITRAG_NO_SUSPENSION_ARCHETYPES` aus `reply-template-order.ts` — der
 * No-Suspension-Hinweis (Spec § 4.3 / Correction #2) ist eine
 * Mislead-Prevention-Control: er rendert auf JEDEM dieser Letter mit derselben
 * Verbindlichkeit wie das PreInsertionModal und ist **nie** wegklickbar.
 */
const BEITRAG_NO_SUSPENSION_ARCHETYPES: ReadonlySet<string> = new Set([
  'krankenkasse-beitrag',
  'berufsgenossenschaft-beitrag',
  'ihk-beitrag',
  'beitragsservice-mahnung',
]);

export function isBeitragNoSuspensionLetter(letter: Letter): boolean {
  return BEITRAG_NO_SUSPENSION_ARCHETYPES.has(letter.archetype ?? '');
}

interface NoSuspensionHintBannerProps {
  letter: Letter;
}

/**
 * Persistente, NICHT wegklickbare Banderole über dem Entwurf-Body
 * (Spec § 4.3, zweiter Absatz). Bleibt sichtbar, solange ein Rechtsbehelf-Skelett
 * auf einem Beitrags-Bescheid aktiv ist — auch nachdem das PreInsertionModal
 * geschlossen wurde. Zeigt den verbatim No-Suspension-Hinweis (über den
 * re-exportierten `NO_SUSPENSION_HINT_BEITRAG_KEY`) PLUS beide Fristen
 * (Widerspruch + Zahlung) verbatim aus `letter.fristen[]` — keine der beiden
 * darf ausgeblendet oder zusammengefasst werden.
 */
export function NoSuspensionHintBanner({
  letter,
}: NoSuspensionHintBannerProps): React.ReactElement | null {
  const t = useTranslations();
  const tHint = useTranslations('posteingang.compose.no_suspension_hint');

  if (!isBeitragNoSuspensionLetter(letter)) return null;

  const fristen = letter.fristen ?? [];
  const widerspruchFrist = fristen.find((f) => f.typ === 'widerspruch');
  const zahlungFrist = fristen.find((f) => f.typ === 'zahlung');

  const hintText = t(NO_SUSPENSION_HINT_BEITRAG_KEY);

  return (
    <section
      role="note"
      aria-label={tHint('banner_title')}
      data-testid="no-suspension-hint-banner"
      className="flex flex-col gap-2 rounded-lg border-l-4 border-[var(--ds-color-warning)] bg-[var(--ds-color-warning-soft)] p-3.5 text-sm text-amber-950 dark:text-[var(--ds-color-text-primary)]"
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        {tHint('banner_title')}
      </p>
      <p className="leading-relaxed">{wrapNormZitate(hintText)}</p>
      <ul className="flex flex-col gap-1 text-[13px] leading-relaxed">
        {widerspruchFrist && (
          <li data-testid="no-suspension-frist-widerspruch">
            {tHint('widerspruch_frist_template', {
              datum: formatDateDe(widerspruchFrist.datum),
            })}
          </li>
        )}
        {zahlungFrist && (
          <li data-testid="no-suspension-frist-zahlung">
            {tHint('zahlung_frist_template', {
              datum: formatDateDe(zahlungFrist.datum),
            })}
          </li>
        )}
      </ul>
    </section>
  );
}
