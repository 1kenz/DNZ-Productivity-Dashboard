import { Todo, Section } from '@/types';

export interface ProgressStats {
  completed: number;
  total: number;
  percent: number;
}

function makeStats(completed: number, total: number): ProgressStats {
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

/**
 * Whether a single leaf task counts as "done". A task with a numeric goal
 * (targetCount set, e.g. "500 kelime") is done once currentCount reaches
 * it; every other task uses its plain completed checkbox.
 */
export function isTodoDone(todo: Todo): boolean {
  if (todo.targetCount != null && todo.targetCount > 0) {
    return (todo.currentCount ?? 0) >= todo.targetCount;
  }
  return todo.completed;
}

/**
 * Progress for one task INCLUDING its own microtasks/subtasks, if any. A
 * task that has subtasks is never counted as its own leaf -- its progress
 * is fully derived from its subtasks (finishing all of them is what
 * "completes" it in every rollup above it), so there is nothing to keep in
 * sync: completion at every non-leaf level is always computed, never
 * stored.
 */
export function getTodoProgress(todo: Todo, allTodos: Todo[]): ProgressStats {
  const subtasks = allTodos.filter((t) => t.parentTodoId === todo.id);
  if (subtasks.length === 0) {
    return makeStats(isTodoDone(todo) ? 1 : 0, 1);
  }
  let completed = 0;
  let total = 0;
  for (const st of subtasks) {
    const r = getTodoProgress(st, allTodos);
    completed += r.completed;
    total += r.total;
  }
  return makeStats(completed, total);
}

/**
 * Progress for a Section, rolling up every top-level task assigned directly
 * to it plus (recursively) every sub-section's tasks.
 */
export function getSectionProgress(
  sectionId: string,
  allTodos: Todo[],
  allSections: Section[]
): ProgressStats {
  let completed = 0;
  let total = 0;

  const ownTasks = allTodos.filter((t) => t.sectionId === sectionId && !t.parentTodoId);
  for (const t of ownTasks) {
    const r = getTodoProgress(t, allTodos);
    completed += r.completed;
    total += r.total;
  }

  const childSections = allSections.filter((s) => s.parentId === sectionId);
  for (const child of childSections) {
    const r = getSectionProgress(child.id, allTodos, allSections);
    completed += r.completed;
    total += r.total;
  }

  return makeStats(completed, total);
}

/**
 * Progress for a whole Project: every top-level task tagged with this
 * project (sectioned or not), each with its own subtasks rolled up. Since
 * every task keeps its projectId regardless of which section it sits in,
 * this already covers section/sub-section tasks too -- no need to walk the
 * section tree separately.
 */
export function getProjectProgress(projectId: string, allTodos: Todo[]): ProgressStats {
  let completed = 0;
  let total = 0;

  const topLevelTasks = allTodos.filter((t) => t.projectId === projectId && !t.parentTodoId);
  for (const t of topLevelTasks) {
    const r = getTodoProgress(t, allTodos);
    completed += r.completed;
    total += r.total;
  }

  return makeStats(completed, total);
}
