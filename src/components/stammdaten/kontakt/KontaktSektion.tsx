'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type { Persona, PersonaKontakt } from '@/types';

import { BundidPostfachCard } from './BundidPostfachCard';
import { FoederalismusCardDisclaimer } from './FoederalismusCardDisclaimer';
import { MobilfunkSelfEditCard } from './MobilfunkSelfEditCard';
import { PostanschriftCrossRefCard } from './PostanschriftCrossRefCard';
import { VerifizierteEmailCard } from './VerifizierteEmailCard';

interface KontaktSektionProps {
  persona: Persona;
}

/**
 * `<KontaktSektion>` — Spec § 6.2.
 *
 * 6. Sektion auf der Stammdaten-Page „Kontakt & Postfach". Default
 * zugeklappt im V1-Stil. Lädt Kontakt-Daten via `api.getKontakt(personaId)`
 * (mock-backend V1.2 § 5.1).
 *
 * Layout: Föderalismus-Card-Disclaimer prominent oben (§ 11.34) → 4 Cards.
 */
export function KontaktSektion({ persona }: KontaktSektionProps) {
  const t = useTranslations('stammdaten.kontakt');
  const tSektion = useTranslations('stammdaten.sektion');
  const [open, setOpen] = React.useState(false);
  const [kontakt, setKontakt] = React.useState<PersonaKontakt | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadKontakt = React.useCallback(async () => {
    setError(null);
    try {
      const result = await api.getKontakt(persona.id);
      setKontakt(result);
    } catch (err) {
      if (typeof console !== 'undefined') console.error(err);
      setError(t('error_load'));
    }
  }, [persona.id, t]);

  React.useEffect(() => {
    void loadKontakt();
  }, [loadKontakt]);

  const titleId = 'sektion-kontakt-postfach-title';
  const isSelbststaendig = persona.beschaeftigung?.typ === 'selbstaendig';

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-border bg-card"
      data-testid="sektion-kontakt-postfach"
      id="sektion-kontakt-postfach"
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
              {tSektion('kontakt_postfach.title')}
            </h2>
            {!open && kontakt && (
              <span className="text-xs text-muted-foreground">
                {kontakt.bundid_email.value}
              </span>
            )}
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-border px-4 py-4">
          <div className="flex flex-col gap-3">
            <FoederalismusCardDisclaimer />

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {!kontakt && !error && (
              <p
                className="text-xs text-muted-foreground"
                aria-busy="true"
                data-testid="kontakt-loading"
              >
                {t('loading')}
              </p>
            )}

            {kontakt && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <BundidPostfachCard
                  status={kontakt.bundid_postfach.status}
                  aktiviertAm={kontakt.bundid_postfach.aktiviert_am}
                />
                <VerifizierteEmailCard
                  email={kontakt.bundid_email.value}
                  verified={kontakt.bundid_email.verified}
                  verifiziertAm={kontakt.bundid_email.verifiziert_am}
                  showSelbststaendigCaveat={isSelbststaendig}
                />
                <MobilfunkSelfEditCard
                  personaId={persona.id}
                  value={kontakt.bundid_mobil?.value}
                  verified={!!kontakt.bundid_mobil?.verified}
                  verifiziertAm={kontakt.bundid_mobil?.verifiziert_am}
                  onVerified={loadKontakt}
                />
                <PostanschriftCrossRefCard />
              </div>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
