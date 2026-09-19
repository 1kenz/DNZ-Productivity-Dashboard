'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRIORITY_META } from '@/lib/priority';
import { DueRangeFilterKey, daysUntil, filterDueTodosByRange } from '@/lib/dueDates';
import { Todo } from '@/types';
import { TaskDetailDrawer } from './TaskDetailModal';
import styles from './DueDatesPanel.module.css';

interface DueDatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
}

const NEXT_DAYS_OPTIONS = [30, 60, 90];

/**
 * Content shared by the once-a-day auto-opened Due Dates modal and the
 * on-demand "Due Dates" button in the Header -- see DueDatesController.
 * Shows every task with a deadline as a single flat, deadline-ascending
 * list, narrowed by a pill filter bar (All / Today / This Week / a
 * "Next N Days" range that opens a dropdown for 30/60/90 or a custom
 * date range) -- unlike the Header/StatsCard "due soon" badges, which
 * stay narrowly focused on what's actually urgent (see lib/dueDates.ts).
 */
export const DueDatesPanel: React.FC<DueDatesPanelProps> = ({ isOpen, onClose, todos }) => {
  const { projects, toggleTodo } = useApp();
  const { t } = useLanguage();
  const [filterKey, setFilterKey] = useState<DueRangeFilterKey>('nextDays');
  const [nextDaysValue, setNextDaysValue] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const rangeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rangeMenuRef.current && !rangeMenuRef.current.contains(e.target as Node)) {
        setIsRangeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = useMemo(
    () =>
      filterDueTodosByRange(todos, {
        key: filterKey,
        nextDaysValue,
        customFrom: customFrom || undefined,
        customTo: customTo || undefined,
      }),
    [todos, filterKey, nextDaysValue, customFrom, customTo]
  );

  const isCustomActive = filterKey === 'custom' && Boolean(customFrom && customTo);
  const isRangePillActive = filterKey === 'nextDays' || filterKey === 'custom';

  const rangeButtonLabel = isCustomActive
    ? `${new Date(`${customFrom}T00:00:00`).toLocaleDateString()} – ${new Date(`${customTo}T00:00:00`).toLocaleDateString()}`
    : t('dueDates.filterNextDays', { days: String(nextDaysValue) }) || `Next ${nextDaysValue} Days`;

  const selectPreset = (key: DueRangeFilterKey) => {
    setFilterKey(key);
    setIsRangeMenuOpen(false);
  };

  const selectNextDays = (days: number) => {
    setNextDaysValue(days);
    setFilterKey('nextDays');
    setIsRangeMenuOpen(false);
  };

  const handleCustomFromChange = (value: string) => {
    setCustomFrom(value);
    if (value && customTo) setFilterKey('custom');
  };

  const handleCustomToChange = (value: string) => {
    setCustomTo(value);
    if (customFrom && value) setFilterKey('custom');
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
        <div className={styles.filterBar}>
          <button
            type="button"
            className={`${styles.presetBtn} ${filterKey === 'all' ? styles.active : ''}`}
            onClick={() => selectPreset('all')}
          >
            {t('dueDates.filterAll') || 'All'}
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${filterKey === 'today' ? styles.active : ''}`}
            onClick={() => selectPreset('today')}
          >
            {t('dueDates.filterToday') || 'Today'}
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${filterKey === 'thisWeek' ? styles.active : ''}`}
            onClick={() => selectPreset('thisWeek')}
          >
            {t('dueDates.thisWeekGroup') || 'This Week'}
          </button>
          <div className={styles.rangeDropdown} ref={rangeMenuRef}>
            <button
              type="button"
              className={`${styles.presetBtn} ${styles.rangeBtn} ${isRangePillActive ? styles.active : ''}`}
              onClick={() => setIsRangeMenuOpen((prev) => !prev)}
              aria-expanded={isRangeMenuOpen}
            >
              <span className={styles.rangeBtnLabel}>{rangeButtonLabel}</span>
              <span className={styles.rangeCaret}>{isRangeMenuOpen ? '▲' : '▼'}</span>
            </button>
            {isRangeMenuOpen && (
              <div className={styles.rangeMenu}>
                {NEXT_DAYS_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={`${styles.rangeMenuItem} ${
                      filterKey === 'nextDays' && nextDaysValue === days ? styles.rangeMenuItemActive : ''
                    }`}
                    onClick={() => selectNextDays(days)}
                  >
                    {t('dueDates.filterNextDays', { days: String(days) }) || `Next ${days} Days`}
                  </button>
                ))}
                <div className={styles.rangeMenuDivider} />
                <div className={styles.rangeMenuCustom}>
                  <span className={styles.rangeMenuCustomLabel}>{t('dueDates.customRange') || 'Custom range'}</span>
                  <div className={styles.customDates}>
                    <label className={styles.dateLabel}>
                      {t('dueDates.from') || 'From'}
                      <input
                        type="date"
                        className={styles.dateInput}
                        value={customFrom}
                        max={customTo || undefined}
                        onChange={(e) => handleCustomFromChange(e.target.value)}
                      />
                    </label>
                    <label className={styles.dateLabel}>
                      {t('dueDates.to') || 'To'}
                      <input
                        type="date"
                        className={styles.dateInput}
                        value={customTo}
                        min={customFrom || undefined}
                        onChange={(e) => handleCustomToChange(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🎉</span>
            <span>{t('dueDates.empty') || "You're all caught up -- nothing due soon."}</span>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.flatList}>{items.map(renderRow)}</div>
          </div>
        )}
      </Modal>

      {selectedTodo && (
        <TaskDetailDrawer todo={selectedTodo} isOpen={Boolean(selectedTodo)} onClose={() => setSelectedTodo(null)} />
      )}
    </>
  );
};
