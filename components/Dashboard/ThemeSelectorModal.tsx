'use client';

import React from 'react';
import { useThemeCustomizer } from '@/contexts/ThemeCustomizerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { GLASS_THEMES } from '@/lib/themes';
import styles from './ThemeSelectorModal.module.css';

export const ThemeSelectorModal: React.FC = () => {
  const { glassTheme, setGlassTheme, isThemeModalOpen, setIsThemeModalOpen } = useThemeCustomizer();
  const { language, t } = useLanguage();
  const { theme: appTheme, toggleTheme } = useApp();

  if (!isThemeModalOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setIsThemeModalOpen(false)}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span>🎨</span>
            <span>{t('changeTheme')}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsThemeModalOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {GLASS_THEMES.map((theme) => {
            const isActive = glassTheme === theme.id && appTheme === 'dark';
            const badgeText = theme.badge[language] || theme.badge.en;
            const descText = theme.desc[language] || theme.desc.en;

            return (
              <button
                key={theme.id}
                type="button"
                className={`${styles.themeCard} ${isActive ? styles.active : ''}`}
                onClick={() => {
                  setGlassTheme(theme.id);
                  if (appTheme !== 'dark') {
                    toggleTheme();
                  }
                  setIsThemeModalOpen(false);
                }}
              >
                <div className={styles.themeInfo}>
                  <div className={styles.themeTitleRow}>
                    <span className={styles.themeName}>{theme.name}</span>
                    <span className={styles.themeBadge}>{badgeText}</span>
                  </div>
                  <div className={styles.themeDesc}>{descText}</div>
                </div>

                <div
                  className={styles.previewCircle}
                  style={{
                    backgroundColor: theme.previewBg,
                    borderColor: theme.previewBorder,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
