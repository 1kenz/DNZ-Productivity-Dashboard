'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TaskCard } from './TaskCard';
import { TodoForm } from './TodoForm';
import { ViewControls } from './ViewControls';
import { TaskGroup, TaskGroupDefaults } from './TaskGroup';
import { KanbanBoard } from '@/components/Kanban';
import { SectionManager } from '@/components/Sections';
import { DynamicFocusBar } from '@/components/Tools/DynamicFocusBar';
import { Button } from '@/components/ui/Button';
import { Todo, ViewPreferences, DOMAIN_AREAS, DomainArea } from '@/types';
import { PRIORITY_ORDER, PRIORITY_RANK, PRIORITY_META } from '@/lib/priority';
import styles from './TodoList.module.css';

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'date' | 'priority' | 'alphabetical' | 'project' | 'status';
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
const NO_DOMAIN_KEY = '__no-domain__';

export const TodoList: React.FC = () => {
  const {
    todos,
    projects,
    sections,
    kanbanColumns,
    viewPreferences,
    updateViewPreferences,
    selectedProjectId,
    setSelectedProjectId,
    selectedDomain,
    setSelectedDomain,
  } = useApp();

  const { t } = useLanguage();

  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);

  const filteredTodos = todos.filter((todo) => {
    if (todo.parentTodoId) return false;
    if (selectedProjectId && todo.projectId !== selectedProjectId) return false;

    // Filter by Domain Area if selected
    if (selectedDomain) {
      const project = projects.find((p) => p.id === todo.projectId);
      const itemDomain = todo.domain || project?.domain;
      if (itemDomain !== selectedDomain) return false;
    }

    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    let cmp = 0;
    if (sort === 'priority') {
      cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    } else if (sort === 'alphabetical') {
      cmp = a.title.localeCompare(b.title);
    } else if (sort === 'project') {
      const aName = projects.find((p) => p.id === a.projectId)?.name || '';
      const bName = projects.find((p) => p.id === b.projectId)?.name || '';
      if (aName && !bName) cmp = -1; // tasks with a project come before unassigned ones
      else if (!aName && bName) cmp = 1;
      else cmp = aName.localeCompare(bName);
    } else if (sort === 'status') {
      const aOrder = kanbanColumns.find((c) => c.id === a.status)?.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = kanbanColumns.find((c) => c.id === b.status)?.order ?? Number.MAX_SAFE_INTEGER;
      cmp = aOrder - bOrder;
    } else {
      const aHasDeadline = Boolean(a.deadline);
      const bHasDeadline = Boolean(b.deadline);
      if (aHasDeadline && bHasDeadline) {
        cmp = new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
      } else if (aHasDeadline && !bHasDeadline) {
        cmp = -1; // tasks with explicit deadline come first
      } else if (!aHasDeadline && bHasDeadline) {
        cmp = 1;
      } else {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = aCreated - bCreated;
      }
    }
    if (cmp === 0) {
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      cmp = aCreated - bCreated;
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

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

    if (groupBy === 'domain') {
      const domainMap = new Map<string, TodoGroup>();
      (Object.keys(DOMAIN_AREAS) as DomainArea[]).forEach((d) => {
        const meta = DOMAIN_AREAS[d];
        domainMap.set(d, {
          key: d,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
          todos: [],
        });
      });
      const noDomain: TodoGroup = { key: NO_DOMAIN_KEY, label: t('common.none') || 'General / None', todos: [] };

      for (const todo of sortedTodos) {
        const project = projects.find((p) => p.id === todo.projectId);
        const d = todo.domain || project?.domain;
        if (d && domainMap.has(d)) {
          domainMap.get(d)!.todos.push(todo);
        } else {
          noDomain.todos.push(todo);
        }
      }

      return [...domainMap.values(), noDomain].filter((g) => g.todos.length > 0);
    }

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
      const noProject: TodoGroup = { key: NO_PROJECT_KEY, label: t('projects.allProjects') || 'No Project', todos: [] };

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
      const bySection = new Map<string, TodoGroup>();
      for (const section of sections) {
        bySection.set(section.id, {
          key: section.id,
          label: section.name,
          color: section.color,
          icon: section.icon,
          todos: [],
        });
      }
      const noSection: TodoGroup = { key: NO_SECTION_KEY, label: t('tasks.sections') || 'No Section', todos: [] };

      for (const todo of sortedTodos) {
        if (todo.sectionId && bySection.has(todo.sectionId)) {
          bySection.get(todo.sectionId)!.todos.push(todo);
        } else {
          noSection.todos.push(todo);
        }
      }

      return [...bySection.values(), noSection].filter((g) => g.todos.length > 0);
    }

    if (groupBy === 'status') {
      const byStatus = new Map<string, TodoGroup>();
      for (const col of kanbanColumns) {
        byStatus.set(col.id, {
          key: col.id,
          label: col.name,
          color: col.color,
          todos: [],
        });
      }
      const noStatus: TodoGroup = { key: NO_STATUS_KEY, label: t('tasks.status') || 'No Status', todos: [] };

      for (const todo of sortedTodos) {
        if (todo.status && byStatus.has(todo.status)) {
          byStatus.get(todo.status)!.todos.push(todo);
        } else {
          noStatus.todos.push(todo);
        }
      }

      return [...byStatus.values(), noStatus].filter((g) => g.todos.length > 0);
    }

    if (groupBy === 'date') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

      const buckets: Record<string, { label: string; color: string; todos: Todo[] }> = {
        overdue: { label: t('tasks.overdue') || 'Overdue', color: 'var(--color-error)', todos: [] },
        today: { label: t('tasks.today') || 'Today', color: 'var(--color-primary)', todos: [] },
        tomorrow: { label: t('tasks.tomorrow') || 'Tomorrow', color: 'var(--color-warning)', todos: [] },
        thisWeek: { label: t('tasks.thisWeek') || 'This Week', color: 'var(--color-info, #06b6d4)', todos: [] },
        later: { label: t('tasks.later') || 'Later', color: 'var(--color-text-secondary)', todos: [] },
        noDate: { label: t('tasks.noDate') || 'No Date', color: 'var(--color-text-tertiary)', todos: [] },
      };

      for (const todo of sortedTodos) {
        if (!todo.deadline) {
          buckets.noDate.todos.push(todo);
          continue;
        }
        const d = new Date(todo.deadline);
        d.setHours(0, 0, 0, 0);
        if (d < today) {
          buckets.overdue.todos.push(todo);
        } else if (d.getTime() === today.getTime()) {
          buckets.today.todos.push(todo);
        } else if (d.getTime() === tomorrow.getTime()) {
          buckets.tomorrow.todos.push(todo);
        } else if (d <= endOfWeek) {
          buckets.thisWeek.todos.push(todo);
        } else {
          buckets.later.todos.push(todo);
        }
      }

      return Object.entries(buckets)
        .filter(([, b]) => b.todos.length > 0)
        .map(([key, b]) => ({
          key,
          label: b.label,
          color: b.color,
          todos: b.todos,
        }));
    }

    if (groupBy === 'priority') {
      const byPriority = new Map<Todo['priority'], TodoGroup>();
      for (const p of PRIORITY_ORDER) {
        const meta = PRIORITY_META[p];
        byPriority.set(p, {
          key: p,
          label: meta.label,
          color: meta.color,
          todos: [],
        });
      }

      for (const todo of sortedTodos) {
        const g = byPriority.get(todo.priority);
        if (g) g.todos.push(todo);
      }

      return [...byPriority.values()].filter((g) => g.todos.length > 0);
    }

    return null;
  })();

  const defaultsForGroup = (group: TodoGroup): TaskGroupDefaults => {
    if (groupBy === 'project' && group.key !== NO_PROJECT_KEY) {
      return { projectId: group.key };
    }
    if (groupBy === 'section' && group.key !== NO_SECTION_KEY) {
      return { sectionId: group.key, projectId: selectedProjectId || undefined };
    }
    if (groupBy === 'status' && group.key !== NO_STATUS_KEY) {
      return { status: group.key, projectId: selectedProjectId || undefined };
    }
    if (groupBy === 'priority') {
      return { priority: group.key as Todo['priority'] };
    }
    return { projectId: selectedProjectId || undefined };
  };

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
            <h2 className={styles.title}>{t('nav.tasks')}</h2>
            <ViewControls />
          </div>
          <p className={styles.subtitle}>
            {stats.active} {t('tasks.active')}, {stats.completed} {t('tasks.completed')}
          </p>
        </div>

        {/* Dynamic Focus Bar (Pomodoro & Quick Notes only - per image 5) */}
        <div className={styles.headerActions}>
          <DynamicFocusBar />

          <Button onClick={() => setShowForm(!showForm)} size="sm">
            + {t('tasks.addTask')}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="animate-slide-down">
          <TodoForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {selectedProjectId && (
        <div className={styles.projectFilterBanner}>
          <span>
            {t('nav.projects')}:{' '}
            <strong>
              {(() => {
                const p = projects.find((pr) => pr.id === selectedProjectId);
                return p ? `${p.icon ? p.icon + ' ' : ''}${p.name}` : 'Project';
              })()}
            </strong>
          </span>
          <button onClick={() => setSelectedProjectId(null)} title={t('common.clear')}>
            ✕ {t('common.clear')}
          </button>
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
                {t('common.all')}
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
                onClick={() => setFilter('active')}
              >
                {t('tasks.active')}
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
                onClick={() => setFilter('completed')}
              >
                {t('tasks.completed')}
              </button>
            </div>

            <div className={styles.rightControls}>
              <select
                className={styles.sortSelect}
                value={groupBy}
                onChange={(e) =>
                  updateViewPreferences({ groupBy: e.target.value as GroupByType })
                }
                title={t('tasks.groupBy') || 'Group Tasks'}
              >
                <option value="none">{t('tasks.groupBy') || 'No Grouping'}</option>
                <option value="domain">{t('domains.title') || 'Domain Area'}</option>
                <option value="status">{t('tasks.status') || 'Status'}</option>
                <option value="project">{t('nav.projects') || 'Project'}</option>
                <option value="section">{t('tasks.sections') || 'Section'}</option>
                <option value="priority">{t('tasks.priority') || 'Priority'}</option>
                <option value="date">{t('tasks.deadline') || 'Deadline'}</option>
              </select>

              <select
                className={styles.sortSelect}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortType);
                  setSortDir('asc');
                }}
              >
                <option value="date">{t('tasks.deadline')}</option>
                <option value="priority">{t('tasks.priority')}</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>
          </div>

          {sortedTodos.length === 0 ? (
            <div className={styles.empty}>
              <p>{t('tasks.noTasks') || 'No tasks found'}</p>
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
                  label={t('nav.tasks')}
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
