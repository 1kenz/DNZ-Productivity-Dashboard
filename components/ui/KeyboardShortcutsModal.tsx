'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './KeyboardShortcutsModal.module.css';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setIsShortcutsOpen } = useApp();
  const { t } = useLanguage();

  if (!isShortcutsOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setIsShortcutsOpen(false)}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span>⌨️</span>
            <span>{t('shortcuts.title')}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsShortcutsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.groupTitle}>{t('shortcuts.general')}</div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.openPalette')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>⌘</kbd>
              <kbd className={styles.key}>K</kbd>
            </div>
          </div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.openNotes')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>⌘</kbd>
              <kbd className={styles.key}>J</kbd>
            </div>
          </div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.showGuide')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>?</kbd>
            </div>
          </div>

          <div className={styles.groupTitle}>{t('shortcuts.tasksFocus')}</div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.editTask')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>{t('shortcuts.doubleClick')}</kbd>
            </div>
          </div>
          <div className={styles.shortcutRow}>
            <span>{t('palette.toggleFocus')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>⌘</kbd>
              <kbd className={styles.key}>⇧</kbd>
              <kbd className={styles.key}>F</kbd>
            </div>
          </div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.saveClose')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>Enter</kbd>
              <kbd className={styles.key}>Esc</kbd>
            </div>
          </div>

          <div className={styles.groupTitle}>{t('shortcuts.aiVoice')}</div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.sendMessage')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>Enter</kbd>
            </div>
          </div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.newLine')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>Shift</kbd>
              <kbd className={styles.key}>Enter</kbd>
            </div>
          </div>
          <div className={styles.shortcutRow}>
            <span>{t('shortcuts.toggleVoiceDebug')}</span>
            <div className={styles.keys}>
              <kbd className={styles.key}>Cmd/Ctrl</kbd>
              <kbd className={styles.key}>Shift</kbd>
              <kbd className={styles.key}>D</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
