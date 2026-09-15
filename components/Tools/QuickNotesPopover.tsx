'use client';

import React, { useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppleNotesIcon } from '@/components/ui/AppleNotesIcon';
import { QuickNotes, QuickNotesHandle } from './QuickNotes';
import styles from './QuickNotesPopover.module.css';

export const QuickNotesPopover: React.FC = () => {
  const { isQuickNotesOpen, setIsQuickNotesOpen } = useApp();
  const { t } = useLanguage();
  const quickNotesRef = useRef<QuickNotesHandle>(null);

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

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.newNoteBtn}
              onClick={() => quickNotesRef.current?.createNewNote()}
              title={t('quickNotes.newNote')}
            >
              <span className={styles.plusIcon}>+</span>
              <span className={styles.newNoteText}>{t('newNote')}</span>
            </button>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsQuickNotesOpen(false)}
              title={t('common.close')}
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.contentBody}>
          <QuickNotes ref={quickNotesRef} hideHeader={true} />
        </div>
      </div>
    </div>
  );
};
