'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TaskCard } from './TaskCard';
import { TodoForm } from './TodoForm';
import { ViewControls } from './ViewControls';
import { TaskGroup, TaskGroupDefaults } from './TaskGroup';
import { KanbanBoard } from '@/components/Kanban';
import { SectionManager } from '@/components/Sections';
import { Button } from '@/components/ui/Button';
import { Todo, ViewPreferences } from '@/types';
import { PRIORITY_ORDER, PRIORITY_RANK, PRIORITY_META } from '@/lib/priority';
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
const NO_SECTION_KEY = '__no-section__';
const NO_DATE_KEY = '__no-date__';
const NO_STATUS_KEY = '__no-status__';

export const TodoList: React.FC = () => {
  const { todos, projects, sections, kanbanColumns, viewPreferences, updateViewPreferences, selectedProjectId, setSelectedProjectId } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);

  const filteredTodos = todos.filter((todo) => {
    if (todo.parentTodoId) return false; // subtasks render nested inside their parent, not as top-level items
    if (selectedProjectId && todo.projectId !== selectedProjectId) return false;
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    let cmp: number;
    if (sort === 'priority') {
      cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    } else if (sort === 'alphabetical') {
      cmp = a.title.localeCompare(b.title);
    } else {
      // Due date, ascending -- tasks with no deadline sort to the end.
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      cmp = aTime - bTime;
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Clicking a column header (Name / Due date / Priority) sorts by that
  // field; clicking the same header again flips direction, matching the
  // ClickUp reference. The "Sort by..." dropdown drives the same state.
  const handleSortClick = (field: SortType) => {
    if (sort === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setSortDir('asc');
    }
  };

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

    if (groupBy === 'section') {
      const relevantSections = selectedProjectId
        ? sections.filter((s) => s.projectId === selectedProjectId)
        : sections;
      const bySection = new Map<string, TodoGroup>();
      for (const section of relevantSections) {
        bySection.set(section.id, {
          key: section.id,
          label: section.name,
          color: section.color,
          icon: section.icon,
          todos: [],
        });
      }
      const noSection: TodoGroup = { key: NO_SECTION_KEY, label: 'No Section', todos: [] };

      for (const todo of sortedTodos) {
        if (todo.sectionId && bySection.has(todo.sectionId)) {
          bySection.get(todo.sectionId)!.todos.push(todo);
        } else {
          noSection.todos.push(todo);
        }
      }

      return [...bySection.values(), noSection].filter((g) => g.todos.length > 0);
    }

    if (groupBy === 'priority') {
      const byPriority = new Map<Todo['priority'], TodoGroup>();
      PRIORITY_ORDER.forEach((p) => {
        byPriority.set(p, {
          key: p,
          label: `${PRIORITY_META[p].icon} ${PRIORITY_META[p].label}`,
          color: PRIORITY_META[p].color,
          todos: [],
        });
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

    if (groupBy === 'status') {
      const byStatus = new Map<string, TodoGroup>();
      const sortedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);
      for (const column of sortedColumns) {
        byStatus.set(column.id, { key: column.id, label: column.name, color: column.color, todos: [] });
      }
      const noStatus: TodoGroup = { key: NO_STATUS_KEY, label: 'No Status', todos: [] };

      for (const todo of sortedTodos) {
        if (byStatus.has(todo.status)) {
          byStatus.get(todo.status)!.todos.push(todo);
        } else {
          noStatus.todos.push(todo);
        }
      }

      return [...byStatus.values(), noStatus].filter((g) => g.todos.length > 0);
    }

    return null;
  })();

  // Quick-add presets for each group's inline "+ Add Task" row: a task
  // added inside a status group starts in that status, inside a project
  // group belongs to that project, etc. -- mirrors what the group actually
  // represents instead of always falling back to generic defaults.
  const defaultsForGroup = (group: TodoGroup): TaskGroupDefaults => {
    if (groupBy === 'status' && group.key !== NO_STATUS_KEY) {
      return { status: group.key };
    }
    if (groupBy === 'project' && group.key !== NO_PROJECT_KEY) {
      return { projectId: group.key };
    }
    if (groupBy === 'section' && group.key !== NO_SECTION_KEY) {
      return { sectionId: group.key, projectId: selectedProjectId || undefined };
    }
    if (groupBy === 'priority') {
      return { priority: group.key as Todo['priority'] };
    }
    return { projectId: selectedProjectId || undefined };
  };

  // Grid view only (the List view renders through TaskGroup/TaskRow) --
  // same ClickUp-style card as Kanban, just sized up since it's not
  // squeezed into a narrow column here.
  const renderTodos = (list: Todo[]) => (
    <div className={styles.grid}>
      {list.map((todo) => (
        <TaskCard key={todo.id} todo={todo} size="large" />
      ))}
    </div>
  );

  return (
    <div className={styles.container} id="tasks-section">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Tasks</h2>
            <ViewControls />
          </div>
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

      {selectedProjectId && (
        <div className={styles.sectionManagerWrap}>
          <SectionManager projectId={selectedProjectId} />
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
                <option value="status">Group by Status</option>
                <option value="none">No Grouping</option>
                <option value="project">Group by Project</option>
                <option value="section">Group by Section</option>
                <option value="priority">Group by Priority</option>
                <option value="date">Group by Due Date</option>
              </select>

              <select
                className={styles.sortSelect}
                value={sort}
                onChange={(e) => { setSort(e.target.value as SortType); setSortDir('asc'); }}
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
          ) : viewPreferences.taskView === 'grid' ? (
            groups ? (
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
            )
          ) : (
            // Compact ClickUp-style grouped table for the List view.
            <div className={styles.taskTableList}>
              {groups ? (
                groups.map((group) => (
                  <TaskGroup
                    key={group.key}
                    groupKey={group.key}
                    label={group.label}
                    icon={group.icon}
                    color={group.color}
                    todos={group.todos}
                    defaults={defaultsForGroup(group)}
                    sortField={sort}
                    sortDir={sortDir}
                    onSortChange={handleSortClick}
                  />
                ))
              ) : (
                <TaskGroup
                  groupKey="all"
                  label="Tasks"
                  todos={sortedTodos}
                  showHeader={false}
                  defaults={{ projectId: selectedProjectId || undefined }}
                  sortField={sort}
                  sortDir={sortDir}
                  onSortChange={handleSortClick}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
