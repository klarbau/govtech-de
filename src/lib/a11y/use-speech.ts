'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

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
  const sentences = normalised.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g);
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
 * On-device Web Speech (`speechSynthesis`) hook, `de-DE`. Play/pause/resume/
 * stop, sentence-chunked long text, async `voiceschanged` voice selection, and
 * cleanup on unmount + route/locale change (otherwise it keeps speaking after
 * navigation). Word-highlight via `boundary` is intentionally NOT implemented
 * for v1 — it is enhancement-only and must never gate playback (spec §7).
 */
export function useSpeech(): UseSpeech {
  const [supported] = React.useState(isSupported);
  const [status, setStatus] = React.useState<SpeechStatus>('idle');

  const pathname = usePathname();
  const locale = useLocale();

  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = React.useRef<string[]>([]);
  const indexRef = React.useRef(0);

  // Resolve a German voice as soon as the (async) voice list populates.
  React.useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const pickVoice = () => {
      const voices = synth.getVoices();
      const german = voices.filter((v) => v.lang.toLowerCase().startsWith('de'));
      voiceRef.current =
        german.find((v) => v.lang.toLowerCase() === 'de-de' && v.localService) ??
        german.find((v) => v.lang.toLowerCase() === 'de-de') ??
        german[0] ??
        null;
    };

    pickVoice();
    synth.addEventListener('voiceschanged', pickVoice);
    return () => synth.removeEventListener('voiceschanged', pickVoice);
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
    utterance.lang = 'de-DE';
    if (voiceRef.current) utterance.voice = voiceRef.current;
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
