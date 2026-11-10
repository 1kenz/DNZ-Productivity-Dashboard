'use client';

import React, { useState, useEffect } from 'react';
import { AiSettings, AiProvider } from '@/types';
import { getAiSettings, updateAiSettings } from '@/app/actions/ai';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useLanguage } from '@/contexts/LanguageContext';
import { CHATGPT_VOICE_PRESETS, filterHighQualityVoices } from '@/lib/voiceEngine';
import styles from './ApiKeyConfigModal.module.css';

interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: AiSettings) => void;
}

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { t } = useLanguage();
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<AiProvider>('gemini');
  const [voiceLanguage, setVoiceLanguage] = useState('tr-TR');
  const [selectedPreset, setSelectedPreset] = useState('juniper');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { voices, speak, stop, isSpeaking } = useSpeechSynthesis({
    defaultLanguage: voiceLanguage,
    defaultPresetId: selectedPreset,
  });

  useEffect(() => {
    if (isOpen) {
      setSaveSuccess(false);

      // 1. Load from localStorage first (guarantees immediate persistence)
      if (typeof window !== 'undefined') {
        const localGemini = localStorage.getItem('dnz_ai_gemini_key');
        const localAnthropic = localStorage.getItem('dnz_ai_anthropic_key');
        const localOpenai = localStorage.getItem('dnz_ai_openai_key');
        const localProvider = localStorage.getItem('dnz_ai_default_provider') as AiProvider;
        const localLang = localStorage.getItem('dnz_ai_voice_lang');
        const localPreset = localStorage.getItem('dnz_ai_voice_preset');
        const localVoice = localStorage.getItem('dnz_ai_selected_voice');

        if (localGemini) setGeminiKey(localGemini);
        if (localAnthropic) setAnthropicKey(localAnthropic);
        if (localOpenai) setOpenaiKey(localOpenai);
        if (localProvider) setDefaultProvider(localProvider);
        if (localLang) setVoiceLanguage(localLang);
        if (localPreset) setSelectedPreset(localPreset);
        if (localVoice) setSelectedVoice(localVoice);
      }

      // 2. Fetch server settings to merge if not yet set
      getAiSettings()
        .then((data) => {
          if (!geminiKey && data.geminiApiKey) setGeminiKey(data.geminiApiKey);
          if (!anthropicKey && data.anthropicApiKey) setAnthropicKey(data.anthropicApiKey);
          if (!openaiKey && data.openaiApiKey) setOpenaiKey(data.openaiApiKey);
          if (data.defaultProvider) setDefaultProvider(data.defaultProvider);
          if (data.voiceLanguage) setVoiceLanguage(data.voiceLanguage);
          setAutoSpeak(data.autoSpeak || false);
        })
        .catch((e) => console.warn('Could not fetch server AI settings:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter high-quality / natural voices only (strips out robotic/bad synthesizer voices)
  const highQualityVoices = filterHighQualityVoices(voices, voiceLanguage);

  const handleTestVoice = (presetIdToTest = selectedPreset) => {
    if (isSpeaking) {
      stop();
      return;
    }

    const sampleText =
      voiceLanguage.startsWith('tr')
        ? 'Merhaba! Ben DNZ Productivity Dashboard yapay zeka asistanınızım. Sesim nasıl geliyor?'
        : voiceLanguage.startsWith('de')
        ? 'Hallo! Ich bin Ihr DNZ Productivity Dashboard KI-Sprachassistent. Wie gefällt Ihnen meine Stimme?'
        : 'Hello! I am your DNZ Productivity Dashboard AI voice assistant. How does my voice sound to you?';

    speak(sampleText, voiceLanguage, selectedVoice || undefined, presetIdToTest);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const geminiVal = geminiKey.trim();
      const anthropicVal = anthropicKey.trim();
      const openaiVal = openaiKey.trim();

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        if (geminiVal) localStorage.setItem('dnz_ai_gemini_key', geminiVal);
        else localStorage.removeItem('dnz_ai_gemini_key');

        if (anthropicVal) localStorage.setItem('dnz_ai_anthropic_key', anthropicVal);
        else localStorage.removeItem('dnz_ai_anthropic_key');

        if (openaiVal) localStorage.setItem('dnz_ai_openai_key', openaiVal);
        else localStorage.removeItem('dnz_ai_openai_key');

        localStorage.setItem('dnz_ai_default_provider', defaultProvider);
        localStorage.setItem('dnz_ai_voice_lang', voiceLanguage);
        localStorage.setItem('dnz_ai_voice_preset', selectedPreset);

        if (selectedVoice) {
          localStorage.setItem('dnz_ai_selected_voice', selectedVoice);
        } else {
          localStorage.removeItem('dnz_ai_selected_voice');
        }
      }

      // Try updating server settings
      const serverUpdated = await updateAiSettings({
        anthropicApiKey: anthropicVal || null,
        geminiApiKey: geminiVal || null,
        openaiApiKey: openaiVal || null,
        defaultProvider,
        voiceLanguage,
        autoSpeak,
      }).catch((err) => {
        console.warn('Server DB update skipped/errored, localStorage preserved:', err);
        return {
          id: 'default',
          anthropicApiKey: anthropicVal || null,
          geminiApiKey: geminiVal || null,
          openaiApiKey: openaiVal || null,
          defaultProvider,
          defaultModel: defaultProvider === 'anthropic' ? 'claude-opus-5' : defaultProvider === 'openai' ? 'gpt-6-astra' : defaultProvider === 'ollama' ? 'llama3.2' : 'gemini-3.8-flash',
          voiceLanguage,
          autoSpeak,
          updatedAt: new Date(),
        };
      });

      setSaveSuccess(true);
      if (onSaved) onSaved(serverUpdated);

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.title}>
            <span>⚙️</span>
            <span>{t('ai.aiSettingsTitle') || 'AI Models & Voice Settings'}</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {saveSuccess && (
            <div className={styles.successBanner}>
              ✓ {t('ai.savedSuccess') || 'API keys and voice preferences saved successfully!'}
            </div>
          )}

          <div className={styles.infoBanner}>
            🔑 {t('ai.keysBanner') || 'Your API keys are stored securely on your device and database. You can freely switch between Claude, Gemini, and OpenAI models.'}
          </div>

          {/* ChatGPT Style Premium Voice Personas (User Request) */}
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className={styles.label} style={{ marginBottom: 0 }}>
                <span>🗣️ {t('ai.voicePersona') || 'AI Voice Persona'}</span>
              </label>
              <button
                type="button"
                className={styles.testVoiceBtn}
                onClick={() => handleTestVoice(selectedPreset)}
              >
                {isSpeaking ? ('⏹️ ' + (t('common.close') || 'Stop')) : ('🔊 ' + (t('ai.testVoice') || 'Listen Sample'))}
              </button>
            </div>

            <div className={styles.personaGrid}>
              {CHATGPT_VOICE_PRESETS.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(p.id);
                      setSelectedVoice('');
                      handleTestVoice(p.id);
                    }}
                    className={`${styles.personaCard} ${isSelected ? styles.personaCardSelected : ''}`}
                  >
                    <div className={styles.personaCardHead}>
                      <span className={styles.personaAvatar}>{p.avatar}</span>
                      <strong className={`${styles.personaName} ${isSelected ? styles.personaNameSelected : ''}`}>
                        {p.name.split(' ')[1] || p.name}
                      </strong>
                      {isSelected && <span className={styles.personaCheck}>✓</span>}
                    </div>
                    <span className={styles.personaDesc}>
                      {p.description.split('(')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Voice Language Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>🎙️ {t('ai.voiceLang') || 'Voice & Dictation Language'}</span>
              </label>
              <select
                className={styles.select}
                value={voiceLanguage}
                onChange={(e) => {
                  setVoiceLanguage(e.target.value);
                  setSelectedVoice('');
                }}
              >
                <option value="tr-TR">🇹🇷 Türkçe (tr-TR)</option>
                <option value="en-US">🇺🇸 English (en-US)</option>
                <option value="de-DE">🇩🇪 Deutsch (de-DE)</option>
              </select>
            </div>

            {/* Custom High Quality System Voice */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>🎧 {t('ai.deviceVoice') || 'System Voice (Optional)'}</span>
              </label>
              <select
                className={styles.select}
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                <option value="">{t('ai.autoBestVoice') || '-- Auto Best Quality Voice --'}</option>
                {highQualityVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* API Keys */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>⚡ Google Gemini API Key</span>
              <span className={styles.providerHint}>(Google AI Studio)</span>
            </label>
            <input
              type="password"
              className={styles.input}
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>🧠 Anthropic Claude API Key</span>
              <span className={styles.providerHint}>(Claude Console)</span>
            </label>
            <input
              type="password"
              className={styles.input}
              placeholder="sk-ant-api03-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>🤖 OpenAI ChatGPT API Key</span>
              <span className={styles.providerHint}>(Platform OpenAI)</span>
            </label>
            <input
              type="password"
              className={styles.input}
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </div>

          {/* Ollama Local LLM Section */}
          <div className={styles.formGroup} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className={styles.label} style={{ margin: 0 }}>
                <span>🦙 Ollama Local LLM (100% Offline & Private)</span>
              </label>
              <span className={styles.providerHint} style={{ color: '#10b981', fontWeight: 600 }}>● API Anahtarı Gerekmez</span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              Kendi bilgisayarınızda çalışan açık kaynaklı yapay zeka modelleri (Llama 3.2, Mistral, DeepSeek R1, Qwen 2.5). Verileriniz asla internete veya buluta aktarılmaz.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className={styles.input}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
                value="http://127.0.0.1:11434"
                readOnly
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>Yerel Ollama Portu</span>
            </div>
          </div>


          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
            />
            <span className={styles.checkboxLabel}>
              {t('ai.autoSpeakOption') || 'Automatically read AI responses aloud (Auto-Speak)'}
            </span>
          </label>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (t('ai.saving') || 'Saving...') : (t('common.save') || 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};
