'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { cn } from '@/lib/utils';
import type { Behoerde, Letter } from '@/types';

import { ARCHETYPE_TO_VORGANG_TYP } from './letter-archetype-actions';
import { AuthentizitaetsBadge, DEFAULT_AUTH_CHANNEL } from './AuthentizitaetsBadge';
import { FristChip } from './FristChip';
import {
  VorgangsBuendelTagExisting,
  VorgangsBuendelTagInitial,
} from './VorgangsBuendelTag';

interface LetterCardProps {
  letter: Letter;
  absender?: Pick<Behoerde, 'name_de' | 'kategorie'>;
  /** Vorgangs-Titel, falls Brief einem bestehenden Vorgang zugeordnet ist. */
  vorgangTitle?: string;
  /** ISO „now" für SSR-stabile Frist-Renders. */
  nowIso?: string;
  /** Triggert Öffnen des `<NeuerVorgangAusBriefModal>`. */
  onCreateVorgang?: (letter: Letter) => void;
  className?: string;
}

function letterUrl(id: string): string {
  return `/posteingang/${encodeURIComponent(id)}`;
}

/**
 * V1.5-LetterCard — vereinfachte Hierarchie (Spec §4.5 + Verifier #B1).
 *
 * Hauptzeile: `[Status-dot] [FristChip] | [Behörde-Badge] [Brieftyp] | [Aktenzeichen]`
 * Optional: VorgangsBuendelTag oder „Neuer Vorgang? …"-CTA
 * Utility-Zeile: 16-px-Shield-Icon (Datenschutz) + Tiny-Authentizitäts-Icon
 *
 * Authentizitäts-Badge + Datenschutz-Cockpit-Link bleiben on-card; visuelles
 * Gewicht ist auf 16-px-Icons reduziert, Volltext lebt in `aria-label`.
 */
export function LetterCard({
  letter,
  absender,
  vorgangTitle,
  nowIso,
  onCreateVorgang,
  className,
}: LetterCardProps) {
  const t = useTranslations('posteingang.card');
  const tArche = useTranslations('posteingang.archetype.label');

  const authChannel = letter.auth_channel ?? DEFAULT_AUTH_CHANNEL;
  const fristen = letter.fristen ?? [];
  const archetype = letter.archetype ?? 'sonstiges';
  const brieftyp = tArche(archetype);

  const behoerdeName = absender?.name_de ?? letter.absender_behoerde_id;

  const archetypIsKnown = archetype !== 'sonstiges';
  const showInitialVorgangCta =
    !letter.vorgang_id &&
    archetypIsKnown &&
    typeof onCreateVorgang === 'function';

  const vorgangsJahr = (() => {
    try {
      return new Date(letter.empfangen_am).getUTCFullYear();
    } catch {
      return new Date().getUTCFullYear();
    }
  })();

  const isUngelesen = letter.status === 'ungelesen';
  const earliestFrist = fristen[0];
  const fristDatum = earliestFrist?.datum
    ? earliestFrist.datum.split('-').reverse().join('.')
    : '';
  const articleAriaLabel = earliestFrist
    ? t('cta_open') +
      ': ' +
      [behoerdeName, brieftyp, t('frist_pre_open_template', { datum: fristDatum })].join(' · ')
    : t('cta_open') + ': ' + [behoerdeName, brieftyp, t('frist_keine')].join(' · ');

  return (
    <li
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md',
        isUngelesen ? 'border-foreground/20' : 'border-border',
        className,
      )}
      aria-label={articleAriaLabel}
    >
      <Link
        href={letterUrl(letter.id)}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={t('cta_open')}
      />
      {/* Hauptzeile: Status-dot + FristChip | Behörde + Brieftyp | Aktenzeichen */}
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2">
        {isUngelesen && (
          <span
            aria-hidden="true"
            className="inline-block size-2 shrink-0 rounded-full bg-foreground"
          />
        )}
        <span className="sr-only">
          {isUngelesen ? t('status.ungelesen') : t('status.gelesen')}
        </span>
        {fristen.length > 0 ? (
          <FristChip frist={fristen[0]!} fromIso={nowIso} />
        ) : (
          <span className="text-xs text-muted-foreground">{t('frist_keine')}</span>
        )}
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <BehoerdenBadge
          name={behoerdeName}
          kategorie={absender?.kategorie}
          className="text-xs"
        />
        <span
          className={cn(
            'truncate text-xs',
            isUngelesen ? 'font-semibold text-foreground' : 'text-foreground/80',
          )}
        >
          {brieftyp}
        </span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {letter.aktenzeichen}
        </span>
      </div>

      {/* Optionale Vorgangs-Zeile */}
      {(letter.vorgang_id || showInitialVorgangCta) && (
        <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
          {letter.vorgang_id && vorgangTitle ? (
            <VorgangsBuendelTagExisting
              vorgangId={letter.vorgang_id}
              vorgangTitle={vorgangTitle}
              className="pointer-events-auto"
            />
          ) : showInitialVorgangCta ? (
            <VorgangsBuendelTagInitial
              brieftypLabel={brieftyp}
              jahr={vorgangsJahr}
              onCreate={() => onCreateVorgang?.(letter)}
              className="pointer-events-auto"
            />
          ) : null}
        </div>
      )}

      {/* Utility-Zeile: Datenschutz-Icon + Tiny-Authentizitäts-Icon */}
      <div
        className="pointer-events-none relative z-10 flex items-center justify-end gap-3"
        role="group"
        aria-label={t('utility_row_aria')}
      >
        <AuthentizitaetsBadge channel={authChannel} variant="tiny-icon-only" />
        <DatenschutzCockpitLink
          variant="shield-icon-only"
          letterId={letter.id}
          className="pointer-events-auto"
        />
      </div>
    </li>
  );
}

export { ARCHETYPE_TO_VORGANG_TYP };
