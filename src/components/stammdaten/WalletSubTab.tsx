'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Sparkles, Building2, Home, Zap } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/mock-backend';
import type {
  WalletAttestation,
  WalletAttestationPreview,
} from '@/types/stammdaten';

import { WalletAttestationPreviewModal } from './WalletAttestationPreviewModal';

interface WalletSubTabProps {
  /** Pre-loaded list of 3 fixed mock attestations (Hard-Line § 11.18). */
  attestations: WalletAttestation[];
  personaId: string;
  className?: string;
}

const KATEGORIE_ICON: Record<WalletAttestation['kategorie'], typeof Building2> =
  {
    bank: Building2,
    hausverwaltung: Home,
    energieversorger: Zap,
  };

/**
 * `<WalletSubTab>` (Spec § 3 / § 6.4 / Hard-Lines § 11.11 + § 11.18).
 *
 * V1: minimal-statisch. 3 fixe Mock-Drittanbieter (Hausbank, Hausverwaltung,
 * Energieversorger). Klick „Anfrage simulieren" öffnet
 * `<WalletAttestationPreviewModal>` mit `getWalletAttestationPreview()`-Resultat.
 *
 * 2027-Vision-Banner verbatim aus `stammdaten.subtab.wallet_externe_empfaenger.banner`
 * (Hard-Line § 11.11). Disclaimer-3 (`eudi_speculative`) prominent.
 */
export function WalletSubTab({
  attestations,
  personaId,
  className,
}: WalletSubTabProps) {
  const t = useTranslations();
  const tTab = useTranslations('stammdaten.subtab.wallet_externe_empfaenger');

  const [openEmpfaenger, setOpenEmpfaenger] = React.useState<string | null>(
    null,
  );
  const [preview, setPreview] = React.useState<WalletAttestationPreview | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);

  let bannerTitle: string;
  let bannerBody: string;
  try {
    bannerTitle = t(
      'stammdaten.subtab.wallet_externe_empfaenger.banner_title',
    );
    bannerBody = t('stammdaten.subtab.wallet_externe_empfaenger.banner');
  } catch {
    bannerTitle = 'stammdaten.subtab.wallet_externe_empfaenger.banner_title';
    bannerBody = 'stammdaten.subtab.wallet_externe_empfaenger.banner';
  }

  let eudiDisclaimer: string;
  try {
    eudiDisclaimer = t('stammdaten.disclaimer.eudi_speculative');
  } catch {
    eudiDisclaimer = 'stammdaten.disclaimer.eudi_speculative';
  }

  async function onSimulate(att: WalletAttestation, label: string) {
    setOpenEmpfaenger(att.empfaenger_id);
    setPreview(null);
    setLoading(true);
    try {
      const result = await api.getWalletAttestationPreview(
        personaId,
        att.empfaenger_id,
      );
      setPreview(result);
    } catch (err) {
      toast.error(tTab('preview_error'));
      if (typeof console !== 'undefined') console.error(err);
      setOpenEmpfaenger(null);
    } finally {
      setLoading(false);
    }
    void label;
  }

  function onClose() {
    setOpenEmpfaenger(null);
    setPreview(null);
  }

  const activeAttestation = attestations.find(
    (a) => a.empfaenger_id === openEmpfaenger,
  );
  const activeLabel = activeAttestation
    ? safeT(t, activeAttestation.name_i18n_key)
    : '';

  return (
    <div
      className={cn('flex flex-col gap-5', className)}
      data-testid="wallet-subtab"
    >
      <section
        aria-labelledby="wallet-subtab-banner-title"
        className="flex flex-col gap-2 rounded-xl border border-violet-200/70 bg-violet-50/60 p-5 dark:border-violet-700/60 dark:bg-violet-900/20"
        data-testid="wallet-2027-banner"
      >
        <div className="flex items-center gap-2">
          <Sparkles
            className="size-4 text-violet-700 dark:text-violet-200"
            aria-hidden="true"
          />
          <h2
            id="wallet-subtab-banner-title"
            className="text-base font-semibold text-violet-900 dark:text-violet-100"
          >
            {bannerTitle}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-violet-900/90 dark:text-violet-100/90">
          {bannerBody}
        </p>
      </section>

      <details className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground marker:hidden">
          {tTab('disclaimer_title')}
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {wrapNormZitate(eudiDisclaimer)}
        </p>
      </details>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {attestations.map((att) => {
          const Icon = KATEGORIE_ICON[att.kategorie];
          const name = safeT(t, att.name_i18n_key);
          const zweck = safeT(t, att.zweck_i18n_key);
          return (
            <li key={att.empfaenger_id} className="contents">
              <article
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                data-testid={`wallet-mock-card-${att.empfaenger_id}`}
              >
                <div className="flex items-start gap-2">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-semibold text-foreground">
                      {name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {tTab(`kategorie.${att.kategorie}`)}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {zweck}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => onSimulate(att, name)}
                  data-testid={`wallet-simulate-${att.empfaenger_id}`}
                >
                  {tTab('cta_simulate')}
                </Button>
              </article>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">{tTab('arf_footer')}</p>

      <WalletAttestationPreviewModal
        open={openEmpfaenger !== null}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        empfaengerLabel={activeLabel}
        preview={preview}
        loading={loading}
        onClose={onClose}
      />
    </div>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
