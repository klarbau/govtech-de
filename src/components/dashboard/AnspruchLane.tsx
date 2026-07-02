'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { api } from '@/lib/mock-backend';
import type { AnspruchLaneEntry, PersonaId } from '@/types';
import { AnspruchLaneRow } from '@/components/dashboard/AnspruchLaneRow';
import { KinderzuschlagRadarCard } from '@/components/dashboard/KinderzuschlagRadarCard';

interface AnspruchLaneProps {
  entries: AnspruchLaneEntry[];
  personaId: PersonaId;
  /** Dashboard neu laden, damit dismiss/consent-Widerruf persistent greifen. */
  onReload: () => void | Promise<unknown>;
}

/**
 * `<AnspruchLane>` (Spec `anspruch-arc.md` § 4.2, Beat b) — die „Ihnen steht zu"-
 * Sektion mit dem Pflicht-Split (#4-KRITISCH): Gruppe „Eingerichtet" (NUR
 * antragsloses Kindergeld) vs. „Anspruch erkannt — wir bereiten den Antrag vor"
 * (antragsgebunden, KiZ). Kippt den Blick von der Holschuld-Liste darüber.
 *
 * Rendert nichts, wenn keine sichtbaren Einträge übrig sind; jede Gruppe rendert
 * nur, wenn sie mindestens einen Eintrag hat (keine leere Hülle). Der Status-
 * Unterschied steht als Heading-Text, nicht nur als Tönung (a11y).
 */
export function AnspruchLane({ entries, personaId, onReload }: AnspruchLaneProps) {
  const t = useTranslations('anspruchLane');
  const tRadar = useTranslations('kinderzuschlagRadar');
  const titleId = React.useId();
  const [hiddenIds, setHiddenIds] = React.useState<ReadonlySet<string>>(
    new Set(),
  );

  const visible = entries.filter((e) => !hiddenIds.has(e.id));
  const eingerichtet = visible.filter((e) => e.status === 'eingerichtet');
  const anspruchErkannt = visible.filter((e) => e.status === 'anspruch_erkannt');

  if (visible.length === 0) return null;

  function hide(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
  }

  async function handleDismiss(entry: AnspruchLaneEntry) {
    hide(entry.id);
    try {
      await api.dismissKinderzuschlagRadar(personaId);
      await onReload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleRevokeConsent(entry: AnspruchLaneEntry) {
    hide(entry.id);
    try {
      await api.setKinderzuschlagRadarConsent(personaId, false);
      await onReload();
    } catch {
      /* optimistic hide already applied */
    }
    toast(tRadar('consent_revoked_toast'));
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-base font-semibold text-text-primary">
          {t('title')}
        </h2>
        <p className="text-sm italic text-text-secondary">
          {t('politik_line')}
        </p>
        <p className="text-xs text-text-muted">{t('politik_attribution')}</p>
      </header>

      {eingerichtet.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t('group_eingerichtet')}
            </h3>
            <p className="text-xs text-text-muted">{t('group_eingerichtet_sub')}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {eingerichtet.map((entry) => (
              <li key={entry.id}>
                <AnspruchLaneRow entry={entry} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {anspruchErkannt.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t('group_anspruch_erkannt')}
            </h3>
            <p className="text-xs text-text-muted">
              {t('group_anspruch_erkannt_sub')}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {anspruchErkannt.map((entry) =>
              entry.render === 'radar' && entry.kinderzuschlag_estimate ? (
                <li key={entry.id}>
                  <KinderzuschlagRadarCard
                    estimate={entry.kinderzuschlag_estimate}
                    onDismiss={() => handleDismiss(entry)}
                    onRevokeConsent={() => handleRevokeConsent(entry)}
                  />
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
