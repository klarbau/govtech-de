import { useId } from 'react';
import {
  Briefcase,
  Building2,
  HeartPulse,
  IdCard,
  Landmark,
  Radio,
  Receipt,
  Shield,
  Wallet,
} from 'lucide-react';

import { SectionCard } from '@/components/shared/SectionCard';
import { IdentitaetFreigabeRow } from './IdentitaetFreigabeRow';

export function IdentitaetFreigabenCard() {
  const autoId = useId();
  const consentId = useId();

  return (
    <SectionCard
      title="Freigaben für diesen Vorgang"
      icon={<Shield />}
      as="h2"
      padding="md"
    >
      <p className="-mt-2 mb-4 text-xs text-text-secondary">
        Welche Stellen welche Daten erhalten und auf welcher Grundlage.
      </p>

      <section aria-labelledby={autoId} className="mb-5">
        <h3
          id={autoId}
          className="mb-2 text-sm font-semibold text-text-primary"
        >
          Automatischer Behördenabgleich
        </h3>
        <p className="mb-2 text-xs text-text-secondary">gesetzlich erlaubt</p>
        <ul className="divide-y divide-border">
          <IdentitaetFreigabeRow
            icon={<Landmark />}
            iconTone="success"
            label="Bürgeramt"
            sub="Adressänderung im Melderegister"
            rechtsgrundlage="§ 33 BMG"
            kind="automatic"
            trailingLabel="Wird automatisch abgeglichen"
          />
          <IdentitaetFreigabeRow
            icon={<Receipt />}
            iconTone="success"
            label="Finanzamt"
            sub="Zuständigkeit anhand neuer Anschrift"
            rechtsgrundlage="§ 39e EStG"
            kind="automatic"
            trailingLabel="Wird automatisch abgeglichen"
          />
          <IdentitaetFreigabeRow
            icon={<Radio />}
            iconTone="success"
            label="Beitragsservice"
            sub="Wohnungs-Aktenzeichen aktualisiert"
            rechtsgrundlage="§ 14 RBStV"
            kind="automatic"
            trailingLabel="Wird automatisch abgeglichen"
          />
          <IdentitaetFreigabeRow
            icon={<IdCard />}
            iconTone="success"
            label="Bundesdruckerei"
            sub="Anschrift-Aufkleber für Ausweis"
            rechtsgrundlage="§ 18 PAuswG"
            kind="automatic"
            trailingLabel="Wird automatisch abgeglichen"
          />
        </ul>
      </section>

      <section aria-labelledby={consentId}>
        <h3
          id={consentId}
          className="mb-2 text-sm font-semibold text-text-primary"
        >
          Einwilligungsbasierte Freigaben
        </h3>
        <p className="mb-2 text-xs text-text-secondary">
          Ihre Zustimmung erforderlich
        </p>
        <ul className="divide-y divide-border">
          <IdentitaetFreigabeRow
            icon={<HeartPulse />}
            iconTone="primary"
            label="Krankenkasse"
            sub="Mitteilung neue Anschrift"
            rechtsgrundlage="Art. 6 Abs. 1 lit. a DSGVO"
            kind="consent"
            trailingLabel="Zustimmung erforderlich"
          />
          <IdentitaetFreigabeRow
            icon={<Wallet />}
            iconTone="primary"
            label="Bank"
            sub="Kontaktdaten-Aktualisierung"
            rechtsgrundlage="Art. 6 Abs. 1 lit. a DSGVO"
            kind="consent"
            trailingLabel="Zustimmung erforderlich"
          />
          <IdentitaetFreigabeRow
            icon={<Briefcase />}
            iconTone="primary"
            label="Arbeitgeber"
            sub="Lohnsteuermerkmale (ELStAM)"
            rechtsgrundlage="§ 39e Abs. 4 EStG"
            kind="consent"
            trailingLabel="Zustimmung erforderlich"
          />
          <IdentitaetFreigabeRow
            icon={<Building2 />}
            iconTone="primary"
            label="Versicherer"
            sub="Vertragsdaten-Aktualisierung"
            rechtsgrundlage="Art. 6 Abs. 1 lit. a DSGVO"
            kind="consent"
            trailingLabel="Zustimmung erforderlich"
          />
        </ul>
      </section>
    </SectionCard>
  );
}
