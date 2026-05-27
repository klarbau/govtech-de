'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { api } from '@/lib/mock-backend';
import type { Persona } from '@/types';

import { KontaktSektion } from './KontaktSektion';
import { NotificationPraeferenzenSektion } from './NotificationPraeferenzenSektion';

/**
 * `<KontaktSektionsWrapper>` (Spec § 6 Layout-Skizze).
 *
 * Mountet die Kontakt-Sektion (6) und Notification-Präferenzen-Sektion (7)
 * unterhalb der V1-`<StammdatenView>`. Rendert nur auf dem Default-Tab
 * `?tab=profil`. Lädt Persona via `api.getProfile()` einmal pro Mount.
 */
export function KontaktSektionsWrapper() {
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab') === 'wallet' ? 'wallet' : 'profil';
  const [persona, setPersona] = React.useState<Persona | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void api.getProfile().then((p) => {
      if (!cancelled) setPersona(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (tab !== 'profil') return null;
  if (!persona) return null;

  return (
    <div
      className="flex flex-col gap-5"
      data-testid="kontakt-sektionen-wrapper"
    >
      <KontaktSektion persona={persona} />
      <NotificationPraeferenzenSektion persona={persona} />
    </div>
  );
}
