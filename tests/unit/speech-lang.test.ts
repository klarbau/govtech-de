/**
 * Vorlesefunktion — Sprach-Auflösung + Stimmwahl (`src/lib/a11y/speech-lang.ts`).
 *
 * Die Vorlese-Sprache folgt der UI-Locale, mit Schrift-Heuristik für gemischte
 * Inhalte: Kyrillisch/Arabisch im Text gewinnt über die Locale; lateinischer
 * Text unter ru/uk/ar-UI ist deutscher Behörden-Inhalt (Brieftext, Leichte
 * Sprache) und bleibt deutsch vorgelesen.
 *
 * Coverage:
 *   - Alle 6 Locales mit Text in der jeweiligen Sprache.
 *   - Schrift gewinnt über Locale (kyrillische Selektion in en-UI).
 *   - Ukrainisch-Marker (і/ї/є/ґ) vs. Locale-Entscheid innerhalb Kyrillisch.
 *   - Deutscher Brieftext unter ru/uk/ar-UI → de-DE.
 *   - Stimmwahl: exakt+lokal > exakt > Basissprache+lokal > Basissprache > null;
 *     Underscore-Normalisierung (`de_DE`, Android-Engines).
 */
import { describe, expect, test } from 'vitest';

import { pickVoiceForLang, resolveSpeechLang } from '@/lib/a11y/speech-lang';

describe('resolveSpeechLang', () => {
  test('jede Locale mit Text in der eigenen Sprache', () => {
    expect(
      resolveSpeechLang('Ihr Antrag wurde genehmigt.', 'de'),
    ).toBe('de-DE');
    expect(
      resolveSpeechLang('Your application has been approved.', 'en'),
    ).toBe('en-GB');
    expect(resolveSpeechLang('Başvurunuz onaylandı.', 'tr')).toBe('tr-TR');
    expect(resolveSpeechLang('Ваше заявление одобрено.', 'ru')).toBe('ru-RU');
    expect(resolveSpeechLang('Вашу заяву схвалено.', 'uk')).toBe('uk-UA');
    expect(
      resolveSpeechLang('تمت الموافقة على طلبك.', 'ar'),
    ).toBe('ar-SA');
  });

  test('Schrift gewinnt über die UI-Locale', () => {
    expect(resolveSpeechLang('Ваше заявление одобрено.', 'en')).toBe('ru-RU');
    expect(resolveSpeechLang('تمت الموافقة على طلبك.', 'de')).toBe('ar-SA');
  });

  test('Ukrainisch-Marker schlagen die ru-Locale, Locale entscheidet ohne Marker', () => {
    // "заяву" enthält kein і/ї/є/ґ — hier entscheidet die Locale.
    expect(resolveSpeechLang('Вашу заяву схвалено.', 'ru')).toBe('ru-RU');
    // "рішення" trägt і — ukrainisch, auch unter ru-UI.
    expect(resolveSpeechLang('Рішення надіслано.', 'ru')).toBe('uk-UA');
  });

  test('deutscher Brieftext unter nicht-lateinischer UI bleibt deutsch', () => {
    const brief = 'Sehr geehrte Frau Petrova, Ihr Aufenthaltstitel ist gültig.';
    expect(resolveSpeechLang(brief, 'ru')).toBe('de-DE');
    expect(resolveSpeechLang(brief, 'uk')).toBe('de-DE');
    expect(resolveSpeechLang(brief, 'ar')).toBe('de-DE');
  });
});

function voice(
  lang: string,
  localService: boolean,
  name: string,
): SpeechSynthesisVoice {
  return {
    lang,
    localService,
    name,
    voiceURI: name,
    default: false,
  } as SpeechSynthesisVoice;
}

describe('pickVoiceForLang', () => {
  const anna = voice('ru-RU', true, 'Milena');
  const remoteRu = voice('ru-RU', false, 'Milena Online');
  const deAt = voice('de-AT', true, 'Leopold');
  const deDe = voice('de_DE', false, 'Anna Online');

  test('exakter Tag + on-device vor allem anderen', () => {
    expect(pickVoiceForLang([remoteRu, anna], 'ru-RU')).toBe(anna);
  });

  test('exakter Tag remote vor Basissprache', () => {
    expect(pickVoiceForLang([deAt, deDe], 'de-DE')).toBe(deDe);
  });

  test('Underscore-Variante (de_DE) wird als exakter Treffer normalisiert', () => {
    expect(pickVoiceForLang([deDe], 'de-DE')).toBe(deDe);
  });

  test('Basissprachen-Fallback, wenn die Region fehlt', () => {
    expect(pickVoiceForLang([anna, deAt], 'de-DE')).toBe(deAt);
  });

  test('null, wenn das Gerät die Sprache nicht hat', () => {
    expect(pickVoiceForLang([anna, deAt], 'uk-UA')).toBeNull();
    expect(pickVoiceForLang([], 'de-DE')).toBeNull();
  });
});
