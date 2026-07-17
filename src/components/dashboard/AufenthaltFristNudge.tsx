'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CalendarClock, Clock3, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { ZukunftChip } from '@/components/shared/ZukunftChip';
import { formatDateDe } from '@/lib/utils';
import type { Persona } from '@/types';

/** Ab hier zeigt der Nudge die dringlichere „läuft bald ab"-Rahmung (Tage-Anzeige). */
const ABLAUF_BALD_TAGE = 120;

/**
 * Fristbewachungs-Horizont: bis so viele Tage vor Ablauf wird die Frist proaktiv
 * bewacht (schwächere, ehrliche „wir bereiten rechtzeitig vor"-Variante). Annas
 * eAT läuft 14.09.2027 ab (~14 Monate), Mehmets § 21 am 31.08.2027 → dieser
 * Horizont hält den Nudge ehrlich, ohne die seed-Daten zu verbiegen (die an
 * Brief + Vorgang-Fristen gekoppelt sind).
 */
const FRISTBEWACHUNG_HORIZONT_TAGE = 450;

export type AufenthaltFristVariant = 'ablauf_bald' | 'bewacht';

export interface AufenthaltFristView {
  validUntilIso: string;
  norm: string;
  tageBis: number;
  variant: AufenthaltFristVariant;
  /** Zuständige Ausländerbehörde (behoerde_id aus dem Titel) — für die Namens-
   *  Auflösung (LEA Berlin / ABH Köln …), damit die Card nicht Berlin hartkodiert. */
  abhBehoerdeId?: string;
}

/**
 * Leitet das View-Model des Antizipations-Nudges (wow-#10) rein aus der bereits
 * geladenen Persona ab (kein neuer Estimate-Pfad, kein Mock-Backend-Call).
 *
 * Persona-generisch (Pass-3-Followup): der Nudge zeigt für JEDE Persona, deren
 * Aufenthaltstitel-Ablauf in den Bewachungs-Horizont fällt — Mehmet-fähig ohne
 * Seed-Änderung. Liefert `null`, wenn die Persona keinen Aufenthaltstitel trägt
 * oder das Ablaufdatum außerhalb des Horizonts (bzw. bereits abgelaufen) liegt.
 */
export function resolveAufenthaltFristNudge(
  persona: Persona,
  nowIso: string,
): AufenthaltFristView | null {
  const titel = persona.aufenthaltstitel;
  if (!titel?.valid_until) return null;

  const bis = new Date(titel.valid_until).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(bis) || Number.isNaN(now)) return null;

  const tageBis = Math.ceil((bis - now) / 86_400_000);
  if (tageBis <= 0 || tageBis > FRISTBEWACHUNG_HORIZONT_TAGE) return null;

  return {
    validUntilIso: titel.valid_until,
    norm: titel.norm,
    tageBis,
    variant: tageBis <= ABLAUF_BALD_TAGE ? 'ablauf_bald' : 'bewacht',
    abhBehoerdeId: titel.abh_behoerde_id,
  };
}

interface AufenthaltFristNudgeProps {
  view: AufenthaltFristView;
  /** Aufgelöster Name der zuständigen Ausländerbehörde (aus `view.abhBehoerdeId`).
   *  Fehlt er, fällt die Zuständigkeits-Zeile auf die generische Rahmung zurück. */
  behoerdeName?: string;
  /** Nudge dauerhaft schließen — persistiert deviceLocal über `api`. */
  onDismiss: () => void;
  /** Nudge für eine Weile verstecken ("Später erinnern") — persistiert über `api`. */
  onSnooze: () => void;
}

/**
 * `<AufenthaltFristNudge>` (wow-backlog #10) — proaktive Fristbewachung für Annas
 * Aufenthaltstitel-Verlängerung (§ 18g AufenthG, Blue Card EU).
 *
 * Honesty-Guardrails (Verifier-Pflichtflags):
 *  - Der Antrag ist NUR „vorbereitet", NIE „gestellt"/„eingereicht" — die Card
 *    sagt das explizit (`nicht_eingereicht`).
 *  - Bürger-Mitwirkung sichtbar: Arbeitgeberbestätigung + Gehaltsnachweise +
 *    Upload ergänzt der Bürger selbst (`mitwirkung_*`).
 *  - Termin-Aussage strikt konditional („würde reserviert, sobald … angebunden").
 *  - [ZUKUNFT 2027]-Rahmung via `<ZukunftChip>`; proaktive Fristbewachung ist
 *    Zielbild, keine Rechtswirkung. Synthetische [MOCK]-Demo-Daten.
 */
export function AufenthaltFristNudge({
  view,
  behoerdeName,
  onDismiss,
  onSnooze,
}: AufenthaltFristNudgeProps) {
  const t = useTranslations('aufenthaltFristNudge');
  // Generische Dismiss/Snooze-Labels aus dem Wohngeld-Hinweis wiederverwenden
  // („Hinweis schließen" / „Später erinnern") — kein eigener Keys-Satz nötig.
  const tCtl = useTranslations('wohngeldHinweis');
  const titleId = React.useId();

  const datum = formatDateDe(view.validUntilIso);
  const relativ =
    view.variant === 'bewacht'
      ? t('ablauf_relativ_monate', {
          monate: Math.max(1, Math.round(view.tageBis / 30.44)),
        })
      : t('ablauf_relativ_tage', { tage: view.tageBis });

  const eyebrow = view.variant === 'bewacht' ? t('eyebrow_bewacht') : t('eyebrow_bald');
  const lead = view.variant === 'bewacht' ? t('lead_bewacht') : t('lead_bald');

  return (
    <section
      aria-labelledby={titleId}
      className="lg-glass-surface flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconCircle icon={<CalendarClock />} tone="primary" size="md" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-text-muted">{eyebrow}</span>
            <h2 id={titleId} className="text-sm font-semibold text-text-primary">
              {t('title')}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={tCtl('snooze')}
            title={tCtl('snooze')}
            onClick={onSnooze}
            className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary [&>svg]:size-4"
          >
            <Clock3 aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={tCtl('dismiss')}
            title={tCtl('dismiss')}
            onClick={onDismiss}
            className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary [&>svg]:size-4"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-text-primary">
        {t('ablauf', { norm: view.norm, datum, relativ })}
      </p>
      <p className="text-sm text-text-secondary">{lead}</p>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-text-secondary">
          {t('mitwirkung_title')}
        </p>
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          <li className="flex gap-1.5">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            {t('mitwirkung_arbeitgeber')}
          </li>
          <li className="flex gap-1.5">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            {t('mitwirkung_upload')}
          </li>
          <li className="flex gap-1.5">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            {t('mitwirkung_bestaetigen')}
          </li>
        </ul>
      </div>

      <Button
        className="self-start"
        render={<Link href="/lebenslagen/aufenthalt-verlaengerung" />}
      >
        {t('cta')}
        <ArrowRight aria-hidden="true" />
      </Button>

      <p className="text-xs text-text-secondary">{t('nicht_eingereicht')}</p>
      <p className="text-xs text-text-muted">{t('termin_konditional')}</p>

      <div className="flex flex-col gap-1 text-xs text-text-muted">
        <p>{behoerdeName ? t('zustaendig_named', { name: behoerdeName }) : t('zustaendig')}</p>
        <p>{t('rechtsgrundlage')}</p>
      </div>

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        <ZukunftChip label={t('zukunft_chip')} />
        {t('disclaimer')}
      </p>
    </section>
  );
}
