import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { CheckCircle2 } from 'lucide-react';

import { PersonaSelbststaendigCaveat } from './PersonaSelbststaendigCaveat';

interface VerifizierteEmailCardProps {
  email: string;
  verified: boolean;
  verifiziertAm?: string;
  /** Wenn true → Mehmet-Caveat rendern (§ 6.4.B / § 11.41). */
  showSelbststaendigCaveat?: boolean;
}

/**
 * `<VerifizierteEmailCard>` — Spec § 6.4 + § 6.4.B.
 *
 * Card 2: BundID-E-Mail read-only mit Verifikations-Badge,
 * Card-Footer-Disclaimer (only-for-bundid-attached), und optionaler
 * Mehmet-Selbstständigen-Caveat. Self-Edit nur via id.bund.de.
 */
export function VerifizierteEmailCard({
  email,
  verified,
  verifiziertAm,
  showSelbststaendigCaveat,
}: VerifizierteEmailCardProps) {
  const t = useTranslations('stammdaten.kontakt.card.email');
  const tEmail = useTranslations('stammdaten.kontakt.email');

  let verifiedText = t('not_verified_label');
  if (verified && verifiziertAm) {
    try {
      const formatted = format(parseISO(verifiziertAm), 'dd.MM.yyyy', {
        locale: deLocale,
      });
      verifiedText = t('verified_label', { datum: formatted });
    } catch {
      verifiedText = t('verified_label', { datum: verifiziertAm });
    }
  }

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      data-testid="verifizierte-email-card"
    >
      <header>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {t('title')}
        </h3>
      </header>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm text-foreground" data-testid="email-value">
          {email}
        </p>
        <p
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          data-testid="email-verified-state"
          data-verified={verified ? 'true' : 'false'}
        >
          {verified && (
            <CheckCircle2
              aria-hidden="true"
              className="size-3 text-emerald-600 dark:text-emerald-400"
            />
          )}
          {verifiedText}
        </p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('read_only_pointer')}
      </p>

      <p
        className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-xs leading-relaxed text-muted-foreground"
        data-disclaimer-marker="bundid_email_only_for_bundid_attached_behoerden"
      >
        {tEmail('disclaimer_only_for_bundid_attached')}
      </p>

      {showSelbststaendigCaveat && <PersonaSelbststaendigCaveat />}
    </article>
  );
}
