'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { EidCredentialCard } from '@/components/onboarding/EidCredentialCard';
import { VerifyChipRow } from '@/components/stammdaten/v2/VerifyChipRow';

interface IdentitaetsHeroProps {
  fullName: string;
  geburtsdatumIso: string;
  staatsangehoerigkeit: string;
  /** Resolved name of the leading authority, already localized by the caller. */
  fuehrendeQuelle: string;
  verify: {
    adresseBestaetigt: boolean;
    walletVerbunden: boolean;
    aufenthaltGueltig: boolean;
  };
  fallbackChipLabel?: string;
}

/**
 * Band 2 — „Verifizierter Identitätsraum" anchor (Stammdaten V3).
 *
 * One calm, bordered card: the `EidCredentialCard` (variant `hero`) is the dark
 * focal credential on the left (it carries the `[MOCK]` stamp + MRZ detailing);
 * the right column states the verified identity facts. Owns the single section
 * `<h2 id="sd-hero-title">` — pure presentational, no edit buttons, no fetching.
 */
export function IdentitaetsHero({
  fullName,
  geburtsdatumIso,
  staatsangehoerigkeit,
  fuehrendeQuelle,
  verify,
  fallbackChipLabel,
}: IdentitaetsHeroProps) {
  const t = useTranslations('stammdaten.hero_v3');

  const nationality = capitalize(staatsangehoerigkeit);
  const birthYear = geburtsdatumIso.slice(0, 4);

  return (
    <section aria-labelledby="sd-hero-title">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)] sm:p-6">
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[300px_1fr] lg:gap-6">
          <EidCredentialCard
            variant="hero"
            name={fullName}
            nationality={nationality}
            birthYear={birthYear}
          />

          <div className="flex flex-col">
            <h2
              id="sd-hero-title"
              className="text-xs font-medium uppercase tracking-wide text-text-secondary"
            >
              {t('region_label')}
            </h2>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
              {fullName}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {t('status_badge')}
            </p>

            <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
              <KvRow label={t('kv_geburtsdatum')} value={formatDe(geburtsdatumIso)} />
              <KvRow label={t('kv_staatsangehoerigkeit')} value={nationality} />
              <KvRow label={t('kv_quelle')} value={fuehrendeQuelle} />
            </dl>

            <VerifyChipRow
              adresseBestaetigt={verify.adresseBestaetigt}
              walletVerbunden={verify.walletVerbunden}
              aufenthaltGueltig={verify.aufenthaltGueltig}
              fallbackChip={fallbackChipLabel}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-medium text-text-primary">{value}</dd>
    </>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
