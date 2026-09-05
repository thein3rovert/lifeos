import { describe, expect, it } from 'vitest';
import {
  dateAtMinutes,
  formatEventTimeRange,
  resizedEventEnd,
  snapMinutes,
  toLocalDateKey,
} from './utils';

describe('calendar interaction utilities', () => {
  it('snaps times to 15-minute increments', () => {
    expect(snapMinutes(607)).toBe(600);
    expect(snapMinutes(608)).toBe(615);
    expect(snapMinutes(622)).toBe(615);
  });

  it('creates a local date at the requested minutes from midnight', () => {
    const result = dateAtMinutes(new Date(2026, 8, 1, 18), 10 * 60 + 15);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(15);
  });

  it('formats a visible event time range', () => {
    expect(
      formatEventTimeRange(new Date(2026, 8, 1, 10, 15), new Date(2026, 8, 1, 11, 30))
    ).toContain('10:15 AM');
  });

  it('snaps resizing and enforces a 15-minute minimum duration', () => {
    const start = new Date(2026, 8, 1, 10);
    const originalEnd = new Date(2026, 8, 1, 11);
    const latestEnd = new Date(2026, 8, 2);
    expect(resizedEventEnd(start, originalEnd, -55, latestEnd).getTime()).toBe(
      new Date(2026, 8, 1, 10, 15).getTime()
    );
    expect(resizedEventEnd(start, originalEnd, 22, latestEnd).getTime()).toBe(
      new Date(2026, 8, 1, 11, 15).getTime()
    );
  });

  it('formats local calendar dates', () => {
    expect(toLocalDateKey(new Date(2026, 8, 7, 23))).toBe('2026-09-07');
  });
});
