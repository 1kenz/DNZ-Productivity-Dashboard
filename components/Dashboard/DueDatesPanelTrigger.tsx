'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDueTodoGroups } from '@/lib/dueDates';
import { Todo } from '@/types';
import styles from './Header.module.css';

interface DueDatesPanelTriggerProps {
  todos: Todo[];
  onOpen: () => void;
}

/**
 * Header icon button for the Due Dates panel. Doubles as the persistent,
 * always-visible half of the in-app due-date warning system -- the modal
 * (see DueDatesController) only auto-opens once a day, but this badge stays
 * up the whole time there's something overdue or coming up soon.
 */
export const DueDatesPanelTrigger: React.FC<DueDatesPanelTriggerProps> = ({ todos, onOpen }) => {
  const { t } = useLanguage();
  const groups = getDueTodoGroups(todos);
  const hasOverdue = groups.overdue.length > 0;

  return (
    <button
      type="button"
      className={`${styles.actionBtn} ${hasOverdue ? styles.dueBtnOverdue : ''}`}
      onClick={onOpen}
      aria-label={t('dueDates.title') || 'Due Dates'}
      title={t('dueDates.title') || 'Due Dates'}
    >
      📅
      {groups.total > 0 && (
        <span className={`${styles.dueBadge} ${hasOverdue ? styles.dueBadgeOverdue : ''}`}>
          {groups.total > 9 ? '9+' : groups.total}
        </span>
      )}
    </button>
  );
};
