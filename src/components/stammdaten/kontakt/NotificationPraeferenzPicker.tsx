'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';
import type {
  NotificationKanal,
  NotificationPraeferenzen,
} from '@/types';

import { LiveCounter } from './LiveCounter';

type Kategorie = keyof NotificationPraeferenzen;

interface CounterState {
  briefeProJahrGespart: number;
  tageFristGespart: number;
}

interface NotificationPraeferenzPickerProps {
  kategorie: Kategorie;
  /** Aktueller Persona-Wert. */
  value: NotificationKanal;
  /** Optionaler Anbindungs-Status der primären Behörde der Kategorie. */
  anbindung?: 'angebunden' | 'in_pilotierung' | 'nicht_angebunden';
  /** Hard-Lock-Flag: Picker disabled (Mehmet ABH). */
  hardLocked?: boolean;
  /** Wird ausgelöst sobald User die Vorauswahl ändert (vor Save-Confirm). */
  onSelect?: (kanal: NotificationKanal) => void;
  /** Wird vom Save-Klick getriggert; Caller öffnet SaveConfirmDialog. */
  onRequestSave: (kategorie: Kategorie, kanal: NotificationKanal) => void;
  /** Live-Counter erscheint nach erfolgreichem Save. */
  counter?: CounterState | null;
  /** Pending-State während API-Call. */
  pending?: boolean;
}

const KANAL_OPTIONS: NotificationKanal[] = [
  'postfach',
  'email_pilot',
  'sms_pilot',
  'brief',
];

/**
 * `<NotificationPraeferenzPicker>` — Spec § 6.7 / § 6.8 / Hard-Line § 11.36.
 *
 * Picker-Card pro Vorgangs-Kategorie. Native `<input type="radio">`-Group
 * mit `role="radiogroup"`-Wrapper, `aria-labelledby` auf Kategorie-Label.
 * Pro-Option-Tooltip via `<details>`-Disclosure, conditional disabled bei
 * ABH-Hard-Lock.
 *
 * Save-Trigger ruft `onRequestSave(kategorie, kanal)` — Caller öffnet
 * `<SaveConfirmDialog>`. Nach erfolgreichem Save rendert `<LiveCounter>`
 * unterhalb des Pickers (Counter aus Mock-Backend-Antwort).
 */
export function NotificationPraeferenzPicker({
  kategorie,
  value,
  anbindung,
  hardLocked,
  onSelect,
  onRequestSave,
  counter,
  pending,
}: NotificationPraeferenzPickerProps) {
  const tKategorie = useTranslations(
    'stammdaten.kontakt.notification.kategorie',
  );
  const tKanal = useTranslations('stammdaten.kontakt.notification.kanal');
  const tOption = useTranslations(
    'stammdaten.kontakt.notification.option',
  );
  const tNotif = useTranslations('stammdaten.kontakt.notification');
  const tPill = useTranslations('stammdaten.kontakt.anbindung_pill');

  const [pending_, setPendingLocal] = React.useState(false);
  const [draft, setDraft] = React.useState<NotificationKanal>(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const groupId = `notif-picker-${kategorie}`;
  const labelId = `${groupId}-label`;

  const dirty = draft !== value;
  const showSave = dirty && !hardLocked;

  const handleSave = () => {
    setPendingLocal(true);
    onRequestSave(kategorie, draft);
  };

  React.useEffect(() => {
    if (!pending) setPendingLocal(false);
  }, [pending]);

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4',
        hardLocked && 'opacity-90',
      )}
      data-testid={`notification-picker-${kategorie}`}
      data-kategorie={kategorie}
      data-hardlocked={hardLocked ? 'true' : 'false'}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3
          id={labelId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {tKategorie(`${kategorie}.label`)}
        </h3>
        {anbindung && (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              anbindung === 'angebunden' &&
                'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
              anbindung === 'in_pilotierung' &&
                'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
              anbindung === 'nicht_angebunden' &&
                'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
            )}
            data-testid={`anbindung-pill-${kategorie}`}
          >
            {tPill(anbindung)}
          </span>
        )}
      </header>

      <p className="text-xs text-muted-foreground">
        {tNotif('current_value_label')} {tKanal(`${value}.label`)}
      </p>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={hardLocked ? 'true' : undefined}
        aria-describedby={hardLocked ? `${groupId}-hardlock` : undefined}
        className="flex flex-col gap-2"
      >
        {KANAL_OPTIONS.map((kanal) => {
          const optId = `${groupId}-${kanal}`;
          const optionDisabled = !!hardLocked;
          const note = optionNote({
            kategorie,
            kanal,
            anbindung,
            tOption,
          });
          return (
            <label
              key={kanal}
              htmlFor={optId}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-md border border-border p-2',
                draft === kanal && 'border-foreground/40 bg-muted/40',
                optionDisabled && 'cursor-not-allowed opacity-60',
              )}
              data-testid={`notification-picker-${kategorie}-option-${kanal}`}
            >
              <span className="flex items-center gap-2">
                <input
                  id={optId}
                  name={groupId}
                  type="radio"
                  value={kanal}
                  checked={draft === kanal}
                  disabled={optionDisabled}
                  onChange={() => {
                    setDraft(kanal);
                    onSelect?.(kanal);
                  }}
                  className="size-4 cursor-pointer accent-primary"
                />
                <span className="text-sm text-foreground">
                  {tKanal(`${kanal}.label`)}
                </span>
              </span>
              {note && (
                <span className="ml-6 text-[11px] leading-relaxed text-muted-foreground">
                  {wrapNormZitate(note)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {hardLocked && (
        <p
          id={`${groupId}-hardlock`}
          className="rounded-md border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
          data-disclaimer-marker="abh_brief_hardlock"
        >
          {wrapNormZitate(tOption('abh_hardlock_tooltip'))}
        </p>
      )}

      {showSave && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={pending || pending_}
            data-testid={`notification-picker-${kategorie}-save`}
            aria-label={`${tNotif('cta_save')} — ${tKategorie(
              `${kategorie}.label`,
            )} → ${tKanal(`${draft}.label`)}`}
          >
            {pending || pending_
              ? tNotif('save_pending')
              : tNotif('cta_save')}
          </Button>
        </div>
      )}

      {counter && (
        <LiveCounter
          briefeProJahrGespart={counter.briefeProJahrGespart}
          tageFristGespart={counter.tageFristGespart}
        />
      )}
    </article>
  );
}

interface OptionNoteArgs {
  kategorie: Kategorie;
  kanal: NotificationKanal;
  anbindung?: 'angebunden' | 'in_pilotierung' | 'nicht_angebunden';
  tOption: ReturnType<typeof useTranslations>;
}

function optionNote({
  kategorie,
  kanal,
  anbindung,
  tOption,
}: OptionNoteArgs): string | null {
  // SMS-Pilot: Sozialdaten-Redaction für Kategorie 'sozial'.
  if (kanal === 'sms_pilot' && kategorie === 'sozial') {
    return tOption('sms_pilot.disclaimer_redaction');
  }
  if (kanal === 'sms_pilot') {
    return tOption('sms_only_notification');
  }
  if (kanal === 'postfach' && kategorie === 'steuer') {
    return tOption('steuer_hint_elster');
  }
  if (kanal === 'postfach' && kategorie === 'verkehr') {
    return tOption('kfz_hint');
  }
  if (kanal === 'postfach' && anbindung === 'in_pilotierung') {
    return tOption('pilot_phase_note');
  }
  if (kanal === 'postfach' && anbindung === 'nicht_angebunden') {
    return tOption('not_angebunden_note');
  }
  return null;
}
