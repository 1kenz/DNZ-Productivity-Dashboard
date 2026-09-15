'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppleNotesIcon } from '@/components/ui/AppleNotesIcon';
import { QuickNotes } from './QuickNotes';
import styles from './QuickNotesPopover.module.css';

export const QuickNotesPopover: React.FC = () => {
  const { isQuickNotesOpen, setIsQuickNotesOpen } = useApp();
  const { t } = useLanguage();

  if (!isQuickNotesOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setIsQuickNotesOpen(false)}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <AppleNotesIcon size={22} />
            <h2 className={styles.title}>{t('quickNotes.title')}</h2>
            <span className={styles.shortcut}>⌘J</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsQuickNotesOpen(false)}
            title={t('common.close')}
          >
            ✕
          </button>
        </div>

        <div className={styles.contentBody}>
          <QuickNotes hideHeader={true} />
        </div>
      </div>
    </div>
  );
};
