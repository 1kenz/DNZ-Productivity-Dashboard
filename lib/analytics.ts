// Pure, derived aggregation helpers for the Analytics view. Nothing here is
// stored -- every chart recomputes from the live todos/timeEntries/projects
// already held in AppContext, same philosophy as lib/progress.ts.

import { Todo, TimeEntry, Project, Section, KanbanColumn } from '@/types';
import { getProjectProgress, getSectionProgress } from './progress';
import { PRIORITY_ORDER, PRIORITY_META } from './priority';

export interface DailyPoint {
  date: string; // local YYYY-MM-DD key
  label: string; // short display label, e.g. "8 Sep"
}

// An explicit, inclusive day range. Always resolved to concrete Dates by the
// caller (AnalyticsView) -- whether that came from a quick "last N days"
// preset or a manually picked from/to, every chart downstream sees the same
// shape and doesn't need to know which.
export interface AnalyticsRange {
  from: Date;
  to: Date;
}

export interface TimeTrendPoint extends DailyPoint {
  hours: number;
}

export interface CompletionTrendPoint extends DailyPoint {
  completed: number;
}

export interface ProjectProgressPoint {
  id: string;
  name: string;
  color: string;
  icon?: string;
  completed: number;
  total: number;
  percent: number;
}

export interface PriorityDistributionPoint {
  priority: Todo['priority'];
  label: string;
  count: number;
  color: string;
}

export interface StatusDistributionPoint {
  status: string;
  label: string;
  count: number;
  color: string;
}

export function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

// Local (not UTC) date key so "today" lines up with what the user sees on
// their own clock -- toISOString() would shift near midnight in most
// timezones, which is exactly the kind of off-by-one that erodes trust in a
// chart.
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Default range for the two trend charts before the user touches anything,
// and what a preset button (7D/14D/30D) resolves to.
export function presetRange(days: number): AnalyticsRange {
  const to = startOfDay(new Date());
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

function daysInRange(range: AnalyticsRange): DailyPoint[] {
  const from = startOfDay(range.from);
  const to = startOfDay(range.to);
  const points: DailyPoint[] = [];
  const cursor = new Date(from);
  // Guards against a reversed or accidentally huge manually-picked range --
  // caps the chart instead of hanging on a stray typo like a 1990 "From" date.
  let guard = 0;
  while (cursor.getTime() <= to.getTime() && guard < 366) {
    points.push({
      date: localDateKey(cursor),
      label: cursor.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    });
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return points;
}

export function getTimeTrend(timeEntries: TimeEntry[], range: AnalyticsRange): TimeTrendPoint[] {
  const buckets = daysInRange(range);
  const secondsByDate = new Map(buckets.map((b) => [b.date, 0]));
  for (const entry of timeEntries) {
    const key = localDateKey(new Date(entry.createdAt));
    if (secondsByDate.has(key)) {
      secondsByDate.set(key, (secondsByDate.get(key) || 0) + entry.duration);
    }
  }
  return buckets.map((b) => ({
    ...b,
    hours: Math.round(((secondsByDate.get(b.date) || 0) / 3600) * 10) / 10,
  }));
}

export function getCompletionTrend(todos: Todo[], range: AnalyticsRange): CompletionTrendPoint[] {
  const buckets = daysInRange(range);
  const countByDate = new Map(buckets.map((b) => [b.date, 0]));
  for (const todo of todos) {
    if (!todo.completed) continue;
    const key = localDateKey(new Date(todo.updatedAt));
    if (countByDate.has(key)) {
      countByDate.set(key, (countByDate.get(key) || 0) + 1);
    }
  }
  return buckets.map((b) => ({ ...b, completed: countByDate.get(b.date) || 0 }));
}

export function getProjectProgressList(projects: Project[], todos: Todo[]): ProjectProgressPoint[] {
  return projects
    .map((p) => {
      const progress = getProjectProgress(p.id, todos);
      return { id: p.id, name: p.name, color: p.color, icon: p.icon, ...progress };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.percent - a.percent);
}

export interface SectionProgressPoint {
  id: string;
  name: string;
  color: string;
  icon?: string;
  projectName?: string;
  completed: number;
  total: number;
  percent: number;
}

// Every section across every project, ranked by completion so the strongest
// (or most stalled) areas surface first. Capped to keep the card scannable --
// this is a highlights list, not a full section browser (SectionManager is).
export function getSectionProgressList(
  sections: Section[],
  todos: Todo[],
  projects: Project[],
  limit = 8
): SectionProgressPoint[] {
  return sections
    .map((s) => {
      const progress = getSectionProgress(s.id, todos, sections);
      const project = projects.find((p) => p.id === s.projectId);
      return {
        id: s.id,
        name: s.name,
        color: s.color || 'var(--color-primary)',
        icon: s.icon,
        projectName: project?.name,
        ...progress,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit);
}

// Mirrors TodoList/KanbanBoard: only top-level, active tasks -- a subtask's
// priority already rolls up into its parent conceptually, so counting both
// would double-weight a task that has several microtasks.
export function getPriorityDistribution(todos: Todo[]): PriorityDistributionPoint[] {
  const relevant = todos.filter((t) => !t.completed && !t.parentTodoId);
  const counts: Record<Todo['priority'], number> = { urgent: 0, high: 0, medium: 0, low: 0, routine: 0 };
  for (const t of relevant) counts[t.priority] = (counts[t.priority] || 0) + 1;
  return PRIORITY_ORDER
    .map((p) => ({ priority: p, label: PRIORITY_META[p].shortLabel, count: counts[p], color: PRIORITY_META[p].color }))
    .filter((p) => p.count > 0);
}

export function getStatusDistribution(todos: Todo[], kanbanColumns: KanbanColumn[]): StatusDistributionPoint[] {
  const relevant = todos.filter((t) => !t.completed && !t.parentTodoId);
  const counts = new Map<string, number>();
  for (const t of relevant) counts.set(t.status, (counts.get(t.status) || 0) + 1);
  return kanbanColumns
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ status: c.id, label: c.name, count: counts.get(c.id) || 0, color: c.color }))
    .filter((c) => c.count > 0);
}
