// Native Date helpers for the calendar grid. No date library needed.

import type { CalendarWeekday } from '@/types';

export const CALENDAR_INCREMENT_MINUTES = 15;
export const MIN_EVENT_DURATION_MINUTES = 15;
export const CALENDAR_WEEKDAYS = [
  { token: 'SU', label: 'S' },
  { token: 'MO', label: 'M' },
  { token: 'TU', label: 'T' },
  { token: 'WE', label: 'W' },
  { token: 'TH', label: 'T' },
  { token: 'FR', label: 'F' },
  { token: 'SA', label: 'S' },
] as const;

export function weekdayToken(date: Date): (typeof CALENDAR_WEEKDAYS)[number]['token'] {
  return CALENDAR_WEEKDAYS[date.getDay()].token;
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function habitCompletionKey(habitId: string, date: Date | string): string {
  return `${habitId}:${typeof date === 'string' ? date : toLocalDateKey(date)}`;
}

export function parseWeeklyRecurrence(rules: string[] | undefined): {
  weekdays: CalendarWeekday[];
  end: 'never' | 'until';
  until: string;
} {
  const rule = rules?.find((value) => value.startsWith('RRULE:')) ?? '';
  const weekdays = (rule.match(/(?:^|;)BYDAY=([^;]+)/)?.[1]?.split(',') ?? []).filter(
    (value): value is CalendarWeekday => CALENDAR_WEEKDAYS.some((day) => day.token === value)
  );
  const untilValue = rule.match(/(?:^|;)UNTIL=(\d{8})/)?.[1];
  const until = untilValue
    ? `${untilValue.slice(0, 4)}-${untilValue.slice(4, 6)}-${untilValue.slice(6, 8)}`
    : '';
  return { weekdays, end: until ? 'until' : 'never', until };
}

export function snapMinutes(minutes: number, increment = CALENDAR_INCREMENT_MINUTES): number {
  return Math.round(minutes / increment) * increment;
}

export function dateAtMinutes(day: Date, minutes: number): Date {
  const result = new Date(day);
  result.setHours(0, minutes, 0, 0);
  return result;
}

export function resizedEventEnd(
  start: Date,
  originalEnd: Date,
  deltaMinutes: number,
  latestEnd: Date
): Date {
  const originalDuration = (originalEnd.getTime() - start.getTime()) / 60_000;
  const duration = Math.max(
    MIN_EVENT_DURATION_MINUTES,
    snapMinutes(originalDuration + deltaMinutes)
  );
  return new Date(Math.min(start.getTime() + duration * 60_000, latestEnd.getTime()));
}

export function formatEventTimeRange(start: Date, end: Date): string {
  const format = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${format(start)} – ${format(end)}`;
}

// Returns the Sunday at the start of the week containing `date`.
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Returns the first day of the month containing `date`.
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Returns the last day of the month containing `date`.
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Adds (or subtracts) `n` days to a date.
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// True if two dates fall on the same calendar day.
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// True if `date` is today.
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// Builds a 6x7 grid (42 cells) covering the month containing `viewDate`,
// starting from the Sunday before the 1st.
export function buildMonthGrid(viewDate: Date): Date[] {
  const first = startOfMonth(viewDate);
  const startDate = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(startDate, i));
}

// Builds a 7-day array (Sunday → Saturday) for the week containing `viewDate`.
export function buildWeekGrid(viewDate: Date): Date[] {
  const start = startOfWeek(viewDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Formats a Date as an RFC3339 string suitable for the backend API.
export function toRFC3339(date: Date): string {
  return date.toISOString();
}

// Formats an hour (0-23) as "12 AM", "1 AM", ..., "11 PM".
export function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display} ${period}`;
}

// Formats a time string ("2026-08-20T10:00:00Z") as "10:00 AM".
export function formatTime(timeStr: string): string {
  return new Date(timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Formats a date as "Aug 20" or "Aug 20, 2026".
export function formatDay(date: Date, includeYear = false): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear && { year: 'numeric' }),
  });
}

// Formats a month + year header: "August 2026".
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Formats a week range: "Aug 20 – 26, 2026".
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }
  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekEnd.getFullYear()}`;
}
