'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS, AiModelOption } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAiModels } from '@/hooks/useAiModels';
import styles from './ModelSelector.module.css';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (model: AiModelOption) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
}) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Live model list (see hooks/useAiModels.ts) so new provider models show
  // up here without an app update; AI_MODELS is only the last-resort
  // fallback for an id from an older conversation that's since aged out.
  const { models } = useAiModels();

  const currentModel =
    models.find((m) => m.id === selectedModelId) ||
    AI_MODELS.find((m) => m.id === selectedModelId) ||
    models[0] ||
    AI_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const headerText =
    language === 'tr'
      ? 'Model & Sağlayıcı Seçimi'
      : language === 'de'
      ? 'Modell- & Anbieter-Auswahl'
      : 'Model & Provider Selection';

  const tooltipText =
    language === 'tr'
      ? 'Yapay Zeka Modelini Değiştir'
      : language === 'de'
      ? 'KI-Modell wechseln'
      : 'Switch AI Model';

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.selectorBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        title={tooltipText}
      >
        <span className={styles.modelIcon}>{currentModel.icon}</span>
        <span className={styles.modelName}>{currentModel.name}</span>
        <span className={styles.providerBadge}>{currentModel.provider}</span>
        <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>{headerText}</div>
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={`${styles.optionItem} ${model.id === currentModel.id ? styles.active : ''}`}
              onClick={() => {
                onSelectModel(model);
                setIsOpen(false);
              }}
            >
              <span className={styles.optionIcon}>{model.icon}</span>
              <div className={styles.optionContent}>
                <div className={styles.optionTitleRow}>
                  <span className={styles.optionTitle}>{model.name}</span>
                  <span className={styles.optionBadge}>{model.badge}</span>
                </div>
                <div className={styles.optionDesc}>{model.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
