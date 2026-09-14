'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { WorldClock } from '@/components/WorldClock';
import { SettingsModal } from '@/components/Settings';
import { LocalTime } from './LocalTime';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { theme, toggleTheme, focusMode, toggleFocusMode } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <div className={styles.left}>
          <h1 className={styles.logo}>
            <img src="/icons/icon-192.png" alt="DNZ Productivity Dashboard logo" className={styles.logoIcon} />
            DNZ Productivity Dashboard
          </h1>
        </div>

        <div className={styles.right}>
          <LocalTime />
          <button
            className={`${styles.themeToggle} ${focusMode ? styles.active : ''}`}
            onClick={toggleFocusMode}
            aria-label="Toggle focus mode"
            title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {focusMode ? '🧘' : '🎯'}
          </button>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            className={styles.themeToggle}
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            title="Settings — backup, import & Google Drive sync"
          >
            ⚙️
          </button>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {!focusMode && (
        <div className={styles.clockSection}>
          <WorldClock />
        </div>
      )}
    </header>
  );
};
