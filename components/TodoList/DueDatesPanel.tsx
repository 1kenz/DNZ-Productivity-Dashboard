'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRIORITY_META } from '@/lib/priority';
import { DueTodoGroups, daysUntil } from '@/lib/dueDates';
import { Todo } from '@/types';
import styles from './DueDatesPanel.module.css';

interface DueDatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: DueTodoGroups;
}

/**
 * Content shared by the once-a-day auto-opened Due Dates modal and the
 * on-demand "Due Dates" button in the Header -- see DueDatesController.
 */
export const DueDatesPanel: React.FC<DueDatesPanelProps> = ({ isOpen, onClose, groups }) => {
  const { projects, toggleTodo } = useApp();
  const { t } = useLanguage();

  const renderRow = (todo: Todo) => {
    const project = projects.find((p) => p.id === todo.projectId);
    const priorityMeta = PRIORITY_META[todo.priority];
    const diff = todo.deadline ? daysUntil(todo.deadline) : 0;
    const dateLabel = todo.deadline ? new Date(todo.deadline).toLocaleDateString() : '';

    return (
      <div key={todo.id} className={styles.row}>
        <button
          type="button"
          className={styles.checkbox}
          onClick={() => toggleTodo(todo.id)}
          aria-label={t('dueDates.markDone') || 'Mark done'}
          title={t('dueDates.markDone') || 'Mark done'}
        />
        <div className={styles.rowMain}>
          <span className={styles.rowTitle}>{todo.title}</span>
          <div className={styles.rowMeta}>
            {project && (
              <span
                className={styles.projectChip}
                style={{
                  color: project.color,
                  background: `color-mix(in srgb, ${project.color} 15%, transparent)`,
                }}
              >
                {project.icon} {project.name}
              </span>
            )}
            <span className={styles.priorityDot} style={{ background: priorityMeta.color }} title={priorityMeta.label} />
          </div>
        </div>
        <span
          className={`${styles.dateBadge} ${diff < 0 ? styles.overdue : diff === 0 ? styles.today : styles.soon}`}
        >
          {diff < 0
            ? t('dueDates.daysOverdue', { count: String(Math.abs(diff)) }) || `${Math.abs(diff)}d overdue`
            : diff === 0
            ? t('dueDates.dueToday') || 'Today'
            : dateLabel}
        </span>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('dueDates.title') || 'Due Dates'} size="md">
      {groups.total === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎉</span>
          <span>{t('dueDates.empty') || "You're all caught up -- nothing due soon."}</span>
        </div>
      ) : (
        <div className={styles.body}>
          {groups.overdue.length > 0 && (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>
                ⚠️ {t('dueDates.overdueGroup') || 'Overdue'} ({groups.overdue.length})
              </h3>
              {groups.overdue.map(renderRow)}
            </section>
          )}
          {groups.today.length > 0 && (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>
                📅 {t('dueDates.todayGroup') || 'Due Today'} ({groups.today.length})
              </h3>
              {groups.today.map(renderRow)}
            </section>
          )}
          {groups.soon.length > 0 && (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>
                🔔 {t('dueDates.soonGroup') || 'Coming Up'} ({groups.soon.length})
              </h3>
              {groups.soon.map(renderRow)}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
};
