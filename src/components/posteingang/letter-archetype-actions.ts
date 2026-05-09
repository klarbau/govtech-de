import type { LetterArchetype } from '@/types';

/**
 * Statisches Mapping `LetterArchetype → i18n-Keys` für den
 * "Was-kann-ich-tun"-Footer (Spec §8.4). Die Werte sind Schlüssel, die
 * `useTranslations('posteingang.was_kann_ich_tun.…')` auflöst — die Texte
 * selbst liegen verbindlich in `de.json` (Source-of-Truth).
 *
 * Wenn das Mock-Backend `was_kann_ich_tun_options` für einen Brief liefert,
 * verwenden wir diese Liste. Sonst fällt die UI auf den hier hinterlegten
 * Default pro Archetyp zurück.
 */
export const ARCHETYPE_ACTION_DEFAULTS: Record<LetterArchetype, string[]> = {
  steuerbescheid: [
    'steuerbescheid.zahlung',
    'steuerbescheid.einspruch',
    'steuerbescheid.aussetzung',
    'steuerbescheid.saeumniszuschlag_info',
  ],
  'krankenkasse-beitrag': [
    'krankenkasse-beitrag.zahlung',
    'krankenkasse-beitrag.widerspruch',
    'krankenkasse-beitrag.befreiung_pruefen',
  ],
  'beitragsservice-mahnung': [
    'beitragsservice-mahnung.zahlung',
    'beitragsservice-mahnung.widerspruch',
    'beitragsservice-mahnung.befreiung_pruefen',
  ],
  'abh-verlaengerung': [
    'abh-verlaengerung.termin_buchen',
    'abh-verlaengerung.nachweise_sammeln',
    'abh-verlaengerung.fiktionsbescheinigung_info',
  ],
  'familienkasse-nachweis': [
    'familienkasse-nachweis.nachweis_einreichen',
    'familienkasse-nachweis.fristverlaengerung_pruefen',
  ],
  'buergeramt-meldung': [
    'buergeramt-meldung.keine_aktion',
    'buergeramt-meldung.folgeprozesse_pruefen',
  ],
  'ihk-beitrag': [
    'ihk-beitrag.zahlung',
    'ihk-beitrag.widerspruch',
    'ihk-beitrag.abweichende_festsetzung_pruefen',
  ],
  'berufsgenossenschaft-beitrag': [
    'berufsgenossenschaft-beitrag.zahlung',
    'berufsgenossenschaft-beitrag.widerspruch',
  ],
  'standesamt-urkunde': [
    'standesamt-urkunde.keine_aktion',
    'standesamt-urkunde.folge_familienkasse',
    'standesamt-urkunde.folge_krankenkasse',
    'standesamt-urkunde.folge_steueridnr',
  ],
  sonstiges: [],
};

/** Mapping Archetype → vorgeschlagener Vorgangs-Typ (Spec §6.2). */
export const ARCHETYPE_TO_VORGANG_TYP: Record<
  LetterArchetype,
  'steuer-jahr' | 'familienkasse' | 'aufenthaltstitel-verlaengerung' | 'sonstige'
> = {
  steuerbescheid: 'steuer-jahr',
  'familienkasse-nachweis': 'familienkasse',
  'abh-verlaengerung': 'aufenthaltstitel-verlaengerung',
  'krankenkasse-beitrag': 'sonstige',
  'beitragsservice-mahnung': 'sonstige',
  'buergeramt-meldung': 'sonstige',
  'ihk-beitrag': 'sonstige',
  'berufsgenossenschaft-beitrag': 'sonstige',
  'standesamt-urkunde': 'sonstige',
  sonstiges: 'sonstige',
};

/**
 * Kurze Brieftyp-Beschriftung pro Archetyp — i18n-key (DE-Source in
 * `de.json` unter `posteingang.archetype.label.<key>`).
 */
export const ARCHETYPE_LABEL_KEYS: Record<LetterArchetype, string> = {
  steuerbescheid: 'steuerbescheid',
  'krankenkasse-beitrag': 'krankenkasse-beitrag',
  'beitragsservice-mahnung': 'beitragsservice-mahnung',
  'abh-verlaengerung': 'abh-verlaengerung',
  'familienkasse-nachweis': 'familienkasse-nachweis',
  'buergeramt-meldung': 'buergeramt-meldung',
  'ihk-beitrag': 'ihk-beitrag',
  'berufsgenossenschaft-beitrag': 'berufsgenossenschaft-beitrag',
  'standesamt-urkunde': 'standesamt-urkunde',
  sonstiges: 'sonstiges',
};
