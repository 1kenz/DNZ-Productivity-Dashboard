'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export function useSpeechRecognition({
  language = 'tr-TR',
  continuous = true,
  interimResults = true,
  onResult,
  onError,
  onEnd,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const finalAccumulatorRef = useRef('');
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callbacks in refs to avoid stale closures
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const err = new Error('Speech Recognition is not supported by your browser.');
      if (onErrorRef.current) onErrorRef.current(err);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalAccumulatorRef.current = (
              finalAccumulatorRef.current + ' ' + text.trim()
            ).trim();
          } else {
            currentInterim = (currentInterim + ' ' + text.trim()).trim();
          }
        }

        const fullText = (
          finalAccumulatorRef.current + (currentInterim ? ' ' + currentInterim : '')
        ).trim();

        setTranscript(fullText);
        setInterimTranscript(currentInterim);

        if (onResultRef.current) {
          const isFinal = Boolean(event.results[event.results.length - 1]?.isFinal);
          onResultRef.current(fullText, isFinal);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldListenRef.current = false;
          setIsListening(false);
          if (onErrorRef.current) onErrorRef.current(event);
        }
      };

      recognition.onend = () => {
        // If the user or parent component still wants to listen, auto-restart seamlessly
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch (_) {
                createAndStartRecognition();
              }
            }
          }, 150);
        } else {
          setIsListening(false);
          setInterimTranscript('');
          if (onEndRef.current) onEndRef.current();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Failed to start speech recognition instance:', e);
      if (shouldListenRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) {
            createAndStartRecognition();
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    }
  }, [language, continuous, interimResults]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    createAndStartRecognition();
  }, [createAndStartRecognition]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    finalAccumulatorRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
