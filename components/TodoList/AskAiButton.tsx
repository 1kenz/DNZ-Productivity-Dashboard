'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiAssistantTabIcon } from '@/components/ui/TabIcons';
import styles from './AskAiButton.module.css';

interface AskAiButtonProps {
  taskTitle: string;
  /** Small icon-only variant for tight row layouts (TaskRow's list view).
   * TaskDetailModal uses the full labeled version. */
  compact?: boolean;
}

// "Ask AI" -- lets a task hand itself off to the AI Assistant: pick
// text or voice, and AppContext.pendingAiRequest carries the task's title
// across to AiChatView (see page.tsx's effect on that field), which either
// sends it as a chat message or opens Live Voice with it as the opener.
export const AskAiButton: React.FC<AskAiButtonProps> = ({ taskTitle, compact }) => {
  const { setPendingAiRequest } = useApp();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const choose = (mode: 'text' | 'voice') => {
    setPendingAiRequest({ mode, taskTitle });
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={compact ? styles.iconBtn : styles.fullBtn}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        title={t('tasks.askAi') || 'Ask AI'}
      >
        <AiAssistantTabIcon size={compact ? 16 : 14} className={styles.robotIcon} />
        {!compact && <span>{t('tasks.askAi') || 'Ask AI'}</span>}
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <button type="button" className={styles.popoverOption} onClick={() => choose('text')}>
            💬 {t('tasks.askAiText') || 'Yazılı'}
          </button>
          <button type="button" className={styles.popoverOption} onClick={() => choose('voice')}>
            🎙️ {t('tasks.askAiVoice') || 'Sesli'}
          </button>
        </div>
      )}
    </div>
  );
};
