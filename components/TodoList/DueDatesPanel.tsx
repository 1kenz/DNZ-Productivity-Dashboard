'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRIORITY_META } from '@/lib/priority';
import { DueSegmentKey, DueTodoSegments, daysUntil, getDueTodoSegments } from '@/lib/dueDates';
import { Todo } from '@/types';
import { TaskDetailDrawer } from './TaskDetailModal';
import styles from './DueDatesPanel.module.css';

interface DueDatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
}

const SEGMENT_ORDER: { key: DueSegmentKey; icon: string; labelKey: string }[] = [
  { key: 'overdue', icon: '⚠️', labelKey: 'dueDates.overdueGroup' },
  { key: 'today', icon: '📅', labelKey: 'dueDates.todayGroup' },
  { key: 'thisWeek', icon: '🔔', labelKey: 'dueDates.thisWeekGroup' },
  { key: 'thisMonth', icon: '🗓️', labelKey: 'dueDates.thisMonthGroup' },
  { key: 'next3Months', icon: '📆', labelKey: 'dueDates.next3MonthsGroup' },
  { key: 'next6Months', icon: '📆', labelKey: 'dueDates.next6MonthsGroup' },
  { key: 'thisYear', icon: '📆', labelKey: 'dueDates.thisYearGroup' },
  { key: 'later', icon: '📌', labelKey: 'dueDates.laterGroup' },
];

/**
 * Content shared by the once-a-day auto-opened Due Dates modal and the
 * on-demand "Due Dates" button in the Header -- see DueDatesController.
 * Shows every task with a deadline, grouped into collapsible time-horizon
 * sections (Today / This Week / This Month / next 3-6 months / This Year /
 * Later) -- unlike the Header/StatsCard "due soon" badges, which stay
 * narrowly focused on what's actually urgent (see lib/dueDates.ts).
 */
export const DueDatesPanel: React.FC<DueDatesPanelProps> = ({ isOpen, onClose, todos }) => {
  const { projects, toggleTodo } = useApp();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState<Set<DueSegmentKey>>(new Set()); // empty = all expanded by default
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  const segments: DueTodoSegments = useMemo(() => getDueTodoSegments(todos), [todos]);

  const toggleSegment = (key: DueSegmentKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderRow = (todo: Todo) => {
    const project = projects.find((p) => p.id === todo.projectId);
    const priorityMeta = PRIORITY_META[todo.priority];
    const diff = todo.deadline ? daysUntil(todo.deadline) : 0;
    const dateLabel = todo.deadline ? new Date(todo.deadline).toLocaleDateString() : '';

    return (
      <div
        key={todo.id}
        className={styles.row}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedTodo(todo)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedTodo(todo);
          }
        }}
      >
        <button
          type="button"
          className={styles.checkbox}
          onClick={(e) => {
            e.stopPropagation();
            toggleTodo(todo.id);
          }}
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
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('dueDates.title') || 'Due Dates'} size="md">
        {segments.total === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🎉</span>
            <span>{t('dueDates.empty') || "You're all caught up -- nothing due soon."}</span>
          </div>
        ) : (
          <div className={styles.body}>
            {SEGMENT_ORDER.map(({ key, icon, labelKey }) => {
              const items = segments[key];
              if (items.length === 0) return null;
              const isCollapsed = collapsed.has(key);
              return (
                <section key={key} className={styles.group}>
                  <button
                    type="button"
                    className={styles.groupHeader}
                    onClick={() => toggleSegment(key)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}>▶</span>
                    <h3 className={styles.groupTitle}>
                      {icon} {t(labelKey)} ({items.length})
                    </h3>
                  </button>
                  {!isCollapsed && <div className={styles.groupBody}>{items.map(renderRow)}</div>}
                </section>
              );
            })}
          </div>
        )}
      </Modal>

      {selectedTodo && (
        <TaskDetailDrawer todo={selectedTodo} isOpen={Boolean(selectedTodo)} onClose={() => setSelectedTodo(null)} />
      )}
    </>
  );
};
