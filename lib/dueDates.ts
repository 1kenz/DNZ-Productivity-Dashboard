// Shared due-date logic for the Due Dates modal/panel, the Header warning
// badge, and the StatsCard "Due Soon" tile -- one place decides what counts
// as overdue/today/soon so those three surfaces can never disagree.
//
// Mirrors TaskRow.tsx's existing `isOverdue` check (deadline < start of
// today, and not completed) rather than inventing a second definition.

import { Todo } from '@/types';
import { endOfWeek } from '@/lib/calendarDateUtils';

export type DueBucket = 'overdue' | 'today' | 'soon';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** How many whole calendar days from today until `deadline` (negative = past). */
export function daysUntil(deadline: Date | string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(deadline));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Which bucket a single todo falls into, or null if it has no deadline,
 * is already completed, or is due further out than `soonDays`.
 */
export function getDueBucket(todo: Todo, soonDays = 3): DueBucket | null {
  if (!todo.deadline || todo.completed) return null;
  const diff = daysUntil(todo.deadline);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= soonDays) return 'soon';
  return null;
}

export interface DueTodoGroups {
  overdue: Todo[];
  today: Todo[];
  soon: Todo[];
  total: number;
}

/** Splits `todos` into overdue / due-today / due-within-`soonDays` groups, each sorted by deadline ascending. */
export function getDueTodoGroups(todos: Todo[], soonDays = 3): DueTodoGroups {
  const overdue: Todo[] = [];
  const today: Todo[] = [];
  const soon: Todo[] = [];

  for (const todo of todos) {
    const bucket = getDueBucket(todo, soonDays);
    if (bucket === 'overdue') overdue.push(todo);
    else if (bucket === 'today') today.push(todo);
    else if (bucket === 'soon') soon.push(todo);
  }

  const byDeadlineAsc = (a: Todo, b: Todo) =>
    new Date(a.deadline as Date).getTime() - new Date(b.deadline as Date).getTime();
  overdue.sort(byDeadlineAsc);
  today.sort(byDeadlineAsc);
  soon.sort(byDeadlineAsc);

  return { overdue, today, soon, total: overdue.length + today.length + soon.length };
}

/** True when `a` and `b` fall on the same calendar day (used to gate the once-a-day auto-modal). */
export function isSameCalendarDay(a: Date | string | null | undefined, b: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}

// --- Full-range segmentation for the Due Dates panel ---------------------
// getDueTodoGroups above stays narrow (overdue/today/next `soonDays` days)
// because it also gates the once-a-day auto-open modal (see
// DueDatesController.tsx) and the Header/StatsCard "due soon" badges --
// those should only flag genuinely urgent items. The panel itself, once
// open, shows the full picture across every task with a deadline, broken
// into Today / This Week / This Month / next 3 months / next 6 months /
// This Year / Later, each collapsible in the UI (see DueDatesPanel.tsx).

export type DueSegmentKey =
  | 'overdue'
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'next3Months'
  | 'next6Months'
  | 'thisYear'
  | 'later';

export type DueTodoSegments = Record<DueSegmentKey, Todo[]> & { total: number };

/** Splits every non-completed todo that has a deadline into time-horizon
 * buckets, each sorted by deadline ascending. Boundaries are calendar-based
 * for week/month/year (matching how a person actually thinks about "this
 * week") and rolling from today for the 3/6-month windows. */
export function getDueTodoSegments(todos: Todo[]): DueTodoSegments {
  const now = new Date();
  const weekEnd = endOfWeek(now);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const threeMonthsEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), 23, 59, 59, 999);
  const sixMonthsEnd = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate(), 23, 59, 59, 999);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const segments: DueTodoSegments = {
    overdue: [],
    today: [],
    thisWeek: [],
    thisMonth: [],
    next3Months: [],
    next6Months: [],
    thisYear: [],
    later: [],
    total: 0,
  };

  for (const todo of todos) {
    if (!todo.deadline || todo.completed) continue;
    const diff = daysUntil(todo.deadline);
    const deadline = new Date(todo.deadline);

    if (diff < 0) segments.overdue.push(todo);
    else if (diff === 0) segments.today.push(todo);
    else if (deadline <= weekEnd) segments.thisWeek.push(todo);
    else if (deadline <= monthEnd) segments.thisMonth.push(todo);
    else if (deadline <= threeMonthsEnd) segments.next3Months.push(todo);
    else if (deadline <= sixMonthsEnd) segments.next6Months.push(todo);
    else if (deadline <= yearEnd) segments.thisYear.push(todo);
    else segments.later.push(todo);
  }

  const byDeadlineAsc = (a: Todo, b: Todo) =>
    new Date(a.deadline as Date).getTime() - new Date(b.deadline as Date).getTime();
  (Object.keys(segments) as (keyof DueTodoSegments)[]).forEach((key) => {
    if (key !== 'total') (segments[key] as Todo[]).sort(byDeadlineAsc);
  });

  segments.total = (Object.keys(segments) as (keyof DueTodoSegments)[]).reduce(
    (sum, key) => (key === 'total' ? sum : sum + (segments[key] as Todo[]).length),
    0
  );

  return segments;
}
