'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Todo, Priority } from '@/types';
import { flattenTaskTree } from '@/lib/taskTree';
import { TaskRow } from './TaskRow';
import styles from './TaskGroup.module.css';

export interface TaskGroupDefaults {
  status?: string;
  projectId?: string;
  sectionId?: string;
  priority?: Priority;
}

export type TaskSortField = 'date' | 'priority' | 'alphabetical' | 'project' | 'status';

interface TaskGroupProps {
  groupKey: string;
  label: string;
  icon?: string;
  color?: string;
  todos: Todo[];
  defaults?: TaskGroupDefaults;
  showHeader?: boolean;
  sortField?: TaskSortField;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (field: TaskSortField) => void;
}

// One ClickUp-style section of the grouped List view: a collapsible colored
// header (pill + count), a shared column header, the group's tasks as flat
// TaskRows (subtasks flattened in-place, see lib/taskTree), and an inline
// "+ Add Task" row that quick-creates directly into this group (status,
// project, section or priority, whichever this group is bucketed by).
export const TaskGroup: React.FC<TaskGroupProps> = ({
  groupKey,
  label,
  icon,
  color,
  todos,
  defaults,
  showHeader = true,
  sortField,
  sortDir = 'asc',
  onSortChange,
}) => {
  const { todos: allTodos, addTodo, kanbanColumns } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flatRows = flattenTaskTree(todos, allTodos, expandedIds);

  const handleAdd = () => {
    if (!newTitle.trim()) {
      setIsAdding(false);
      setNewTitle('');
      return;
    }
    addTodo({
      title: newTitle.trim(),
      priority: defaults?.priority || 'medium',
      status: defaults?.status || kanbanColumns[0]?.id || 'todo',
      projectId: defaults?.projectId,
      sectionId: defaults?.sectionId,
      completed: false,
    });
    setNewTitle('');
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTitle('');
    }
  };

  return (
    <div className={styles.group}>
      {showHeader && (
        <div className={styles.groupHeader}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setIsCollapsed((c) => !c)}
            title={isCollapsed ? 'Expand group' : 'Collapse group'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          <span
            className={styles.pill}
            style={
              color
                ? { color, background: `color-mix(in srgb, ${color} 16%, transparent)` }
                : undefined
            }
          >
            {icon ? `${icon} ` : ''}
            {label}
          </span>
          <span className={styles.count}>{todos.length}</span>
          <div className={styles.headerSpacer} />
          <button
            type="button"
            className={styles.headerAddBtn}
            onClick={() => {
              setIsCollapsed(false);
              setIsAdding(true);
            }}
            title="Add task"
          >
            +
          </button>
        </div>
      )}

      {!isCollapsed && (
        <div className={styles.tableWrap}>
          <div className={styles.columnHeader}>
            {onSortChange ? (
              <>
                <button
                  type="button"
                  className={`${styles.sortableHeader} ${sortField === 'alphabetical' ? styles.sortActive : ''}`}
                  onClick={() => onSortChange('alphabetical')}
                >
                  Name
                  {sortField === 'alphabetical' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.sortableHeader} ${sortField === 'status' ? styles.sortActive : ''}`}
                  onClick={() => onSortChange('status')}
                >
                  Status
                  {sortField === 'status' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.sortableHeader} ${sortField === 'project' ? styles.sortActive : ''}`}
                  onClick={() => onSortChange('project')}
                >
                  Project
                  {sortField === 'project' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.sortableHeader} ${sortField === 'date' ? styles.sortActive : ''}`}
                  onClick={() => onSortChange('date')}
                >
                  Due date
                  {sortField === 'date' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.sortableHeader} ${sortField === 'priority' ? styles.sortActive : ''}`}
                  onClick={() => onSortChange('priority')}
                >
                  Priority
                  {sortField === 'priority' && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
              </>
            ) : (
              <>
                <span>Name</span>
                <span>Status</span>
                <span>Project</span>
                <span>Due date</span>
                <span>Priority</span>
              </>
            )}
            <span />
          </div>

          {flatRows.map((r) => (
            <TaskRow
              key={r.todo.id}
              todo={r.todo}
              depth={r.depth}
              hasChildren={r.hasChildren}
              isExpanded={expandedIds.has(r.todo.id)}
              onToggleExpand={toggleExpand}
            />
          ))}

          {flatRows.length === 0 && !isAdding && (
            <div className={styles.emptyGroup}>No tasks</div>
          )}

          {isAdding ? (
            <div className={styles.addRowForm}>
              <input
                type="text"
                className={styles.addInput}
                placeholder="Task name..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleAddKeyDown}
                autoFocus
              />
              <button type="button" className={styles.addCancelBtn} onClick={() => { setIsAdding(false); setNewTitle(''); }}>
                Cancel
              </button>
              <button type="button" className={styles.addSaveBtn} onClick={handleAdd}>
                Save
              </button>
            </div>
          ) : (
            <button type="button" className={styles.addRow} onClick={() => setIsAdding(true)}>
              + Add Task
            </button>
          )}
        </div>
      )}
    </div>
  );
};
