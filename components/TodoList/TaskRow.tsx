'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFocus } from '@/contexts/FocusContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Todo, DOMAIN_AREAS } from '@/types';
import { PRIORITY_ORDER, PRIORITY_META } from '@/lib/priority';
import { TaskDetailDrawer } from './TaskDetailModal';
import styles from './TaskRow.module.css';

interface TaskRowProps {
  todo: Todo;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

const toDateInputValue = (d: Date | string) => new Date(d).toISOString().split('T')[0];

export const TaskRow: React.FC<TaskRowProps> = ({
  todo,
  depth,
  hasChildren,
  isExpanded,
  onToggleExpand,
}) => {
  const { updateTodo, deleteTodo, toggleTodo, projects, todos, kanbanColumns } = useApp();
  const { stopTracking, isTimeTracking, trackingTaskId, startTracking, formatTime, trackingElapsedTime } = useFocus();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDateEditing, setIsDateEditing] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPriorityOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setIsPriorityOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPriorityOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPriorityOpen]);

  const project = projects.find((p) => p.id === todo.projectId);
  const statusColumn = kanbanColumns.find((c) => c.id === todo.status);
  const directChildCount = hasChildren
    ? todos.filter((t) => t.parentTodoId === todo.id).length
    : 0;
  const isOverdue =
    Boolean(todo.deadline) &&
    !todo.completed &&
    new Date(todo.deadline as Date) < new Date(new Date().toDateString());
  const priorityMeta = PRIORITY_META[todo.priority];
  const statusColor = statusColumn?.color || 'var(--color-text-tertiary)';
  const checkboxColor = project?.color || statusColor;

  const domain = todo.domain || project?.domain;
  const domainMeta = domain ? DOMAIN_AREAS[domain] : null;

  const isCurrentTaskTracking = isTimeTracking && trackingTaskId === todo.id;

  const handleSave = () => {
    if (editTitle.trim()) {
      updateTodo(todo.id, { title: editTitle.trim() });
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') {
      setEditTitle(todo.title);
      setIsEditing(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateTodo(todo.id, { deadline: value ? new Date(value) : undefined });
    setIsDateEditing(false);
  };

  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTodo(todo.id, { deadline: undefined });
    setIsDateEditing(false);
  };

  const handlePickPriority = (p: Todo['priority']) => {
    updateTodo(todo.id, { priority: p });
    setIsPriorityOpen(false);
  };

  const handleIncrementCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.targetCount != null) {
      const nextCount = Math.min((todo.currentCount ?? 0) + 1, todo.targetCount);
      updateTodo(todo.id, {
        currentCount: nextCount,
        completed: nextCount >= todo.targetCount ? true : todo.completed,
      });
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = t('tasks.deleteTaskConfirm') || 'Bu görevi silmek istediğinize emin misiniz?';
    const message = todo.title ? `"${todo.title}"\n\n${confirmMsg}` : confirmMsg;
    if (window.confirm(message)) {
      deleteTodo(todo.id);
    }
  };

  return (
    <>
      <div
        id={`task-${todo.id}`}
        className={`${styles.row} ${todo.completed ? styles.completed : ''}`}
      >
        <div className={styles.nameCell} style={{ paddingLeft: depth * 20 }}>
          <span className={styles.expandSlot}>
            {hasChildren && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => onToggleExpand(todo.id)}
                title={isExpanded ? 'Alt görevleri daralt' : 'Alt görevleri genişlet'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
          </span>

          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
            className={styles.checkbox}
            style={{ '--checkbox-color': checkboxColor } as React.CSSProperties}
          />

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={styles.editInput}
              autoFocus
            />
          ) : (
            <button
              type="button"
              className={styles.titleBtn}
              onClick={() => setIsDetailOpen(true)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title={todo.title}
            >
              <span className={styles.title}>{todo.title}</span>
            </button>
          )}

          {todo.description && (
            <span className={styles.descIcon} title="Açıklama içeriyor">
              ≡
            </span>
          )}

          {hasChildren ? (
            <span
              className={styles.subtaskBadge}
              title={`${directChildCount} alt görev`}
            >
              🔗 {directChildCount}
            </span>
          ) : todo.targetCount != null ? (
            <button
              type="button"
              className={styles.subtaskBadge}
              onClick={handleIncrementCount}
              title="Hedefi artırmak için tıkla"
              style={{ cursor: 'pointer' }}
            >
              🎯 {todo.currentCount ?? 0}/{todo.targetCount} {todo.unit || ''}
            </button>
          ) : null}

          {todo.recurringTaskId && (
            <span className={styles.recurringTag} title={t('tasks.recurring') || 'Recurring'}>
              🔁
            </span>
          )}

          {/* Inline Live Time Tracker Button */}
          {isCurrentTaskTracking ? (
            <button
              type="button"
              className={`${styles.inlineTimerBtn} ${styles.active}`}
              onClick={(e) => {
                e.stopPropagation();
                stopTracking();
              }}
              title={t('tools.stopTracking')}
            >
              <span>⏱️</span>
              <span>{formatTime(trackingElapsedTime)}</span>
              <span className={styles.timerStopIcon}>⏸</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.taskPlayBtn}
              onClick={(e) => {
                e.stopPropagation();
                startTracking(todo.projectId || projects[0]?.id || 'default', todo.id);
              }}
              title={`${t('tools.startTracking')} (⏱️)`}
            >
              <span className={styles.playIcon}>▶</span>
            </button>
          )}
        </div>

        <div className={styles.domainCell}>
          {domainMeta && (
            <span
              className={styles.projectTag}
              style={{
                color: domainMeta.color,
                background: `color-mix(in srgb, ${domainMeta.color} 12%, transparent)`,
              }}
              title={`Alan: ${domainMeta.label}`}
            >
              {domainMeta.icon}
            </span>
          )}
          {project && (
            <span className={styles.projectTag} style={{ color: project.color }}>
              {project.icon} {project.name}
            </span>
          )}
        </div>

        <div className={styles.dateCell}>
          {isDateEditing ? (
            <span className={styles.dateEditWrap}>
              <input
                type="date"
                className={styles.dateInput}
                defaultValue={todo.deadline ? toDateInputValue(todo.deadline) : ''}
                onChange={handleDateChange}
                onBlur={() => setIsDateEditing(false)}
                autoFocus
              />
              {todo.deadline && (
                <button
                  type="button"
                  className={styles.dateClearBtn}
                  onMouseDown={handleClearDate}
                  title={t('common.clear') || 'Clear'}
                >
                  ✕
                </button>
              )}
            </span>
          ) : todo.deadline ? (
            <button
              type="button"
              className={`${styles.dateChip} ${isOverdue ? styles.overdue : ''}`}
              onClick={() => setIsDateEditing(true)}
              title={t('tasks.deadline')}
            >
              {isOverdue ? '⚠️' : '📅'} {new Date(todo.deadline).toLocaleDateString()}
            </button>
          ) : (
            <button
              type="button"
              className={styles.dateEmpty}
              onClick={() => setIsDateEditing(true)}
              title={t('tasks.deadline')}
            >
              📅
            </button>
          )}
        </div>

        <div className={styles.priorityCell} ref={priorityRef}>
          <button
            type="button"
            className={styles.priorityChip}
            style={{
              color: priorityMeta.color,
              background: `color-mix(in srgb, ${priorityMeta.color} 15%, transparent)`,
            }}
            title={t('tasks.priority')}
            onClick={() => setIsPriorityOpen((o) => !o)}
          >
            <span
              className={styles.priorityDot}
              style={{ backgroundColor: priorityMeta.color }}
            />
            {priorityMeta.shortLabel}
          </button>

          {isPriorityOpen && (
            <div className={styles.priorityMenu}>
              {PRIORITY_ORDER.map((p) => {
                const meta = PRIORITY_META[p];
                return (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.priorityMenuItem} ${
                      p === todo.priority ? styles.priorityMenuItemActive : ''
                    }`}
                    onClick={() => handlePickPriority(p)}
                  >
                    <span
                      className={styles.priorityMenuDot}
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className={styles.priorityMenuLabel}>{meta.label}</span>
                    {p === todo.priority && (
                      <span className={styles.priorityMenuCheck}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actionsCell}>
          <button
            className={styles.actionBtn}
            onClick={() => setIsEditing(true)}
            title={t('common.edit') || 'Edit'}
          >
            ✏️
          </button>
          <button
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={handleDelete}
            title={t('common.delete') || 'Delete'}
          >
            🗑️
          </button>
        </div>
      </div>

      <TaskDetailDrawer
        todo={todo}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
};
