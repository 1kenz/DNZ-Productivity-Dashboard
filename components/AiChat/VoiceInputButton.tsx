'use client';

import React from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './VoiceInputButton.module.css';

interface VoiceInputButtonProps {
  onTranscriptChange: (text: string) => void;
  language?: string;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscriptChange,
  language = 'tr-TR',
  className = '',
}) => {
  const { t } = useLanguage();
  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition({
      language,
      continuous: true,
      interimResults: true,
      onResult: (text) => {
        onTranscriptChange(text);
      },
      onError: (err) => {
        console.warn('Voice input error:', err);
      },
    });

  if (!isSupported) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const langLabel = language.split('-')[0].toUpperCase();

  return (
    <button
      type="button"
      className={`${styles.micBtn} ${isListening ? styles.active : ''} ${className}`}
      onClick={handleClick}
      title={isListening ? (t('ai.stopListening') || 'Stop Dictation') : `${t('dictateVoice')} (${langLabel})`}
    >
      <span className={styles.micIcon}>{isListening ? '🛑' : '🎙️'}</span>
      <span className={styles.langBadge}>{langLabel}</span>
    </button>
  );
};
