'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, FileQuestion, FolderOpen } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Behoerde, Letter, Vorgang } from '@/types';

import { LetterCard } from './LetterCard';

interface VorgangsGruppeProps {
  vorgangId: string;
  vorgangTitle: string;
  letters: Letter[];
  behoerdenById: Record<string, Behoerde>;
  vorgaengeById: Record<string, Vorgang>;
  nowIso: string;
  onCreateVorgang: (letter: Letter) => void;
  className?: string;
}

type SonstigeGruppeProps = Omit<
  VorgangsGruppeProps,
  'vorgangId' | 'vorgangTitle' | 'vorgaengeById'
>;

function earliestFristIso(letters: Letter[]): string | null {
  let earliest: string | null = null;
  for (const l of letters) {
    for (const f of l.fristen ?? []) {
      if (!earliest || f.datum.localeCompare(earliest) < 0) {
        earliest = f.datum;
      }
    }
  }
  return earliest;
}

export function VorgangsGruppe({
  vorgangId,
  vorgangTitle,
  letters,
  behoerdenById,
  vorgaengeById,
  nowIso,
  onCreateVorgang,
  className,
}: VorgangsGruppeProps) {
  const t = useTranslations('posteingang.gruppe');
  const [open, setOpen] = React.useState(true);
  const earliest = earliestFristIso(letters);
  const id = React.useId();

  return (
    <section
      aria-labelledby={`gruppe-${id}-title`}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card p-4',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`gruppe-${id}-body`}
        className="flex items-center justify-between gap-2 text-left"
      >
        <h3
          id={`gruppe-${id}-title`}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          {open ? (
            <ChevronDown className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
          <FolderOpen className="size-4 text-muted-foreground" aria-hidden="true" />
          <span>{t('titel_template', { titel: vorgangTitle, count: letters.length })}</span>
        </h3>
        {earliest && (
          <span className="text-xs text-muted-foreground">
            {t('earliest_frist_template', {
              datum: earliest.split('-').reverse().join('.'),
            })}
          </span>
        )}
      </button>
      {open && (
        <ul
          id={`gruppe-${id}-body`}
          data-vorgang-id={vorgangId}
          className="flex flex-col gap-2"
        >
          {letters.map((l) => (
            <LetterCard
              key={l.id}
              letter={l}
              absender={behoerdenById[l.absender_behoerde_id]}
              vorgangTitle={
                l.vorgang_id ? vorgaengeById[l.vorgang_id]?.titel : undefined
              }
              nowIso={nowIso}
              onCreateVorgang={onCreateVorgang}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SonstigeGruppe({
  letters,
  behoerdenById,
  nowIso,
  onCreateVorgang,
  className,
}: SonstigeGruppeProps) {
  const t = useTranslations('posteingang.gruppe');
  const [open, setOpen] = React.useState(true);
  const id = React.useId();

  return (
    <section
      aria-labelledby={`gruppe-${id}-title`}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-dashed border-border bg-card p-4',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`gruppe-${id}-body`}
        className="flex items-center justify-between gap-2 text-left"
      >
        <h3
          id={`gruppe-${id}-title`}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          {open ? (
            <ChevronDown className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
          <FileQuestion
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span>{t('sonstige_titel_template', { count: letters.length })}</span>
        </h3>
      </button>
      {open && (
        <ul id={`gruppe-${id}-body`} className="flex flex-col gap-2">
          {letters.map((l) => (
            <LetterCard
              key={l.id}
              letter={l}
              absender={behoerdenById[l.absender_behoerde_id]}
              vorgangTitle={undefined}
              nowIso={nowIso}
              onCreateVorgang={onCreateVorgang}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
