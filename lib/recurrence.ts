// Pure date math for recurring tasks — no DB access here so it stays easy to unit test.
// Strategy: walk day-by-day over the (usually short) catch-up window and test each day
// against the rule. Simpler and far less bug-prone than computing closed-form jumps,
// and cheap enough since this only ever runs over "days since the dashboard was last opened".

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // every N days / weeks / months
  daysOfWeek: number[]; // 0=Sun .. 6=Sat — used when frequency === 'weekly'
  dayOfMonth?: number | null; // used when frequency === 'monthly'
  startDate: Date;
  endDate?: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday-anchored week
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Last valid day-of-month for the month containing `date` (handles Feb, 30-day months). */
function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isOccurrence(rule: RecurrenceRule, day: Date): boolean {
  const start = startOfDay(rule.startDate);
  if (day < start) return false;

  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === 'daily') {
    return daysBetween(start, day) % interval === 0;
  }

  if (rule.frequency === 'weekly') {
    const days = rule.daysOfWeek?.length ? rule.daysOfWeek : [start.getDay()];
    if (!days.includes(day.getDay())) return false;
    const weeksSinceStart = Math.floor(daysBetween(startOfWeek(start), startOfWeek(day)) / 7);
    return weeksSinceStart >= 0 && weeksSinceStart % interval === 0;
  }

  // monthly
  const anchorDay = rule.dayOfMonth || start.getDate();
  const targetDay = Math.min(anchorDay, lastDayOfMonth(day));
  if (day.getDate() !== targetDay) return false;
  const monthsSinceStart = monthsBetween(start, day);
  return monthsSinceStart >= 0 && monthsSinceStart % interval === 0;
}

/**
 * Returns every occurrence date of `rule` strictly after `from` and up to and
 * including `to` (both normalized to local midnight). `from` is typically the
 * task's lastRunDate (or startDate if it has never run); `to` is "today".
 */
export function getOccurrencesBetween(rule: RecurrenceRule, from: Date, to: Date): Date[] {
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);
  const hardEnd = rule.endDate ? startOfDay(rule.endDate) : null;

  if (toDay <= fromDay) return [];

  const occurrences: Date[] = [];
  for (let d = new Date(fromDay.getTime() + DAY_MS); d <= toDay; d = new Date(d.getTime() + DAY_MS)) {
    if (hardEnd && d > hardEnd) break;
    if (isOccurrence(rule, d)) occurrences.push(new Date(d));
  }
  return occurrences;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Human-readable schedule summary, e.g. "Every 2 weeks on Mon, Wed, Fri". */
export function formatSchedule(rule: RecurrenceRule): string {
  const every = rule.interval > 1 ? `Every ${rule.interval} ` : 'Every ';

  if (rule.frequency === 'daily') {
    return rule.interval > 1 ? `${every}days` : 'Every day';
  }

  if (rule.frequency === 'weekly') {
    const days = (rule.daysOfWeek?.length ? [...rule.daysOfWeek] : [])
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_LABELS[d])
      .join(', ');
    const unit = rule.interval > 1 ? 'weeks' : 'week';
    return days ? `${every}${unit} on ${days}` : `${every}${unit}`;
  }

  const unit = rule.interval > 1 ? 'months' : 'month';
  const day = rule.dayOfMonth || new Date(rule.startDate).getDate();
  return `${every}${unit} on day ${day}`;
}

export const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

/** Formats a Date as YYYY-MM-DD for a native <input type="date"> value. */
export function toDateInputValue(date?: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}
