'use client';

import * as React from 'react';
import {
  addDays,
  parseISO,
  setHours,
  setMinutes,
  type Locale,
} from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Termin } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';

import { formatDateLong, formatTimeRange } from './termin-format';

interface TerminRescheduleDialogProps {
  termin: Termin | null;
  nowIso: string;
  dateLocale: Locale;
  busy: boolean;
  onPick: (slotIso: string) => void;
  onWaitlist: () => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Deterministische [MOCK]-Slot-Suche zwischen jetzt und der gesetzlichen Frist
 * (`frist_iso`). KEINE drei erfundenen 09/11/14-Slots: jeder Vorschlag liegt
 * Frist-gebunden `≤ frist_iso`, ist `[MOCK]`-markiert, und unterscheidet sich vom
 * aktuell gehaltenen Termin. Liegt kein Werktags-Slot ≤ Frist (oder fehlt
 * `frist_iso`), ist die Liste leer → Warteliste-Empty-State (§ 9). Erzeugt höchstens
 * zwei Vorschläge.
 */
function findeFreieSlots(termin: Termin, nowIso: string): string[] {
  if (!termin.frist_iso) return [];
  const frist = parseISO(termin.frist_iso);
  const now = parseISO(nowIso);
  const aktuell = parseISO(termin.datum);
  if (Number.isNaN(frist.getTime()) || Number.isNaN(now.getTime())) return [];

  const slots: string[] = [];
  // Beginne am Tag nach „heute" und sammle Werktags-Slots bis zur Frist.
  let cursor = addDays(now, 1);
  let guard = 0;
  const stunden = [9, 14];
  while (slots.length < 2 && cursor.getTime() <= frist.getTime() && guard < 60) {
    guard += 1;
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      const slot = setMinutes(setHours(cursor, stunden[slots.length] ?? 9), 0);
      if (
        slot.getTime() <= frist.getTime() &&
        Math.abs(slot.getTime() - aktuell.getTime()) > 60 * 60 * 1000
      ) {
        slots.push(slot.toISOString());
      }
    }
    cursor = addDays(cursor, 1);
  }
  return slots;
}

/**
 * `<TerminRescheduleDialog>` — „Anderen Termin suchen"
 * (redesign-termine-vorgemerkt.md, Tier 2, § 4.1).
 *
 * Focus-trapped shared `Dialog`. Ehrliche [MOCK]-Slot-Suche; leer →
 * Warteliste-Empty-State. Die false „Die Behörde erhält die Änderung
 * automatisch"-Zeile ist gelöscht (Intro stammt aus `reschedule.intro`).
 */
export function TerminRescheduleDialog({
  termin,
  nowIso,
  dateLocale,
  busy,
  onPick,
  onWaitlist,
  onOpenChange,
}: TerminRescheduleDialogProps) {
  const t = useTranslations('termine');
  const tCommon = useTranslations('common.actions');

  const slots = React.useMemo(
    () => (termin ? findeFreieSlots(termin, nowIso) : []),
    [termin, nowIso],
  );

  return (
    <Dialog
      open={termin !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent>
        {termin ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('reschedule.title')}</DialogTitle>
              <DialogDescription>{t('reschedule.intro')}</DialogDescription>
            </DialogHeader>

            {slots.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start' }}
                    disabled={busy}
                    onClick={() => onPick(slot)}
                  >
                    <Calendar aria-hidden="true" />
                    <span className="tabular-nums">
                      {formatDateLong(slot, dateLocale)} ·{' '}
                      {t('zeit_range', { range: formatTimeRange(slot) })}
                    </span>
                    <span
                      style={{
                        marginInlineStart: 'auto',
                        fontSize: 11,
                        color: 'var(--ink-3)',
                      }}
                    >
                      {t('reschedule.slot_mock_suffix')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 4 }}>
                <EmptyState
                  icon={<Clock aria-hidden="true" />}
                  title={t('reschedule.warteliste_titel')}
                  description={t('reschedule.warteliste_text')}
                  action={
                    <Button onClick={onWaitlist} disabled={busy}>
                      {t('reschedule.warteliste_cta')}
                    </Button>
                  }
                />
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {tCommon('abbrechen')}
              </DialogClose>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
