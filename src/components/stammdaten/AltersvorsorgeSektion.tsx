'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';

import {
  AnrechnungszeitenList,
  type AnrechnungszeitEntry,
} from './AnrechnungszeitenList';
import { TrackCEmptyStateCard } from './TrackCEmptyStateCard';
import { VersorgungswerkWegweiserCard } from './VersorgungswerkWegweiserCard';
import {
  YellowLetterEchoCard,
  type RentenEckdatenView,
} from './YellowLetterEchoCard';
import { ZfdrWegweiserCard } from './ZfdrWegweiserCard';

export interface AltersvorsorgeSektionData {
  track: 'A' | 'B' | 'C';
  /** Bei Track A: DRV-Träger (Behörden-ID + Behörde aus behoerdenById). */
  drv_traeger_id?: string;
  /** Bei Track A nach Yellow-Letter-Bridge gesetzt. */
  eckdaten?: RentenEckdatenView;
  /** Bei Track B (Versorgungswerk-Pflichtmitgliedschaft). */
  versorgungswerk?: { name: string; mitgliedsnummer: string };
  /** Anrechnungszeiten (Kindererziehung + ggf. Pflege). */
  anrechnungszeiten: AnrechnungszeitEntry[];
  /**
   * Hard-Line § 11.30: Pflege-Zeile in `AnrechnungszeitenList` nur sichtbar,
   * wenn dieser Toggle in derselben Sitzung erteilt ist.
   */
  pflegegradConsentSession: boolean;
}

interface AltersvorsorgeSektionProps {
  data: AltersvorsorgeSektionData;
  behoerdenById: Record<string, Behoerde>;
  /** Initial open? Default false (alle Sektionen außer „Identität" collapsed). */
  defaultOpen?: boolean;
}

/**
 * `<AltersvorsorgeSektion>` (Spec § 6.1 — Stammdaten V1.1).
 *
 * Wrapper-Sektion, die je nach `renten_track` einen von drei Pfaden rendert:
 *   - Track A: Yellow-Letter-Echo + ZfDR-Wegweiser + Anrechnungszeiten
 *   - Track B: Versorgungswerk-Wegweiser + ZfDR-Wegweiser
 *   - Track C: TrackCEmptyStateCard + ZfDR-Wegweiser
 *
 * Pattern-Konsistenz zu V1 `<StammdatenSektion>`: native `<details>`/
 * `<summary>`-Disclosure für vollständige Tastatur-/Screenreader-Unterstützung.
 *
 * a11y:
 *   - `<section aria-labelledby>` mit `<h2>`-Header
 *   - `id="altersvorsorge"` als Anchor-Target für Yellow-Letter-Bridge-Deeplink
 *     (`/stammdaten#altersvorsorge`)
 *   - default-collapsed; bei Hash-Anchor öffnet die Sektion automatisch
 */
export function AltersvorsorgeSektion({
  data,
  behoerdenById,
  defaultOpen = false,
}: AltersvorsorgeSektionProps) {
  const t = useTranslations('stammdaten.sektion.altersvorsorge');
  const tRoot = useTranslations();

  const [open, setOpen] = React.useState(defaultOpen);

  // Auto-open bei Hash-Anchor `/stammdaten#altersvorsorge` (Yellow-Letter-
  // Bridge-Navigations-Target).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#altersvorsorge') {
      setOpen(true);
      const node = document.getElementById('altersvorsorge');
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  let title: string;
  try {
    title = t('title');
  } catch {
    title = 'Altersvorsorge';
  }
  let subtitle: string;
  try {
    subtitle = t('subtitle');
  } catch {
    subtitle =
      'Gesetzliche Rente, Versorgungswerke und Privatvorsorge im Überblick';
  }

  const drvBehoerde = data.drv_traeger_id
    ? behoerdenById[data.drv_traeger_id]
    : undefined;

  return (
    <section
      id="altersvorsorge"
      aria-labelledby="sektion-altersvorsorge-title"
      className="rounded-xl border border-border bg-card"
      data-testid="sektion-altersvorsorge"
    >
      <details
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="group"
      >
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4',
            'marker:hidden [&::-webkit-details-marker]:hidden',
            'rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          <div className="flex flex-col gap-0.5">
            <h2
              id="sektion-altersvorsorge-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {!open && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
          {data.track === 'A' && (
            <>
              {drvBehoerde && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{tRoot('stammdaten.altersvorsorge.traeger_label')}</span>
                  <BehoerdenBadge
                    name={drvBehoerde.name_de}
                    kategorie={drvBehoerde.kategorie}
                  />
                </div>
              )}
              {data.eckdaten ? (
                <YellowLetterEchoCard eckdaten={data.eckdaten} />
              ) : (
                <p
                  className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground"
                  role="status"
                  data-testid="altersvorsorge-empty-no-letter"
                >
                  {tRoot('stammdaten.altersvorsorge.empty_state_body')}
                </p>
              )}
              <ZfdrWegweiserCard />
              <AnrechnungszeitenList
                entries={data.anrechnungszeiten}
                pflegegradConsentSession={data.pflegegradConsentSession}
              />
            </>
          )}

          {data.track === 'B' && data.versorgungswerk && (
            <>
              <VersorgungswerkWegweiserCard
                name={data.versorgungswerk.name}
                mitgliedsnummer={data.versorgungswerk.mitgliedsnummer}
              />
              <ZfdrWegweiserCard />
            </>
          )}

          {data.track === 'C' && (
            <>
              <TrackCEmptyStateCard />
              <ZfdrWegweiserCard />
            </>
          )}
        </div>
      </details>
    </section>
  );
}
