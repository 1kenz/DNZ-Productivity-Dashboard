'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useLanguage } from '@/contexts/LanguageContext';
import { isElectronApp } from '@/lib/electron';
import { AiModelOption } from '@/types';
import styles from './LiveVoiceModal.module.css';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: AiModelOption;
  language?: string;
  onNewMessage?: (userText: string, assistantReply: string) => void;
  initialSpokenText?: string;
  customSystemPrompt?: string;
}

type LiveState = 'idle' | 'listening' | 'thinking' | 'speaking';

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  language = 'tr-TR',
  onNewMessage,
  initialSpokenText,
  customSystemPrompt,
}) => {
  const { t } = useLanguage();
  const [liveState, setLiveState] = useState<LiveState>('idle');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOpenRef = useRef(isOpen);
  const chatAbortRef = useRef<AbortController | null>(null);
  const latestPromptRef = useRef('');

  // Independent heartbeat, deliberately with ZERO connection to
  // useVoiceCapture's internals (no shared refs, no shared timers) -- its
  // only job is to answer one question when the debug badge looks frozen:
  // is this renderer's JS/React event loop actually still alive at all
  // right now, or is the whole page genuinely stuck? If this number is
  // still climbing while the voice-capture debugStatus text isn't
  // changing, the freeze is specific to that hook's own state/closures --
  // not a renderer-wide stall (Electron backgroundThrottling, a stuck
  // native dialog eating the event loop, etc.).
  const [heartbeat, setHeartbeat] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setHeartbeat((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Independent click counter for the "Bitti, Gönder" button, with ZERO
  // dependency on forceStop's internals -- same instrumentation logic as
  // the heartbeat above. If this number climbs on click but the badge's
  // debugStatus never shows "buton tıklandı", the click IS reaching React
  // but something about the forceStop closure itself is broken. If this
  // number never climbs at all, the click isn't reaching this handler in
  // the first place (event capture/propagation issue), which is a very
  // different bug to chase.
  const [doneButtonClicks, setDoneButtonClicks] = useState(0);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const { speak, stop: stopSpeaking, voices } = useSpeechSynthesis({
    defaultLanguage: language,
  });

  // Speaks `text` with the currently selected voice, then resumes listening
  // once playback finishes -- shared by both a real reply and an error
  // message, so a failed turn still gets the same audible hand-back to the
  // user instead of silently reopening the mic with no explanation.
  const speakAndResumeListening = (text: string) => {
    let rate = 1.0;
    let pitch = 1.0;
    if (typeof window !== 'undefined') {
      const r = localStorage.getItem('dnz_ai_voice_rate');
      if (r) rate = parseFloat(r) || 1.0;
      const p = localStorage.getItem('dnz_ai_voice_pitch');
      if (p) pitch = parseFloat(p) || 1.0;
    }

    const presetId = selectedVoiceName?.startsWith('preset:') ? selectedVoiceName.replace('preset:', '') : undefined;
    const directVoice = !selectedVoiceName?.startsWith('preset:') ? selectedVoiceName : undefined;

    speak(text, language, directVoice, presetId, rate, pitch, () => {
      if (isOpenRef.current) {
        latestPromptRef.current = '';
        resetTranscript();
        setCurrentPrompt('');
        setLiveState('listening');
        startListening();
      }
    });
  };

  const handleSendVoicePrompt = async (explicitText?: string) => {
    const textToSend = (explicitText || latestPromptRef.current || currentPrompt).trim();
    if (!textToSend || !isOpenRef.current) {
      if (isOpenRef.current) {
        setLiveState('listening');
        startListening();
      }
      return;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    stopListening();
    setLiveState('thinking');

    try {
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
      }
      const abortCtrl = new AbortController();
      chatAbortRef.current = abortCtrl;

      const clientApiKeys = typeof window !== 'undefined' ? {
        gemini: localStorage.getItem('dnz_ai_gemini_key') || undefined,
        anthropic: localStorage.getItem('dnz_ai_anthropic_key') || undefined,
        openai: localStorage.getItem('dnz_ai_openai_key') || undefined,
      } : {};

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          messages: [{ role: 'user', content: textToSend }],
          provider: selectedModel.provider,
          model: selectedModel.id,
          apiKeys: clientApiKeys,
          systemPrompt:
            customSystemPrompt ||
            'Sen DNZ Productivity OS\'un üst düzey Yönetici Kişisel Asistanısın (Adın Deniz). Kullanıcı seninle canlı sesli konuşuyor. Yanıtlarını kısa, net, anlaşılır, saygılı, samimi, madde işaretli olmayan ve doğal bir konuşma tonunda ver.',
        }),
      });

      if (!isOpenRef.current || abortCtrl.signal.aborted) {
        return;
      }

      const data = await res.json();

      // The route returns HTTP 500 + { error } (no `content`) whenever the
      // provider call itself fails (bad/missing key, rate limit, a
      // rejected parameter like temperature, etc.) -- this used to go
      // unnoticed here and get replaced by a generic "No response", so a
      // real, actionable error was silently thrown away. Surface it the
      // same way the text chat does.
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `${res.status} ${res.statusText}`);
      }

      const reply = data?.content || (t('ai.errorOccurred') || 'No response');

      if (!isOpenRef.current) return;

      setLastReply(reply);
      setLiveState('speaking');

      if (onNewMessage) {
        onNewMessage(textToSend, reply);
      }

      // Speak response with user selected voice (neural AI or high-res system voice)
      speakAndResumeListening(reply);
    } catch (err: any) {
      if (err?.name === 'AbortError' || !isOpenRef.current) {
        return;
      }
      console.error('Live voice error:', err);
      if (isOpenRef.current) {
        const errorText = `${t('ai.errorOccurred') || 'Bir hata oluştu'}: ${err?.message || 'Yapay zeka ile iletişim kurulamadı.'}`;
        setLastReply(errorText);
        setLiveState('speaking');
        speakAndResumeListening(errorText);
      }
    }
  };

  const {
    startListening,
    stopListening,
    interimTranscript,
    resetTranscript,
    // Electron path only (see hooks/useVoiceCapture.ts) -- a live,
    // human-readable trace of what the mic pipeline is doing right now.
    // Rendered as a small caption below so mic issues on the packaged
    // macOS app can be diagnosed straight off the screen, since getting
    // real console/DevTools output out of that app has proven unreliable.
    // Always undefined on the browser (Web Speech) path, so it renders
    // nothing there.
    debugStatus,
    // Same as debugStatus, but the last ~14 messages instead of just the
    // latest one -- debugStatus alone only ever shows a single frozen
    // frame, and something overwriting it a moment later (the exact
    // failure mode behind several of the bugs chased in this file
    // already) leaves no trace of what actually happened before that.
    // Rendered as a small scrolling log under the badge below.
    debugHistory,
    // Electron path only -- see hooks/useVoiceCapture.ts. A manual
    // escape hatch for the whole class of VAD/silence-detection tuning
    // problems (noisy room, quiet mic, a threshold that's never quite
    // right for every machine): lets the user end the current recording
    // and send it right now instead of waiting on auto-detection to
    // notice they've stopped talking.
    forceStop,
  } = useVoiceCapture({
    language,
    continuous: true,
    interimResults: true,
    onProcessingStart: () => {
      // Electron path only: fired once the user stops talking and the
      // recorded clip is being sent off for transcription -- there's no
      // live partial transcript with that approach, so switch to the
      // "thinking" state instead of leaving the orb stuck on "listening"
      // with nothing visibly happening for the ~1-2s round trip.
      if (!isOpenRef.current) return;
      setLiveState('thinking');
    },
    onResult: (text) => {
      if (!isOpenRef.current) return;
      latestPromptRef.current = text;
      setCurrentPrompt(text);

      // Silence detection to auto-send when user finishes talking
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (text.trim().length > 1) {
        silenceTimerRef.current = setTimeout(() => {
          if (!isOpenRef.current) return;
          const promptToSend = latestPromptRef.current.trim();
          if (promptToSend) {
            handleSendVoicePrompt(promptToSend);
          }
        }, 700);
      }
    },
    onError: (err) => {
      console.warn('Live voice recognition error:', err);
      if (!isOpenRef.current) return;
      // Silent mic-permission failures are the #1 cause of the feature
      // looking completely broken (esp. in the packaged desktop app,
      // where macOS can deny mic access with no OS-level prompt at all):
      // give the same audible hand-back the chat-send error path uses
      // instead of only logging to the console.
      const isPermissionError = err?.error === 'not-allowed' || err?.error === 'service-not-allowed';
      // Electron path only: getUserMedia can hang forever instead of
      // resolving/rejecting in a packaged, unsigned macOS app when the OS
      // never actually shows (or silently drops) the mic permission
      // prompt -- useVoiceCapture races it against a timeout so that case
      // reaches us as its own error code instead of leaving the UI stuck
      // on "Listening..." forever with nothing to tell the user.
      const isMicTimeout = err?.error === 'mic-timeout';
      // Electron path only: the recorded-clip transcription needs an
      // OpenAI key configured (there's no free/keyless fallback the way
      // the browser's built-in speech engine was) -- tell the user that
      // specifically instead of a generic "try again".
      const isMissingApiKey = err?.error === 'no-api-key';
      const errorText = isPermissionError
        ? (t('ai.micPermissionDenied') || 'Microphone access is blocked.')
        : isMicTimeout
        ? (t('ai.micTimeout') || 'Microphone request timed out -- check System Settings > Privacy & Security > Microphone.')
        : isMissingApiKey
        ? (t('ai.voiceNoApiKey') || 'Voice transcription needs an OpenAI API key -- add one in API Key Settings.')
        : (t('ai.voiceRecognitionError') || 'Voice recognition error. Please try again.');
      setLastReply(errorText);
      setLiveState('speaking');
      speakAndResumeListening(errorText);
    },
  });

  useEffect(() => {
    if (isOpen) {
      let activeVoiceName = selectedVoiceName;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('dnz_ai_selected_voice');
        if (saved) {
          setSelectedVoiceName(saved);
          activeVoiceName = saved;
        }
      }
      latestPromptRef.current = '';
      setCurrentPrompt('');

      if (initialSpokenText && initialSpokenText.trim()) {
        setLastReply(initialSpokenText);
        setLiveState('speaking');

        let rate = 1.0;
        let pitch = 1.0;
        if (typeof window !== 'undefined') {
          const r = localStorage.getItem('dnz_ai_voice_rate');
          if (r) rate = parseFloat(r) || 1.0;
          const p = localStorage.getItem('dnz_ai_voice_pitch');
          if (p) pitch = parseFloat(p) || 1.0;
        }

        const presetId = activeVoiceName?.startsWith('preset:') ? activeVoiceName.replace('preset:', '') : undefined;
        const directVoice = !activeVoiceName?.startsWith('preset:') ? activeVoiceName : undefined;

        speak(initialSpokenText, language, directVoice, presetId, rate, pitch, () => {
          if (isOpenRef.current) {
            latestPromptRef.current = '';
            resetTranscript();
            setCurrentPrompt('');
            setLiveState('listening');
            startListening();
          }
        });
      } else {
        setLastReply('');
        setLiveState('listening');
        resetTranscript();
        startListening();
      }
    } else {
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
        chatAbortRef.current = null;
      }
      stopListening();
      stopSpeaking();
      setLiveState('idle');
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    return () => {
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
        chatAbortRef.current = null;
      }
      stopListening();
      stopSpeaking();
    };
  }, [isOpen, initialSpokenText, language, startListening, stopListening, stopSpeaking, resetTranscript, speak]);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoiceName(val);
    if (typeof window !== 'undefined') {
      if (val.startsWith('preset:')) {
        localStorage.setItem('dnz_ai_voice_preset', val.replace('preset:', ''));
        localStorage.removeItem('dnz_ai_selected_voice');
      } else if (val) {
        localStorage.setItem('dnz_ai_selected_voice', val);
      } else {
        localStorage.removeItem('dnz_ai_selected_voice');
      }
    }
  };

  const handleInterrupt = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    stopSpeaking();
    stopListening();
    latestPromptRef.current = '';
    resetTranscript();
    setCurrentPrompt('');
    setLiveState('listening');
    startListening();
  };

  const handleClose = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    stopSpeaking();
    stopListening();
    setLiveState('idle');
    onClose();
  };

  if (!isOpen) return null;

  const langPrefix = language.split('-')[0];
  const matchingVoices = voices.filter(
    (v) => v.lang === language || v.lang.startsWith(langPrefix)
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.topBar}>
        <div className={styles.modelBadge}>
          <span>{selectedModel.icon}</span>
          <span>{selectedModel.name}</span>
          <span>• {t('ai.liveVoice') || 'Live Voice Mode'}</span>
        </div>

        {/* Quick Voice Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>🗣️ {t('ai.voiceLabel') || 'Voice:'}</span>
          <select
            value={selectedVoiceName}
            onChange={handleVoiceChange}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              outline: 'none',
            }}
          >
            <optgroup label="✨ ChatGPT Voices" style={{ background: '#18181b', color: '#fff' }}>
              <option value="preset:juniper">🌿 Juniper (ChatGPT - Warm & Energetic)</option>
              <option value="preset:breeze">🌊 Breeze (ChatGPT - Calm & Clear)</option>
              <option value="preset:cove">🌲 Cove (ChatGPT - Deep & Grounded)</option>
              <option value="preset:ember">⚡ Ember (ChatGPT - Dynamic & Confident)</option>
              <option value="preset:defne_tr">🇹🇷 Defne & Yelda (Natural Turkish)</option>
            </optgroup>
            {matchingVoices.length > 0 && (
              <optgroup label="🎧 System Voices" style={{ background: '#18181b', color: '#fff' }}>
                {matchingVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <button type="button" className={styles.closeBtn} onClick={handleClose} title={t('common.close')}>
          ✕
        </button>
      </div>

      <div className={styles.centerStage}>
        <div
          className={styles.orbContainer}
          onClick={() => {
            if (liveState === 'speaking' || liveState === 'thinking') {
              handleInterrupt();
            } else if (liveState === 'listening' && (currentPrompt.trim() || latestPromptRef.current.trim())) {
              handleSendVoicePrompt();
            }
          }}
          title={
            liveState === 'speaking'
              ? (t('ai.speakingHint') || 'Click to interrupt')
              : liveState === 'listening' && currentPrompt
              ? 'Tıkla ve Hemen Gönder 🚀'
              : ''
          }
        >
          <div className={`${styles.orb} ${styles[liveState]}`} />
        </div>

        <div>
          <div className={styles.statusText}>
            {liveState === 'listening' && `🎙️ ${t('ai.listeningStatus') || 'Listening to you...'}`}
            {liveState === 'thinking' && `🧠 ${t('ai.thinkingStatus') || 'Thinking...'}`}
            {liveState === 'speaking' && `🔊 ${t('ai.speakingStatus') || 'Speaking...'}`}
            {liveState === 'idle' && (t('ai.readyStatus') || 'Ready')}
          </div>
          <div className={styles.statusHint}>
            {liveState === 'listening' && (t('ai.listeningHint') || 'Speak naturally; it responds automatically when you pause.')}
            {liveState === 'speaking' && (t('ai.speakingHint') || 'Tap the orb to interrupt or ask a new question.')}
          </div>
        </div>

        <div className={styles.transcriptBox}>
          {currentPrompt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <div>
                <strong>{t('ai.you') || 'You'}:</strong> {currentPrompt}{' '}
                {interimTranscript && <span className={styles.interim}>{interimTranscript}</span>}
              </div>
              {liveState === 'listening' && (
                <button
                  type="button"
                  onClick={() => handleSendVoicePrompt()}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#ffffff',
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  🚀 {t('shortcuts.sendMessage') || 'Gönder'}
                </button>
              )}
            </div>
          ) : lastReply ? (
            <div>
              <strong>{selectedModel.name}:</strong> {lastReply}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <span className={styles.interim}>
                🎙️ {t('ai.startSpeakingPrompt') || 'Start speaking...'}
              </span>
              {/* Manual escape hatch for the whole VAD/silence-detection
                  tuning saga -- forceStop is only defined on the Electron
                  path (see hooks/useVoiceCapture.ts), so this renders
                  nothing on the browser build, which doesn't need it. */}
              {liveState === 'listening' && forceStop && (
                <button
                  type="button"
                  onClick={() => {
                    setDoneButtonClicks((n) => n + 1);
                    forceStop();
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#ffffff',
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  ✅ {t('ai.doneSpeakingBtn') || 'Bitti, Gönder'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Always rendered (not just when debugStatus is set) so which
          capture path is active -- the Electron MediaRecorder pipeline vs.
          the browser's Web Speech API -- is never ambiguous from the
          screen alone. If this ever reads "mod: browser" inside the
          packaged desktop app, none of the Electron-only mic fixes above
          are in play at all, which is the single most important thing to
          rule out before chasing anything else. */}
      <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            // High-contrast on purpose (not just a dimmed opacity) -- a
            // subtle gray-on-dark caption here previously blended into the
            // modal's own dark background closely enough to be
            // effectively invisible on a real screen/screenshot, even
            // though it was rendering correctly the whole time.
            color: '#0a0a0a',
            background: '#facc15',
            padding: '2px 8px',
            borderRadius: '4px',
            display: 'inline-block',
          }}
        >
          mod: {isElectronApp() ? 'electron' : 'browser'}
          {' | build: '}
          {process.env.NEXT_PUBLIC_BUILD_ID || 'dev'}
          {' | canlı: '}
          {heartbeat}
          s
          {' | tık: '}
          {doneButtonClicks}
          {debugStatus ? ` | ${debugStatus}` : ''}
        </span>
      </div>

      {debugHistory && debugHistory.length > 0 && (
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto 8px',
            maxHeight: '110px',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '0.66rem',
            fontFamily: 'monospace',
            color: '#e5e7eb',
            textAlign: 'left',
            lineHeight: 1.5,
          }}
        >
          {debugHistory.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}

      <div className={styles.controlsRow}>
        <button type="button" className={styles.controlBtn} onClick={handleInterrupt}>
          🔄 {t('ai.newQuestionBtn') || 'Ask New Question'}
        </button>
        <button type="button" className={`${styles.controlBtn} ${styles.primary}`} onClick={handleClose}>
          {t('ai.endChatBtn') || 'End Chat'}
        </button>
      </div>
    </div>
  );
};

