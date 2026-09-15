'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { resolvePresetVoice, filterHighQualityVoices } from '@/lib/voiceEngine';

interface UseSpeechSynthesisOptions {
  defaultLanguage?: string;
  defaultVoiceName?: string | null;
  defaultPresetId?: string;
  defaultRate?: number;
  defaultPitch?: number;
}

export function useSpeechSynthesis({
  defaultLanguage = 'tr-TR',
  defaultVoiceName = null,
  defaultPresetId = 'juniper',
  defaultRate = 1.05,
  defaultPitch = 1.08,
}: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        const filtered = filterHighQualityVoices(available, defaultLanguage);
        setVoices(filtered.length > 0 ? filtered : available);
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [defaultLanguage]);

  const stop = useCallback(() => {
    // 1. Abort in-flight network requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Stop HTML5 audio player if active
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }

    // 3. Stop browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, []);

  // Clean up any playing audio on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const fallbackToWebSpeech = useCallback(
    (
      text: string,
      language: string,
      voiceName: string | null | undefined,
      presetId: string,
      rate: number,
      pitch: number,
      onEnd?: () => void
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        return;
      }

      const currentVoices = window.speechSynthesis.getVoices();
      const resolved = resolvePresetVoice(presetId, currentVoices, language);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = resolved.rate ?? rate;
      utterance.pitch = resolved.pitch ?? pitch;

      let targetVoiceName = voiceName;
      if (!targetVoiceName && typeof window !== 'undefined') {
        targetVoiceName = localStorage.getItem('dnz_ai_selected_voice');
      }

      let chosenVoice: SpeechSynthesisVoice | undefined;
      if (targetVoiceName) {
        chosenVoice = currentVoices.find((v) => v.name === targetVoiceName);
      }
      if (!chosenVoice && resolved.voice) {
        chosenVoice = resolved.voice;
      }
      if (!chosenVoice) {
        const langPrefix = language.split('-')[0].toLowerCase();
        chosenVoice = currentVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const speak = useCallback(
    async (
      text: string,
      language = defaultLanguage,
      voiceName = defaultVoiceName,
      presetId = defaultPresetId,
      customRate?: number,
      customPitch?: number,
      onEnd?: () => void
    ) => {
      // Clean markdown symbols before speaking
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Kod bloğu.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#+\s/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

      if (!cleanText) return;

      // Stop prior speech and create new AbortController
      stop();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsSpeaking(true);

      const activePresetId =
        presetId ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('dnz_ai_voice_preset') || 'juniper'
          : 'juniper');

      const rate = customRate ?? defaultRate;
      const pitch = customPitch ?? defaultPitch;

      // Check client API keys in localStorage
      const clientApiKeys =
        typeof window !== 'undefined'
          ? {
              gemini: localStorage.getItem('dnz_ai_gemini_key') || undefined,
              openai: localStorage.getItem('dnz_ai_openai_key') || undefined,
            }
          : {};

      // 1. Attempt High-Fidelity Neural AI TTS from server route (/api/ai/tts)
      let serverAudioSuccess = false;
      try {
        const ttsRes = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            text: cleanText,
            language,
            voice: voiceName,
            presetId: activePresetId,
            speed: rate,
            apiKeys: clientApiKeys,
          }),
        });

        // If stopped in between, exit
        if (abortController.signal.aborted) {
          return;
        }

        if (ttsRes.ok && ttsRes.headers.get('content-type')?.includes('audio/mpeg')) {
          const blob = await ttsRes.blob();
          if (abortController.signal.aborted) return;

          const audioUrl = URL.createObjectURL(blob);
          currentAudioUrlRef.current = audioUrl;

          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsSpeaking(true);
          };

          audio.onended = () => {
            setIsSpeaking(false);
            if (currentAudioUrlRef.current) {
              URL.revokeObjectURL(currentAudioUrlRef.current);
              currentAudioUrlRef.current = null;
            }
            if (onEnd) onEnd();
          };

          audio.onerror = (e) => {
            console.warn('Audio playback error, falling back:', e);
            if (!abortController.signal.aborted) {
              fallbackToWebSpeech(cleanText, language, voiceName, activePresetId, rate, pitch, onEnd);
            }
          };

          await audio.play();
          serverAudioSuccess = true;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || abortController.signal.aborted) {
          return;
        }
        console.warn('Server AI TTS fetch error, falling back:', err);
      }

      if (serverAudioSuccess || abortController.signal.aborted) return;

      // 2. Fallback: Browser Speech Synthesis
      fallbackToWebSpeech(cleanText, language, voiceName, activePresetId, rate, pitch, onEnd);
    },
    [defaultLanguage, defaultVoiceName, defaultPresetId, defaultRate, defaultPitch, stop, fallbackToWebSpeech]
  );

  return {
    isSpeaking,
    isSupported,
    voices,
    speak,
    stop,
  };
}
