'use client';

import { Phone, Pencil, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { Badge } from '@/components/ui/badge';

interface KontaktCardProps {
  email?: string;
  emailVerifiziert?: boolean;
  mobil?: string;
  mobilVerifiziert?: boolean;
}

/**
 * Prototype-v2 — „Kontakt" card (Spec § COL 1.2).
 *
 * Two stacked rows (email / mobile) with a green „Verifiziert" pill on the
 * right when the value is verified via BundID / OTP.
 */
export function KontaktCard({
  email,
  emailVerifiziert,
  mobil,
  mobilVerifiziert,
}: KontaktCardProps) {
  const t = useTranslations('stammdaten.v2.kontakt');
  const tCta = useTranslations('stammdaten.cta');

  return (
    <section
      aria-labelledby="v2-kontakt-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-kontakt-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle icon={<Phone />} tone="neutral" size="sm" />
          <h2
            id="v2-kontakt-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('card_title')}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          {tCta('bearbeiten')}
        </Button>
      </header>

      <div className="flex flex-col">
        <KontaktRow
          caption={t('email')}
          value={email}
          fallback={t('email_keine')}
          verifiziert={emailVerifiziert}
          verifiziertLabel={t('verifiziert')}
        />
        <div className="border-t border-border">
          <KontaktRow
            caption={t('telefon')}
            value={mobil}
            fallback={t('telefon_keine')}
            verifiziert={mobilVerifiziert}
            verifiziertLabel={t('verifiziert')}
          />
        </div>
      </div>
    </section>
  );
}

interface KontaktRowProps {
  caption: string;
  value?: string;
  fallback: string;
  verifiziert?: boolean;
  verifiziertLabel: string;
}

function KontaktRow({
  caption,
  value,
  fallback,
  verifiziert,
  verifiziertLabel,
}: KontaktRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{caption}</p>
        <p className="truncate text-sm font-medium text-text-primary">
          {value ?? fallback}
        </p>
      </div>
      {verifiziert && value ? (
        <Badge variant="success" size="sm" leadingIcon={<CheckCircle2 />}>
          {verifiziertLabel}
        </Badge>
      ) : null}
    </div>
  );
}
