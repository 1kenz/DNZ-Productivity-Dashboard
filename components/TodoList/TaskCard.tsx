'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Todo } from '@/types';
import { PRIORITY_META } from '@/lib/priority';
import { flattenTaskTree } from '@/lib/taskTree';
import { TaskDetailDrawer } from './TaskDetailModal';
import styles from './TaskCard.module.css';

interface SubtaskTreeRowProps {
  todo: Todo;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onOpen: (todo: Todo) => void;
}

// One row of a card's inline subtask disclosure -- flattened via the same
// lib/taskTree helper the List view uses, so nesting any number of levels
// deep works the same way here as everywhere else. A node with children
// gets its own expand arrow + icon; a leaf is just indented plain text.
const SubtaskTreeRow: React.FC<SubtaskTreeRowProps> = ({ todo, depth, hasChildren, isExpanded, onToggle, onOpen }) => (
  <div className={styles.subtaskTreeRow} style={{ paddingLeft: depth * 16 }}>
    <span className={styles.subtaskTreeArrowSlot}>
      {hasChildren && (
        <button
          type="button"
          className={styles.subtaskTreeArrow}
          onClick={(e) => { e.stopPropagation(); onToggle(todo.id); }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      )}
    </span>
    {hasChildren && <span className={styles.subtaskTreeIcon}>🧩</span>}
    <button
      type="button"
      className={styles.subtaskTreeTitle}
      onClick={(e) => { e.stopPropagation(); onOpen(todo); }}
    >
      {todo.title}
    </button>
  </div>
);

export interface TaskCardProps {
  todo: Todo;
  /** 'large' is used by the Grid view; Kanban stays 'compact'. */
  size?: 'compact' | 'large';
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  /** Override the click behavior (Kanban uses this to skip opening right
   * after a drag). Defaults to opening this card's own detail drawer. */
  onClick?: () => void;
}

// The ClickUp-style card shared by the Kanban board and the Grid view:
// title, project tag, a date/priority icon row, and an inline subtask
// disclosure that flattens the task's subtree in place. Kanban renders it
// small and in status columns; Grid renders it large in a wrapping grid.
export const TaskCard: React.FC<TaskCardProps> = ({ todo, size = 'compact', draggable, onDragStart, onDragEnd, onClick }) => {
  const { todos, projects } = useApp();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openSubtask, setOpenSubtask] = useState<Todo | null>(null);

  const subtaskCountOf = (id: string) => todos.filter((t) => t.parentTodoId === id).length;
  const project = projects.find((p) => p.id === todo.projectId);
  const taskSubtaskCount = subtaskCountOf(todo.id);
  const isOverdue = Boolean(todo.deadline) && !todo.completed && new Date(todo.deadline as Date) < new Date(new Date().toDateString());
  const priorityMeta = PRIORITY_META[todo.priority];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div
        className={`${styles.card} ${size === 'large' ? styles.large : ''}`}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={() => (onClick ? onClick() : setIsDetailOpen(true))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick ? onClick() : setIsDetailOpen(true);
          }
        }}
      >
        <div className={styles.title}>{todo.title}</div>

        {project && (
          <span className={styles.projectTag} style={{ color: project.color }}>
            {project.icon} {project.name}
          </span>
        )}

        <div className={styles.iconRow}>
          <span className={`${styles.iconChip} ${todo.deadline ? styles.iconChipFilled : ''} ${isOverdue ? styles.iconChipOverdue : ''}`}>
            {todo.deadline ? `📅 ${new Date(todo.deadline).toLocaleDateString()}` : '📅'}
          </span>
          <span className={`${styles.iconChip} ${styles.iconChipFilled}`} style={{ color: priorityMeta.color }} title={priorityMeta.label}>
            🚩 {priorityMeta.shortLabel}
          </span>
        </div>

        {taskSubtaskCount > 0 && (
          <div className={styles.subtaskSection}>
            <button
              type="button"
              className={styles.subtaskToggle}
              onClick={(e) => { e.stopPropagation(); toggleExpand(todo.id); }}
            >
              <span className={styles.subtaskArrow}>{expandedIds.has(todo.id) ? '▼' : '▶'}</span>
              {taskSubtaskCount} subtask{taskSubtaskCount === 1 ? '' : 's'}
            </button>
            {expandedIds.has(todo.id) && (
              <div className={styles.subtaskTree} onClick={(e) => e.stopPropagation()}>
                {flattenTaskTree(
                  todos.filter((t) => t.parentTodoId === todo.id),
                  todos,
                  expandedIds
                ).map((r) => (
                  <SubtaskTreeRow
                    key={r.todo.id}
                    todo={r.todo}
                    depth={r.depth}
                    hasChildren={r.hasChildren}
                    isExpanded={expandedIds.has(r.todo.id)}
                    onToggle={toggleExpand}
                    onOpen={setOpenSubtask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!onClick && <TaskDetailDrawer todo={todo} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />}
      {openSubtask && (
        <TaskDetailDrawer todo={openSubtask} isOpen={true} onClose={() => setOpenSubtask(null)} />
      )}
    </>
  );
};
