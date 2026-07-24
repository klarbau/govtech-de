/**
 * Pure Sprach-Auflösung für die On-Device-Vorlesefunktion (`use-speech.ts`).
 *
 * Die Vorlese-Sprache folgt der aktiven UI-Locale — mit einer Schrift-
 * Heuristik für gemischte Inhalte: kyrillischer bzw. arabischer Text gewinnt
 * immer über die Locale (z. B. russische Selektion in englischer UI), und rein
 * lateinischer Text unter einer ru/uk/ar-UI ist praktisch immer deutscher
 * Quell-Inhalt (Brieftext `body_de`, Leichte Sprache, KI-Bullets) und wird
 * deutsch vorgelesen. de/en/tr sind per Schrift nicht unterscheidbar — dort
 * entscheidet die UI-Locale.
 */

/** UI-Locale (`next-intl`) → BCP-47-Tag für `SpeechSynthesisUtterance.lang`. */
export function resolveSpeechLang(text: string, locale: string): string {
  if (/\p{Script=Arabic}/u.test(text)) return 'ar-SA';
  if (/\p{Script=Cyrillic}/u.test(text)) {
    // і/ї/є/ґ existieren nur im Ukrainischen; fehlen sie, entscheidet die Locale.
    return locale === 'uk' || /[іїєґ]/iu.test(text) ? 'uk-UA' : 'ru-RU';
  }
  switch (locale) {
    case 'en':
      return 'en-GB';
    case 'tr':
      return 'tr-TR';
    default:
      return 'de-DE';
  }
}

/**
 * Beste verfügbare Stimme für `lang`: exakter Tag + on-device > exakter Tag >
 * gleiche Basissprache + on-device (z. B. `de-AT` für `de-DE`) > gleiche
 * Basissprache. `null`, wenn das Gerät die Sprache nicht hat — dann steuert
 * `utterance.lang` allein die Engine-Wahl.
 */
export function pickVoiceForLang(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const target = lang.toLowerCase();
  const base = target.split('-')[0];
  // Manche Android-Engines melden `de_DE` statt `de-DE`.
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  const candidates = voices.filter((v) => norm(v).split('-')[0] === base);
  return (
    candidates.find((v) => norm(v) === target && v.localService) ??
    candidates.find((v) => norm(v) === target) ??
    candidates.find((v) => v.localService) ??
    candidates[0] ??
    null
  );
}
