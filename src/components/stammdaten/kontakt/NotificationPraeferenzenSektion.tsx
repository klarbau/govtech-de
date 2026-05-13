'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type {
  NotificationKanal,
  NotificationPraeferenzen,
  Persona,
} from '@/types';

import { FamilienkasseWechselCascade } from './FamilienkasseWechselCascade';
import {
  NotificationPraeferenzPicker,
} from './NotificationPraeferenzPicker';
import { SaveConfirmDialog } from './SaveConfirmDialog';
import { VisionBanner } from './VisionBanner';

interface NotificationPraeferenzenSektionProps {
  persona: Persona;
}

type Kategorie = keyof NotificationPraeferenzen;

interface CounterMap {
  [kategorie: string]: {
    briefeProJahrGespart: number;
    tageFristGespart: number;
  };
}

interface PendingSave {
  kategorie: Kategorie;
  kanal: NotificationKanal;
}

interface CascadeState {
  active: boolean;
  followup: { aktenzeichen: string; datumIso: string } | null;
}

const KATEGORIE_TO_BEHOERDE_HINT: Partial<Record<Kategorie, string>> = {
  // Hero-Mapping: Familienkasse Berlin-Brandenburg ist Anbindung-Quelle für `familie`.
  familie: 'familienkasse-berlin-brandenburg',
  steuer: 'finanzamt-koerperschaften-i-berlin',
  sozial: 'aok-nordost',
  verkehr: 'kfz-berlin-labo',
  sonstige: 'buergeramt-berlin-mitte',
};

/**
 * `<NotificationPraeferenzenSektion>` — Spec § 6.7 + Hard-Line § 11.36.
 *
 * 7. Sektion „Notification-Präferenzen (2027-Vision)". Default expanded
 * (Wow-Träger). VisionBanner oben + 5 Picker-Cards. Save-Confirm pro
 * Mutation; Familie × Postfach triggert die Cascade.
 */
export function NotificationPraeferenzenSektion({
  persona,
}: NotificationPraeferenzenSektionProps) {
  const t = useTranslations('stammdaten.kontakt');
  const tToast = useTranslations('stammdaten.kontakt.toast');
  const tSektion = useTranslations('stammdaten.sektion');
  const [open, setOpen] = React.useState(true);

  const [praeferenzen, setPraeferenzen] =
    React.useState<NotificationPraeferenzen | null>(null);
  const [counters, setCounters] = React.useState<CounterMap>({});
  const [error, setError] = React.useState<string | null>(null);
  const [anbindungen, setAnbindungen] = React.useState<
    Record<Kategorie, 'angebunden' | 'in_pilotierung' | 'nicht_angebunden' | undefined>
  >({
    steuer: undefined,
    sozial: undefined,
    familie: undefined,
    verkehr: undefined,
    sonstige: undefined,
  });

  const [pendingSave, setPendingSave] = React.useState<PendingSave | null>(
    null,
  );
  const [savePending, setSavePending] = React.useState(false);
  const [cascade, setCascade] = React.useState<CascadeState>({
    active: false,
    followup: null,
  });

  const isDrittstaat = !!persona.aufenthaltstitel;
  // ABH-Hard-Lock greift NUR für drittstaatsangehörige Personas mit
  // ABH-`nicht_angebunden`. Picker für `sonstige` bleibt frei wählbar; die
  // Sub-Card (ABH) ist hard-locked. Vereinfacht in V1.2: Mehmet `sonstige`
  // ist hard-locked auf `brief` (Spec § 6.8 ABH-Hard-Lock-Behandlung).
  const sonstigeHardLocked = isDrittstaat;

  const loadInitial = React.useCallback(async () => {
    setError(null);
    try {
      const next = await api.getNotificationPraeferenzen(persona.id);
      setPraeferenzen(next);
    } catch (err) {
      if (typeof console !== 'undefined') console.error(err);
      setError(t('error_load'));
    }
  }, [persona.id, t]);

  // Anbindungen pro Kategorie laden (ein Mock-Behörden-Hint pro Kategorie).
  const loadAnbindungen = React.useCallback(async () => {
    const next: typeof anbindungen = {
      steuer: undefined,
      sozial: undefined,
      familie: undefined,
      verkehr: undefined,
      sonstige: undefined,
    };
    for (const [kategorie, behoerdeId] of Object.entries(
      KATEGORIE_TO_BEHOERDE_HINT,
    ) as [Kategorie, string][]) {
      try {
        const value = await api.getBehoerdeAnbindung(behoerdeId);
        next[kategorie] = value;
      } catch {
        // Stiller Fallback — kein Pill rendern.
      }
    }
    setAnbindungen(next);
  }, []);

  React.useEffect(() => {
    void loadInitial();
    void loadAnbindungen();
  }, [loadInitial, loadAnbindungen]);

  const handleRequestSave = (kategorie: Kategorie, kanal: NotificationKanal) => {
    setPendingSave({ kategorie, kanal });
  };

  const handleConfirmSave = async () => {
    if (!pendingSave) return;
    setSavePending(true);
    try {
      const result = await api.toggleNotificationPraeferenz(
        persona.id,
        pendingSave.kategorie,
        pendingSave.kanal,
      );
      // Persistenten Zustand aktualisieren.
      setPraeferenzen((prev) =>
        prev ? { ...prev, [pendingSave.kategorie]: pendingSave.kanal } : prev,
      );
      // Counter speichern.
      setCounters((prev) => ({
        ...prev,
        [pendingSave.kategorie]: {
          briefeProJahrGespart: result.counter.briefe_pro_jahr_gespart,
          tageFristGespart: result.counter.tage_frist_gespart,
        },
      }));
      // Cascade-Trigger: Hero-Pfad Familie × Postfach.
      if (
        result.cascade &&
        pendingSave.kategorie === 'familie' &&
        pendingSave.kanal === 'postfach'
      ) {
        toast.success(tToast('familienkasse_angebunden'));
        try {
          const followup = await api.simulateFamilienkasseFollowupLetter(
            persona.id,
          );
          setCascade({
            active: true,
            followup: {
              aktenzeichen: followup.aktenzeichen,
              datumIso: followup.empfangen_am ?? new Date().toISOString(),
            },
          });
          toast.success(tToast('familienkasse_followup'));
        } catch {
          // Fallback: Cascade ohne followup-Daten anzeigen.
          setCascade({ active: true, followup: null });
        }
      } else {
        toast.success(tToast('praeferenz_gespeichert'));
      }
    } catch (err) {
      if (typeof console !== 'undefined') console.error(err);
      toast.error(t('error_load'));
    } finally {
      setSavePending(false);
      setPendingSave(null);
    }
  };

  const handleCancelSave = () => {
    setPendingSave(null);
  };

  const titleId = 'sektion-notification-praeferenzen-title';
  const KATEGORIEN: Kategorie[] = [
    'steuer',
    'sozial',
    'familie',
    'verkehr',
    'sonstige',
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-border bg-card"
      data-testid="sektion-notification-praeferenzen"
      id="sektion-notification-praeferenzen"
    >
      <details
        open={open}
        onToggle={(e) =>
          setOpen((e.currentTarget as HTMLDetailsElement).open)
        }
        className="group"
      >
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 marker:hidden',
            '[&::-webkit-details-marker]:hidden',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl',
          )}
        >
          <div className="flex flex-col gap-0.5">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {tSektion('notification_praeferenzen.title')}
            </h2>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-border px-4 py-4">
          <div className="flex flex-col gap-4">
            <VisionBanner />

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {!praeferenzen && !error && (
              <p
                className="text-xs text-muted-foreground"
                aria-busy="true"
                data-testid="notification-loading"
              >
                {t('loading')}
              </p>
            )}

            {praeferenzen && (
              <div className="flex flex-col gap-3">
                {KATEGORIEN.map((kategorie) => (
                  <NotificationPraeferenzPicker
                    key={kategorie}
                    kategorie={kategorie}
                    value={praeferenzen[kategorie]}
                    anbindung={anbindungen[kategorie]}
                    hardLocked={
                      kategorie === 'sonstige' && sonstigeHardLocked
                    }
                    onRequestSave={handleRequestSave}
                    counter={counters[kategorie] ?? null}
                    pending={
                      savePending && pendingSave?.kategorie === kategorie
                    }
                  />
                ))}
              </div>
            )}

            <FamilienkasseWechselCascade
              vorherDatumIso="2026-05-08"
              followup={cascade.followup}
              active={cascade.active}
            />
          </div>
        </div>
      </details>

      <SaveConfirmDialog
        open={pendingSave !== null}
        onOpenChange={(next) => {
          if (!next) handleCancelSave();
        }}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
        pending={savePending}
      />
    </section>
  );
}
