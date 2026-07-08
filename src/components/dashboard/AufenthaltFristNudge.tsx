'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { ZukunftChip } from '@/components/shared/ZukunftChip';
import { formatDateDe } from '@/lib/utils';
import type { Persona } from '@/types';

/**
 * Persona-Gate (wow-#10): nur Anna Petrov trägt die vollständige § 18g-Blue-Card-
 * Verlängerungs-Story (LEA-Brief + Vorgang-Stub + Termin-Empfehlung). Andere
 * Personas mit eAT (Mehmet, § 21) haben diese Kaskade nicht geseedet → kein Nudge.
 */
const AUFENTHALT_NUDGE_PERSONA_ID = 'anna-petrov';

/** Ab hier zeigt der Nudge die dringlichere „läuft bald ab"-Rahmung (Tage-Anzeige). */
const ABLAUF_BALD_TAGE = 120;

/**
 * Fristbewachungs-Horizont: bis so viele Tage vor Ablauf wird die Frist proaktiv
 * bewacht (schwächere, ehrliche „wir bereiten rechtzeitig vor"-Variante). Annas
 * eAT läuft 14.09.2027 ab (~14 Monate) → dieser Horizont hält den Nudge ehrlich,
 * ohne das seed-Datum zu verbiegen (das an Brief + Vorgang-Fristen gekoppelt ist).
 */
const FRISTBEWACHUNG_HORIZONT_TAGE = 450;

export type AufenthaltFristVariant = 'ablauf_bald' | 'bewacht';

export interface AufenthaltFristView {
  validUntilIso: string;
  norm: string;
  tageBis: number;
  variant: AufenthaltFristVariant;
}

/**
 * Leitet das View-Model des Antizipations-Nudges rein aus der bereits geladenen
 * Persona ab (kein neuer Estimate-Pfad, kein Mock-Backend-Call). Liefert `null`,
 * wenn die Persona nicht gilt, keinen Aufenthaltstitel trägt oder das Ablaufdatum
 * außerhalb des Bewachungs-Horizonts liegt.
 */
export function resolveAufenthaltFristNudge(
  persona: Persona,
  nowIso: string,
): AufenthaltFristView | null {
  if (persona.id !== AUFENTHALT_NUDGE_PERSONA_ID) return null;
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
  };
}

interface AufenthaltFristNudgeProps {
  view: AufenthaltFristView;
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
export function AufenthaltFristNudge({ view }: AufenthaltFristNudgeProps) {
  const t = useTranslations('aufenthaltFristNudge');
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
      <div className="flex items-start gap-3">
        <IconCircle icon={<CalendarClock />} tone="primary" size="md" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-text-muted">{eyebrow}</span>
          <h2 id={titleId} className="text-sm font-semibold text-text-primary">
            {t('title')}
          </h2>
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
        <p>{t('zustaendig')}</p>
        <p>{t('rechtsgrundlage')}</p>
      </div>

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        <ZukunftChip label={t('zukunft_chip')} />
        {t('disclaimer')}
      </p>
    </section>
  );
}
