'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TodoItem } from './TodoItem';
import { TodoForm } from './TodoForm';
import { ViewControls } from './ViewControls';
import { KanbanBoard } from '@/components/Kanban';
import { Button } from '@/components/ui/Button';
import { Todo, ViewPreferences } from '@/types';
import styles from './TodoList.module.css';

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'date' | 'priority' | 'alphabetical';
type GroupByType = ViewPreferences['groupBy'];

interface TodoGroup {
  key: string;
  label: string;
  color?: string;
  icon?: string;
  todos: Todo[];
}

const NO_PROJECT_KEY = '__no-project__';
const NO_DATE_KEY = '__no-date__';
const PRIORITY_ORDER: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABELS: Record<Todo['priority'], string> = {
  high: '🔴 High Priority',
  medium: '🟡 Medium Priority',
  low: '🟢 Low Priority',
};

export const TodoList: React.FC = () => {
  const { todos, projects, viewPreferences, updateViewPreferences, selectedProjectId, setSelectedProjectId } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date');
  const [showForm, setShowForm] = useState(false);

  const filteredTodos = todos.filter((todo) => {
    if (selectedProjectId && todo.projectId !== selectedProjectId) return false;
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sort === 'priority') {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    if (sort === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  const groupBy: GroupByType = viewPreferences.groupBy ?? 'none';

  const groups: TodoGroup[] | null = (() => {
    if (groupBy === 'none') return null;

    if (groupBy === 'project') {
      const byProject = new Map<string, TodoGroup>();
      for (const project of projects) {
        byProject.set(project.id, {
          key: project.id,
          label: project.name,
          color: project.color,
          icon: project.icon,
          todos: [],
        });
      }
      const noProject: TodoGroup = { key: NO_PROJECT_KEY, label: 'No Project', todos: [] };

      for (const todo of sortedTodos) {
        if (todo.projectId && byProject.has(todo.projectId)) {
          byProject.get(todo.projectId)!.todos.push(todo);
        } else {
          noProject.todos.push(todo);
        }
      }

      return [...byProject.values(), noProject].filter((g) => g.todos.length > 0);
    }

    if (groupBy === 'priority') {
      const byPriority = new Map<Todo['priority'], TodoGroup>();
      (['high', 'medium', 'low'] as const).forEach((p) => {
        byPriority.set(p, { key: p, label: PRIORITY_LABELS[p], todos: [] });
      });
      for (const todo of sortedTodos) {
        byPriority.get(todo.priority)?.todos.push(todo);
      }
      return [...byPriority.values()].filter((g) => g.todos.length > 0);
    }

    if (groupBy === 'date') {
      const byDate = new Map<string, TodoGroup>();
      const noDate: TodoGroup = { key: NO_DATE_KEY, label: 'No Due Date', todos: [] };

      for (const todo of sortedTodos) {
        if (!todo.dueDate) {
          noDate.todos.push(todo);
          continue;
        }
        const label = new Date(todo.dueDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        if (!byDate.has(label)) {
          byDate.set(label, { key: label, label, todos: [] });
        }
        byDate.get(label)!.todos.push(todo);
      }

      return [...byDate.values(), noDate].filter((g) => g.todos.length > 0);
    }

    return null;
  })();

  const renderTodos = (list: Todo[]) => (
    <div className={viewPreferences.taskView === 'grid' ? styles.grid : styles.list}>
      {list.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );

  return (
    <div className={styles.container} id="tasks-section">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Tasks</h2>
          <p className={styles.subtitle}>
            {stats.active} active, {stats.completed} completed
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          + Add Task
        </Button>
      </div>

      {showForm && (
        <div className="animate-slide-down">
          <TodoForm onClose={() => setShowForm(false)} />
        </div>
      )}

      <ViewControls />

      {selectedProjectId && (
        <div className={styles.projectFilterBanner}>
          <span>
            Showing tasks for:{' '}
            <strong>
              {(() => {
                const p = projects.find((pr) => pr.id === selectedProjectId);
                return p ? `${p.icon ? p.icon + ' ' : ''}${p.name}` : 'Unknown project';
              })()}
            </strong>
          </span>
          <button onClick={() => setSelectedProjectId(null)} title="Clear filter">✕ Clear</button>
        </div>
      )}

      {viewPreferences.taskView === 'kanban' ? (
        <KanbanBoard />
      ) : (
        <>
          <div className={styles.controls}>
            <div className={styles.filters}>
              <button
                className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
            </div>

            <div className={styles.rightControls}>
              <select
                className={styles.sortSelect}
                value={groupBy}
                onChange={(e) =>
                  updateViewPreferences({ groupBy: e.target.value as GroupByType })
                }
                title="Group tasks"
              >
                <option value="none">No Grouping</option>
                <option value="project">Group by Project</option>
                <option value="priority">Group by Priority</option>
                <option value="date">Group by Due Date</option>
              </select>

              <select
                className={styles.sortSelect}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortType)}
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="alphabetical">Sort A-Z</option>
              </select>
            </div>
          </div>

          {sortedTodos.length === 0 ? (
            <div className={styles.empty}>
              <p>No tasks found</p>
              <p className={styles.emptySubtext}>
                {filter !== 'all' ? 'Try changing the filter' : 'Add your first task to get started'}
              </p>
            </div>
          ) : groups ? (
            <div className={styles.groupedList}>
              {groups.map((group) => (
                <div key={group.key} className={styles.group}>
                  <div
                    className={styles.groupHeader}
                    style={{ borderTopColor: group.color || 'var(--color-border)' }}
                  >
                    <h3 className={styles.groupTitle}>
                      {group.icon ? `${group.icon} ` : ''}
                      {group.label}
                    </h3>
                    <span className={styles.groupCount}>{group.todos.length}</span>
                  </div>
                  {renderTodos(group.todos)}
                </div>
              ))}
            </div>
          ) : (
            renderTodos(sortedTodos)
          )}
        </>
      )}
    </div>
  );
};
