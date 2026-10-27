"use client";

/**
 * Web Speech API sarmalayıcısı (sesli arama).
 * ⚠️ Gizlilik notu: Chromium tabanlı tarayıcılar konuşmayı tanıma için
 * sesi tarayıcı üreticisinin sunucularına gönderir. Bu yüzden özellik
 * yalnızca kullanıcı mikrofona açıkça tıkladığında çalışır.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

export function useSpeechRecognition(opts: {
  lang: string;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
}) {
  // Destek kontrolü SSR'da false, istemcide gerçek değer (hidrasyon güvenli).
  const supported = useSyncExternalStore(noopSubscribe, () => getCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const stop = useCallback(() => {
    recRef.current?.abort();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = optsRef.current.lang === "all" ? navigator.language : optsRef.current.lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) {
          optsRef.current.onFinal(r[0].transcript.trim());
        } else {
          interim += r[0].transcript;
        }
      }
      if (interim) optsRef.current.onInterim?.(interim.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, start, stop };
}
