'use client';

// Drop-in replacement for useSpeechRecognition in Live Voice mode.
//
// In a real browser (the Docker/web deployment), the free browser-native
// Web Speech API (useSpeechRecognition, backed by webkitSpeechRecognition)
// works fine and keeps being used as-is.
//
// Inside the packaged Electron desktop app, webkitSpeechRecognition cannot
// work: it depends on a proprietary Google speech-service key that is baked
// into real Chrome but is NOT present in Electron's bundled Chromium, so it
// fails (typically a silent/looping 'network' error) the instant the user
// speaks. There is no flag or setting that fixes this on Electron's side --
// see components/AiChat/LiveVoiceModal.tsx and app/api/ai/stt/route.ts for
// the full story. The fix here is to stop relying on the browser's speech
// engine in the desktop app and instead record the user's mic with
// MediaRecorder, detect when they stop talking with a simple volume-based
// voice-activity detector, and send the clip to /api/ai/stt for
// transcription with OpenAI's speech-to-text API.
//
// Both code paths are exposed through this single hook so the rest of
// LiveVoiceModal doesn't need to know which one is active.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { isElectronApp } from '@/lib/electron';

interface VoiceCaptureError {
  error: string;
  message?: string;
}

interface UseVoiceCaptureOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: VoiceCaptureError) => void;
  onEnd?: () => void;
  // Electron path only -- fired the moment a recorded utterance stops being
  // captured and starts being sent off for transcription, so the caller can
  // show a "processing" state instead of "listening" for the ~1-2s round
  // trip (there's no live partial transcript with this approach, unlike the
  // browser's continuous/interim Web Speech results).
  onProcessingStart?: () => void;
}

interface VoiceCaptureApi {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (t: string) => void;
  // Electron path only. A short, human-readable trace of what the mic
  // capture pipeline is doing right now (requesting the mic, recording,
  // discarding a too-short clip, uploading for transcription, an error
  // message, ...). This exists because getting real console/DevTools
  // output out of the packaged macOS app has proven unreliable -- this
  // gives the same visibility directly on screen instead. Always
  // undefined on the browser (Web Speech) path.
  debugStatus?: string;
}

// Volume (RMS, roughly 0-1) above which we consider the user to be
// actively speaking. Picked conservatively so normal room noise/hum
// doesn't count as speech; can be revisited if real-world testing shows
// it's mis-tuned for a given mic.
const SPEECH_VOLUME_THRESHOLD = 0.02;
// How long the volume has to stay below the threshold, after speech was
// detected, before we treat the utterance as finished.
const SILENCE_MS = 900;
// Hard cap so a stuck/misdetected recording can't run forever.
const MAX_RECORDING_MS = 20000;
// Recordings shorter than this are almost certainly a false start (a click,
// a cough) rather than real speech -- skip transcribing them.
const MIN_BLOB_BYTES = 4000;
// The silence-based auto-stop is ignored for this long at the start of
// every recording cycle. Without this, a brief encoder/mic startup
// transient (a lot of real-world mic + MediaRecorder combinations produce
// one right as recording begins) can register as "speech", immediately
// followed by silence once it settles -- triggering an almost-instant
// stop with a near-empty clip that gets thrown away by MIN_BLOB_BYTES,
// which then restarts the cycle and repeats. That loop can run fast
// enough to never give real speech a chance to be captured at all, while
// still outwardly looking like "Listening..." forever with nothing ever
// reaching transcription. The hard MAX_RECORDING_MS cap below is NOT
// gated by this -- it always applies.
const MIN_RECORDING_BEFORE_STOP_MS = 600;

// How long to wait for navigator.mediaDevices.getUserMedia() before giving
// up. In a packaged, unsigned macOS app, getUserMedia's promise can hang
// forever -- neither resolving nor rejecting -- if macOS never actually
// shows (or silently drops) the OS-level microphone permission prompt.
// Without a timeout that leaves the UI stuck on "Listening..." forever
// with no error surfaced anywhere. Racing it against a hard deadline turns
// that silent hang into a clear, actionable error instead.
const GET_USER_MEDIA_TIMEOUT_MS = 8000;

function getUserMediaWithTimeout(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new DOMException(
          'Timed out waiting for microphone access.',
          'TimeoutError'
        )
      );
    }, GET_USER_MEDIA_TIMEOUT_MS);

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (settled) {
          // We already timed out and told the caller it failed -- release
          // this late-arriving stream instead of leaking it.
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(stream);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
}

function useElectronAudioCapture({
  language = 'tr-TR',
  onResult,
  onError,
  onEnd,
  onProcessingStart,
}: UseVoiceCaptureOptions): VoiceCaptureApi {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');

  const shouldListenRef = useRef(false);
  const explicitStopRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechStartedRef = useRef(false);
  const cycleStartRef = useRef(0);
  const lastLoudTimeRef = useRef(0);
  const languageRef = useRef(language);
  languageRef.current = language;

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const onProcessingStartRef = useRef(onProcessingStart);
  onProcessingStartRef.current = onProcessingStart;
  // Holds beginRecordingCycle once it's defined below, so transcribeBlob
  // (defined first, since beginRecordingCycle's own deps include it) can
  // trigger the next capture cycle without a direct forward reference.
  const beginRecordingCycleRef = useRef<() => void>(() => {});

  useEffect(() => {
    setIsSupported(
      typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== 'undefined'
    );
  }, []);

  const cancelVadLoop = useCallback(() => {
    if (vadIntervalRef.current !== null) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const teardownStream = useCallback(() => {
    cancelVadLoop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [cancelVadLoop]);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    setDebugStatus(`ses gönderiliyor (${blob.size}B)`);
    if (onProcessingStartRef.current) onProcessingStartRef.current();
    try {
      const form = new FormData();
      form.append('audio', blob, 'speech.webm');
      form.append('language', languageRef.current || 'tr');
      const clientApiKey = typeof window !== 'undefined' ? localStorage.getItem('dnz_ai_openai_key') : null;
      if (clientApiKey) form.append('apiKey', clientApiKey);

      const res = await fetch('/api/ai/stt', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.error) {
        const errCode = data?.error === 'no-api-key' ? 'no-api-key' : 'transcription-failed';
        throw new Error(errCode);
      }

      const text = ((data?.text as string) || '').trim();
      if (text) {
        setDebugStatus(`transkript alındı: "${text.slice(0, 40)}"`);
        setTranscriptState(text);
        if (onResultRef.current) onResultRef.current(text, true);
      } else {
        setDebugStatus('boş transkript alındı, tekrar dinleniyor');
      }
    } catch (err) {
      const code = err instanceof Error && err.message === 'no-api-key' ? 'no-api-key' : 'transcription-failed';
      setDebugStatus(`transkripsiyon hatası: ${err instanceof Error ? err.message : String(err)}`);
      console.warn('Voice transcription failed:', err);
      if (onErrorRef.current) {
        onErrorRef.current({ error: code, message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      if (shouldListenRef.current) {
        beginRecordingCycleRef.current();
      }
    }
  }, []);

  // setInterval rather than requestAnimationFrame: rAF callbacks can be
  // throttled all the way down to a near-standstill by Chromium for a
  // window that loses focus/occlusion, even with the main-process
  // throttling switches in main.js as a first line of defense -- a
  // polling timer degrades far more gracefully and isn't tied to paint
  // scheduling at all, which this audio-level check has no need of.
  const runVadLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        cancelVadLoop();
        return;
      }
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const now = Date.now();

      if (rms > SPEECH_VOLUME_THRESHOLD) {
        lastLoudTimeRef.current = now;
        speechStartedRef.current = true;
      }

      const elapsedSinceStart = now - cycleStartRef.current;
      const silenceElapsed = now - lastLoudTimeRef.current;

      if (
        (speechStartedRef.current &&
          elapsedSinceStart > MIN_RECORDING_BEFORE_STOP_MS &&
          silenceElapsed > SILENCE_MS) ||
        elapsedSinceStart > MAX_RECORDING_MS
      ) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
    };

    vadIntervalRef.current = setInterval(tick, 100);
  }, [cancelVadLoop]);

  const beginRecordingCycle = useCallback(() => {
    if (!shouldListenRef.current || !mediaStreamRef.current) return;
    const stream = mediaStreamRef.current;

    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) throw new Error('AudioContext is not supported in this environment.');
      const audioCtx: AudioContext = new AudioContextCtor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        cancelVadLoop();
        const wasExplicit = explicitStopRef.current;
        explicitStopRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];

        if (wasExplicit || !shouldListenRef.current) {
          setIsListening(false);
          return;
        }
        if (blob.size < MIN_BLOB_BYTES) {
          const elapsedMs = Date.now() - cycleStartRef.current;
          setDebugStatus(`kayıt çok kısa (${blob.size}B / ${elapsedMs}ms), yeniden deneniyor`);
          beginRecordingCycle();
          return;
        }
        transcribeBlob(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
      setDebugStatus('dinleniyor…');

      speechStartedRef.current = false;
      cycleStartRef.current = Date.now();
      lastLoudTimeRef.current = Date.now();
      runVadLoop();
    } catch (e) {
      console.warn('Failed to start audio capture cycle:', e);
      setDebugStatus(`ses yakalama hatası: ${e instanceof Error ? e.message : String(e)}`);
      if (onErrorRef.current) {
        onErrorRef.current({ error: 'audio-capture', message: e instanceof Error ? e.message : String(e) });
      }
      setIsListening(false);
    }
  }, [cancelVadLoop, runVadLoop, transcribeBlob]);

  beginRecordingCycleRef.current = beginRecordingCycle;

  const startListening = useCallback(() => {
    shouldListenRef.current = true;

    const start = async () => {
      try {
        if (!mediaStreamRef.current) {
          setDebugStatus('mikrofon isteniyor…');
          mediaStreamRef.current = await getUserMediaWithTimeout({ audio: true });
          setDebugStatus('mikrofon alındı');
        }
        beginRecordingCycle();
      } catch (err) {
        console.warn('Microphone access failed:', err);
        shouldListenRef.current = false;
        setIsListening(false);
        const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
        setDebugStatus(`mikrofon hatası: ${isTimeout ? 'zaman aşımı' : (err instanceof Error ? err.message : String(err))}`);
        if (onErrorRef.current) {
          onErrorRef.current({
            error: isTimeout ? 'mic-timeout' : 'not-allowed',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };

    start();
  }, [beginRecordingCycle]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    explicitStopRef.current = true;
    cancelVadLoop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    if (onEndRef.current) onEndRef.current();
  }, [cancelVadLoop]);

  const resetTranscript = useCallback(() => {
    setTranscriptState('');
  }, []);

  const setTranscript = useCallback((t: string) => {
    setTranscriptState(t);
  }, []);

  // Release the mic entirely on unmount, not just pause capture.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      teardownStream();
    };
  }, [teardownStream]);

  return {
    isListening,
    transcript,
    interimTranscript: '', // no live partial results with this approach
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    debugStatus,
  };
}

export function useVoiceCapture(options: UseVoiceCaptureOptions = {}): VoiceCaptureApi {
  // Stable for the component's lifetime -- the runtime (Electron vs a real
  // browser) doesn't change mid-session. Lazy useState (rather than a ref
  // read during render) is the correct way to compute a one-time value at
  // mount; calling both hooks unconditionally on every render keeps this
  // compliant with the Rules of Hooks regardless of which branch's result
  // we actually return.
  const [useElectronCapture] = useState(() => isElectronApp());

  const webSpeech = useSpeechRecognition(options);
  const electronCapture = useElectronAudioCapture(options);

  return useElectronCapture ? electronCapture : webSpeech;
}
