'use client';

import React from 'react';
import { useThemeCustomizer } from '@/contexts/ThemeCustomizerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { GLASS_THEMES } from '@/lib/themes';
import { ThemeMode } from '@/types';
import styles from './ThemeSelectorModal.module.css';

export const ThemeSelectorModal: React.FC = () => {
  const { glassTheme, setGlassTheme, isThemeModalOpen, setIsThemeModalOpen } = useThemeCustomizer();
  const { language, t } = useLanguage();
  const { theme, themeMode, setThemeMode } = useApp();

  if (!isThemeModalOpen) return null;

  const modeOptions: { id: ThemeMode; icon: string; title: string; desc: string }[] = [
    {
      id: 'system',
      icon: '💻',
      title: t('themeSystem'),
      desc: t('themeSystemDesc'),
    },
    {
      id: 'light',
      icon: '☀️',
      title: t('themeLight'),
      desc: t('themeLightDesc'),
    },
    {
      id: 'dark',
      icon: '🌙',
      title: t('themeDark'),
      desc: t('themeDarkDesc'),
    },
  ];

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
          {/* Section 1: Mode Selection (System / Light / Dark) */}
          <div className={styles.sectionTitle}>
            <span>⚙️</span>
            <span>{t('themeMode')}</span>
          </div>

          <div className={styles.modeGrid}>
            {modeOptions.map((opt) => {
              const isActive = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.modeCard} ${isActive ? styles.modeCardActive : ''}`}
                  onClick={() => setThemeMode(opt.id)}
                >
                  <div className={styles.modeIcon}>{opt.icon}</div>
                  <div className={styles.modeContent}>
                    <div className={styles.modeTitleRow}>
                      <span className={styles.modeTitle}>{opt.title}</span>
                      {isActive && <span className={styles.activePill}>✓</span>}
                    </div>
                    <div className={styles.modeDesc}>{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Section 2: Glass Color Accents */}
          <div className={styles.sectionTitle} style={{ marginTop: '16px' }}>
            <span>💎</span>
            <span>{t('themeDark')} - {t('changeTheme')}</span>
          </div>

          <div className={styles.glassList}>
            {GLASS_THEMES.map((gTheme) => {
              const isActive = glassTheme === gTheme.id && theme === 'dark';
              const badgeText = gTheme.badge[language] || gTheme.badge.en;
              const descText = gTheme.desc[language] || gTheme.desc.en;

              return (
                <button
                  key={gTheme.id}
                  type="button"
                  className={`${styles.themeCard} ${isActive ? styles.active : ''}`}
                  onClick={() => {
                    setGlassTheme(gTheme.id);
                    if (themeMode === 'light') {
                      setThemeMode('dark');
                    }
                  }}
                >
                  <div className={styles.themeInfo}>
                    <div className={styles.themeTitleRow}>
                      <span className={styles.themeName}>{gTheme.name}</span>
                      <span className={styles.themeBadge}>{badgeText}</span>
                    </div>
                    <div className={styles.themeDesc}>{descText}</div>
                  </div>

                  <div
                    className={styles.previewCircle}
                    style={{
                      backgroundColor: gTheme.previewBg,
                      borderColor: gTheme.previewBorder,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
