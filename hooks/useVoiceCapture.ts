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
  stopListening: (reason?: string) => void;
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
  // Electron path only. The last several debugStatus messages, oldest
  // first, each with a "Ns" timestamp relative to when this hook
  // instance was created. debugStatus alone only ever shows the LATEST
  // message -- if something overwrites it a moment later (exactly the
  // failure mode behind several bugs in this file already), the previous
  // message is gone with no way to see what actually happened. This is
  // the same problem the on-screen badge exists to solve for DevTools
  // access, one level up: a full timeline instead of a single frozen
  // frame.
  debugHistory?: string[];
  // Electron path only. Manually ends the CURRENT recording cycle right
  // now, as if silence had just been detected, instead of waiting for
  // the VAD's own silence timer -- goes through the normal onstop path
  // (discard-if-too-short / transcribe), unlike stopListening() which
  // intentionally skips transcription (that one's for cancel/close). A
  // safety valve for the whole class of VAD-tuning problems this file's
  // history is full of (a noisy room, a quiet mic, a threshold that's
  // never quite right for every machine): whatever the auto-detection
  // gets wrong, the user can always just say "done" themselves. Always
  // undefined on the browser (Web Speech) path, which has no separate
  // stop-vs-cancel distinction to begin with.
  forceStop?: () => void;
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
// Real evidence from a live test (debug badge showing a live RMS/elapsed
// readout) proved MIN_RECORDING_BEFORE_STOP_MS alone doesn't fix the
// false-start loop described above -- it only delays the inevitable stop,
// it doesn't stop a single loud tick (e.g. exactly the startup transient
// warned about above) from permanently flagging speechStartedRef = true
// for the rest of that cycle. Every cycle then reliably times out via the
// silence branch ~1.5s after start regardless of whether the user is
// actually mid-utterance, producing a near-empty blob that gets thrown
// away and restarts the cycle -- outwardly indistinguishable from being
// frozen on "Listening...", repeating every few seconds, forever. Now
// speechStartedRef only latches true once the volume has stayed above
// SPEECH_VOLUME_THRESHOLD continuously for this long, filtering out a
// single-tick transient while still being short enough not to add
// noticeable delay to real speech onset.
const SPEECH_CONFIRM_MS = 200;
// How long (from the very start of each recording cycle) to sample
// ambient noise before testing for speech at all -- see the comment at
// the calibration site in tick() for why this was added.
const NOISE_CALIBRATION_MS = 400;
// This cycle's effective speech threshold is the peak ambient RMS
// sampled during calibration times this multiplier (never lower than
// SPEECH_VOLUME_THRESHOLD). 2.5x gives real speech (typically several
// times louder than a room's/laptop's own noise floor) clear separation
// without requiring the user to speak unnaturally loudly.
const NOISE_FLOOR_MULTIPLIER = 2.5;

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
  const [debugHistory, setDebugHistory] = useState<string[]>([]);
  const debugSessionStartRef = useRef(Date.now());
  // Every debug message in this file should go through this instead of
  // setDebugStatus directly, so it lands in both the single-line badge
  // AND the running history -- see debugHistory above for why the
  // history exists.
  const logStatus = useCallback((msg: string) => {
    setDebugStatus(msg);
    setDebugHistory((prev) => {
      const elapsedS = ((Date.now() - debugSessionStartRef.current) / 1000).toFixed(1);
      const next = [...prev, `${elapsedS}s ${msg}`];
      return next.length > 14 ? next.slice(next.length - 14) : next;
    });
  }, []);

  const shouldListenRef = useRef(false);
  const explicitStopRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Independent watchdog, NOT driven by the 100ms VAD tick interval --
  // a real-world case (reported: frozen on "dinleniyor..." for 40-50s+,
  // well past the 20s MAX_RECORDING_MS the tick loop is supposed to
  // enforce) showed the tick-based cap alone is not reliable enough,
  // whether from interval throttling or some other stall in that loop.
  // This setTimeout fires on the wall clock regardless of whether the
  // tick interval is running at all, and force-recovers the cycle.
  const hardStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Throttle for the live RMS/elapsed readout below -- updated once a
  // second (not every 100ms tick) so this stays readable and doesn't spam
  // re-renders, but still proves conclusively, on the next real test,
  // whether tick() is running at all and whether the mic track is
  // delivering any real signal (RMS should visibly fluctuate with room
  // noise even in silence; a flat 0.000 forever means the track itself is
  // dead, not that timers are stuck).
  const lastLiveDebugUpdateRef = useRef(0);
  const speechStartedRef = useRef(false);
  const cycleStartRef = useRef(0);
  const lastLoudTimeRef = useRef(0);
  // Tracks when the current above-threshold streak began (null when not
  // currently above threshold) -- see SPEECH_CONFIRM_MS above.
  const loudStreakStartRef = useRef<number | null>(null);
  // This cycle's peak RMS observed during the NOISE_CALIBRATION_MS
  // window (ambient-noise sample), and the resulting effective threshold
  // once calibration ends (null while still calibrating).
  const cycleNoiseFloorRef = useRef(0);
  const effectiveThresholdRef = useRef<number | null>(null);
  // How many consecutive cycles in a row have been thrown away as
  // too-short. Surfaced in the debug badge so a fast false-start retry
  // loop (this exact bug) is visible at a glance next time instead of
  // just looking like a frozen "dinleniyor..." again.
  const consecutiveShortRetriesRef = useRef(0);
  // True from the instant ANY code path here calls mediaRecorderRef.current
  // .stop() (silence detected, the hard-stop watchdog, or the user's
  // forceStop() button) until onstop actually runs. MediaRecorder flips
  // .state to 'inactive' SYNCHRONOUSLY on stop(), but the 'stop' event
  // (onstop) fires ASYNCHRONOUSLY a moment later -- and the still-running
  // 100ms tick loop can land in exactly that gap. This flag is what lets
  // tick() tell "we just told it to stop, onstop is legitimately pending"
  // apart from "the recorder actually died unexpectedly" (Electron/
  // Chromium silently killing MediaRecorder on an occluded/backgrounded
  // window, the original reason the guard-fail recovery below exists at
  // all) -- previously tick() could not distinguish the two and treated
  // every single deliberate stop as an unexpected death, restarting a
  // brand new cycle that raced the real onstop for the shared chunksRef.
  const stopRequestedRef = useRef(false);
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

  const clearHardStopWatchdog = useCallback(() => {
    if (hardStopTimeoutRef.current !== null) {
      clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
  }, []);

  const teardownStream = useCallback(() => {
    cancelVadLoop();
    clearHardStopWatchdog();
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
  }, [cancelVadLoop, clearHardStopWatchdog]);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    logStatus(`ses gönderiliyor (${blob.size}B)`);
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
        logStatus(`transkript alındı: "${text.slice(0, 40)}"`);
        setTranscriptState(text);
        if (onResultRef.current) onResultRef.current(text, true);
      } else {
        logStatus('boş transkript alındı, tekrar dinleniyor');
      }
    } catch (err) {
      const code = err instanceof Error && err.message === 'no-api-key' ? 'no-api-key' : 'transcription-failed';
      logStatus(`transkripsiyon hatası: ${err instanceof Error ? err.message : String(err)}`);
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
    if (!analyser) {
      logStatus('VAD döngüsü başlatılamadı: analyser yok');
      return;
    }
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      const recorder = mediaRecorderRef.current;
      const analyserNode = analyserRef.current;
      if (!analyserNode || !recorder || recorder.state !== 'recording') {
        // A normal, expected teardown (stopListening()/unmount, or the
        // cycle already moved on) always nulls mediaRecorderRef.current
        // first via teardownStream -- so if we still have a recorder
        // reference here but it's not in the 'recording' state, that's
        // unexpected: Electron/Chromium has been observed silently
        // auto-pausing/ending MediaRecorder on an occluded or
        // backgrounded window (a MediaRecorder-specific behavior, not
        // covered by the timer-throttling switches in main.js). Without
        // this branch that left the VAD loop dead with nothing left to
        // ever call recorder.stop() -- the UI froze on "dinleniyor..."
        // forever, well short of the MAX_RECORDING_MS hard cap, with no
        // error and no way to recover short of closing the modal.
        const stillListening = shouldListenRef.current;
        cancelVadLoop();
        if (stopRequestedRef.current) {
          // We asked for this stop ourselves moments ago (silence
          // detection, the hard-stop watchdog, or forceStop()) and onstop
          // just hasn't run yet. Trust it to finish the job -- restarting
          // from here would create a second, overlapping recording cycle
          // that shares (and corrupts) chunksRef with the real onstop
          // handler, discarding whatever was actually captured. This was
          // the root cause behind "buton çalışmıyor" (the button's own
          // stop kept losing this exact race) and almost certainly the
          // original "hep dinleme modunda kalıyor" symptom too, since a
          // perfectly normal silence-triggered stop hit the same race.
          logStatus('VAD: durdurma isteğimiz var, onstop bekleniyor');
          return;
        }
        if (stillListening && recorder) {
          logStatus(`VAD döngüsü beklenmedik durdu (durum: ${recorder.state}), yeniden başlatılıyor`);
          if (recorder.state === 'inactive') {
            beginRecordingCycleRef.current();
          } else {
            try {
              recorder.stop();
            } catch (_) {
              beginRecordingCycleRef.current();
            }
          }
        }
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
      const elapsedSinceStart = now - cycleStartRef.current;

      // Ambient-noise calibration, added after live telemetry (a real
      // debug-badge test) showed the fixed SPEECH_VOLUME_THRESHOLD alone
      // still wasn't enough: "konuşma:evet" kept latching with the
      // *current* RMS sitting well under the threshold, meaning this
      // mic/room's ambient noise floor sits close enough to 0.02 that it
      // crosses it for stretches long enough to satisfy even the 200ms
      // SPEECH_CONFIRM_MS streak on its own -- a laptop fan, HVAC hum, or
      // just this specific mic's self-noise, not the user's voice. For
      // the first NOISE_CALIBRATION_MS of every cycle we sample the peak
      // RMS as this cycle's ambient floor instead of testing for speech,
      // then require real speech to clear that floor by a real margin
      // (NOISE_FLOOR_MULTIPLIER), never lower than the fixed constant.
      // This adapts per-cycle/per-machine instead of guessing one static
      // number that has to work for every room and every Mac.
      if (elapsedSinceStart < NOISE_CALIBRATION_MS) {
        if (rms > cycleNoiseFloorRef.current) cycleNoiseFloorRef.current = rms;
      } else if (effectiveThresholdRef.current === null) {
        effectiveThresholdRef.current = Math.max(
          SPEECH_VOLUME_THRESHOLD,
          cycleNoiseFloorRef.current * NOISE_FLOOR_MULTIPLIER
        );
      }
      const activeThreshold = effectiveThresholdRef.current ?? SPEECH_VOLUME_THRESHOLD;

      if (elapsedSinceStart >= NOISE_CALIBRATION_MS) {
        if (rms > activeThreshold) {
          if (loudStreakStartRef.current === null) loudStreakStartRef.current = now;
          // Reported directly ("boşluğu yakalayamıyor, hep dinleme modunda
          // kalıyor" -- a real recording that ran well past 900ms of the
          // user reporting silence, with the debug badge's own rms readout
          // sitting under the threshold at every sampled instant): the bug
          // was here. lastLoudTimeRef used to advance on ANY single 100ms
          // tick above threshold, so one lone spike (real ambient noise,
          // mic self-noise, a stray click) fully reset the silence clock
          // back to zero even during genuine silence -- if that happens
          // every so often, 900ms of *uninterrupted* quiet can never
          // accumulate and the recording never stops on its own. Now
          // lastLoudTimeRef only advances once the loudness has been
          // sustained for SPEECH_CONFIRM_MS, exactly like the
          // speech-start latch below -- an isolated blip can no longer
          // push the silence clock back out, only real sustained sound
          // (i.e. actual continued speech) can.
          if (now - loudStreakStartRef.current >= SPEECH_CONFIRM_MS) {
            lastLoudTimeRef.current = now;
            if (!speechStartedRef.current) speechStartedRef.current = true;
          }
        } else {
          loudStreakStartRef.current = null;
        }
      }

      const silenceElapsed = now - lastLoudTimeRef.current;

      if (now - lastLiveDebugUpdateRef.current > 1000) {
        lastLiveDebugUpdateRef.current = now;
        logStatus(
          `dinleniyor… (rms:${rms.toFixed(3)}, eşik:${activeThreshold.toFixed(3)}, t:${(elapsedSinceStart / 1000).toFixed(1)}s, konuşma:${speechStartedRef.current ? 'evet' : 'hayır'}, deneme:#${consecutiveShortRetriesRef.current})`
        );
      }

      if (
        (speechStartedRef.current &&
          elapsedSinceStart > MIN_RECORDING_BEFORE_STOP_MS &&
          silenceElapsed > SILENCE_MS) ||
        elapsedSinceStart > MAX_RECORDING_MS
      ) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRequestedRef.current = true;
          mediaRecorderRef.current.stop();
        }
      }
    };

    vadIntervalRef.current = setInterval(tick, 100);
  }, [cancelVadLoop]);

  const beginRecordingCycle = useCallback(() => {
    if (!shouldListenRef.current || !mediaStreamRef.current) {
      logStatus(
        `döngü başlatılamadı (shouldListen:${shouldListenRef.current}, stream:${mediaStreamRef.current ? 'var' : 'yok'})`
      );
      return;
    }
    logStatus('yeni kayıt döngüsü başlıyor');
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
        clearHardStopWatchdog();
        stopRequestedRef.current = false;
        const wasExplicit = explicitStopRef.current;
        explicitStopRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        logStatus(
          `onstop tetiklendi (blob:${blob.size}B, wasExplicit:${wasExplicit}, shouldListen:${shouldListenRef.current})`
        );

        if (wasExplicit || !shouldListenRef.current) {
          setIsListening(false);
          return;
        }
        if (blob.size < MIN_BLOB_BYTES) {
          const elapsedMs = Date.now() - cycleStartRef.current;
          consecutiveShortRetriesRef.current += 1;
          logStatus(
            `kayıt çok kısa (${blob.size}B / ${elapsedMs}ms), yeniden deneniyor (deneme #${consecutiveShortRetriesRef.current})`
          );
          beginRecordingCycle();
          return;
        }
        consecutiveShortRetriesRef.current = 0;
        transcribeBlob(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
      logStatus('dinleniyor…');

      speechStartedRef.current = false;
      loudStreakStartRef.current = null;
      cycleNoiseFloorRef.current = 0;
      effectiveThresholdRef.current = null;
      cycleStartRef.current = Date.now();
      lastLoudTimeRef.current = Date.now();
      runVadLoop();

      clearHardStopWatchdog();
      hardStopTimeoutRef.current = setTimeout(() => {
        hardStopTimeoutRef.current = null;
        if (!shouldListenRef.current) return;
        const currentRecorder = mediaRecorderRef.current;
        if (!currentRecorder) return;
        if (currentRecorder.state === 'recording') {
          // The 100ms tick loop should have stopped this on its own well
          // before now -- it didn't (throttled, stalled, or never armed).
          // Force it directly; onstop still runs the normal retry/
          // transcribe path from here.
          logStatus('sert zaman aşımı (watchdog), kayıt zorla durduruluyor');
          try {
            stopRequestedRef.current = true;
            currentRecorder.stop();
          } catch (_) {}
        } else if (currentRecorder.state === 'inactive') {
          // Already stopped/dead with nothing having restarted the cycle
          // (e.g. the tick loop's own recovery path also failed to).
          // Full fresh restart rather than reusing whatever's left.
          logStatus('sert zaman aşımı (watchdog): kayıt hareketsiz, yeniden başlatılıyor');
          beginRecordingCycleRef.current();
        }
      }, MAX_RECORDING_MS + 3000);
    } catch (e) {
      console.warn('Failed to start audio capture cycle:', e);
      logStatus(`ses yakalama hatası: ${e instanceof Error ? e.message : String(e)}`);
      if (onErrorRef.current) {
        onErrorRef.current({ error: 'audio-capture', message: e instanceof Error ? e.message : String(e) });
      }
      setIsListening(false);
    }
  }, [cancelVadLoop, clearHardStopWatchdog, runVadLoop, transcribeBlob]);

  beginRecordingCycleRef.current = beginRecordingCycle;

  const startListening = useCallback(() => {
    shouldListenRef.current = true;

    const start = async () => {
      try {
        if (!mediaStreamRef.current) {
          logStatus('mikrofon isteniyor…');
          mediaStreamRef.current = await getUserMediaWithTimeout({ audio: true });
          logStatus('mikrofon alındı');
        }
        beginRecordingCycle();
      } catch (err) {
        console.warn('Microphone access failed:', err);
        shouldListenRef.current = false;
        setIsListening(false);
        const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
        logStatus(`mikrofon hatası: ${isTimeout ? 'zaman aşımı' : (err instanceof Error ? err.message : String(err))}`);
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

  const stopListening = useCallback((reason?: string) => {
    logStatus(`stopListening() çağrıldı (sebep: ${reason || 'belirtilmedi'})`);
    shouldListenRef.current = false;
    explicitStopRef.current = true;
    cancelVadLoop();
    clearHardStopWatchdog();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    if (onEndRef.current) onEndRef.current();
  }, [cancelVadLoop, clearHardStopWatchdog]);

  const forceStop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    // Unconditional, immediate, un-throttled feedback the instant this is
    // called -- regardless of recorder state. If the button click were
    // being silently swallowed by an early return (recorder missing, or
    // state not 'recording' at the exact instant of the click, e.g. mid
    // cycle-transition), the old version left NO trace at all, which is
    // indistinguishable from "the click never reached this function".
    // This line alone proves whether forceStop() is even invoked.
    logStatus(`buton tıklandı (recorder:${recorder ? recorder.state : 'yok'})`);
    if (!recorder) return;
    if (recorder.state === 'recording') {
      logStatus('elle durduruldu, gönderiliyor…');
      // Race condition fix: MediaRecorder.stop() flips `.state` to
      // 'inactive' SYNCHRONOUSLY, but the 'stop' event (which does the
      // actual blob/transcription work in onstop) fires ASYNCHRONOUSLY
      // a moment later. If the 100ms VAD tick loop is still running, it
      // can fire in that gap, see state !== 'recording', and mistake this
      // deliberate stop for an unexpected-death scenario (the recovery
      // logic from an earlier fix) -- immediately starting a brand new
      // recording cycle and clobbering the pending onstop callback before
      // it gets a chance to run. Tear the VAD loop (and its watchdog) down
      // FIRST, synchronously, so nothing can race in during that gap.
      cancelVadLoop();
      clearHardStopWatchdog();
      stopRequestedRef.current = true;
      // Deliberately does NOT set explicitStopRef -- that flag makes
      // onstop skip transcription entirely (the cancel/close path). This
      // should behave exactly like the VAD detecting silence on its own,
      // just triggered by the user instead of the volume analysis.
      try {
        recorder.stop();
      } catch (_) {}
    }
  }, [cancelVadLoop, clearHardStopWatchdog]);

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
    debugHistory,
    forceStop,
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
