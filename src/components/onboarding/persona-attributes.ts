import personas from '@/data/personas.json';
import { formatDateDe } from '@/lib/utils';

export type OnboardingPersonaId =
  | 'anna-petrov'
  | 'markus-schmidt'
  | 'mehmet-yildiz';

export const ONBOARDING_PERSONA_IDS: OnboardingPersonaId[] = [
  'anna-petrov',
  'markus-schmidt',
  'mehmet-yildiz',
];

/** i18n key stems for the persona-select cards, keyed by persona id. */
export const PERSONA_I18N_KEY: Record<OnboardingPersonaId, string> = {
  'anna-petrov': 'anna',
  'markus-schmidt': 'schmidt',
  'mehmet-yildiz': 'mehmet',
};

/**
 * The concrete eID attributes shown on the transparency screen, projected from
 * the static `personas.json` fixture. No mock-backend read — onboarding runs
 * before the persona is committed, so it reads the synthetic source directly.
 */
export interface OnboardingPersonaAttributes {
  /** Full name `${vorname} ${nachname}`. */
  name: string;
  /** German civilian date of the `geburtsdatum`. */
  birthdate: string;
  /** Four-digit birth year, for the credential card's context line. */
  birthYear: string;
  /** `${strasse} ${hausnummer}, ${plz} ${ort}`. */
  address: string;
  nationality: string;
  /** May be `—` when not unambiguously derivable. */
  maritalStatus: string;
  /** Synthetic Steuer-ID, still carrying its `[MOCK]` prefix. */
  taxId: string;
}

interface RawPersona {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  staatsangehoerigkeit: string;
  adresse: {
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
  };
  steuer_id: string;
  eheschliessung?: { datum: string };
  familie?: {
    partner?: unknown;
  };
}

const NATIONALITY_LABEL: Record<string, string> = {
  russisch: 'russisch',
  deutsch: 'deutsch',
  tuerkisch: 'türkisch',
};

function deriveMaritalStatus(persona: RawPersona): string {
  if (persona.eheschliessung) return 'verheiratet';
  if (persona.familie?.partner) return 'ledig (Partnerschaft)';
  return '—';
}

export function getOnboardingPersonaAttributes(
  personaId: string,
): OnboardingPersonaAttributes | null {
  const persona = (personas as RawPersona[]).find((p) => p.id === personaId);
  if (!persona) return null;

  const { adresse } = persona;
  return {
    name: `${persona.vorname} ${persona.nachname}`,
    birthdate: formatDateDe(persona.geburtsdatum),
    birthYear: persona.geburtsdatum.slice(0, 4),
    address: `${adresse.strasse} ${adresse.hausnummer}, ${adresse.plz} ${adresse.ort}`,
    nationality:
      NATIONALITY_LABEL[persona.staatsangehoerigkeit] ??
      persona.staatsangehoerigkeit,
    maritalStatus: deriveMaritalStatus(persona),
    taxId: persona.steuer_id,
  };
}
