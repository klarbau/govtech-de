'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  EpaStatusFieldCard,
} from './EpaStatusFieldCard';
import {
  ERezeptFieldCard,
  type ERezeptModus,
} from './ERezeptFieldCard';
import {
  FamilienversicherungFieldCard,
  type FamilienversicherteSubject,
} from './FamilienversicherungFieldCard';
import {
  KrankenkasseFieldCard,
  type VersichertenStatus,
} from './KrankenkasseFieldCard';
import {
  PflegeFieldCard,
  type PflegegradView,
} from './PflegeFieldCard';

export interface KvPflegeSektionData {
  krankenkasse: {
    name: string;
    kategorie?: 'sozialversicherung' | 'privat' | 'bund' | 'land' | 'kommune';
  };
  kvnr_v1_1?: { unveraenderbar: string; veraenderbar: string };
  kvnr_fallback?: string;
  versicherten_status: VersichertenStatus;
  /** Wenn die Persona selbst familienversichert ist. */
  familienversichert_ueber?: { stammversicherte_name: string; bis: string };
  /** Mitversicherte Familienangehörige (wenn die Persona Stamm-Versicherte:r ist). */
  mitversicherte_personen: FamilienversicherteSubject[];
  epa_status: {
    eingerichtet: boolean;
    widerspruch_gesetzt: boolean;
    eingerichtet_am?: string;
  };
  erezept_modus: ERezeptModus;
  pflegekasse: { name: string };
  /**
   * Existenz-Marker (Art-9-Gating-Fix, REVISE-Wave 2026-05-10): unabhängig
   * vom Session-Consent. Steuert Reveal-Button vs. Empty-State in
   * `<PflegeFieldCard>`.
   */
  pflegegrad_exists: boolean;
  pflegegrad?: PflegegradView;
  /**
   * Hard-Line § 11.22 — sessionStorage-Toggle. Caller (StammdatenView) lädt
   * den Wert aus `sessionStorage` mit Key
   * `govtech-de:v1:stammdaten:pflegegrad-consent-session`.
   */
  pflegegrad_consent_session: boolean;
}

interface KvPflegeSektionProps {
  data: KvPflegeSektionData;
  /** Callback: User klickte „Pflegegrad anzeigen" → öffnet Modal in Parent. */
  onRequestPflegegradConsent: () => void;
  /** Activity-Log-Hook: ePA-Banner wurde gesehen (1× pro Page-Load). */
  onEpaBannerSeen?: () => void;
  /**
   * Hard-Line § 11.29: ERezet-Card kann ohne fachlichen Verlust ausgeblendet
   * werden. Default true; bei Scope-Druck auf false setzen (i18n-Keys
   * bleiben als V1.2-Hook in `de.json` erhalten).
   */
  showERezeptCard?: boolean;
  defaultOpen?: boolean;
}

/**
 * `<KvPflegeSektion>` (Spec § 6.2 — Stammdaten V1.1).
 *
 * Wrapper-Sektion mit fixer Reihenfolge der FieldCards:
 *   1. Krankenkasse + KVNR
 *   2. Familienversicherung (§ 10 SGB V) — nur wenn vorhanden
 *   3. ePA-Status (mit Disclaimer-Banner § 342 + § 343)
 *   4. eRezept (optional, Hard-Line § 11.29)
 *   5. Pflege (Pflegekasse + Pflegegrad-Sub-Card hinter Modal-Toggle)
 *
 * a11y:
 *   - `<section aria-labelledby>` mit `<h2>`-Header
 *   - `id="kv-pflege"` als Anchor-Target
 *   - default-collapsed
 */
export function KvPflegeSektion({
  data,
  onRequestPflegegradConsent,
  onEpaBannerSeen,
  showERezeptCard = true,
  defaultOpen = false,
}: KvPflegeSektionProps) {
  const t = useTranslations('stammdaten.sektion.kv_pflege');

  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (
      window.location.hash === '#kv-pflege' ||
      window.location.hash === '#krankenversicherung-pflege'
    ) {
      setOpen(true);
      const node =
        document.getElementById('kv-pflege') ??
        document.getElementById('krankenversicherung-pflege');
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  let title: string;
  try {
    title = t('title');
  } catch {
    title = 'Krankenversicherung & Pflege';
  }
  let subtitle: string;
  try {
    subtitle = t('subtitle');
  } catch {
    subtitle = 'Krankenkasse, ePA, eRezept und Pflege';
  }

  return (
    <section
      id="kv-pflege"
      aria-labelledby="sektion-kv-pflege-title"
      className="rounded-xl border border-border bg-card"
      data-testid="sektion-kv-pflege"
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
              id="sektion-kv-pflege-title"
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
          <KrankenkasseFieldCard
            kassenName={data.krankenkasse.name}
            kassenKategorie={data.krankenkasse.kategorie}
            kvnr={data.kvnr_v1_1}
            kvnrFallback={data.kvnr_fallback}
            versicherten_status={data.versicherten_status}
          />
          {(data.familienversichert_ueber ||
            data.mitversicherte_personen.length > 0) && (
            <FamilienversicherungFieldCard
              familienversichert_ueber={data.familienversichert_ueber}
              mitversicherte_personen={data.mitversicherte_personen}
            />
          )}
          <EpaStatusFieldCard
            eingerichtet={data.epa_status.eingerichtet}
            widerspruch_gesetzt={data.epa_status.widerspruch_gesetzt}
            eingerichtet_am={data.epa_status.eingerichtet_am}
            onBannerSeen={onEpaBannerSeen}
          />
          {showERezeptCard && (
            <ERezeptFieldCard modus={data.erezept_modus} />
          )}
          <PflegeFieldCard
            pflegekasseName={data.pflegekasse.name}
            pflegegradExists={data.pflegegrad_exists}
            pflegegrad={data.pflegegrad}
            consentSession={data.pflegegrad_consent_session}
            onRequestConsent={onRequestPflegegradConsent}
          />
        </div>
      </details>
    </section>
  );
}
