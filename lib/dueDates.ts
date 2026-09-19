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

// --- Range filter for the Due Dates panel ---------------------------------
// getDueTodoGroups above stays narrow (overdue/today/next `soonDays` days)
// because it also gates the once-a-day auto-open modal (see
// DueDatesController.tsx) and the Header/StatsCard "due soon" badges --
// those should only flag genuinely urgent items. The panel itself, once
// open, lets the person pick a pill filter (All / Today / This Week /
// Next 30-60-90 Days / a custom range) and shows a single flat,
// deadline-ascending list for whichever range is selected (see
// DueDatesPanel.tsx). Every preset except "custom" is cumulative -- it
// always includes anything already overdue, since an overdue task is
// relevant no matter which forward-looking window is selected.

export type DueRangeFilterKey = 'all' | 'today' | 'thisWeek' | 'nextDays' | 'custom';

export interface DueRangeFilter {
  key: DueRangeFilterKey;
  /** Used when key === 'nextDays'. Defaults to 30. */
  nextDaysValue?: number;
  /** Used when key === 'custom'. 'YYYY-MM-DD' (from a <input type="date">). */
  customFrom?: string;
  customTo?: string;
}

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Filters non-completed todos with a deadline down to `filter`'s range, sorted by deadline ascending. */
export function filterDueTodosByRange(todos: Todo[], filter: DueRangeFilter): Todo[] {
  const now = new Date();
  const endOfToday = endOfDay(now);
  const weekEnd = endOfWeek(now);
  const nextDaysEnd = endOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + (filter.nextDaysValue ?? 30))
  );
  const customFromDate = filter.customFrom ? new Date(`${filter.customFrom}T00:00:00`) : null;
  const customToDate = filter.customTo ? new Date(`${filter.customTo}T23:59:59.999`) : null;

  const matches = (todo: Todo): boolean => {
    if (!todo.deadline || todo.completed) return false;
    const deadline = new Date(todo.deadline);
    switch (filter.key) {
      case 'all':
        return true;
      case 'today':
        return deadline <= endOfToday;
      case 'thisWeek':
        return deadline <= weekEnd;
      case 'nextDays':
        return deadline <= nextDaysEnd;
      case 'custom':
        if (!customFromDate || !customToDate) return true;
        return deadline >= customFromDate && deadline <= customToDate;
      default:
        return true;
    }
  };

  return todos
    .filter(matches)
    .sort((a, b) => new Date(a.deadline as Date).getTime() - new Date(b.deadline as Date).getTime());
}
