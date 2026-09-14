'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Todo } from '@/types';
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

// One flat, single-line table row -- the compact ClickUp-style replacement
// for the card-style TodoItem, used only by the grouped List view. Depth is
// expressed as left padding on the Name cell's own content, not on the row
// itself, so Due Date / Priority stay aligned in the same grid columns no
// matter how deep a subtask is nested. Due Date and Priority are editable
// right in the cell -- a native date input for the date, a small popover
// for priority -- so changing either never requires opening the drawer.
export const TaskRow: React.FC<TaskRowProps> = ({ todo, depth, hasChildren, isExpanded, onToggleExpand }) => {
  const { updateTodo, deleteTodo, toggleTodo, projects, todos, kanbanColumns } = useApp();
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
  const directChildCount = hasChildren ? todos.filter((t) => t.parentTodoId === todo.id).length : 0;
  const isOverdue = Boolean(todo.deadline) && !todo.completed && new Date(todo.deadline as Date) < new Date(new Date().toDateString());
  const priorityMeta = PRIORITY_META[todo.priority];
  const statusColor = statusColumn?.color || 'var(--color-text-tertiary)';
  // Ticks are colored by project, not status -- a task's project is its
  // most stable identity in this app (status changes constantly as work
  // moves through columns). Falls back to the status color for tasks that
  // have no project.
  const checkboxColor = project?.color || statusColor;

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

  return (
    <>
      <div className={`${styles.row} ${todo.completed ? styles.completed : ''}`}>
        <div className={styles.nameCell} style={{ paddingLeft: depth * 20 }}>
          <span className={styles.expandSlot}>
            {hasChildren && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => onToggleExpand(todo.id)}
                title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
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

          {project && (
            <span className={styles.projectTag} style={{ color: project.color }}>
              {project.icon} {project.name}
            </span>
          )}
          {todo.description && (
            <span className={styles.descIcon} title="Has a description">≡</span>
          )}
          {hasChildren ? (
            <span className={styles.subtaskBadge} title={`${directChildCount} subtask${directChildCount === 1 ? '' : 's'}`}>
              🔗 {directChildCount}
            </span>
          ) : todo.targetCount != null ? (
            <span className={styles.subtaskBadge} title="Numeric goal progress">
              ✓ {todo.currentCount ?? 0}/{todo.targetCount}
            </span>
          ) : null}
          {todo.recurringTaskId && (
            <span className={styles.recurringTag} title="Generated by a recurring task">🔁</span>
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
                <button type="button" className={styles.dateClearBtn} onMouseDown={handleClearDate} title="Clear due date">
                  ✕
                </button>
              )}
            </span>
          ) : todo.deadline ? (
            <button
              type="button"
              className={`${styles.dateChip} ${isOverdue ? styles.overdue : ''}`}
              onClick={() => setIsDateEditing(true)}
              title="Click to change due date"
            >
              {isOverdue ? '⚠️' : '📅'} {new Date(todo.deadline).toLocaleDateString()}
            </button>
          ) : (
            <button
              type="button"
              className={styles.dateEmpty}
              onClick={() => setIsDateEditing(true)}
              title="Set due date"
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
            title="Click to change priority"
            onClick={() => setIsPriorityOpen((o) => !o)}
          >
            <span className={styles.priorityDot} style={{ backgroundColor: priorityMeta.color }} />
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
                    className={`${styles.priorityMenuItem} ${p === todo.priority ? styles.priorityMenuItemActive : ''}`}
                    onClick={() => handlePickPriority(p)}
                  >
                    <span className={styles.priorityMenuDot} style={{ backgroundColor: meta.color }} />
                    <span className={styles.priorityMenuLabel}>{meta.label}</span>
                    {p === todo.priority && <span className={styles.priorityMenuCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actionsCell}>
          <button className={styles.actionBtn} onClick={() => setIsEditing(true)} title="Edit Inline">✏️</button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => deleteTodo(todo.id)} title="Delete">🗑️</button>
        </div>
      </div>

      <TaskDetailDrawer todo={todo} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
};
