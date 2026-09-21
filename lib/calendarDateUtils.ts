// Pure date-range helpers for the Calendar tab's Day/Week/Month grids.
// Weeks start on Monday (matches Google/Apple Calendar's common EU/TR default).

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday to the end of the previous week
  return addDays(d, diff);
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/** The Monday on/before the 1st of the month, through the Sunday on/after
 * the last day -- a full set of Monday-start weeks for a month grid. */
export function monthGridRange(date: Date): { start: Date; end: Date } {
  return { start: startOfWeek(startOfMonth(date)), end: endOfWeek(endOfMonth(date)) };
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getRangeForView(
  view: 'day' | 'week' | 'month',
  anchor: Date
): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(anchor), end: endOfDay(anchor) };
  if (view === 'week') return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
  return monthGridRange(anchor);
}

export function shiftAnchor(view: 'day' | 'week' | 'month', anchor: Date, direction: 1 | -1): Date {
  if (view === 'day') return addDays(anchor, direction);
  if (view === 'week') return addDays(anchor, 7 * direction);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

/** ISO 8601 week number (weeks start Monday, week 1 is the week containing
 * the year's first Thursday) -- matches the Monday-start weeks used
 * throughout this file, unlike the US-style Sunday-start week numbering
 * some libraries default to. */
export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // shift to this week's Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** 1-indexed day-of-year (Jan 1 = 1). */
export function getDayOfYear(date: Date): number {
  const yearStart = startOfDay(new Date(date.getFullYear(), 0, 1));
  const diffDays = Math.round((startOfDay(date).getTime() - yearStart.getTime()) / 86400000);
  return diffDays + 1;
}
