'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

import { pickVoiceForLang, resolveSpeechLang } from '@/lib/a11y/speech-lang';
import { useA11yPreferences } from '@/lib/a11y/use-a11y-preferences';

export type SpeechStatus = 'idle' | 'playing' | 'paused';

export interface UseSpeech {
  /** `false` when `speechSynthesis` is unavailable — UI shows the degraded state. */
  supported: boolean;
  status: SpeechStatus;
  /** Speaks `text` (chunked by sentence). Re-call to restart with new text. */
  play: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

/** Split long text into utterance-sized chunks at sentence boundaries. */
function chunkBySentence(text: string): string[] {
  const normalised = text.replace(/\s+/g, ' ').trim();
  if (!normalised) return [];
  const sentences = normalised.match(/[^.!?…؟]+[.!?…؟]+|\S[^.!?…؟]*$/g);
  if (!sentences) return [normalised];

  // Coalesce very short fragments so we don't fire dozens of utterances.
  const chunks: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if ((buffer + ' ' + piece).trim().length > 240 && buffer) {
      chunks.push(buffer.trim());
      buffer = piece;
    } else {
      buffer = buffer ? `${buffer} ${piece}` : piece;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}

/**
 * On-device Web Speech (`speechSynthesis`) hook. Speaks in the language the
 * text actually is in — resolved per `play()` from the active UI locale plus a
 * script heuristic (`resolveSpeechLang`), so German Behörden-Briefe stay
 * German-voiced under a ru/uk/ar UI. Play/pause/resume/stop, sentence-chunked
 * long text, async `voiceschanged` voice list, and cleanup on unmount +
 * route/locale change (otherwise it keeps speaking after navigation).
 * Word-highlight via `boundary` is intentionally NOT implemented for v1 — it
 * is enhancement-only and must never gate playback (spec §7).
 */
export function useSpeech(): UseSpeech {
  const [supported] = React.useState(isSupported);
  const [status, setStatus] = React.useState<SpeechStatus>('idle');

  const pathname = usePathname();
  const locale = useLocale();

  // Read the device-local Vorlese-Tempo pref and hold it in a ref so a tempo
  // change takes effect on the NEXT chunk without recreating callbacks or
  // restarting playback (spec §6.3). Both Panel-Vorlesen and Selektions-
  // Vorlesen pick this up for free — no call-site change.
  const { readAloudRate } = useA11yPreferences();
  const rateRef = React.useRef(readAloudRate);
  rateRef.current = readAloudRate;

  // The locale in a ref so play() picks up a language switch without being
  // recreated (same pattern as rateRef above).
  const localeRef = React.useRef(locale);
  localeRef.current = locale;

  const voicesRef = React.useRef<readonly SpeechSynthesisVoice[]>([]);
  const langRef = React.useRef('de-DE');
  const queueRef = React.useRef<string[]>([]);
  const indexRef = React.useRef(0);

  // Keep the (async) voice list current; the concrete voice is picked per
  // chunk from the language resolved at play() time.
  React.useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      voicesRef.current = synth.getVoices();
    };

    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);
    return () => synth.removeEventListener('voiceschanged', loadVoices);
  }, [supported]);

  const speakNext = React.useCallback(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const chunk = queueRef.current[indexRef.current];
    if (chunk === undefined) {
      setStatus('idle');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = langRef.current;
    utterance.rate = rateRef.current;
    const voice = pickVoiceForLang(voicesRef.current, langRef.current);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      indexRef.current += 1;
      if (indexRef.current < queueRef.current.length) {
        speakNext();
      } else {
        setStatus('idle');
      }
    };
    utterance.onerror = () => {
      setStatus('idle');
    };
    synth.speak(utterance);
  }, [supported]);

  const stop = React.useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    indexRef.current = 0;
    window.speechSynthesis.cancel();
    setStatus('idle');
  }, [supported]);

  const play = React.useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const chunks = chunkBySentence(text);
      if (chunks.length === 0) return;
      langRef.current = resolveSpeechLang(text, localeRef.current);
      queueRef.current = chunks;
      indexRef.current = 0;
      setStatus('playing');
      speakNext();
    },
    [supported, speakNext],
  );

  const pause = React.useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [supported]);

  const resume = React.useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus('playing');
  }, [supported]);

  // Cancel any in-flight speech on route/locale change and on unmount.
  React.useEffect(() => {
    if (!supported) return;
    return () => {
      queueRef.current = [];
      indexRef.current = 0;
      window.speechSynthesis.cancel();
    };
  }, [supported, pathname, locale]);

  return { supported, status, play, pause, resume, stop };
}
