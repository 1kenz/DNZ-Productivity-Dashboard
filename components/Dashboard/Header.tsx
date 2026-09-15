'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFocus } from '@/contexts/FocusContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeCustomizer } from '@/contexts/ThemeCustomizerContext';
import { WorldClock } from '@/components/WorldClock';
import { SettingsModal } from '@/components/Settings';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { LocalTime } from './LocalTime';
import { Language } from '@/types';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { theme, toggleTheme, focusLevel, toggleFocusMode, setIsCommandPaletteOpen, setIsShortcutsOpen, todos, projects } = useApp();
  const { isTimeTracking, trackingElapsedTime, trackingTaskId, trackingProjectId, stopTracking, formatTime } = useFocus();
  const { language, setLanguage, t } = useLanguage();
  const { setIsThemeModalOpen } = useThemeCustomizer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeTask = todos.find((t) => t.id === trackingTaskId);
  const activeProject = projects.find((p) => p.id === trackingProjectId);

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <div className={styles.left}>
          <h1 className={styles.logo}>
            <img src="/logo/DNZSecurity150px.png" alt="DNZ Security Logo" className={styles.logoIcon} />
            <span>{t('appName')}</span>
            <span className={styles.versionBadge}>{t('versionBadge')}</span>
          </h1>

          {/* Dynamic Island Live Tracking Indicator in Header */}
          {isTimeTracking && (
            <div className={styles.headerLiveTracking}>
              <span className={styles.pulseDot} />
              <span className={styles.liveTaskName}>
                {activeTask ? `🎯 ${activeTask.title}` : activeProject ? `📁 ${activeProject.name}` : t('timeTracker')}
              </span>
              <span className={styles.liveTimerText}>
                {formatTime(trackingElapsedTime)}
              </span>
              <button
                type="button"
                className={styles.headerStopBtn}
                onClick={stopTracking}
                title={t('stopTimer')}
              >
                ⏹️
              </button>
            </div>
          )}
        </div>

        <div className={styles.right}>
          <LocalTime />

          {/* High-Contrast Command Search Button */}
          <button
            type="button"
            className={styles.commandBarBtn}
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Command Palette"
            title={t('searchPlaceholder')}
          >
            <span className={styles.commandBadge}>⌘K</span>
            <span>{t('searchButton')}</span>
          </button>

          {/* Language Switcher (EN, TR, DE) */}
          <div className={styles.langSelector}>
            {(['en', 'tr', 'de'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`${styles.langBtn} ${language === lang ? styles.active : ''}`}
                onClick={() => setLanguage(lang)}
                title={`Switch language to ${lang.toUpperCase()}`}
              >
                {lang === 'en' ? '🇬🇧 EN' : lang === 'tr' ? '🇹🇷 TR' : '🇩🇪 DE'}
              </button>
            ))}
          </div>

          {/* 3-Stage Progressive Focus Mode Toggle */}
          <button
            className={`${styles.actionBtn} ${focusLevel === 'deep' ? styles.active : focusLevel === 'semi' ? styles.activeSemi : ''}`}
            onClick={toggleFocusMode}
            aria-label="Toggle progressive focus mode"
            title={
              focusLevel === 'off'
                ? `${t('focusModeNormal')} -> ${t('focusModeSemi')}`
                : focusLevel === 'semi'
                ? `${t('focusModeSemi')} -> ${t('focusModeDeep')}`
                : `${t('focusModeDeep')} -> ${t('focusModeNormal')}`
            }
          >
            {focusLevel === 'deep' ? '🧘' : focusLevel === 'semi' ? '⏱️' : '🎯'}
          </button>

          {/* 5 Glass Themes Modal Trigger */}
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setIsThemeModalOpen(true)}
            aria-label="Glass Design Theme"
            title={t('changeTheme')}
          >
            🎨
          </button>

          {/* Theme Light / Dark */}
          <button
            className={styles.actionBtn}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? t('themeDark') : t('themeLight')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Shortcuts Modal Trigger */}
          <button
            className={styles.actionBtn}
            onClick={() => setIsShortcutsOpen(true)}
            aria-label="Keyboard Shortcuts"
            title={t('shortcutsTitle')}
          >
            ⌨️
          </button>

          {/* Settings */}
          <button
            className={styles.actionBtn}
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            title={t('settingsTitle')}
          >
            ⚙️
          </button>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ThemeSelectorModal />

      {focusLevel === 'off' && (
        <div className={styles.clockSection}>
          <WorldClock />
        </div>
      )}
    </header>
  );
};
